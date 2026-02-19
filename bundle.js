// bundle.js — Post-install script to bundle OpenAI SDK for browser use
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Use esbuild to bundle the OpenAI SDK into a single browser-compatible file
const entryContent = `export { AzureOpenAI } from 'openai';\n`;
const entryPath = path.join(__dirname, '_entry.js');
const outPath = path.join(__dirname, 'openai-bundle.js');

fs.writeFileSync(entryPath, entryContent);

try {
  execSync(
    `npx esbuild "${entryPath}" --bundle --format=esm --outfile="${outPath}" --platform=browser --target=chrome120`,
    { stdio: 'inherit', cwd: __dirname }
  );
  console.log('✓ OpenAI SDK bundled to openai-bundle.js');
} finally {
  fs.unlinkSync(entryPath);
}
