import fs from 'fs';
import { parse } from 'csv-parse/sync';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./data/local.db');
const dbRun = promisify(db.run).bind(db);

async function createTable() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS impairments (
            code TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            section TEXT
        )
    `);
}

async function importImpairments() {
    try {
        // Create table if it doesn't exist
        await createTable();

        // Read CSV file
        const fileContent = fs.readFileSync('./data/bodypart_impairment_rows.csv');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });

        // Clear existing data
        await dbRun('DELETE FROM impairments');

        // Insert records
        for (const record of records) {
            await dbRun(
                'INSERT INTO impairments (code, description, section) VALUES (?, ?, ?)',
                [
                    record.Code,
                    record.Description,
                    record.Section || ''
                ]
            );
        }

        console.log(`Imported ${records.length} impairment records`);
    } catch (error) {
        console.error('Error importing impairments:', error);
    } finally {
        db.close();
    }
}

importImpairments();
