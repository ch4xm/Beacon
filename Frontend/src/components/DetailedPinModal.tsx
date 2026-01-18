import { useState, useRef, useEffect } from "react";
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
  accountID: number;
  pinID: number;
  email: string;
  comment: string;
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

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch comments when modal opens
  useEffect(() => {
    if (selectedPoint.id) {
      fetchComments();
    }
  }, [selectedPoint.id]);

  const fetchComments = async () => {
    if (!selectedPoint.id) return;

    setIsLoadingComments(true);
    try {
      const response = await fetch(
        `${BASE_API_URL}/api/pins/${selectedPoint.id}/comments`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        console.error("Failed to fetch comments");
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedPoint.id) return;

    if (newComment.length > 280) {
      alert("Comment must be 280 characters or less");
      return;
    }

    setIsSubmittingComment(true);
    try {
      const response = await fetch(
        `${BASE_API_URL}/api/pins/${selectedPoint.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({ comment: newComment.trim() }),
        }
      );

      if (response.ok) {
        const newCommentData = await response.json();
        setComments([newCommentData, ...comments]);
        setNewComment("");
      } else {
        let errorMessage = "Failed to post comment";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = `Failed to post comment (${response.status})`;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      alert("Failed to post comment. Please check your connection.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Delete this comment?")) return;

    try {
      const response = await fetch(
        `${BASE_API_URL}/api/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      } else {
        alert("Failed to delete comment");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    }
  };

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
                      maxLength={280}
                      disabled={isSubmittingComment}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <button
                      className="comment-submit-btn"
                      disabled={!newComment.trim() || isSubmittingComment}
                      onClick={handleSubmitComment}
                    >
                      {isSubmittingComment ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="spinning"
                        >
                          <line x1="12" y1="2" x2="12" y2="6"></line>
                          <line x1="12" y1="18" x2="12" y2="22"></line>
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                          <line x1="2" y1="12" x2="6" y2="12"></line>
                          <line x1="18" y1="12" x2="22" y2="12"></line>
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                      ) : (
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
                      )}
                    </button>
                  </div>
                </div>

                {/* Loading State */}
                {isLoadingComments && (
                  <div className="comments-loading">Loading comments...</div>
                )}

                {/* Empty State */}
                {!isLoadingComments && comments.length === 0 && (
                  <div className="comments-empty">
                    No comments yet. Be the first to comment!
                  </div>
                )}

                {/* Comments List */}
                {!isLoadingComments && comments.length > 0 && (
                  <div className="comments-list">
                    {(showAllComments ? comments : comments.slice(0, 2)).map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-avatar">
                          {comment.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <span className="comment-author">
                              {comment.email.split('@')[0]}
                            </span>
                            <span className="comment-time">
                              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="comment-text">{comment.comment}</p>
                          {currentUserEmail === comment.email && (
                            <div className="comment-actions">
                              <button
                                className="comment-action-btn delete"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24\" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
