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

function HeartIcon({ filled }: { filled: boolean }) {
	return (
		<img
			src={filled ? '/filledheart.svg' : '/outlineheart.svg'}
		/>
	)
}

function BookmarkIcon({ filled }: { filled: boolean }) {
	return (
		<img
			src={filled ? '/bookmark.svg' : '/bookmarkoutline.svg'}
		/>
	)
}

export default function LocationPin({ selectedPoint, setSelectedPoint, onShowDetails }: LocationPinProps) {
	const titleText = selectedPoint.title?.trim() || selectedPoint.description?.trim() || "Untitled Pin";
	const messageText = selectedPoint.description?.trim() || "";
	const showMessage = messageText && messageText !== titleText;
	const descriptionPreview = messageText.length > 50 ? `${messageText.slice(0, 50).trimEnd()}...` : messageText;

	const [likes, setLikes] = useState<number>(0);
	const [isLiked, setIsLiked] = useState<boolean>(false);
	const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
	const [likesLoading, setLikesLoading] = useState<boolean>(true);

	useEffect(() => {
		// Check if pin is bookmarked
		const saved = JSON.parse(localStorage.getItem("savedPins") ?? '{}');
		const email = localStorage.getItem("userEmail")!;
		const userSavedPins = saved[email] || [];
		setIsBookmarked(userSavedPins.includes(selectedPoint.id));

		// Fetch likes
		setLikesLoading(true);
		fetch(`${BASE_API_URL}/api/likes/${selectedPoint.id}`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem("accessToken")}`
			}
		})
			.then(res => res.json())
			.then(res => {
				setLikes(res.likes);
				setIsLiked(res.wasLiked);
				setLikesLoading(false);
			})
			.catch(() => {
				setLikesLoading(false);
			});
	}, [selectedPoint]);

	const toggleLike = () => {
		const newLikedState = !isLiked;
		setIsLiked(newLikedState);

		if (newLikedState) {
			setLikes(prev => prev + 1);
			fetch(`${BASE_API_URL}/api/likes/${selectedPoint.id}`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${localStorage.getItem("accessToken")}`
				}
			});
		} else {
			setLikes(prev => prev - 1);
			fetch(`${BASE_API_URL}/api/likes/${selectedPoint.id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${localStorage.getItem("accessToken")}`
				}
			});
		}
	};

	const toggleBookmark = () => {
		const saved = JSON.parse(localStorage.getItem("savedPins") ?? '{}');
		const email = localStorage.getItem("userEmail")!;
		const newSavedState = !isBookmarked;
		setIsBookmarked(newSavedState);

		if (!saved[email]) {
			saved[email] = [];
		}

		if (newSavedState) {
			if (!saved[email].includes(selectedPoint.id)) {
				saved[email].push(selectedPoint.id);
			}
		} else {
			saved[email] = saved[email].filter((id: number) => id !== selectedPoint.id);
		}

		localStorage.setItem("savedPins", JSON.stringify(saved));
	};


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
				{selectedPoint.image ? (
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
				) : (
					<div
						className="location-pin-image-placeholder"
						style={{
							background: `linear-gradient(135deg, ${selectedPoint.color || PIN_COLOR}88 0%, ${selectedPoint.color || PIN_COLOR} 100%)`,
						}}
					>
						{titleText.charAt(0).toUpperCase()}
					</div>
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
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
					<button
						className="location-popup-button"
						onClick={onShowDetails}
						style={{ background: 'none', padding: '4px 8px', }}
						onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
						onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
					>
						<img
							src={'/info.svg'}
						/>
					</button>

					<button
						className="location-popup-button"
						onClick={toggleLike}
						disabled={likesLoading}
						onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
						onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: 'none',
							color: '#1a1a1a',
							padding: '4px 8px',
							opacity: likesLoading ? 0.5 : 1,
						}}
					>
						<HeartIcon filled={isLiked} />
						<p>{likesLoading ? '...' : likes}</p>
					</button>

					<button
						className="location-popup-button"
						onClick={toggleBookmark}
						disabled={likesLoading}
						onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
						onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: 'none',
							color: '#1a1a1a',
							padding: '4px 8px',
							opacity: likesLoading ? 0.5 : 1,
						}}
					>
						<BookmarkIcon filled={isBookmarked} />
					</button>
				</div>
			</div>
		</Popup>
	);
}
