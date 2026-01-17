import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/heartbeat", (req, res) => {
  console.log("[Server-side] Server received conn");
  res.json({
    status: "ok",
    timestamp: Date.now(),
  });
});


app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express!" });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});


