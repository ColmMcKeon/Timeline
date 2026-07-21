#!/usr/bin/env node
// Usage: node scripts/release.js [version]
// Example: node scripts/release.js 1.1
// If no version given, increments the patch number from the last GitHub release.
// Uses the `gh` CLI for all GitHub API access (auth handled by `gh auth login`).

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT     = path.join(__dirname, '..');
const ZIP_NAME = (v) => `Timeline-v${v}-mac-arm64.zip`;
const REPO     = 'ColmMcKeon/Timeline';

// ── Get latest release version ──
function getLatestVersion() {
  try {
    const tag = execSync(`gh release view --repo ${REPO} --json tagName -q .tagName`, { cwd: ROOT }).toString().trim();
    return tag.replace(/^v/, '');
  } catch(_) { return '1.0'; }
}

// ── Bump patch version (1.0 → 1.1) ──
function bumpVersion(v) {
  const parts = v.split('.');
  parts[parts.length - 1] = String(parseInt(parts[parts.length - 1]) + 1);
  return parts.join('.');
}

// ── Main ──
const argVersion = process.argv[2];
const version = argVersion || bumpVersion(getLatestVersion());
const tag = `v${version}`;
const zipFile = ZIP_NAME(version);
const zipPath = path.join(ROOT, zipFile);

console.log(`\n📦  Building release ${tag}...\n`);

// 1. Zip the app
console.log('Creating zip...');
execSync(`ditto -c -k --sequesterRsrc --keepParent Timeline.app "${zipFile}"`, { cwd: ROOT, stdio: 'inherit' });

// 2. Commit & push source changes
console.log('\nCommitting source changes...');
try {
  execSync(`git add app/main.js app/preload.js app/package.json app/timeline.html app/icon.icns scripts/`, { cwd: ROOT });
  execSync(`git commit -m "Release ${tag}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync('git push', { cwd: ROOT, stdio: 'inherit' });
} catch(e) {
  // Nothing to commit is fine
  console.log('(no source changes to commit)');
  try { execSync('git push', { cwd: ROOT, stdio: 'inherit' }); } catch(_) {}
}

// 3. Create GitHub release and upload the zip in one step
console.log(`\nCreating GitHub release ${tag}...`);
const releaseBody = `Timeline ${tag} — visual resource planner for macOS.\n\nInstallation:\n1. Download Timeline-${tag}-mac-arm64.zip\n2. Unzip and keep Timeline.app alongside data/ and team/ folders\n3. First launch: right-click → Open to bypass Gatekeeper\n\nRequires Apple Silicon (M1/M2/M3), macOS 12+.`;

const notesFile = '/tmp/tl_release_notes.md';
fs.writeFileSync(notesFile, releaseBody);

try {
  execSync(
    `gh release create ${tag} "${zipPath}" --repo ${REPO} --title "Timeline ${tag}" --notes-file "${notesFile}"`,
    { cwd: ROOT, stdio: 'inherit' }
  );
  console.log(`\n✅  Release ${tag} published!`);
  console.log(`    https://github.com/${REPO}/releases/tag/${tag}`);
  fs.unlinkSync(zipPath);
} catch (e) {
  console.error('Release failed:', e.message);
  process.exit(1);
} finally {
  fs.unlinkSync(notesFile);
}
