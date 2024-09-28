import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({
  filename: './leaderboard.db',
  driver: sqlite3.Database
});

async function setup() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      link TEXT,
      time INTEGER NOT NULL
    )
  `);
}

setup();

export interface Entry {
  id: number;
  name: string;
  link: string | null;
  time: number;
}

export async function addEntry(name: string, link: string | null, time: number): Promise<void> {
  const db = await dbPromise;
  await db.run('INSERT INTO leaderboard (name, link, time) VALUES (?, ?, ?)', [name, link, time]);
}

export async function getEntries(limit: number, offset: number): Promise<{ id: number, name: string, link: string | null, time: number }[]> {
  const db = await dbPromise;
  return db.all('SELECT * FROM leaderboard ORDER BY time ASC LIMIT ? OFFSET ?', [limit, offset]) as Promise<Entry[]>;
}