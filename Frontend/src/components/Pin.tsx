interface PinProps {
	content: string
}

export default function Pin({ content }: PinProps) {
	return (
		<div
			style={{
				display: "inline-block",
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
			onMouseEnter={(e) => {
				e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
				e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5), 0 6px 12px rgba(0, 0, 0, 0.15)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.transform = "translateY(0) scale(1)";
				e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 8px rgba(0, 0, 0, 0.1)";
			}}
		>
			{content}
		</div>
	);
};