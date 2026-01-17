import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { PostCard, Post } from "@/components/Post";
import NewPostModal from "@/components/NewPostModal";
import "./PostsPage.css";
import { BASE_API_URL } from '../../constants';

export function PostsPage() {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getAuthToken = () => localStorage.getItem("accessToken");

    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            const response = await fetch(`${BASE_API_URL}/api/posts`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            
            if (response.status === 401) {
                navigate("/login");
                return;
            }
            
            if (!response.ok) {
                throw new Error("Failed to fetch posts");
            }
            
            const data = await response.json();
            // Backend returns posts without comments array, so we add empty comments
            const postsWithComments = data.map((post: any) => ({
                ...post,
                comments: post.comments || [],
            }));
            setPosts(postsWithComments);
        } catch (err) {
            console.error("Error fetching posts:", err);
            setError("Failed to load posts. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleBackClick = () => navigate("/home");

    const handleAddPost = async (newPostData: Omit<Post, "id" | "upvotes" | "comments">) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${BASE_API_URL}/api/posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newPostData),
            });

            if (response.status === 401) {
                navigate("/login");
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to create post");
            }

            const createdPost = await response.json();
            setPosts((prev) => [{ ...createdPost, comments: [] }, ...prev]);
        } catch (err) {
            console.error("Error creating post:", err);
            setError("Failed to create post. Please try again.");
        }
    };

    const removePost = async (id: number) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${BASE_API_URL}/api/posts/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                navigate("/login");
                return;
            }

            if (!response.ok && response.status !== 403) {
                throw new Error("Failed to delete post");
            }

            if (response.status === 403) {
                setError("You can only delete your own posts.");
                return;
            }

            setPosts((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error("Error deleting post:", err);
            setError("Failed to delete post. Please try again.");
        }
    };

    return (
        <div className="posts-page">
            {isModalOpen && (
                <NewPostModal
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleAddPost}
                />
            )}

            <div className="posts-content">
                <div className="posts-header">
                    <button className="back-button" onClick={handleBackClick}>
                        <svg
                            className="back-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path
                                d="M19 12H5M5 12L12 19M5 12L12 5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Back to Map
                    </button>

                    <div className="posts-title">
                        <h1>Community Posts</h1>
                        <p className="posts-subtitle">
                            Discover hidden gems shared by the community
                        </p>
                    </div>

                    <div className="posts-actions">
                        <button className="add-post-button" onClick={() => setIsModalOpen(true)}>
                            + Add Post
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="posts-error">
                        <p>{error}</p>
                        <button onClick={() => setError(null)}>Dismiss</button>
                    </div>
                )}

                {isLoading ? (
                    <div className="posts-loading">
                        <div className="posts-loading-spinner"></div>
                        <p>Loading posts...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="posts-empty">
                        <div className="posts-empty-icon">🫶</div>
                        <div className="posts-empty-title">No posts yet</div>
                        <div className="posts-empty-description">
                            Be the first to share a hidden gem with the
                            community.
                        </div>
                        <button
                            className="add-post-button posts-empty-cta"
                            onClick={() => setIsModalOpen(true)}
                        >
                            + Add Post
                        </button>
                    </div>
                ) : (
                    <div className="posts-container">
                        {posts.map((post) => (
                            <div key={post.id} className="post-row">
                                <PostCard content={post} />
                                <button
                                    className="remove-post-button"
                                    onClick={() => removePost(post.id)}
                                    aria-label={`Remove ${post.title}`}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
