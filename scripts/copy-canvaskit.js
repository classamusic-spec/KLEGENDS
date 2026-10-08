// Copies the CanvasKit WASM binary (Skia for web) into ./public so the Expo
// web dev server and static exports can serve it at /canvaskit.wasm.
// Runs automatically on `npm install` (postinstall). Native builds do not use it.

const fs = require('fs');
const path = require('path');

const publicFolder = path.join(__dirname, '..', 'public');
fs.mkdirSync(publicFolder, { recursive: true });

const wasmSrc = require.resolve('canvaskit-wasm/bin/full/canvaskit.wasm', {
  paths: [require.resolve('@shopify/react-native-skia')],
});

fs.copyFileSync(wasmSrc, path.join(publicFolder, 'canvaskit.wasm'));
console.log('[copy-canvaskit] public/canvaskit.wasm ready');
