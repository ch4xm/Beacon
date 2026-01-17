import { useState } from "react";
// import "./NewPinModal.css";

interface NewPinModalProps {
	onClose: () => void;
	onSubmit: (data: { message: string; image?: string; color?: string }) => void;
}

export default function NewPinModal({ onClose, onSubmit }: NewPinModalProps) {
	const [message, setMessage] = useState("");
	const [image, setImage] = useState("");
	const [color, setColor] = useState("#667eea");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({ message, image: image || undefined, color });
		setMessage("");
		setImage("");
		setColor("#667eea");
		onClose();
	};

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2>Create New Pin</h2>
					<button className="modal-close" onClick={onClose}>×</button>
				</div>

				<form onSubmit={handleSubmit} className="modal-form">
					<div className="form-group">
						<label htmlFor="message">Message *</label>
						<textarea
							id="message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="What's happening?"
							required
							rows={4}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="image">Image URL</label>
						<input
							type="url"
							id="image"
							value={image}
							onChange={(e) => setImage(e.target.value)}
							placeholder="https://example.com/image.jpg"
						/>
					</div>

					<div className="form-group">
						<label htmlFor="color">Pin Color</label>
						<input
							type="color"
							id="color"
							value={color}
							onChange={(e) => setColor(e.target.value)}
						/>
					</div>

					<div className="modal-actions">
						<button type="button" onClick={onClose} className="btn-secondary">
							Cancel
						</button>
						<button type="submit" className="btn-primary">
							Create Pin
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}