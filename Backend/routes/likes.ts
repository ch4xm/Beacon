import { Request, Response } from "express";
import * as db from "../database/db";

export function getLikes(req: Request, res: Response) {
	const results = db.query(`
		SELECT 
			p.likes + (SELECT COUNT(*) FROM likes WHERE pinID = ?) AS likes,
			EXISTS (SELECT 1 FROM likes WHERE accountID = ? AND pinID = ?) AS wasLiked
		FROM pin p
		WHERE p.id = ?;
	`, [req.params.id, req.user.id, req.params.id, req.params.id]);
    if (results.length == 0) {
        return res.status(404).send();
    }

	console.log(results[0])
    res.json({
		likes: results[0].likes,
		wasLiked: results[0].wasLiked == 1
	});
}

export function addLike(req: Request, res: Response) {
    const results = db.query(`INSERT INTO likes(pinID, accountID) VALUES(?, ?);`, [req.params.id, req.user.id]);
	
	if (results.changes == 0) {
		return res.status(404).send();
	}

    res.status(204).send();
}

export function removeLike(req: Request, res: Response) {
    const results = db.query(`DELETE FROM likes WHERE pinID = ? AND accountID = ?;`, [req.params.id, req.user.id]);

	if (results.changes == 0) {
		return res.status(404).send();
	}

    res.status(204).send();
}

