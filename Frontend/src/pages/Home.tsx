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
import { Source, Layer, CircleLayerSpecification, HeatmapLayerSpecification } from "react-map-gl/mapbox";
import Pin from "@/components/Pin";
import { reverseGeocode, ReverseGeocodeResult } from "@/utils/geocoding";
import LocationPin from "@/components/LocationPin";
import DetailedPinModal from "@/components/DetailedPinModal";
import { NavLink, useNavigate } from "react-router";
import AuthHook from "./AuthHook";
import { BASE_API_URL, PIN_COLOR, USER_PIN_COLOR, PIN_LAYER_STYLE, HEATMAP_LAYER_STYLE } from '../../constants';

interface PinData {
    lat: number;
    lng: number;
    isLoading: boolean;
    address: ReverseGeocodeResult | string | undefined;
    email: string;
}

interface SelectedPoint {
    id?: number;
    creatorID?: number;
    longitude: number;
    latitude: number;
    title?: string;
    location?: string;
    message: string;
    image: string;
    color: string;
    email?: string;
    address?: ReverseGeocodeResult;
}

function HomePage() {
    useEffect(() => {
        const heartbeat = async () => {
            try {
                console.log("sending API heartbeat")
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
    const [allPins, setAllPins] = useState<{
        type: string;
        features: Array<{
            type: string;
            geometry: {
                type: string;
                coordinates: [number, number];
            };
            properties: {
                id?: number;
                creatorID?: number;
                title?: string;
                location?: string;
                message: string;
                image: string;
                color: string;
                email?: string;
                address?: ReverseGeocodeResult;
            };
        }>;
    }>({
        type: "FeatureCollection",
        features: [],
    });
    const [savedPlaces, setSavedPlaces] = useState<PinData[]>([]);

    const [cursor, setCursor] = useState<string>("auto");
    const [userEmail, userId, isLoggedIn, logout, authSuccess] = AuthHook();
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

    const onMouseEnter = useCallback(() => setCursor("pointer"), []);
    const onMouseLeave = useCallback(() => setCursor("auto"), []);

    const navigate = useNavigate();

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
                            location: p.location,
                            message: p.message,
                            image: p.image,
                            color: localStorage.getItem("userEmail") == p.email ? USER_PIN_COLOR : PIN_COLOR,
                            address: p.address,
                        },
                    })),
                };
                setAllPins(geojson);
            } catch (error) {
                console.error("Error fetching pins:", error);
            }
        };

        const fetchSavedPlaces = async () => {
            try {
                const res = await fetch(`${BASE_API_URL}/api/pins/user`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSavedPlaces(data);
                }
            } catch (error) {
                console.error("Error fetching saved places:", error);
            }
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
        // console.log("Map clicked at:", e.lngLat);
        const features = e.target.queryRenderedFeatures(e.point, {
            layers: ["point"],
        });

        const { lat, lng } = e.lngLat;
        console.log("Map clicked at lat:", lat, "lng:", lng);

        const result = await reverseGeocode(lat, lng);
        console.log("Reverse geocode result:", result);

        // console.log("Features at click:", features);
        if (features && features.length > 0) {
            const feature = features[0];
            console.log("Clicked on feature:", result);
            const coords = (feature.geometry as any).coordinates;
            setSelectedPoint({
                id: feature.properties?.id,
                creatorID: feature.properties?.creatorID,
                longitude: coords[0],
                latitude: coords[1],
                title: feature.properties?.title || "",
                location: feature.properties?.location || "",
                message: feature.properties?.message || "No message",
                image: feature.properties?.image || "",
                color: feature.properties?.color || PIN_COLOR,
                email: feature.properties?.email || "",
                address: result,
            });

            setPinData(null); // Close any existing pin
            return;
        }

        // Otherwise, handle as a new pin creation
        setSelectedPoint(null);
        setPinData({
            lat,
            lng,
            address: result || "Unknown Location",
            isLoading: false,
            email: userEmail || "",
        });
    };



    const handleDiscoverClick = () => {
        // console.log('Discover button clicked');
        navigate("/explore");
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
                    message: f.properties.message,
                    image: f.properties.image,
                    color: f.properties.color,
                    email: f.properties.email
                }))}
                savedPlaces={savedPlaces.map((p: any) => ({
                    id: p.id,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    title: p.title || p.message, // Use message as fallback title
                    message: p.message,
                    image: p.image,
                    color: p.color || PIN_COLOR
                }))}
                isLoggedIn={isLoggedIn}
                isSearchFocused={isSearchFocused}
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
                                {userEmail.split("@")[0] || "Account"}
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
                            name={typeof pinData.address === "object" ? pinData.address?.name : (pinData.address || "Unknown Location")}
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
                                                message: data.message,
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
                        />
                    )}

                    {showDetailedModal && selectedPoint && (
                        <DetailedPinModal
                            selectedPoint={selectedPoint}
                            currentUserId={userId}
                            currentUserEmail={localStorage.getItem("userEmail")}
                            onClose={() => setShowDetailedModal(false)}
                            onUpdate={(updatedPoint) => {
                                setAllPins((prev) => ({
                                    type: "FeatureCollection",
                                    features: prev.features.map((f) => {
                                        if (f.properties.id === updatedPoint.id) {
                                            return {
                                                ...f,
                                                properties: {
                                                    ...f.properties,
                                                    message: updatedPoint.message,
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
                </Map>
            </div>
        </div>
    );
}

export default HomePage;
