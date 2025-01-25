import fs from 'fs';
import { parse } from 'csv-parse/sync';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./data/local.db');
const dbRun = promisify(db.run).bind(db);

async function createTable() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS variants (
            body_part TEXT NOT NULL,
            occupational_group INTEGER NOT NULL,
            impairment_code TEXT NOT NULL,
            variant TEXT NOT NULL,
            PRIMARY KEY (body_part, occupational_group, impairment_code)
        )
    `);
}

async function importVariants() {
    try {
        // Create table if it doesn't exist
        await createTable();

        // Read CSV file
        const fileContent = fs.readFileSync('./data/variants.csv');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });

        // Clear existing data
        await dbRun('DELETE FROM variants');

        // Insert records
        for (const record of records) {
            await dbRun(
                'INSERT INTO variants (body_part, occupational_group, impairment_code, variant) VALUES (?, ?, ?, ?)',
                [
                    record.Body_Part.trim(),
                    parseInt(record.Occupational_Group),
                    record.Impairment_Code.trim(),
                    record.Variant.trim()
                ]
            );
        }

        console.log(`Imported ${records.length} variant records`);
    } catch (error) {
        console.error('Error importing variants:', error);
    } finally {
        db.close();
    }
}

importVariants();
