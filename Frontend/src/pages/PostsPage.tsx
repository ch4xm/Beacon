import {PostCard, Post} from "@/components/Post";

const data: Post[] = [
    {
        id: 1,
        title: "Taco Bell",
        location: "1405 Mission St, Santa Cruz, CA",
        category: "Hot",
        tags: ["Food", "Casual"],
        message: "Authentic Latinx cuisine, straight from the heart of Santa Cruz.",
        image: 'https://s3-media0.fl.yelpcdn.com/bphoto/xla2vDAWBz4b3y3d0iVHuw/348s.jpg',
        upvotes: 10,
        comments: [
            { id: 1, author: "Chad Jack", content: "Gem Alarm!" },
            { id: 2, author: "Aaron Yaiga", content: "Thanks for sharing." },
            { id: 3, author: "Ryo Yamada", content: "Interesting.." }
        ]
    },
    {id: 2,
        title: "Matcha Labubu Cafe",
        location: "16th Ave, Santa Cruz, CA 95062",
        category: "Trendy",
        tags: ["Cafe", "Boba", "Dessert"],
        message: "A cute little cafe with amazing matcha desserts and boba drinks.",
        image: 'https://www.matchacafe-maiko.com/assets/img/store/store-ga-atlanta.jpg',
        upvotes: 8,
        comments: [
            { id: 1, author: "Sakura Tanaka", content: "My favorite spot! I love the hojicha ice cream!" },
            { id: 2, author: "Liam Smith", content: "Highly recommend the matcha latte." }
        ]
    },
    {
        id: 3,
        title: "Farmers Market",
        location: "700 Front Street, Santa Cruz, CA 95060",
        category: "Local",
        tags: ["Community", "Fresh Produce"],
        message: "A small popup farmer's market near Trader Joe's.",
        image: 'https://californiagrown.org/wp-content/uploads/2022/07/Paprika-Studios-CAG-Ag-Tour-Felton-Market-9176-copy.jpg',
        upvotes: 5,
        comments: [
            { id: 1, author: "Molly Member", content: "I love fresh produce!" }
        ]
    }
]

export function PostsPage() {
    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 20, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 20}}>
        {data.map((post: Post) => (
            <PostCard content={post}/>
        ))
        }
        </div>
    );
}