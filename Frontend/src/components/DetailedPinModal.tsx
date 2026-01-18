import { useState, useRef } from "react";
import "./styles/DetailedPinModal.css";
import { BASE_API_URL, PIN_COLOR } from '../../constants';
import { ReverseGeocodeResult } from "@/utils/geocoding";

interface DetailedPinModalProps {
    selectedPoint: {
        id?: number;
        creatorID?: number;
        latitude: number;
        longitude: number;
        title?: string;
        message: string;
        image: string;
        email?: string;
        address?: ReverseGeocodeResult;
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

interface Comment {
    id: number;
    userId: number;
    userEmail: string;
    text: string;
    createdAt: string;
}

export default function DetailedPinModal({
    selectedPoint,
    currentUserId,
    currentUserEmail,
    onClose,
    onUpdate,
}: DetailedPinModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState(selectedPoint.message);
    const [image, setImage] = useState(selectedPoint.image);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Comments state (GUI only, no functionality)
    const [comments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [showAllComments, setShowAllComments] = useState(false);

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
                `${BASE_API_URL}/api/pins/${selectedPoint.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    },
                    body: JSON.stringify({
                        message,
                        image: finalImageUrl,
                    }),
                },
            );

            if (response.ok) {
                const updatedPin = await response.json();
                onUpdate?.({
                    id: selectedPoint.id,
                    message: updatedPin.message || message,
                    image: updatedPin.image || finalImageUrl,
                    color: PIN_COLOR,
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
                                        {selectedPoint.email.split("@")[0]}
                                    </p>
                                </div>
                            )}

                            <div className="detailed-info-section">
                                <h3>Location</h3>
                                <div className="location-details" style={{ display: 'flex', justifyContent: 'center' }}>
                                    <div className="detail-item">
                                        <span className="detail-label">
                                            Address
                                        </span>
                                        <span className="detail-value">
                                            {selectedPoint.address?.fullAddress ||
                                                "Unknown Location"}
                                        </span>
                                    </div>
                                </div>
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

                            {/* Comments Section */}
                            <div className="detailed-info-section comments-section">
                                <h3>
                                    Comments
                                    <span className="comments-count">({comments.length})</span>
                                </h3>
                                
                                {/* Add Comment Input */}
                                <div className="add-comment-container">
                                    <div className="comment-avatar">
                                        {currentUserEmail?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div className="comment-input-wrapper">
                                        <textarea
                                            className="comment-input"
                                            placeholder="Add a comment..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            rows={1}
                                        />
                                        <button 
                                            className="comment-submit-btn"
                                            disabled={!newComment.trim()}
                                        >
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Comments List */}
                                <div className="comments-list">
                                    {(showAllComments ? comments : comments.slice(0, 2)).map((comment) => (
                                        <div key={comment.id} className="comment-item">
                                            <div className="comment-avatar">
                                                {comment.userEmail.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="comment-content">
                                                <div className="comment-header">
                                                    <span className="comment-author">
                                                        {comment.userEmail}
                                                    </span>
                                                    <span className="comment-time">
                                                        {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="comment-text">{comment.text}</p>
                                                <div className="comment-actions">
                                                    <button className="comment-action-btn">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                                        </svg>
                                                        Like
                                                    </button>
                                                    <button className="comment-action-btn">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                                        </svg>
                                                        Reply
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Show More/Less Button */}
                                {comments.length > 2 && (
                                    <button
                                        className="show-more-comments-btn"
                                        onClick={() => setShowAllComments(!showAllComments)}
                                    >
                                        {showAllComments 
                                            ? "Show less" 
                                            : `View all ${comments.length} comments`
                                        }
                                    </button>
                                )}
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
