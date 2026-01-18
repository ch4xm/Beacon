import { useRef, useState, useEffect, useCallback } from "react";
import "./Home.css";
import AuthModal from "@/components/AuthModal";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import Map, {
    GeolocateControl,
    NavigationControl,
    Popup,
} from "react-map-gl/mapbox";
import { Source, Layer, CircleLayerSpecification, HeatmapLayerSpecification, LineLayerSpecification } from "react-map-gl/mapbox";
import Pin from "@/components/Pin";
import { reverseGeocode, ReverseGeocodeResult } from "@/utils/geocoding";
import { lerpColor } from "@/utils/colorUtils";
import LocationPin from "@/components/LocationPin";
import DetailedPinModal from "@/components/DetailedPinModal";
import { NavLink, useNavigate, useSearchParams } from "react-router";
import AuthHook from "./AuthHook";
import { BASE_API_URL, PIN_COLOR, USER_PIN_COLOR, PIN_LAYER_STYLE, HEATMAP_LAYER_STYLE } from '../../constants';
import { GeoJSON } from '../types/express/index';
import { Avatar } from "@/components/Avatar";
import polyline from '@mapbox/polyline';

interface PinData {
    lat: number;
    lng: number;
    isLoading: boolean;
    address: string;
    email: string;
}

export interface SelectedPoint {
    id?: number;
    creatorID?: number;
    longitude: number;
    latitude: number;
    title?: string;
    address?: string;
    description: string;
    image: string;
    color: string;
    email?: string;
}

