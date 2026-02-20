import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/assets/BORANG MANUAL_LAPORAN ANALISIS SOAL SELIDIK template.xlsx');
const outputPath = path.join(process.cwd(), 'scripts/excel_structure.json');

console.log(`Reading file from: ${filePath}`);

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found at: ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header: 1 (array of arrays)
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    const outputData = {
        sheetName,
        rows: data.slice(0, 60) // First 60 rows to capture more context
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`Structure written to ${outputPath}`);

} catch (error) {
    console.error('Error reading file:', error);
    fs.writeFileSync(outputPath, JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
}
