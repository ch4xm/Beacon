import { useState, useEffect, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "./styles/Sidebar.css";
import { PIN_COLOR } from "../../constants";

interface Pin {
    id?: number;
    latitude: number;
    longitude: number;
    title?: string;
    message: string;
    image: string;
    color: string;
    email?: string;
}

interface SidebarProps {
    mapRef: React.MutableRefObject<mapboxgl.Map | null>;
    allPins: Pin[];
    savedPlaces: Pin[];
    isLoggedIn: boolean;
}

export default function Sidebar({ mapRef, allPins, savedPlaces, isLoggedIn }: SidebarProps) {
    const [activeTab, setActiveTab] = useState<"discovery" | "saved">("discovery");
    const [mapCenter, setMapCenter] = useState<{ lng: number; lat: number }>({ lng: -122.4, lat: 37.8 });

    // Distance calculation (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    // Update map center when map moves
    useEffect(() => {
        if (!mapRef.current) return;

        const handleMove = () => {
            const center = mapRef.current?.getCenter();
            if (center) {
                setMapCenter({ lng: center.lng, lat: center.lat });
            }
        };

        mapRef.current.on("moveend", handleMove);
        // Initial center
        handleMove();

        return () => {
            mapRef.current?.off("moveend", handleMove);
        };
    }, [mapRef.current]);

    const nearbyPins = useMemo(() => {
        return allPins
            .map(pin => ({
                ...pin,
                distance: calculateDistance(mapCenter.lat, mapCenter.lng, pin.latitude, pin.longitude)
            }))
            .sort((a, b) => a.distance - b.distance);
    }, [allPins, mapCenter]);

    const handlePinClick = (pin: Pin) => {
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [pin.longitude, pin.latitude],
                zoom: 14,
                essential: true,
            });
        }
    };

    const renderPinList = (pins: (Pin & { distance?: number })[]) => {
        if (pins.length === 0) {
            return (
                <div className="empty-state">
                    <span className="empty-state-icon">📍</span>
                    <p>No places found</p>
                </div>
            );
        }

        return (
            <ul className="pin-list">
                {pins.map((pin, idx) => (
                    <li key={pin.id || idx} className="pin-card" onClick={() => handlePinClick(pin)}>
                        <div className="pin-card-header">
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <div
                                    className="pin-color-dot"
                                    style={{ backgroundColor: pin.color || PIN_COLOR }}
                                />
                                <span className="pin-card-title">{pin.title || "Untitled Point"}</span>
                            </div>
                            {pin.distance !== undefined && (
                                <span className="pin-card-distance">
                                    {pin.distance < 1
                                        ? `${(pin.distance * 1000).toFixed(0)}m`
                                        : `${pin.distance.toFixed(1)}km`}
                                </span>
                            )}
                        </div>
                        {pin.message && <p className="pin-card-message">{pin.message}</p>}
                        {pin.image && <img src={pin.image} alt={pin.title} className="pin-card-image" />}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <aside className="sidebar-container">
            {/* <header className="sidebar-header">
                <h2>Beacon</h2>
            </header> */}

            <div className="sidebar-content">
                {activeTab === "discovery" ? (
                    <>
                        {/* <h3 style={{ fontSize: "1rem", marginBottom: "16px", color: "#666" }}>Nearby Discovery</h3> */}
                        {renderPinList(nearbyPins)}
                    </>
                ) : (
                    <>
                        {/* <h3 style={{ fontSize: "1rem", marginBottom: "16px", color: "#666" }}>Saved Places</h3> */}
                        {!isLoggedIn ? (
                            <div className="empty-state">
                                <p>Log in to see your saved places</p>
                            </div>
                        ) : renderPinList(savedPlaces)}
                    </>
                )}
            </div>

            <nav className="sidebar-tabs">
                <button
                    className={`tab-button ${activeTab === "discovery" ? "active" : ""}`}
                    onClick={() => setActiveTab("discovery")}
                >
                    <span className="tab-icon">🌍</span>
                    <span className="tab-label">Discovery</span>
                </button>
                <button
                    className={`tab-button ${activeTab === "saved" ? "active" : ""}`}
                    onClick={() => setActiveTab("saved")}
                >
                    <span className="tab-icon">🔖</span>
                    <span className="tab-label">Saved</span>
                </button>
            </nav>
        </aside>
    );
}
