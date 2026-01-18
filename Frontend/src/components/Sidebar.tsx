import { useState, useEffect, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "./styles/Sidebar.css";
import { PIN_COLOR } from "../../constants";

const KM_TO_MILES = 0.621371;

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
    isSearchFocused: boolean;
}


export default function Sidebar({ mapRef, allPins, savedPlaces, isLoggedIn, isSearchFocused }: SidebarProps) {
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
            .filter(pin => (pin.distance * KM_TO_MILES) < 100)
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
            <ul className="sidebar-pin-list">
                {pins.map((pin, idx) => {
                    const titleText = pin.title?.trim() || pin.message?.trim() || "Untitled Pin";
                    const messageText = pin.message?.trim() || "";
                    const showMessage = messageText && messageText !== titleText;

                    return (
                        <li key={pin.id || idx} className="sidebar-pin-card" onClick={() => handlePinClick(pin)}>
                            <div className="sidebar-pin-card-header">
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <div
                                        className="sidebar-pin-color-dot"
                                        style={{ backgroundColor: pin.color || PIN_COLOR }}
                                    />
                                    <span className="sidebar-pin-card-title">{titleText}</span>
                                </div>
                                {pin.distance !== undefined && (pin.distance * KM_TO_MILES) < 100 && (() => {
                                    const distanceInMiles = pin.distance * KM_TO_MILES;
                                    return (
                                        <span className="sidebar-pin-card-distance">
                                            {distanceInMiles < 0.1
                                                ? `${(distanceInMiles * 5280).toFixed(0)}ft`
                                                : `${distanceInMiles.toFixed(1)}mi`}
                                        </span>
                                    );
                                })()}
                            </div>
                            {showMessage && <p className="sidebar-pin-card-message">{messageText}</p>}
                            {pin.image && <img src={pin.image} alt={titleText} className="sidebar-pin-card-image" />}
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <aside className={`sidebar-container ${isSearchFocused ? "collapsed" : ""}`}>
            {/* <header className="sidebar-header">
                <h2>Beacon</h2>
            </header> */}

            <div className="sidebar-content">
                <div
                    className="sidebar-slider"
                    style={{ transform: `translateX(${activeTab === "discovery" ? "0%" : "-50%"})` }}
                >
                    <div className="sidebar-panel">
                        {renderPinList(nearbyPins)}
                    </div>
                    <div className="sidebar-panel">
                        {!isLoggedIn ? (
                            <div className="empty-state">
                                <p>Log in to see your saved places</p>
                            </div>
                        ) : renderPinList(savedPlaces)}
                    </div>
                </div>
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
