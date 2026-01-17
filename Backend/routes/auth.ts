import { Request, Response } from "express";
import jwt from 'jsonwebtoken';
import * as db from '../database/db.ts';

export interface User {
    id: string;
    username: string;
}

export async function login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user: User = db.query(
        `SELECT id, email, name FROM account WHERE email = ? AND password = ?`,
        [email, password]
    )[0];

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
        { id: user.id },
        process.env.SECRET as string,
        {
            expiresIn: '1h',
            algorithm: 'HS256',
        }
    );

    res.status(200).json({ accessToken: accessToken });
}