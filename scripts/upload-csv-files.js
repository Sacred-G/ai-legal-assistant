#!/usr/bin/env node
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const csvFiles = [
    '../data/age_adjustment_rows.csv',
    '../data/bodypart_impairment_rows.csv',
    '../data/occupational_adjustments_rows.csv',
    '../data/occupations_rows.csv',
    '../data/variants.csv'
];

async function uploadCSVFiles() {
    const fileIds = [];

    try {
        for (const csvFile of csvFiles) {
            const filePath = path.join(__dirname, csvFile);
            console.log(`Uploading ${path.basename(csvFile)}...`);

            const upload = await openai.files.create({
                file: fs.createReadStream(filePath),
                purpose: 'assistants'
            });

            // Wait for processing
            let status = await openai.files.retrieve(upload.id);
            while (status.status === 'processing') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                status = await openai.files.retrieve(upload.id);
            }

            if (status.status === 'processed') {
                fileIds.push(upload.id);
                console.log(`Successfully uploaded ${path.basename(csvFile)}: ${upload.id}`);
            } else {
                throw new Error(`File processing failed with status: ${status.status}`);
            }
        }

        console.log('\nAll files uploaded successfully!');
        console.log('\nAdd these file IDs to AssistantsService:');
        console.log('this.csvFileIds = [');
        fileIds.forEach(id => console.log(`    "${id}",`));
        console.log('];');

    } catch (error) {
        console.error('Error uploading files:', error);

        // Clean up any uploaded files
        for (const fileId of fileIds) {
            try {
                await openai.files.del(fileId);
                console.log(`Cleaned up file: ${fileId}`);
            } catch (cleanupError) {
                console.error(`Error cleaning up file ${fileId}:`, cleanupError);
            }
        }
    }
}

uploadCSVFiles();
