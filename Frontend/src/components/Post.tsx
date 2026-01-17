export interface Post {
    id: number;
    title: string;
    location: string;
    category?: string;
    tags: string[];
    message: string;
    image?: string;
    upvotes: number;
    comments: Comment[];
}

interface Comment {
    id: number;
    author: string;
    content: string;
    avatar?: string;
}

interface PostProps {
    content: Post;
}

export function CategoryBadge({ category }: { category: string }) {
    const styles = {
        Hot: {
            background: "linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)",
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(255, 107, 53, 0.3)",
        },
        Trendy: {
            background: "linear-gradient(135deg, #e91e63 0%, #ec407a 100%)",
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(233, 30, 99, 0.3)",
        },
        Local: {
            background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
        },
    };

    const style = styles[category as keyof typeof styles];
    if (!style) return null;

    return (
        <div
            style={{
                fontSize: 13,
                fontWeight: 600,
                background: style.background,
                color: style.color,
                boxShadow: style.boxShadow,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 100,
                padding: "4px 20px",
                letterSpacing: "0.3px",
            }}
        >
            {category}
        </div>
    );
}

export function PostCard({ content }: PostProps) {
    return (
        <div
            style={{
                maxWidth: 600,
                margin: "20px auto",
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 20, color: "#1a1a1a" }}>{content.title}</h2>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 8,
                        flexWrap: "wrap",
                    }}
                >
                    {content.category && <CategoryBadge category={content.category} />}
                    <div
                        style={{
                            color: "#64748b",
                            fontSize: 13,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 10px",
                            backgroundColor: "#f1f5f9",
                            borderRadius: 6,
                            fontWeight: 500,
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21C15.5 17.4 19 14.1764 19 10.2C19 6.22355 15.866 3 12 3C8.13401 3 5 6.22355 5 10.2C5 14.1764 8.5 17.4 12 21Z" fill="#64748b"/>
                            <circle cx="12" cy="10" r="2" fill="#ffffff"/>
                        </svg>
                        {content.location}
                    </div>
                </div>
            </div>

            {/* Tags */}
            {content.tags.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    {content.tags.map(tag => (
                        <span
                            key={tag}
                            style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                marginRight: 6,
                                marginBottom: 6,
                                fontSize: 12,
                                color: "#475569",
                                backgroundColor: "#f1f5f9",
                                borderRadius: 6,
                                fontWeight: 500,
                            }}
                        >
                            # {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Message */}
            <p style={{ lineHeight: 1.6, marginBottom: 12, color: "#374151" }}>
                {content.message}
            </p>

            {/* Image */}
            {content.image && (
                <img
                    src={content.image}
                    alt={content.title}
                    style={{
                        width: "100%",
                        maxHeight: 400,
                        objectFit: "cover",
                        borderRadius: 10,
                        marginBottom: 12,
                    }}
                />
            )}

            {/* Actions */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 12,
                    color: "#64748b",
                    fontSize: 14,
                    fontWeight: 500,
                }}
            >
                <span>⬆ {content.upvotes}</span>
                <span>💬 {content.comments.length}</span>
            </div>

            {/* Comments */}
            {content.comments.length > 0 && (
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                    {content.comments.map(comment => (
                        <div
                            key={comment.id}
                            style={{
                                display: "flex",
                                gap: 10,
                                marginBottom: 10,
                            }}
                        >
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    backgroundColor: "#e5e7eb",
                                    backgroundImage: comment.avatar
                                        ? `url(${comment.avatar})`
                                        : undefined,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    flexShrink: 0,
                                }}
                            />

                            <div
                                style={{
                                    backgroundColor: "#f9fafb",
                                    borderRadius: 8,
                                    padding: "10px 12px",
                                    flex: 1,
                                }}
                            >
                                <strong
                                    style={{
                                        fontSize: 13,
                                        color: "#1a1a1a",
                                    }}
                                >
                                    {comment.author}
                                </strong>
                                <div
                                    style={{
                                        fontSize: 14,
                                        color: "#374151",
                                        marginTop: 2,
                                    }}
                                >
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}