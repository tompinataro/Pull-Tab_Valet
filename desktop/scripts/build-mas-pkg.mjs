import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const desktopDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopDir, 'package.json'), 'utf8'));
const installerIdentity =
  process.env.MAS_INSTALLER_IDENTITY ||
  packageJson?.build?.pkg?.identity ||
  '3rd Party Mac Developer Installer: Thomas Anthony Pinataro (S4Y9X74BAL)';

const appPath = path.join(desktopDir, 'dist', 'mas-arm64', 'Pull Tab Valet.app');

if (!fs.existsSync(appPath)) {
  console.error(`Missing MAS app bundle: ${appPath}`);
  process.exit(1);
}

const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
const readPlistValue = (key) => {
  const result = spawnSync('defaults', ['read', infoPlistPath.replace(/\.plist$/, ''), key], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || `Unable to read ${key} from ${infoPlistPath}`);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
};

const shortVersion = readPlistValue('CFBundleShortVersionString') || packageJson.version;
const bundleVersion = readPlistValue('CFBundleVersion') || shortVersion;
const outPath = path.join(
  desktopDir,
  'dist',
  `Pull-Tab-Valet-Desktop-MAS-${shortVersion}-build-${bundleVersion}-arm64-rebuilt.pkg`
);

console.log(`Building MAS installer from ${appPath}`);
console.log(`Using installer identity: ${installerIdentity}`);
console.log(`Packaging version ${shortVersion} (build ${bundleVersion})`);

const build = spawnSync(
  'productbuild',
  [
    '--component',
    appPath,
    '/Applications',
    '--sign',
    installerIdentity,
    outPath,
  ],
  { stdio: 'inherit' }
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const verify = spawnSync('pkgutil', ['--check-signature', outPath], { stdio: 'inherit' });
if (verify.status !== 0) {
  process.exit(verify.status ?? 1);
}

console.log(`MAS installer created: ${outPath}`);
