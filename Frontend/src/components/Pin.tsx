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
		>
			<div className="pin-card">
				<div className="pin-name">{name}</div>
				<div className="pin-divider"></div>
				<div className="pin-actions">
					<button className="pin-btn" onClick={onAdd} aria-label="Add">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
							<line x1="12" y1="5" x2="12" y2="19"></line>
							<line x1="5" y1="12" x2="19" y2="12"></line>
						</svg>
					</button>
					<button className="pin-btn" onClick={onDetails} aria-label="Details">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
							<rect x="4" y="3" width="16" height="18" rx="2"></rect>
							<line x1="8" y1="8" x2="16" y2="8"></line>
							<line x1="8" y1="12" x2="16" y2="12"></line>
							<line x1="8" y1="16" x2="12" y2="16"></line>
						</svg>
					</button>
				</div>
			</div>
		</Popup>
	);
}