function avatarColor(letter: string): string {
    const t = ((letter.charCodeAt(0) - 97) / 25);
    return `hsl(${t * 360}deg, 50%, 50%)`
}

export function Avatar({ letter }: { letter: string }) {
    return (
        <div
            style={{
                backgroundColor: avatarColor(letter),
                width: 45,
                height: 45,
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: 500,
                color: "white",
                fontSize: 20,
                lineHeight: "40px",
                textAlign: "center",
                userSelect: "none",
            }}
        >
            {letter.toUpperCase()}
        </div>
    );
}
