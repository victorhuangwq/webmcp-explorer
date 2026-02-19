// build.js — Copies src/ to dist/ and bundles the OpenAI SDK
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

// 1. Clean and recreate dist/
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });
console.log('✓ Cleaned dist/');

// 2. Copy all files from src/ to dist/
const srcFiles = fs.readdirSync(srcDir);
for (const file of srcFiles) {
  fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
}
console.log(`✓ Copied ${srcFiles.length} files from src/ to dist/`);

// 3. Bundle the OpenAI SDK into dist/openai-bundle.js
console.log('Bundling OpenAI SDK...');
execSync(`node "${path.join(__dirname, 'bundle.js')}"`, { stdio: 'inherit', cwd: rootDir });

console.log('✓ Build complete — load the dist/ folder as an unpacked extension');
