const express = require('express');
const path = require('path');
const app = express();

const ROOT = __dirname;

const MIME = {
  '.glb':  'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.wasm': 'application/wasm',
  '.json': 'application/json'
};

app.use(express.static(ROOT, {
  setHeaders(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (MIME[ext]) res.setHeader('Content-Type', MIME[ext]);
    if (ext === '.glb' || ext === '.gltf' || ext === '.png' || ext === '.jpg') {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Rock'n Ride server running on port ${PORT}`);
});
