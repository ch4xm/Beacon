import { useState } from "react";
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

export default function NewPinModal({ onClose, onSubmit, latitude, longitude }: NewPinModalProps) {
	const [message, setMessage] = useState("");
	const [image, setImage] = useState("");
	const [color, setColor] = useState("#2d6a4f");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		fetch('http://localhost:3000/api/pins', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem("accessToken")}`
			},
			body: JSON.stringify({
				latitude: latitude,
				longitude: longitude,
				message: message,
				image: image,
				color: color
			})
		}).then(res => {
			if (res.ok) {
				onSubmit({ message, image: image || undefined, color });
				setMessage("");
				setImage("");
				setColor("#2d6a4f");
				onClose();
			}
		})
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
						<label htmlFor="image" className="pin-modal__label">
							Photo URL
							<span className="pin-modal__label-hint">optional</span>
						</label>
						<input
							type="url"
							id="image"
							className="pin-modal__input"
							value={image}
							onChange={(e) => setImage(e.target.value)}
							placeholder="https://example.com/photo.jpg"
						/>
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
						<button type="button" onClick={onClose} className="pin-modal__btn pin-modal__btn--secondary">
							Cancel
						</button>
						<button type="submit" className="pin-modal__btn pin-modal__btn--primary">
							Drop Pin
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
