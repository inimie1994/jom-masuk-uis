const fs = require('fs');
const grid = Array(72).fill().map(() => Array(59).fill(0));
const sql = `UPDATE campus_maps SET grid_data = '${JSON.stringify(grid)}'::jsonb WHERE map_id = 1;`;
fs.writeFileSync('update_map.sql', sql);
console.log('update_map.sql written successfully.');
