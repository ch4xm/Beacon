import { useEffect, useState } from "react";
import "./styles/SavedPlacesPanel.css";
import { PIN_COLOR } from "constants";

interface SavedPlace {
    id: number;
    creatorID: number;
    latitude: number;
    longitude: number;
    message: string | null;
    image: string | null;
    color: string;
}

interface SavedPlacesPanelProps {
    mapRef: React.RefObject<mapboxgl.Map | null>;
}

function SavedPlacesPanel({ mapRef }: SavedPlacesPanelProps) {
    const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchSavedPlaces = async () => {
            try {
                const token = localStorage.getItem("accessToken");
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const res = await fetch("/api/pins/user", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    setSavedPlaces(data);
                } else {
                    console.error(
                        "Failed to fetch saved places - Status:",
                        res.status,
                        res.statusText,
                    );
                    const errorData = await res.text();
                    console.error("Error response:", errorData);
                }
            } catch (error) {
                console.error("Error fetching saved places:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSavedPlaces();
    }, []);

    if (!localStorage.getItem("accessToken")) {
        return null; // Don't show if not logged in
    }

    return (
        <div
            className={`saved-places-panel ${isExpanded ? "expanded" : "collapsed"}`}
        >
            <button
                className="panel-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Toggle Saved Places"
            >
                {isExpanded ? "-" : "+"}
            </button>

            {isExpanded && (
                <div className="panel-content">
                    <h3>Your Saved Places</h3>

                    {isLoading ? (
                        <p className="loading">Loading...</p>
                    ) : savedPlaces.length === 0 ? (
                        <p className="empty">No saved places yet</p>
                    ) : (
                        <ul className="places-list">
                            {savedPlaces.map((place) => (
                                <li
                                    key={place.id}
                                    className="place-item"
                                    onClick={() => {
                                        if (mapRef.current) {
                                            mapRef.current.flyTo({
                                                center: [place.longitude, place.latitude],
                                                zoom: 14,
                                                essential: true,
                                            });
                                        }
                                    }}
                                >
                                    <div className="place-header">
                                        <span
                                            className="place-color-indicator"
                                            style={{
                                                backgroundColor:
                                                    place.color || PIN_COLOR,
                                            }}
                                        />
                                        <span className="place-coords">
                                            {place.message}
                                        </span>
                                    </div>
                                    {place.message && (
                                        <span className="place-message">
                                            {place.latitude.toFixed(4)}°,{" "}
                                            {place.longitude.toFixed(4)}°

                                        </span>
                                    )}
                                    {place.image && (
                                        <div className="place-image-preview">
                                            <img
                                                src={place.image}
                                                alt="Pin location"
                                            />
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default SavedPlacesPanel;
