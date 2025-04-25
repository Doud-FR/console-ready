const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;
const dataFile = path.join(__dirname, 'data.json');

// Middleware pour CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Désactiver l'en-tête X-Powered-By pour des raisons de sécurité
app.disable('x-powered-by');

// Servir les fichiers statiques en premier avec les bons Content-Type
app.use('/lib', express.static(path.join(__dirname, 'public/lib'), {
  setHeaders: (res, filePath) => {
    console.log(`Serving file from /lib: ${filePath}`);
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      console.log('Set Content-Type to text/javascript for', filePath);
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.use('/', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    console.log(`Serving file from /: ${filePath}`);
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      console.log('Set Content-Type to text/html for', filePath);
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Middleware pour parser le JSON (après les fichiers statiques)
app.use(express.json());

// API pour recevoir l'inventaire
app.post('/api/inventory', async (req, res) => {
  try {
    const data = await readData();
    const { hostname, ip, domain, os, software, hardware, compatibility } = req.body;
    const existing = data.inventory.find(m => m.hostname === hostname);
    if (existing) {
      Object.assign(existing, { ip, domain, os, software, hardware, compatibility, last_updated: new Date() });
    } else {
      data.inventory.push({ hostname, ip, domain, os, software, hardware, compatibility, last_updated: new Date() });
    }
    await writeData(data);
    res.status(200).json({ message: 'Inventaire reçu' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour lister les machines
app.get('/api/machines', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour déclencher une action
app.post('/api/action', async (req, res) => {
  try {
    const data = await readData();
    const { hostname, action, force } = req.body;
    const actionId = data.actions.length + 1;
    data.actions.push({ id: actionId, hostname, action, force, status: 'pending', created_at: new Date() });
    await writeData(data);
    res.json({ actionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour récupérer les actions en attente
app.get('/api/actions/:hostname', async (req, res) => {
  try {
    const data = await readData();
    const { hostname } = req.params;
    const actions = data.actions.filter(a => a.hostname === hostname && a.status === 'pending');
    res.json(actions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour remonter les erreurs
app.post('/api/error', async (req, res) => {
  try {
    const data = await readData();
    const { hostname, error } = req.body;
    data.errors.push({ hostname, error, created_at: new Date() });
    await writeData(data);
    res.status(200).json({ message: 'Erreur reçue' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Initialisation du fichier JSON si inexistant
async function initDataFile() {
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify({ inventory: [], actions: [], errors: [] }));
  }
}

// Lire les données
async function readData() {
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw);
}

// Écrire les données
async function writeData(data) {
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

initDataFile().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://0.0.0.0:${port}`);
  });
});