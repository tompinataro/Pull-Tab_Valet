import fs from 'node:fs/promises';
import path from 'node:path';

// Expo web export assumes a server root (leading "/").
// For Electron file:// loading, we need relative paths.

const distDir = path.join(process.cwd(), '..', 'mobile', 'dist');
const indexPath = path.join(distDir, 'index.html');

let html = await fs.readFile(indexPath, 'utf8');

// Convert common absolute asset paths to relative.
html = html
  .replace(/\bhref="\/(favicon\.ico)"/g, 'href="./$1"')
  .replace(/\bsrc="\/_expo\//g, 'src="./_expo/')
  .replace(/\bhref="\/_expo\//g, 'href="./_expo/');

await fs.writeFile(indexPath, html);

console.log(`Patched web paths for Electron: ${indexPath}`);
