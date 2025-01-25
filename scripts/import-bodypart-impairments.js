import fs from 'fs';
import { parse } from 'csv-parse/sync';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./data/local.db');
const dbRun = promisify(db.run).bind(db);

async function createTable() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS bodypart_impairments (
            section TEXT NOT NULL,
            title TEXT NOT NULL,
            code TEXT NOT NULL,
            description TEXT NOT NULL,
            PRIMARY KEY (code)
        )
    `);
}

async function importBodypartImpairments() {
    try {
        // Create table if it doesn't exist
        await createTable();

        // Read CSV file
        const fileContent = fs.readFileSync('./data/bodypart_impairment_rows.csv');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });

        // Clear existing data
        await dbRun('DELETE FROM bodypart_impairments');

        // Insert records
        for (const record of records) {
            await dbRun(
                'INSERT INTO bodypart_impairments (section, title, code, description) VALUES (?, ?, ?, ?)',
                [
                    record.Section,
                    record.Title.trim(),
                    record.Code.trim(),
                    record.Description.trim()
                ]
            );
        }

        console.log(`Imported ${records.length} bodypart impairment records`);
    } catch (error) {
        console.error('Error importing bodypart impairments:', error);
    } finally {
        db.close();
    }
}

importBodypartImpairments();
