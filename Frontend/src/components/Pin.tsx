import { Popup } from "react-map-gl/mapbox";
import "./Pin.css";

interface PinProps {
	name: string;
	latitude: number;
	longitude: number;
	onClose: () => void;
	onAdd?: () => void;
	onDetails?: () => void;
}

export default function Pin({ name, latitude, longitude, onClose, onAdd, onDetails }: PinProps) {
	return (
		<Popup
			onClose={onClose}
			longitude={longitude}
			latitude={latitude}
			anchor="bottom"
			closeButton={false}
			closeOnClick={false}
			className="pin-popup"
			offset={12}
		>
			<div className="pin-card">
				<div className="pin-header">
					<div className="pin-name">{name}</div>
					<button className="pin-close" onClick={onClose} aria-label="Close">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
				<div className="pin-divider"></div>
				<div className="pin-actions">
					<button className="pin-btn pin-btn--primary" onClick={onAdd} aria-label="Add to map">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path d="M12 5v14M5 12h14" />
						</svg>
						<span>Add</span>
					</button>
					<button className="pin-btn" onClick={onDetails} aria-label="View details">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
						</svg>
						<span>Details</span>
					</button>
				</div>
			</div>
		</Popup>
	);
}
