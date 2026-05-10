const fs = require('fs');
const path = require('path');

const files = [
  'server/routes/pipelines.js',
  'server/services/deploymentService.js',
  'server/services/renderService.js',
  'server/services/surgeService.js',
  'server/utils/execUtils.js',
  'server/utils/gitUtils.js',
  'server/utils/projectUtils.js'
];

files.forEach(f => {
  const p = path.join('c:/Users/007th/OneDrive/Desktop/PROJECT', f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/\\\\\\\`/g, '\`');
    content = content.replace(/\\\\\\\$/g, '$');
    
    // Also try with fewer backslashes if the above doesn't work
    content = content.replace(/\\\\`/g, '\`');
    content = content.replace(/\\\$/g, '$');
    
    fs.writeFileSync(p, content);
  }
});
console.log('Fixed escaped characters in files.');
