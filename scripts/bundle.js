// bundle.js — Bundles the OpenAI SDK for browser use via esbuild
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Use esbuild to bundle the OpenAI SDK into a single browser-compatible file
const entryContent = `export { AzureOpenAI } from 'openai';\n`;
const entryPath = path.join(rootDir, '_entry.js');
const outPath = path.join(distDir, 'openai-bundle.js');

fs.writeFileSync(entryPath, entryContent);

try {
  execSync(
    `npx esbuild "${entryPath}" --bundle --format=esm --outfile="${outPath}" --platform=browser --target=chrome120`,
    { stdio: 'inherit', cwd: rootDir }
  );
  console.log('✓ OpenAI SDK bundled to dist/openai-bundle.js');
} finally {
  if (fs.existsSync(entryPath)) fs.unlinkSync(entryPath);
}
