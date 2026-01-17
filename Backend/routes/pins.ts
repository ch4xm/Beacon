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