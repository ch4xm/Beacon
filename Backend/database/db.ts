import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.join(__dirname, 'database.db');

export const db = new DatabaseSync(dbPath);

console.log('Connected to SQLite database');

// Helper function to run queries that return rows
export function query(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}