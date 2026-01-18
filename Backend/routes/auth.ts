import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as db from "../database/db";

export interface User {
    id: string;
    username: string;
}

export async function login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user: User = db.query(
        `SELECT id, email, name FROM account WHERE email = ? AND password = ?`,
        [email, password],
    )[0];

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
        { id: user.id },
        process.env.SECRET as string,
        {
            expiresIn: "1h",
            algorithm: "HS256",
        },
    );

    res.status(200).json({
        accessToken: accessToken,
        user: { id: user.id, name: user.name, email: user.email },
    });
}

export async function register(req: Request, res: Response) {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = db.query(`SELECT id FROM account WHERE email = ?`, [
        email,
    ])[0];

    if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
    }

    try {
        db.query(
            `INSERT INTO account (email, password, name) VALUES (?, ?, ?)`,
            [email, password, name || null],
        );

        const [{ id }] = db.query(`SELECT last_insert_rowid() as id`);

        const accessToken = jwt.sign({ id }, process.env.SECRET as string, {
            expiresIn: "1h",
            algorithm: "HS256",
        });

        res.status(201).json({
            accessToken: accessToken,
            user: { id, name: name || null, email },
        });
    } catch (err) {
        res.status(500).json({ message: "Registration failed" });
    }
}

export function check(req: Request, res: Response, next: Function) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.SECRET as string, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Invalid token" });
        }

		req.user = decoded;
        next();
    });
}
