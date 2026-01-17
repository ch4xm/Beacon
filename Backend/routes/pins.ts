import { Request, Response } from 'express';
import * as db from '../database/db.ts';

export function getAllPins(req: Request, res: Response) {
	const results = db.query(`SELECT * FROM pin;`);
	res.json(results);
}

export function getPin(req: Request, res: Response) {
	const pinID = req.params.id;
	const results = db.query(`SELECT * FROM pin WHERE id = ?`, [pinID]);
	res.json(results);
}

export function createPin(req: Request, res: Response) {
	const results = db.query(`
		INSERT INTO pin(creatorID, message, image, color)
		VALUES(?, ?, ?, ?)
		RETURNING id;
	`, [
		req.user.id,
		req.body.message ?? null,
		req.body.image ?? null,
		req.body.color ?? null
	]);

	res.json(results[0]);
}

export function deletePin(req: Request, res: Response) {
	const pinID = req.params.id;
	const result = db.query('DELETE FROM pin WHERE id = ?', [pinID]);
	if (result.changes === 0)
		res.status(404).send()
	else
		res.status(200).send();
}

function haversine(theta: number) {
	return (1 - Math.cos(theta)) / 2;
}

function distBetweenCoordinates(lat1: number, lon1: number, lat2: number, lon2: number) {
	const phi1 = lat1 * Math.PI / 180;
	const phi2 = lat2 * Math.PI / 180;
	const lambda1 = lon1 * Math.PI / 180;
	const lambda2 = lon2 * Math.PI / 180;

	const deltaPhi = phi2 - phi1;
	const deltaLambda = lambda2 - lambda1;

	const haversineTheta = haversine(deltaPhi) + Math.cos(phi1) * Math.cos(phi2) * haversine(deltaLambda);
	const theta = 2 * Math.asin(Math.sqrt(haversineTheta));

	return theta * 6371.2;
}

export function getPinsNearCoordinate(req: Request, res: Response) {
	const latitude = req.body.latitude;
	const longitude = req.body.longitude;
	const MAX_RADIUS_KM = 10;

	const results = db.query(`SELECT * FROM pin;`);
	const filtered = results.map(p => {
		return {
			...p,
			distance: distBetweenCoordinates(p.latitude, p.longitude, latitude, longitude)
		}
	})
		.sort((a, b) => {
			return a.distance - b.distance
		})
		.filter(d => d.distance < MAX_RADIUS_KM)
		.map(c => {
			const { distance, ...everythingElse } = c;
			return everythingElse
		});

	res.json(filtered);
}