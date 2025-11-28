const fs = require('fs');
const path = require('path');

// Fix syntax errors in worker file
const workerPath = path.join(__dirname, '../src/workers/audioAnalysis.worker.js');
let content = fs.readFileSync(workerPath, 'utf8');

// Fix the syntax errors
const fixedContent = content
  .replace(/function\s+(\w+)\([^)]*\)\s*\[\s*\]\s*\{/g, 'function $1($2) {')
  .replace(/const\s+(\w+)\s*\[\s*\]\s*=/g, 'const $1 =')
  .replace(/let\s+(\w+)\s*\[\s*\]\s*=/g, 'let $1 =')
  .replace(/var\s+(\w+)\s*\[\s*\]\s*=/g, 'var $1 =');

// Write the fixed content back
fs.writeFileSync(workerPath, fixedContent);

console.log('✅ Worker file syntax errors fixed');