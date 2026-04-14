/**
 * afterPack.cjs — electron-builder afterPack hook.
 *
 * Runs after the app is packaged but before the installer/portable is created.
 * We use it to embed the .ico into the exe directly via rcedit,
 * bypassing the winCodeSign toolchain that fails on Windows due to symlink restrictions.
 */

const { rcedit } = require('rcedit');
const path   = require('path');

module.exports = async function afterPack({ appOutDir, packager }) {
  // Only needed on Windows targets
  if (packager.platform.name !== 'windows') return;

  const exeName = `${packager.appInfo.productName}.exe`;
  const exePath = path.join(appOutDir, exeName);
  const icoPath = path.resolve(__dirname, '../public/app-icon.ico');

  console.log(`  • patching icon → ${exeName}`);

  await rcedit(exePath, { icon: icoPath });
};
