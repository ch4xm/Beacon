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
	// if (!req.body) {
	// 	res.status(400).send();
	// 	return;
	// }	

	const results = db.query(`
		INSERT INTO pin(creatorID, message, image, color)
		VALUES(?, ?, ?, ?)
		RETURNING id;
	`, [
		req.body.creatorID ?? 1, 
		req.body.message ?? null,
		req.body.image ?? null,
		req.body.color ?? null
	]);

	res.json(results[0]);
}

export function editPin(req: Request, res: Response) {

}