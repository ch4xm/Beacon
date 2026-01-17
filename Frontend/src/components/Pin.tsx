import { Popup } from "react-map-gl/mapbox";
interface PinProps {
	content: string,
	latitude: number,
	longitude: number
}

export default function Pin({ content, latitude, longitude }: PinProps) {
	return (
		<Popup
			longitude={latitude}
			latitude={longitude}
			anchor="bottom"
			closeButton={false}
			closeOnClick={true}
			style={{
				padding: "12px 20px",
				borderRadius: "16px",
				background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
				boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 8px rgba(0, 0, 0, 0.1)",
				fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
				fontSize: "15px",
				fontWeight: "600",
				color: "#fff",
				textAlign: "center",
				letterSpacing: "0.3px",
				cursor: "pointer",
				transition: "all 0.3s ease",
				border: "2px solid rgba(255, 255, 255, 0.2)",
				backdropFilter: "blur(10px)",
			}}
		>
			{content}
		</Popup>
	);
};