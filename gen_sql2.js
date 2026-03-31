const fs = require('fs');
const grid = fs.readFileSync('grid_data.json', 'utf8').trim();
const sql = `UPDATE campus_maps SET grid_data = '${grid}'::jsonb WHERE map_id = 1;`;
fs.writeFileSync('update_map2.sql', sql);
console.log('update_map2.sql generated');
