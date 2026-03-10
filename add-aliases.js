const fs = require('fs');
const path = require('path');

const culturalPath = path.join(__dirname, 'lib/montree/stem/cultural.json');
const data = JSON.parse(fs.readFileSync(culturalPath, 'utf8'));

const aliases_map = {
  'cu_puzzle_map_world': ['World Map Puzzle', 'Map Puzzle World'],
  'cu_puzzle_maps_continents': ['Continent Map Puzzles', 'Map Puzzles'],
  'cu_land_water_forms': ['Landforms', 'Land Water Forms', 'Land and Water'],
  'cu_globe_land_water': ['Sandpaper Globe', 'Land Water Globe'],
  'cu_globe_continents': ['Colored Globe', 'Continent Globe'],
  'cu_parts_bird': ['Puzzle of the Bird', 'Bird Puzzle'],
  'cu_parts_fish': ['Puzzle of the Fish', 'Fish Puzzle'],
  'cu_parts_plant': ['Puzzle of the Plant', 'Plant Puzzle'],
  'cu_parts_flower': ['Puzzle of the Flower', 'Flower Puzzle'],
  'cu_parts_leaf': ['Puzzle of the Leaf', 'Leaf Puzzle'],
  'cu_living_nonliving': ['Living Non-Living Sort', 'Living Things Sort']
};

let updated_count = 0;

for (const category of data.categories || []) {
  for (const work of category.works || []) {
    if (work.id in aliases_map) {
      work.aliases = aliases_map[work.id];
      updated_count++;
      console.log(`Updated ${work.id}`);
    }
  }
}

console.log(`\nTotal works updated: ${updated_count}`);

fs.writeFileSync(culturalPath, JSON.stringify(data, null, 2) + '\n');
console.log('File saved successfully');
