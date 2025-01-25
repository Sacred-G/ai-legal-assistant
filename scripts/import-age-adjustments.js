import fs from 'fs';
import { parse } from 'csv-parse/sync';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./data/local.db');
const dbRun = promisify(db.run).bind(db);

async function createTable() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS age_adjustments (
            wpi_percent INTEGER NOT NULL,
            age_21_and_under REAL NOT NULL,
            age_22_to_26 REAL NOT NULL,
            age_27_to_31 REAL NOT NULL,
            age_32_to_36 REAL NOT NULL,
            age_37_to_41 REAL NOT NULL,
            age_42_to_46 REAL NOT NULL,
            age_47_to_51 REAL NOT NULL,
            age_52_to_56 REAL NOT NULL,
            age_57_to_61 REAL NOT NULL,
            age_62_and_over REAL NOT NULL,
            PRIMARY KEY (wpi_percent)
        )
    `);
}

async function importAgeAdjustments() {
    try {
        // Create table if it doesn't exist
        await createTable();

        // Read CSV file
        const fileContent = fs.readFileSync('./data/age_adjustment_rows.csv');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });

        // Clear existing data
        await dbRun('DELETE FROM age_adjustments');

        // Insert records
        for (const record of records) {
            await dbRun(
                `INSERT INTO age_adjustments (
                    wpi_percent,
                    age_21_and_under,
                    age_22_to_26,
                    age_27_to_31,
                    age_32_to_36,
                    age_37_to_41,
                    age_42_to_46,
                    age_47_to_51,
                    age_52_to_56,
                    age_57_to_61,
                    age_62_and_over
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    parseInt(record.wpi_percent),
                    parseFloat(record['21_and_under']),
                    parseFloat(record['22_to_26']),
                    parseFloat(record['27_to_31']),
                    parseFloat(record['32_to_36']),
                    parseFloat(record['37_to_41']),
                    parseFloat(record['42_to_46']),
                    parseFloat(record['47_to_51']),
                    parseFloat(record['52_to_56']),
                    parseFloat(record['57_to_61']),
                    parseFloat(record['62_and_over'])
                ]
            );
        }

        console.log(`Imported ${records.length} age adjustment records`);
    } catch (error) {
        console.error('Error importing age adjustments:', error);
    } finally {
        db.close();
    }
}

importAgeAdjustments();
