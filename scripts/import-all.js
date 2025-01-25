import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runImports() {
    try {
        console.log('Starting imports...');

        console.log('\nImporting occupations...');
        await execAsync('node scripts/import-occupations.js');

        console.log('\nImporting bodypart impairments...');
        await execAsync('node scripts/import-bodypart-impairments.js');

        console.log('\nImporting variants...');
        await execAsync('node scripts/import-variants.js');

        console.log('\nImporting age adjustments...');
        await execAsync('node scripts/import-age-adjustments.js');

        console.log('\nAll imports completed successfully!');
    } catch (error) {
        console.error('Error during imports:', error);
        process.exit(1);
    }
}

runImports();
