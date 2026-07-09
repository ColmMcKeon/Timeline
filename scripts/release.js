#!/usr/bin/env node
// Usage: node scripts/release.js [version]
// Example: node scripts/release.js 1.1
// If no version given, increments the patch number from the last GitHub release.

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT     = path.join(__dirname, '..');
const APP_DIR  = path.join(ROOT, 'app');
const ZIP_NAME = (v) => `Timeline-v${v}-mac-arm64.zip`;
const REPO     = 'ColmMcKeon/Timeline';

// ── Get token from git remote ──
function getToken() {
  const url = execSync('git remote get-url origin', { cwd: ROOT }).toString().trim();
  const m = url.match(/:([^:@]+)@github/);
  if (!m) { console.error('Could not extract token from git remote URL'); process.exit(1); }
  return m[1];
}

// ── GitHub API call ──
function api(method, endpoint, body) {
  const token = getToken();
  const curlBody = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : '';
  const result = execSync(
    `curl -s -X ${method} "https://api.github.com/${endpoint}" ` +
    `-H "Authorization: token ${token}" ` +
    `-H "Content-Type: application/json" ${curlBody}`
  ).toString();
  return JSON.parse(result);
}

// ── Get latest release version ──
function getLatestVersion() {
  try {
    const releases = api('GET', `repos/${REPO}/releases`);
    if (!releases.length) return '1.0';
    const tag = releases[0].tag_name || 'v1.0';
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

// 3. Create GitHub release
console.log(`\nCreating GitHub release ${tag}...`);
const token = getToken();
const releaseBody = `Timeline ${tag} — visual resource planner for macOS.\n\nInstallation:\n1. Download Timeline-${tag}-mac-arm64.zip\n2. Unzip and keep Timeline.app alongside data/ and team/ folders\n3. First launch: right-click → Open to bypass Gatekeeper\n\nRequires Apple Silicon (M1/M2/M3), macOS 12+.`;

const bodyFile = '/tmp/tl_release_body.json';
fs.writeFileSync(bodyFile, JSON.stringify({
  tag_name: tag,
  target_commitish: 'main',
  name: `Timeline ${tag}`,
  body: releaseBody,
  draft: false,
  prerelease: false
}));

const releaseResult = JSON.parse(
  execSync(`curl -s -X POST "https://api.github.com/repos/${REPO}/releases" -H "Authorization: token ${token}" -H "Content-Type: application/json" --data @${bodyFile}`).toString()
);

if (!releaseResult.upload_url) {
  console.error('Failed to create release:', JSON.stringify(releaseResult));
  process.exit(1);
}

const uploadUrl = releaseResult.upload_url.split('{')[0];
console.log('Release created:', releaseResult.html_url);

// 4. Upload zip
console.log(`\nUploading ${zipFile} (this may take a minute)...`);
const uploadResult = JSON.parse(
  execSync(
    `curl -s -X POST "${uploadUrl}?name=${zipFile}" ` +
    `-H "Authorization: token ${token}" ` +
    `-H "Content-Type: application/zip" ` +
    `--data-binary @"${zipPath}"`
  ).toString()
);

if (uploadResult.browser_download_url) {
  console.log(`\n✅  Release ${tag} published!`);
  console.log(`    ${releaseResult.html_url}`);
  console.log(`    Download: ${uploadResult.browser_download_url}`);
  // Clean up zip
  fs.unlinkSync(zipPath);
} else {
  console.error('Upload failed:', JSON.stringify(uploadResult));
  process.exit(1);
}
