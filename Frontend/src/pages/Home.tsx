import { useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import "./Home.css";
import AuthModal from "@/components/AuthModal";
import SearchBar from "@/components/SearchBar";
import Map, { GeolocateControl } from "react-map-gl/mapbox";
import Pin from "@/components/Pin";
import { reverseGeocode } from "@/utils/geocoding";

interface PinData {
    lat: number;
    lng: number;
    name: string;
    isLoading: boolean;
}

function HomePage() {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const [pinData, setPinData] = useState<PinData | null>(null);

    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
        return !!localStorage.getItem("accessToken");
    });

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        setIsLoggedIn(false);
    };

    const handleAuthSuccess = () => {
        setIsLoggedIn(true);
    };

    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
        const { lat, lng } = e.lngLat;

        // Set initial pin with loading state
        setPinData({
            lat,
            lng,
            name: 'Loading...',
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
            console.error('Reverse geocoding failed:', error);
            setPinData({
                lat,
                lng,
                name: 'Unknown Location',
                isLoading: false,
            });
        }
    };

    return (
        <div className="home-container">
            <SearchBar
                mapRef={mapRef}
                searchMarkerRef={searchMarkerRef}
                onSelectPlace={(place) =>
                    setPinData({ lat: place.lat, lng: place.lng, name: place.name ?? 'Unknown Location', isLoading: false })
                }
            />

            <AuthModal isOpen={!isLoggedIn} onAuthSuccess={handleAuthSuccess} />

            {isLoggedIn && (
                <button onClick={handleLogout} className="logout-button">
                    Log Out
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
                interactive={true}
                doubleClickZoom={true}
            >
                <GeolocateControl
                    position="bottom-right"
                    trackUserLocation
                    showUserHeading
                />
                {pinData && (
                    <Pin
                        name={pinData.name}
                        latitude={pinData.lat}
                        longitude={pinData.lng}
                        isLoading={pinData.isLoading}
                        onClose={() => setPinData(null)}
                        onDetails={() => console.log("Details clicked")}
                    />
                )}
            </Map>
        </div>
    );
}

export default HomePage;
