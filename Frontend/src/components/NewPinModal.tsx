import { useState, useRef } from "react";
import "./NewPinModal.css";

interface NewPinModalProps {
	onClose: () => void;
	onSubmit: (data: { message: string; image?: string; color?: string }) => void;
	latitude: number;
	longitude: number;
}

const COLOR_PRESETS = [
	"#2d6a4f", // Green (brand)
	"#1a1a1a", // Black
	"#e07a5f", // Coral
	"#3d5a80", // Blue
	"#9c6644", // Brown
];

const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB limit for Vercel Blob
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function NewPinModal({ onClose, onSubmit, latitude, longitude }: NewPinModalProps) {
	const [message, setMessage] = useState("");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [color, setColor] = useState("#2d6a4f");
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = (file: File) => {
		setUploadError(null);

		if (!ALLOWED_TYPES.includes(file.type)) {
			setUploadError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			setUploadError('Image must be less than 4.5MB');
			return;
		}

		setImageFile(file);
		
		// Create preview
		const reader = new FileReader();
		reader.onload = (e) => {
			setImagePreview(e.target?.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const removeImage = () => {
		setImageFile(null);
		setImagePreview(null);
		setUploadError(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const uploadImage = async (file: File): Promise<string> => {
		const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
			method: 'POST',
			body: file,
		});

		if (!response.ok) {
			throw new Error('Upload failed');
		}

		const blob = await response.json();
		return blob.url;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsUploading(true);
		setUploadError(null);

		try {
			let imageUrl: string | null = null;

			// Upload image if one is selected
			if (imageFile) {
				imageUrl = await uploadImage(imageFile);
			}

			const response = await fetch('http://localhost:3000/api/pins', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.getItem("accessToken")}`
				},
				body: JSON.stringify({
					latitude: latitude,
					longitude: longitude,
					message: message,
					image: imageUrl,
					color: color
				})
			});

			if (response.ok) {
				onSubmit({ message, image: imageUrl || undefined, color });
				setMessage("");
				setImageFile(null);
				setImagePreview(null);
				setColor("#2d6a4f");
				onClose();
			}
		} catch (error) {
			console.error('Error creating pin:', error);
			setUploadError('Failed to upload image. Please try again.');
		} finally {
			setIsUploading(false);
		}
	};

	const formatCoordinate = (coord: number, isLat: boolean) => {
		const direction = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
		return `${Math.abs(coord).toFixed(4)}° ${direction}`;
	};

	return (
		<div className="pin-modal-overlay" onClick={onClose}>
			<div className="pin-modal" onClick={(e) => e.stopPropagation()}>
				<header className="pin-modal__header">
					<button className="pin-modal__close" onClick={onClose} aria-label="Close modal">
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
						</svg>
					</button>
					<svg className="pin-modal__logo" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="40" cy="40" r="36" stroke="#2d6a4f" strokeWidth="2" fill="#e9f5e9" />
						<path d="M40 20C32 20 26 28 26 36C26 48 40 60 40 60C40 60 54 48 54 36C54 28 48 20 40 20Z" fill="#2d6a4f" />
						<circle cx="40" cy="35" r="6" fill="#faf9f7" />
					</svg>
					<h2 className="pin-modal__title">Drop a Pin</h2>
					<p className="pin-modal__subtitle">Share a spot you love with the community</p>
					<div className="pin-modal__location">
						<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
						</svg>
						<span>{formatCoordinate(latitude, true)}, {formatCoordinate(longitude, false)}</span>
					</div>
				</header>

				<form onSubmit={handleSubmit} className="pin-modal__form">
					<div className="pin-modal__field">
						<label htmlFor="message" className="pin-modal__label">
							What's here?
							<span className="pin-modal__label-hint">*required</span>
						</label>
						<textarea
							id="message"
							className="pin-modal__textarea"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Describe this spot... A hidden cafe, scenic viewpoint, local market?"
							required
							rows={4}
						/>
					</div>

					<div className="pin-modal__field">
						<label className="pin-modal__label">
							Photo
							<span className="pin-modal__label-hint">optional</span>
						</label>
						
						{imagePreview ? (
							<div className="pin-modal__image-preview">
								<img src={imagePreview} alt="Preview" />
								<button 
									type="button" 
									className="pin-modal__image-remove"
									onClick={removeImage}
									aria-label="Remove image"
								>
									<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
									</svg>
								</button>
							</div>
						) : (
							<div 
								className={`pin-modal__upload-area ${isDragging ? 'pin-modal__upload-area--dragging' : ''}`}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								onClick={() => fileInputRef.current?.click()}
							>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/gif,image/webp"
									onChange={handleFileChange}
									className="pin-modal__file-input"
								/>
								<svg className="pin-modal__upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
									<path d="M12 4L12 14M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
								<span className="pin-modal__upload-text">
									<strong>Click to upload</strong> or drag and drop
								</span>
								<span className="pin-modal__upload-hint">JPEG, PNG, GIF or WebP (max 4.5MB)</span>
							</div>
						)}
						
						{uploadError && (
							<span className="pin-modal__error">{uploadError}</span>
						)}
					</div>

					<div className="pin-modal__field">
						<label className="pin-modal__label">Pin Color</label>
						<div className="pin-modal__color-field">
							<input
								type="color"
								className="pin-modal__color-input"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								aria-label="Choose custom color"
							/>
							<div className="pin-modal__color-presets">
								{COLOR_PRESETS.map((preset) => (
									<button
										key={preset}
										type="button"
										className={`pin-modal__color-preset ${color === preset ? 'pin-modal__color-preset--active' : ''}`}
										style={{ background: preset }}
										onClick={() => setColor(preset)}
										aria-label={`Select color ${preset}`}
									/>
								))}
							</div>
						</div>
					</div>

					<div className="pin-modal__actions">
						<button type="button" onClick={onClose} className="pin-modal__btn pin-modal__btn--secondary" disabled={isUploading}>
							Cancel
						</button>
						<button type="submit" className="pin-modal__btn pin-modal__btn--primary" disabled={isUploading}>
							{isUploading ? (
								<>
									<span className="pin-modal__spinner"></span>
									Uploading...
								</>
							) : (
								'Drop Pin'
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
