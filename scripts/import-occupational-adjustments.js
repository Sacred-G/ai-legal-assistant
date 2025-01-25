import fs from 'fs';
import { parse } from 'csv-parse/sync';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./data/local.db');
const dbRun = promisify(db.run).bind(db);

async function createTable() {
    // Drop the table if it exists
    await dbRun('DROP TABLE IF EXISTS occupational_adjustments');

    // Create the table with the new schema
    await dbRun(`
        CREATE TABLE IF NOT EXISTS occupational_adjustments (
            rating_percent INTEGER NOT NULL,
            group_c INTEGER NOT NULL,
            group_d INTEGER NOT NULL,
            group_e INTEGER NOT NULL,
            group_f INTEGER NOT NULL,
            group_g INTEGER NOT NULL,
            group_h INTEGER NOT NULL,
            group_i INTEGER NOT NULL,
            group_j INTEGER NOT NULL,
            PRIMARY KEY (rating_percent)
        )
    `);
}

async function importAdjustments() {
    try {
        // Create table if it doesn't exist
        await createTable();

        // Read CSV file
        const fileContent = fs.readFileSync('./data/occupational_adjustments_rows.csv');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });

        // Insert records
        for (const record of records) {
            await dbRun(
                `INSERT INTO occupational_adjustments (
                    rating_percent, group_c, group_d, group_e, group_f, 
                    group_g, group_h, group_i, group_j
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    parseInt(record.rating_percent),
                    parseInt(record.C),
                    parseInt(record.D),
                    parseInt(record.E),
                    parseInt(record.F),
                    parseInt(record.G),
                    parseInt(record.H),
                    parseInt(record.I),
                    parseInt(record.J)
                ]
            );
        }

        console.log(`Imported ${records.length} occupational adjustment records`);
    } catch (error) {
        console.error('Error importing occupational adjustments:', error);
    } finally {
        db.close();
    }
}

importAdjustments();
