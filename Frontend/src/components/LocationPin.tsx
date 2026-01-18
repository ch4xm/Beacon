import { Popup } from "react-map-gl/mapbox";
import "./styles/LocationPin.css";
import { PIN_COLOR, BASE_API_URL } from "../../constants";
import { SelectedPoint } from "@/pages/Home";
import { useEffect, useState } from "react";

interface LocationPinProps {
	selectedPoint: SelectedPoint;
	setSelectedPoint: (a: any) => void;
	onShowDetails: () => void;
}

function PopupButton({ onClick, color, content }: { onClick: () => void, color: string, content: any }) {
	return (
		<button
			className="location-popup-button"
			onClick={onClick}
			style={{ backgroundColor: color }}
			onMouseEnter={(e) =>
				(e.currentTarget.style.opacity = "0.9")
			}
			onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
		>
			{content}
		</button>
	)
}

export default function LocationPin({ selectedPoint, setSelectedPoint, onShowDetails }: LocationPinProps) {
	const titleText = selectedPoint.title?.trim() || selectedPoint.description?.trim() || "Untitled Pin";
	const messageText = selectedPoint.description?.trim() || "";
	const showMessage = messageText && messageText !== titleText;
	const descriptionPreview = messageText.length > 50 ? `${messageText.slice(0, 50).trimEnd()}...` : messageText;

	const [likes, setLikes] = useState<number>(0);

	useEffect(() => {
		fetch(`${BASE_API_URL}/api/likes/${selectedPoint.id}`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem("accessToken")}`
			}
		})
		.then(res => res.json())
		.then(res => setLikes(res.likes));
	}, [selectedPoint])

	const onLike = () => {
		setLikes(prev => prev + 1);
		fetch(`${BASE_API_URL}/api/likes/${selectedPoint.id}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${localStorage.getItem("accessToken")}`
			}
		});
	}

	const onDislike = () => {
		setLikes(prev => prev - 1);
		fetch(`${BASE_API_URL}/api/likes/${selectedPoint.id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${localStorage.getItem("accessToken")}`
			}
		});
	}

	return (
		<Popup
			longitude={selectedPoint.longitude}
			latitude={selectedPoint.latitude}
			anchor="bottom"
			closeButton={true}
			closeOnClick={false}
			onClose={() => setSelectedPoint(null)}
			className="location-pin-popup"
		>
			<div style={{ maxWidth: "220px" }}>
				<div
					style={{
						margin: "0 4px 8px 4px",
						fontWeight: "700",
						color: "#1a1a1a",
						fontSize: "16px",
						lineHeight: "1.4",
					}}
				>
					{titleText}
				</div>
				{selectedPoint.image && (
					<img
						src={selectedPoint.image}
						alt="Pin image"
						style={{
							width: "100%",
							height: "140px",
							objectFit: "cover",
							borderRadius: "14px",
							marginBottom: "10px",
						}}
					/>
				)}
				{showMessage && (
					<p
						style={{
							margin: "0 4px 8px 4px",
							fontWeight: "500",
							color: "#6b7280",
							fontSize: "14px",
							lineHeight: "1.4",
						}}
					>
						{descriptionPreview}
					</p>
				)}
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
					<PopupButton
						color={selectedPoint.color || PIN_COLOR}
						content={"ℹ️"}
						onClick={onShowDetails}
					/>
					<PopupButton
						color={selectedPoint.color || PIN_COLOR}
						content={`${likes}❤️`}
						onClick={onLike}
					/>
				</div>
			</div>
		</Popup>
	);
}
