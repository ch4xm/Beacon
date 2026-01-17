import { PostCard, Post } from "@/components/Post";
import { useNavigate } from "react-router";
import { useMemo, useState } from "react";
import "./PostsPage.css";

const initialData: Post[] = [
  {
    id: 1,
    title: "Taco Bell",
    location: "1405 Mission St, Santa Cruz, CA",
    category: "Hot",
    tags: ["Food", "Casual"],
    message: "Authentic Latinx cuisine, straight from the heart of Santa Cruz.",
    image: "https://s3-media0.fl.yelpcdn.com/bphoto/xla2vDAWBz4b3y3d0iVHuw/348s.jpg",
    upvotes: 10,
    comments: [
      { id: 1, author: "Chad Jack", content: "Gem Alarm!" },
      { id: 2, author: "Aaron Yaiga", content: "Thanks for sharing." },
      { id: 3, author: "Ryo Yamada", content: "Interesting.." },
    ],
  },
  {
    id: 2,
    title: "Matcha Labubu Cafe",
    location: "16th Ave, Santa Cruz, CA 95062",
    category: "Trendy",
    tags: ["Cafe", "Boba", "Dessert"],
    message: "A cute little cafe with amazing matcha desserts and boba drinks.",
    image: "https://www.matchacafe-maiko.com/assets/img/store/store-ga-atlanta.jpg",
    upvotes: 8,
    comments: [
      { id: 1, author: "Sakura Tanaka", content: "My favorite spot! I love the hojicha ice cream!" },
      { id: 2, author: "Liam Smith", content: "Highly recommend the matcha latte." },
    ],
  },
  {
    id: 3,
    title: "Farmers Market",
    location: "700 Front Street, Santa Cruz, CA 95060",
    category: "Local",
    tags: ["Community", "Fresh Produce"],
    message: "A small popup farmer's market near Trader Joe's.",
    image: "https://californiagrown.org/wp-content/uploads/2022/07/Paprika-Studios-CAG-Ag-Tour-Felton-Market-9176-copy.jpg",
    upvotes: 5,
    comments: [{ id: 1, author: "Molly Member", content: "I love fresh produce!" }],
  },
];

export function PostsPage() {
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>(initialData);

  const nextId = useMemo(() => {
    const maxId = initialData.reduce((m, p) => Math.max(m, p.id), 0);
    return { current: maxId + 1 };
  }, []);

  const handleBackClick = () => navigate("/home");

  const addPost = () => {
    const id = nextId.current++;
    const newPost: Post = {
      id,
      title: `New Post #${id}`,
      location: "Santa Cruz, CA",
      category: "New",
      tags: ["Community"],
      message: "Just added to the feed!",
      image: "https://placehold.co/600x400", // placeholder
      upvotes: 0,
      comments: [],
    };

    setPosts(prev => [newPost, ...prev]); // put newest on top
  };

  const removePost = (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="posts-page">
      <div className="posts-header">
        <button className="back-button" onClick={handleBackClick}>
          <svg className="back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <p className="posts-subtitle">Discover hidden gems shared by the community</p>
        </div>

        <div className="posts-actions">
              <button onClick={addPost} className="add-post-button">+ Add Post</button>
        </div>


        {/* ✅ super basic "add" button */}
        <button onClick={addPost} className="add-post-button">
          + Add Post
        </button>
      </div>

      <div className="posts-container">
        {posts.map(post => (
          <div key={post.id} className="post-row">
            <PostCard content={post} />
            <button className="remove-post-button" onClick={() => removePost(post.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
