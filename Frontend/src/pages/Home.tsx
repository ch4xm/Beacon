import { useRef, useState, useEffect, useCallback } from "react";
import "./Home.css";
import AuthModal from "@/components/AuthModal";
import SearchBar from "@/components/SearchBar";
import SavedPlacesPanel from "@/components/SavedPlacesPanel";
import Map, {
    GeolocateControl,
    NavigationControl,
    Popup,
} from "react-map-gl/mapbox";
import { Source, Layer, CircleLayerSpecification } from "react-map-gl/mapbox";
import { FeatureCollection } from "geojson";
import Pin from "@/components/Pin";
import { reverseGeocode } from "@/utils/geocoding";
import LocationPin from "@/components/LocationPin";
import DetailedPinModal from "@/components/DetailedPinModal";
import { NavLink, useNavigate } from "react-router";

const layerStyle: CircleLayerSpecification = {
    id: "point",
    type: "circle",
    source: "my-data",
    paint: {
        "circle-radius": 10,
        "circle-color": "#007cbf",
    },
    maxzoom: 22,
    minzoom: 5,
};

const heatmapLayerStyle = {
    id: "pins-heat",
    type: "heatmap",
    source: "my-data",
    maxzoom: 9,
    minzoom: 0,
    paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["zoom"], 0, 0, 9, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
        "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(33,102,172,0)",
            0.2,
            "rgb(103,169,207)",
            0.4,
            "rgb(209,229,240)",
            0.6,
            "rgb(253,219,199)",
            0.8,
            "rgb(239,138,98)",
            1,
            "rgb(178,24,43)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
    },
};

const geojson: FeatureCollection = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [-122.4, 37.8],
            },
            properties: {
                title: "915 Front Street, San Francisco, California",
            },
        },
    ],
};

interface PinData {
    lat: number;
    lng: number;
    name: string;
    isLoading: boolean;
}

interface SelectedPoint {
    id?: number;
    creatorID?: number;
    longitude: number;
    latitude: number;
    title?: string;
    message: string;
    image: string;
    color: string;
    email?: string;
}

function HomePage() {
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
                message: string;
                image: string;
                color: string;
                email?: string;
            };
        }>;
    }>({
        type: "FeatureCollection",
        features: [],
    });
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
        return !!localStorage.getItem("accessToken");
    });
    const [cursor, setCursor] = useState<string>("auto");
    const [userEmail, setUserEmail] = useState<string>(() => {
        const email = localStorage.getItem("userEmail");
        console.log("Initial userEmail from localStorage:", email);
        return email || "";
    });
    const [userId, setUserId] = useState<number | null>(() => {
        const id = localStorage.getItem("userId");
        return id ? parseInt(id) : null;
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

    const onMouseEnter = useCallback(() => setCursor("pointer"), []);
    const onMouseLeave = useCallback(() => setCursor("auto"), []);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchPins = async () => {
            try {
                const token = localStorage.getItem("accessToken");
                const headers: HeadersInit = {};

                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }

                const res = await fetch("http://localhost:3000/api/pins", {
                    headers,
                });

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
                            creatorID: p.creatorID,
                            title: p.title,
                            message: p.message,
                            image: p.image,
                            color: p.color,
                            email: p.email,
                        },
                    })),
                };
                setAllPins(geojson);
            } catch (error) {
                console.error("Error fetching pins:", error);
            }
        };

        fetchPins();
    }, [isLoggedIn]);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userId");
        setIsLoggedIn(false);
        setUserEmail("");
        setUserId(null);
        setIsDropdownOpen(false);
    };

    const handleAuthSuccess = () => {
        setIsLoggedIn(true);
        setUserEmail(localStorage.getItem("userEmail") || "");
        const storedId = localStorage.getItem("userId");
        if (storedId) setUserId(parseInt(storedId));
    };

    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
        // Check if we clicked on a point feature
        const features = e.target.queryRenderedFeatures(e.point, {
            layers: ["point"],
        });

        if (features && features.length > 0) {
            const feature = features[0];
            const coords = (feature.geometry as any).coordinates;
            setSelectedPoint({
                id: feature.properties?.id,
                creatorID: feature.properties?.creatorID,
                longitude: coords[0],
                latitude: coords[1],
                title: feature.properties?.title || "",
                message: feature.properties?.message || "No message",
                image: feature.properties?.image || "",
                color: feature.properties?.color || "#007cbf",
                email: feature.properties?.email || "",
            });
            setPinData(null); // Close any existing pin
            return;
        }

        // Otherwise, handle as a new pin creation
        setSelectedPoint(null);
        const { lat, lng } = e.lngLat;
        setPinData({
            lat,
            lng,
            name: "Loading...",
            isLoading: true,
        });

        try {
            const result = await reverseGeocode(lat, lng);

            setPinData({
                lat,
                lng,
                name: result.name,
                isLoading: false,
            });
        } catch (error) {
            setPinData({
                lat,
                lng,
                name: "Unknown Location",
                isLoading: false,
            });
        }
    };

    

    const handleDiscoverClick = () => {
        // console.log('Discover button clicked');
        navigate("/explore");
    };

    return (
        <div className="home-container">
            <div className="search-container">
                <SearchBar
                    mapRef={mapRef}
                    searchMarkerRef={searchMarkerRef}
                    onSelectPlace={(place) =>
                        setPinData({
                            lat: place.lat,
                            lng: place.lng,
                            name: place.name ?? "Unknown Location",
                            isLoading: false,
                        })
                    }
                />
                <button className="discover-button" onClick={handleDiscoverClick}>
                    Discover
                </button>
            </div>

            <SavedPlacesPanel />

            <AuthModal isOpen={!isLoggedIn} onAuthSuccess={handleAuthSuccess} />

            {isLoggedIn && (
                <div className="user-menu">
                    <button
                        className="user-menu-toggle"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <span className="user-email">
                            {userEmail || "Account"}
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
                        name={pinData.name}
                        latitude={pinData.lat}
                        longitude={pinData.lng}
                        isLoading={pinData.isLoading}
                        onClose={() => setPinData(null)}
                        onDetails={() => console.log("Details clicked")}
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
                                            message: data.message,
                                            image: data.image || "",
                                            color: data.color || "#007cbf",
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

                <Source id="my-data" type="geojson" data={allPins}>
                    <Layer {...layerStyle} />
                    <Layer {...heatmapLayerStyle} />
                </Source>
            </Map>
        </div>
    );
}

export default HomePage;