function HomePage() {
    useEffect(() => {
        const heartbeat = async () => {
            try {
                const base = import.meta.env.VITE_API_BASE;
                const res = await fetch(`${base}/heartbeat`);

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const text = await res.text();
            } catch (err) {
                console.log("[CloudFlare] Tunnel unreachable:", err);
            }
        };

        heartbeat();
    }, []);

    const mapRef = useRef<mapboxgl.Map | null>(null);
    const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const [pinData, setPinData] = useState<PinData | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
        null,
    );
    const [showDetailedModal, setShowDetailedModal] = useState<boolean>(false);
    const [allPins, setAllPins] = useState<GeoJSON>({
        type: "FeatureCollection",
        features: [],
    });
    const [savedPlaces, setSavedPlaces] = useState<PinData[]>([]);

    const [cursor, setCursor] = useState<string>("auto");
    const [userEmail, userId, isLoggedIn, logout, authSuccess] = AuthHook();
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
    const [showTripPlanner, setShowTripPlanner] = useState<boolean>(false);
    const [tripRoute, setTripRoute] = useState<GeoJSON.FeatureCollection | null>(null);

    const onMouseEnter = useCallback(() => setCursor("pointer"), []);
    const onMouseLeave = useCallback(() => setCursor("auto"), []);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Handle ?pin= URL parameter for shared links
    useEffect(() => {
        const pinId = searchParams.get('pin');
        if (pinId && allPins.features.length > 0) {
            const feature = allPins.features.find(f => f.properties.id === parseInt(pinId));
            if (feature) {
                const coords = feature.geometry.coordinates;
                // Fly to the pin location
                mapRef.current?.flyTo({
                    center: [coords[0], coords[1]],
                    zoom: 14,
                    duration: 1500
                });
                // Set selected point and show modal
                reverseGeocode(coords[1], coords[0]).then(result => {
                    setSelectedPoint({
                        id: feature.properties.id,
                        longitude: coords[0],
                        latitude: coords[1],
                        title: feature.properties.title || "",
                        description: feature.properties.description || "",
                        image: feature.properties.image || "",
                        color: feature.properties.color || PIN_COLOR,
                        email: feature.properties.email || "",
                        address: result.fullAddress,
                    });
                    setShowDetailedModal(true);
                });
                // Clear the URL parameter
                setSearchParams({});
            }
        }
    }, [allPins.features, searchParams]);

    useEffect(() => {
        const fetchPins = async () => {
            try {
                const res = await fetch(`${BASE_API_URL}/api/pins`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                    }
                });

                if (res.status == 401) {
                    handleLogout();
                    return;
                }

                if (!res.ok) {
                    console.error("Failed to fetch pins:", res.status);
                    return;
                }

                const data = await res.json();
                const geojson = {
                    type: "FeatureCollection",
                    features: data.map((p: any) => ({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [p.longitude, p.latitude],
                        },
                        properties: {
                            id: p.id,
                            email: p.email,
                            title: p.title,
                            description: p.description,
                            image: p.image,
                            color: localStorage.getItem("userEmail") == p.email ? USER_PIN_COLOR : PIN_COLOR,
                            address: p.address,
                            likes: p.likes || 0,
                        },
                    })),
                };
                setAllPins(geojson);
            } catch (error) {
                console.error("Error fetching pins:", error);
            }
        };

        const fetchSavedPlaces = () => {
            const savedPins = JSON.parse(localStorage.getItem("savedPins") || '{}');
            const email = localStorage.getItem("userEmail")!;
            const savedPinIDs = savedPins[email] || [];

            const saved = allPins.features
                .filter(f => savedPinIDs.includes(f.properties.id))
                .map(f => ({
                    id: f.properties.id,
                    latitude: f.geometry.coordinates[1],
                    longitude: f.geometry.coordinates[0],
                    title: f.properties.title,
                    description: f.properties.description,
                    image: f.properties.image,
                    color: f.properties.color,
                    email: f.properties.email
                }));
            setSavedPlaces(saved as any);
        };

        fetchPins();
        if (isLoggedIn) fetchSavedPlaces();
    }, [isLoggedIn]);

    const handleLogout = () => {
        logout();
        setIsDropdownOpen(false);
    };

    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
        // Check if we clicked on a point feature
        const features = e.target.queryRenderedFeatures(e.point, {
            layers: ["point"],
        });

        const { lat, lng } = e.lngLat;
        const result = await reverseGeocode(lat, lng);
        if (features && features.length > 0) {
            const feature = features[0];
            const coords = (feature.geometry as any).coordinates;
            setSelectedPoint({
                id: feature.properties?.id,
                creatorID: feature.properties?.creatorID,
                longitude: coords[0],
                latitude: coords[1],
                title: feature.properties?.title || "",
                description: feature.properties?.description || "No description provided.",
                image: feature.properties?.image || "",
                color: feature.properties?.color || PIN_COLOR,
                email: feature.properties?.email || "",
                address: result.fullAddress,
            });

            setPinData(null); // Close any existing pin
            return;
        }

        setSelectedPoint(null);
        setPinData({
            lat,
            lng,
            isLoading: false,
            address: result.fullAddress || "Unknown Location",
            email: userEmail || "",
        });
    };

    return (
        <div className="home-container">
            <Sidebar
                mapRef={mapRef}
                allPins={allPins.features.map(f => ({
                    id: f.properties.id,
                    latitude: f.geometry.coordinates[1],
                    longitude: f.geometry.coordinates[0],
                    title: f.properties.title,
                    description: f.properties.description,
                    image: f.properties.image,
                    color: f.properties.color,
                    email: f.properties.email
                }))}
                savedPlaces={savedPlaces.map((p: any) => ({
                    id: p.id,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    title: p.title || p.message, // Use message as fallback title
                    description: p.description,
                    image: p.image,
                    color: p.color || PIN_COLOR
                }))}
                isLoggedIn={isLoggedIn}
                isSearchFocused={isSearchFocused}
                showTripPlanner={showTripPlanner}
                onCloseTripPlanner={() => setShowTripPlanner(false)}
                onTripPlanComplete={(result) => {
                    // Decode polylines and create route GeoJSON
                    if (result.routePolylines.length > 0) {
                        const features = result.routePolylines.map((route, idx) => {
                            const decoded = polyline.decode(route.polyline);
                            return {
                                type: "Feature" as const,
                                properties: { mode: route.mode },
                                geometry: {
                                    type: "LineString" as const,
                                    coordinates: decoded.map(([lat, lng]: [number, number]) => [lng, lat]),
                                },
                            };
                        });
                        setTripRoute({
                            type: "FeatureCollection",
                            features,
                        } as any);
                    }
                }}
            />
            <div className="main-content">
                <div className="search-container">
                    <SearchBar
                        mapRef={mapRef}
                        searchMarkerRef={searchMarkerRef}
                        onSelectPlace={(place) =>
                            setPinData({
                                lat: place.lat,
                                lng: place.lng,
                                address: place.address,
                                isLoading: false,
                                email: userEmail || "",
                            })
                        }
                        onFocusChange={(focused) => setIsSearchFocused(focused)}
                        isFocused={isSearchFocused}
                    />

                </div>

                <AuthModal isOpen={!isLoggedIn} onAuthSuccess={authSuccess} />


                {isLoggedIn && (
                    <div className="user-menu">
                        <button
                            className="user-menu-toggle"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className="user-email">
                                <Avatar letter={userEmail[0]} />
                            </span>
                            <svg
                                className={`chevron ${isDropdownOpen ? "open" : ""}`}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        {isDropdownOpen && (
                            <div className="user-dropdown">
                                <button
                                    onClick={handleLogout}
                                    className="dropdown-item logout"
                                >
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Trip Planner Button */}
                {isLoggedIn && (
                    <button
                        className="trip-planner-fab"
                        onClick={() => setShowTripPlanner(true)}
                        title="Plan a Trip"
                    >
                        🌍
                    </button>
                )}

                <Map
                    ref={(map) => {
                        if (map) mapRef.current = map.getMap();
                    }}
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                    initialViewState={{
                        longitude: -122.4,
                        latitude: 37.8,
                        zoom: 9,
                    }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    onClick={handleMapClick}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    interactiveLayerIds={["point"]}
                    cursor={cursor}
                    interactive={true}
                    doubleClickZoom={true}
                    dragRotate={true}
                    touchZoomRotate={true}
                    attributionControl={false}
                    onZoom={(e) => {
                        const zoom = e.viewState.zoom;
                        if (zoom < 8) {
                            setPinData(null);
                            setSelectedPoint(null);
                        }
                    }}
                >
                    <GeolocateControl
                        position="bottom-right"
                        trackUserLocation
                        showUserHeading
                        showAccuracyCircle
                        showButton
                    />
                    <NavigationControl
                        position="bottom-right"
                        showCompass={true}
                        showZoom={true}
                        visualizePitch={true}
                    />

                    {pinData && (
                        <Pin
                            address={pinData.address}
                            latitude={pinData.lat}
                            longitude={pinData.lng}
                            isLoading={pinData.isLoading}
                            onClose={() => setPinData(null)}
                            onDetails={() => { }}
                            onPinCreated={(data) => {
                                setAllPins((prev) => ({
                                    ...prev,
                                    features: [
                                        ...prev.features,
                                        {
                                            type: "Feature",
                                            geometry: {
                                                type: "Point",
                                                coordinates: [
                                                    pinData.lng,
                                                    pinData.lat,
                                                ],
                                            },
                                            properties: {
                                                title: data.title,
                                                location: typeof pinData.address === "object" ? pinData.address?.name : pinData.address,
                                                description: data.description,
                                                image: data.image || "",
                                                color: localStorage.getItem("email") == pinData.email ? USER_PIN_COLOR : PIN_COLOR,
                                                email: userEmail,
                                            },
                                        },
                                    ],
                                }));
                                setPinData(null);
                            }}
                        />
                    )}

                    {selectedPoint && (
                        <LocationPin
                            selectedPoint={selectedPoint}
                            setSelectedPoint={setSelectedPoint}
                            onShowDetails={() => setShowDetailedModal(true)}
                            onBookmarkChange={(pinId, isBookmarked) => {
                                const savedPins = JSON.parse(localStorage.getItem("savedPins") || '{}');
                                const email = localStorage.getItem("userEmail")!;
                                const savedPinIDs = savedPins[email] || [];

                                const saved = allPins.features
                                    .filter(f => savedPinIDs.includes(f.properties.id))
                                    .map(f => ({
                                        id: f.properties.id,
                                        latitude: f.geometry.coordinates[1],
                                        longitude: f.geometry.coordinates[0],
                                        title: f.properties.title,
                                        description: f.properties.description,
                                        image: f.properties.image,
                                        color: f.properties.color,
                                        email: f.properties.email
                                    }));
                                setSavedPlaces(saved as any);
                            }}
                        />
                    )}

                    {showDetailedModal && selectedPoint && (
                        <DetailedPinModal
                            selectedPoint={selectedPoint}
                            currentUserId={userId}
                            currentUserEmail={localStorage.getItem("userEmail")}
                            onClose={() => setShowDetailedModal(false)}
                            onDelete={(deletedId) => {
                                setAllPins((prev) => ({
                                    type: "FeatureCollection",
                                    features: prev.features.filter(
                                        (f) => f.properties.id !== deletedId
                                    ),
                                }));
                                setSavedPlaces((prev) =>
                                    prev.filter((p: any) => p.id !== deletedId)
                                );
                                setSelectedPoint(null);
                                setShowDetailedModal(false);
                            }}
                            onUpdate={(updatedPoint) => {
                                setAllPins((prev) => ({
                                    type: "FeatureCollection",
                                    features: prev.features.map((f) => {
                                        if (f.properties.id === updatedPoint.id) {
                                            return {
                                                ...f,
                                                properties: {
                                                    ...f.properties,
                                                    description: updatedPoint.description,
                                                    image: updatedPoint.image,
                                                    color:
                                                        updatedPoint.color ||
                                                        f.properties.color,
                                                },
                                            };
                                        }
                                        return f;
                                    }),
                                }));
                                setSelectedPoint((prev) =>
                                    prev
                                        ? {
                                            ...prev,
                                            ...updatedPoint,
                                            color:
                                                updatedPoint.color || prev.color,
                                        }
                                        : null,
                                );
                            }}
                        />
                    )}

                    <Source id="my-data" type="geojson" data={allPins as any}>
                        <Layer {...PIN_LAYER_STYLE} />
                        <Layer {...(HEATMAP_LAYER_STYLE as HeatmapLayerSpecification)} />
                    </Source>

                    {/* Trip Route Line */}
                    {tripRoute && (
                        <Source id="trip-route" type="geojson" data={tripRoute as any}>
                            <Layer
                                id="trip-route-line"
                                type="line"
                                paint={{
                                    "line-color": "#22c55e",
                                    "line-width": 4,
                                    "line-opacity": 0.8,
                                }}
                            />
                        </Source>
                    )}
                </Map>
            </div>
        </div>
    );
}

export default HomePage;
