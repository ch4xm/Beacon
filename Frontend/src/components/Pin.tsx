import { useState } from "react";
import { Popup } from "react-map-gl/mapbox";
import NewPinModal from "./NewPinModal";
import "./Pin.css";

interface PinProps {
	name: string;
	latitude: number;
	longitude: number;
	isLoading?: boolean;
	onClose: () => void;
	onDetails?: () => void;
}

export default function Pin({ name, latitude, longitude, isLoading, onClose, onDetails }: PinProps) {
	const [modalIsOpen, setModalOpen] = useState<boolean>(false);

	const onAdd = () => {
		setModalOpen(true);
		console.log("open")
	}

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
						<div className={`pin-name ${isLoading ? "pin-name-loading" : ""}`}>
							{isLoading ? (
								<span className="loading-text">Loading...</span>
							) : (
								name
							)}
						</div>
						<button className="pin-close" onClick={onClose} aria-label="Close">
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
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>
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
			{modalIsOpen &&
				<NewPinModal
					onClose={() => setModalOpen(false)}
					onSubmit={() => console.log("submit")}
				/>
			}
		</>
	);
}
