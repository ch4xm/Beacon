import express from "express";
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';
import * as pinRoutes from './routes/pins.ts';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiSpec = path.join(__dirname, './openapi.yml');

app.use(cors(
    {origin: 'http://localhost:3000'},
    {origin: 'http://localhost:4173'},
    {origin: 'http://localhost:5173'},
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

app.get("/api/pins", pinRoutes.getAllPins);
app.get("/api/pins/:id", pinRoutes.getPin);
app.post("/api/pins", pinRoutes.createPin);
app.put("/api/pins", pinRoutes.editPin);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});


