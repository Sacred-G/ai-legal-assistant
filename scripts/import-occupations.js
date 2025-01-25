import fs from 'fs';
import { parse } from 'csv-parse/sync';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./data/local.db');
const dbRun = promisify(db.run).bind(db);

async function createTable() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS occupations (
            group_number TEXT NOT NULL,
            occupation_title TEXT NOT NULL,
            industry TEXT,
            PRIMARY KEY (group_number, occupation_title)
        )
    `);
}

async function importOccupations() {
    try {
        // Create table if it doesn't exist
        await createTable();

        // Read CSV file
        const fileContent = fs.readFileSync('./data/occupations_rows.csv');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });

        // Clear existing data
        await dbRun('DELETE FROM occupations');

        // Insert records
        for (const record of records) {
            await dbRun(
                'INSERT INTO occupations (group_number, occupation_title, industry) VALUES (?, ?, ?)',
                [
                    record.group_number,
                    record.occupation_title.trim(),
                    record.industry.trim()
                ]
            );
        }

        console.log(`Imported ${records.length} occupation records`);
    } catch (error) {
        console.error('Error importing occupations:', error);
    } finally {
        db.close();
    }
}

importOccupations();
