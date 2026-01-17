import { Request, Response } from "express";
import * as db from "../database/db";

export function getAllPins(req: Request, res: Response) {
    const results = db.query(`
		SELECT
			p.id,
			a.email,
			p.latitude,
			p.longitude, 
			p.message,
			p.image
		FROM pin p
		JOIN account a ON a.id = p.creatorID;
	`);
    res.json(results);
}

export function getUserPins(req: Request, res: Response) {
    const userID = req.user.id;
    const results = db.query(`SELECT * FROM pin WHERE creatorID = ?;`, [
        userID,
    ]);
    res.json(results);
}

export function getPin(req: Request, res: Response) {
    const pinID = req.params.id;
    const results = db.query(`SELECT * FROM pin WHERE id = ?`, [pinID]);
    res.json(results);
}

export function createPin(req: Request, res: Response) {
    // Look up the user's email
    const user = db.query("SELECT email FROM account WHERE id = ?", [
        req.user.id,
    ])[0];
    const email = user ? user.email : null;

    const results = db.query(
        `
		INSERT INTO pin(creatorID, latitude, longitude, title, message, image, color, email)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id;
	`,
        [
            req.user.id,
            req.body.latitude,
            req.body.longitude,
            req.body.title ?? null,
            req.body.message ?? null,
            req.body.image ?? null,
            req.body.color ?? null,
            email,
        ],
    );

    res.json(results[0]);
}

export function updatePin(req: Request, res: Response) {
    const pinID = req.params.id;
    const userID = req.user.id;
    const { title, message, image, color } = req.body;

    const pin = db.query("SELECT creatorID FROM pin WHERE id = ?", [pinID])[0];
    if (!pin) {
        res.status(404).json({ message: "Pin not found" });
        return;
    }
    if (pin.creatorID !== userID) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (message) {
        updates.push("message = ?");
        params.push(message);
    }
    if (title) {
        updates.push("title = ?");
        params.push(title);
    }
    if (image) {
        updates.push("image = ?");
        params.push(image);
    }

    if (updates.length > 0) {
        params.push(pinID);
        const sql = `UPDATE pin SET ${updates.join(", ")} WHERE id = ?`;
        db.query(sql, params);
    }

    // Return the updated pin
    const updatedPin = db.query("SELECT * FROM pin WHERE id = ?", [pinID])[0];
    res.json(updatedPin);
}

export function deletePin(req: Request, res: Response) {
    const pinID = req.params.id;
    const result = db.query("DELETE FROM pin WHERE id = ?", [pinID]);
    if (result.changes === 0) res.status(404).send();
    else res.status(200).send();
}

function haversine(theta: number) {
    return (1 - Math.cos(theta)) / 2;
}

function distBetweenCoordinates(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
) {
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const lambda1 = (lon1 * Math.PI) / 180;
    const lambda2 = (lon2 * Math.PI) / 180;

    const deltaPhi = phi2 - phi1;
    const deltaLambda = lambda2 - lambda1;

    const haversineTheta =
        haversine(deltaPhi) +
        Math.cos(phi1) * Math.cos(phi2) * haversine(deltaLambda);
    const theta = 2 * Math.asin(Math.sqrt(haversineTheta));

    return theta * 6371.2;
}

export function getPinsNearCoordinate(req: Request, res: Response) {
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const MAX_RADIUS_KM = 10;

    const results = db.query(`SELECT * FROM pin;`);
    const filtered = results
        .map((p) => {
            return {
                ...p,
                distance: distBetweenCoordinates(
                    p.latitude,
                    p.longitude,
                    latitude,
                    longitude,
                ),
            };
        })
        .sort((a, b) => {
            return a.distance - b.distance;
        })
        .filter((d) => d.distance < MAX_RADIUS_KM)
        .map((c) => {
            const { distance, ...everythingElse } = c;
            return everythingElse;
        });

    res.json(filtered);
}
