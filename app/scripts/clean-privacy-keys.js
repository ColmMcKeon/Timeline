const { execSync } = require('child_process');
const path = require('path');

const appPath = process.argv[2];
if (!appPath) {
  console.error('Usage: node clean-privacy-keys.js <app-path>');
  process.exit(1);
}

const plistPath = path.join(appPath, 'Contents/Info.plist');

const keysToRemove = [
  'NSBluetoothAlwaysUsageDescription',
  'NSBluetoothPeripheralUsageDescription',
  'NSCameraUsageDescription',
  'NSMicrophoneUsageDescription',
];

keysToRemove.forEach(key => {
  try {
    execSync(`plutil -remove ${key} "${plistPath}" 2>/dev/null`, { stdio: 'ignore' });
    console.log(`✓ Removed ${key}`);
  } catch (e) {
    // Key doesn't exist, that's fine
  }
});

console.log('Privacy keys cleaned');
