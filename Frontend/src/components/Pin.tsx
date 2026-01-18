import { useState } from "react";
import { Popup } from "react-map-gl/mapbox";
import NewPinModal from "./NewPinModal";
import "./styles/Pin.css";

interface PinProps {
    name: string;
    latitude: number;
    longitude: number;
    isLoading?: boolean;
    onClose: () => void;
    onDetails?: () => void;
    onPinCreated?: (data: {
        title: string;
        message: string;
        image?: string;
        color?: string;
    }) => void;
}

export default function Pin({
    name,
    latitude,
    longitude,
    isLoading,
    onClose,
    onDetails,
    onPinCreated,
}: PinProps) {
    // console.log("[Pin.tsx]   " + latitude);
    // console.log("[Pin.tsx]   " + longitude);

    const [modalIsOpen, setModalOpen] = useState<boolean>(false);

    const onAdd = () => {
        setModalOpen(true);
        console.log("open");
    };

    return (
        <>
            <Popup
                onClose={onClose}
                longitude={longitude}
                latitude={latitude}
                anchor="bottom"
                closeButton={false}
                closeOnClick={false}
                className="pin-popup"
            >
                <div className="pin-card">
                    <div className="pin-header">
                        <div
                            className={`pin-name ${isLoading ? "pin-name-loading" : ""}`}
                        >
                            {isLoading ? (
                                <span className="loading-text">Loading...</span>
                            ) : (
                                name
                            )}
                        </div>
                        <button
                            className="pin-add-btn"
                            onClick={onAdd}
                            aria-label="Add"
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </Popup>
            {modalIsOpen && (
                <NewPinModal
                    latitude={latitude}
                    longitude={longitude}
                    locationName={name}
                    onClose={() => setModalOpen(false)}
                    onSubmit={(data) => {
                        onPinCreated?.(data);
                        setModalOpen(false);
                    }}
                />
            )}
        </>
    );
}
