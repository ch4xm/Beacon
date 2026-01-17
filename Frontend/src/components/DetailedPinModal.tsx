import { useState, useRef } from "react";
import "./styles/DetailedPinModal.css";

interface DetailedPinModalProps {
    selectedPoint: {
        id?: number;
        creatorID?: number;
        latitude: number;
        longitude: number;
        title?: string;
        message: string;
        image: string;
        color?: string;
        email?: string;
    };
    currentUserId: number | null;
    currentUserEmail: string | null;
    onClose: () => void;
    onUpdate?: (data: {
        id: number;
        message: string;
        image: string;
        color?: string;
    }) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB limit

export default function DetailedPinModal({
    selectedPoint,
    currentUserId,
    currentUserEmail,
    onClose,
    onUpdate,
}: DetailedPinModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState(selectedPoint.message);
    const [color, setColor] = useState(selectedPoint.color || "#007cbf");
    const [image, setImage] = useState(selectedPoint.image);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // const isOwner =
    //     currentUserId != null &&
    //     selectedPoint.creatorID != null &&
    //     Number(currentUserId) === Number(selectedPoint.creatorID);

    const isOwner =
        currentUserEmail != null && selectedPoint.email == currentUserEmail;

    const titleText =
        selectedPoint.title?.trim() ||
        selectedPoint.message?.trim() ||
        "Untitled Pin";
    const messageText = selectedPoint.message?.trim() || "";
    const showMessage = messageText && messageText !== titleText;

    // console.log( isOwner )
    // console.log( currentUserEmail )
    // console.log( currentUserId )
    // console.log (selectedPoint.email )

    const handleFileSelect = (file: File) => {
        setUploadError(null);
        if (!ALLOWED_TYPES.includes(file.type)) {
            setUploadError("Invalid file type");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setUploadError("File too large");
            return;
        }
        setImageFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const uploadImage = async (file: File): Promise<string> => {
        const response = await fetch(
            `/api/upload?filename=${encodeURIComponent(file.name)}`,
            {
                method: "POST",
                body: file,
            },
        );
        if (!response.ok) throw new Error("Upload failed");
        const blob = await response.json();
        return blob.url;
    };

    const handleSave = async () => {
        if (!selectedPoint.id) return;
        setIsSaving(true);

        try {
            let finalImageUrl = image;
            if (imageFile) {
                finalImageUrl = await uploadImage(imageFile);
            }

            const response = await fetch(
                `http://localhost:3000/api/pins/${selectedPoint.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    },
                    body: JSON.stringify({
                        message,
                        image: finalImageUrl,
                        color,
                    }),
                },
            );

            if (response.ok) {
                const updatedPin = await response.json();
                onUpdate?.({
                    id: selectedPoint.id,
                    message: updatedPin.message || message,
                    image: updatedPin.image || finalImageUrl,
                    color: updatedPin.color || color,
                });
                setIsEditing(false);
            } else {
                console.error("Failed to update pin");
            }
        } catch (error) {
            console.error("Error updating pin:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="detailed-modal-overlay" onClick={onClose}>
            <div
                className="detailed-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="detailed-modal-header">
                    <h2>{isEditing ? "Edit Pin" : "Pin Details"}</h2>
                    <button
                        className="detailed-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="detailed-modal-content">
                    {isEditing ? (
                        <div className="edit-form">
                            {image && (
                                <div className="image-preview-container">
                                    <img
                                        src={image}
                                        alt="Preview"
                                        className="detailed-modal-image"
                                    />
                                    <button
                                        className="remove-image-btn"
                                        onClick={() => {
                                            setImage("");
                                            setImageFile(null);
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            <div className="file-input-wrapper">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) =>
                                        e.target.files?.[0] &&
                                        handleFileSelect(e.target.files[0])
                                    }
                                    accept="image/*"
                                />
                            </div>
                            {uploadError && (
                                <div className="error-message">
                                    {uploadError}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="edit-textarea"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {selectedPoint.image && (
                                <img
                                    src={selectedPoint.image}
                                    alt="Pin location"
                                    className="detailed-modal-image"
                                />
                            )}

                            <div className="detailed-info-section">
                                <h3>Title</h3>
                                <p className="detailed-message">
                                    {titleText}
                                </p>
                            </div>

                            {showMessage && (
                                <div className="detailed-info-section">
                                    <h3>Description</h3>
                                    <p className="detailed-message">
                                        {messageText}
                                    </p>
                                </div>
                            )}

                            {selectedPoint.email && (
                                <div className="detailed-info-section">
                                    <h3>Uploaded by</h3>
                                    <p className="detailed-message">
                                        {selectedPoint.email}
                                    </p>
                                </div>
                            )}

                            <div className="detailed-info-section">
                                <h3>Location</h3>
                                <div className="location-details">
                                    <div className="detail-item">
                                        <span className="detail-label">
                                            Latitude
                                        </span>
                                        <span className="detail-value">
                                            {selectedPoint.latitude.toFixed(6)}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">
                                            Longitude
                                        </span>
                                        <span className="detail-value">
                                            {selectedPoint.longitude.toFixed(6)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="detailed-modal-actions">
                        {isEditing ? (
                            <>
                                <button
                                    className="action-button secondary"
                                    onClick={() => setIsEditing(false)}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="action-button primary"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="action-button secondary"
                                    onClick={onClose}
                                >
                                    Close
                                </button>

                                {isOwner ? (
                                    <button
                                        className="action-button primary"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Edit Pin
                                    </button>
                                ) : (
                                    <a
                                        href={`https://www.google.com/maps/?q=${selectedPoint.latitude},${selectedPoint.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="action-button primary"
                                    >
                                        Open in Google Maps
                                    </a>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
