const fs = require('fs');
const path = require('path');

const files = [
  'routes/pipelines.js',
  'services/deploymentService.js',
  'services/renderService.js',
  'services/surgeService.js',
  'utils/execUtils.js',
  'utils/gitUtils.js',
  'utils/projectUtils.js'
];

let hasErrors = false;

for (const f of files) {
  try {
    const fullPath = path.join(__dirname, f);
    require(fullPath);
    console.log(`✅ ${f} loaded successfully.`);
  } catch (err) {
    console.error(`❌ Error loading ${f}:`, err.message);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log('All modules loaded successfully!');
}
