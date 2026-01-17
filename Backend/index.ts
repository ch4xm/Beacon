import "dotenv/config";

import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import cors from "cors";
import * as OpenApiValidator from "express-openapi-validator";

import * as auth from "./routes/auth";
import * as pins from "./routes/pins";
import * as posts from "./routes/posts";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiSpec = path.join(__dirname, "./openapi.yml");

app.use(express.json());

// --- CORS (FIXED) ---
const allowedOrigins = new Set<string>([
    "http://localhost:3000",
    "http://localhost:5173", // Vite dev
    "http://localhost:4173", // Vite preview (if you use it)
    "https://ch2026.vercel.app", // Vercel prod
]);

// Optional: allow Vercel preview deployments like https://<hash>.vercel.app
const isAllowedOrigin = (origin: string) =>
    allowedOrigins.has(origin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

app.use(
    cors({
        origin: (origin, cb) => {
            // allow requests with no Origin header (curl, server-to-server)
            if (!origin) return cb(null, true);

            if (isAllowedOrigin(origin)) return cb(null, true);

            // Block everything else
            return cb(new Error(`CORS blocked for origin: ${origin}`), false);
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        // If you use cookies/sessions, set this true AND avoid "*" origins.
        credentials: false,
    }),
);

// Express 5-safe preflight handler (no app.options("*")!)
app.use((req, res, next) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

// IMPORTANT: If OpenApiValidator is validating responses, make sure /heartbeat is in the spec
app.use(
    OpenApiValidator.middleware({
        apiSpec,
        validateRequests: true,
        validateResponses: true,
    }),
);

app.get("/heartbeat", (req, res) => {
    console.log("[Server-side] Server received conn");
    res.json({
        status: "ok",
        timestamp: Date.now(),
    });
});

// Auth routes
app.post("/api/login", auth.login);
app.post("/api/register", auth.register);

// Pins routes
app.get("/api/pins", auth.check, pins.getAllPins);
app.get("/api/pins/user", auth.check, pins.getUserPins);
app.get("/api/pins/:id", auth.check, pins.getPin);
app.put("/api/pins/:id", auth.check, pins.updatePin);
app.post("/api/pins", auth.check, pins.createPin);
app.put("/api/pins", auth.check, pins.deletePin);

// Posts routes
app.get("/api/posts", auth.check, posts.getAllPosts);
app.get("/api/posts/:id", auth.check, posts.getPost);
app.post("/api/posts", auth.check, posts.createPost);
app.put("/api/posts/:id", auth.check, posts.updatePost);
app.delete("/api/posts/:id", auth.check, posts.deletePost);
app.post("/api/posts/:id/upvote", auth.check, posts.upvotePost);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});
