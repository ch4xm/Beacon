import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { createPortal } from "react-dom";

interface PinProps {
	map: mapboxgl.Map,
	latitude: number,
	longitude: number,
	content: string
}

export default function Pin({ map, latitude, longitude, content }: PinProps) {
	const markerRef = useRef<mapboxgl.Marker|null>(null);
	const contentRef = useRef(document.createElement("div"));

	useEffect(() => {
		markerRef.current = new mapboxgl.Marker(contentRef.current)
			.setLngLat([longitude, latitude])
			.addTo(map);

		return () => {
			markerRef.current!.remove();
		};
	}, []);
	return (
		<>
			{createPortal(
				<div
					style={{
						display: "inline-block",
						padding: "2px 10px",
						borderRadius: "50px",
						backgroundColor: "#fff",
						boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.5)",
						fontFamily: "Arial, sans-serif",
						fontSize: "14px",
						fontWeight: "bold",
						color: "#333",
						textAlign: "center",
					}}
				>
					{content}
				</div>,
				contentRef.current
			)}
		</>
	);
};