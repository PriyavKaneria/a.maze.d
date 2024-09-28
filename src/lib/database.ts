import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import SeedJson from "$lib/seed.json";

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
      time INTEGER NOT NULL,
      items INTEGER NOT NULL
    )
  `);

  // If the table is empty, seed from seed.json
  const count = await db.get('SELECT COUNT(*) as count FROM leaderboard');
  if (count.count === 0) {
    await Promise.all(SeedJson.entries.map((entry: { name: any; link: any; time: any; items: any; }) => db.run('INSERT INTO leaderboard (name, link, time, items) VALUES (?, ?, ?, ?)', [entry.name, entry.link, entry.time, entry.items])));
  }
}

setup();

export interface Entry {
  id: number;
  name: string;
  link: string | null;
  time: number;
  items: number;
}

export async function addEntry(name: string, link: string | null, time: number, items: number): Promise<void> {
  const db = await dbPromise;
  await db.run('INSERT INTO leaderboard (name, link, time, items) VALUES (?, ?, ?, ?)', [name, link, time, items]);
}

export async function getEntries(limit: number, offset: number): Promise<{ id: number, name: string, link: string | null, time: number, items: number }[]> {
  const db = await dbPromise;
  return db.all('SELECT * FROM leaderboard ORDER BY time ASC, items ASC LIMIT ? OFFSET ?', [limit, offset]) as Promise<Entry[]>;
}

export async function getAllEntries(): Promise<{ id: number, name: string, link: string | null, time: number, items: number }[]> {
  const db = await dbPromise;
  return db.all('SELECT * FROM leaderboard ORDER BY time ASC, items ASC') as Promise<Entry[]>;
}