import 'dotenv/config';

import express from "express";
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';

import * as auth from './routes/auth';
import * as pins from './routes/pins';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiSpec = path.join(__dirname, './openapi.yml');

app.use(express.json());
app.use(cors(
    {origin: ['http://localhost:3000', 'http://localhost:4173', 'http://localhost:5173']}
));


app.use(
    OpenApiValidator.middleware({
      apiSpec: apiSpec,
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

app.post("/api/login", auth.login);

app.get("/api/pins", pins.getAllPins);
app.get("/api/pins/:id", pins.getPin);
app.post("/api/pins", pins.createPin);
app.put("/api/pins", pins.deletePin);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});


