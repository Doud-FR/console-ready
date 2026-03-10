require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'data.json');

const JWT_SECRET = process.env.JWT_SECRET;
const AGENT_SECRET = process.env.AGENT_SECRET;
const _DEFAULT_JWT_SECRET = 'applideploy-secret-change-in-production';
const _DEFAULT_AGENT_SECRET = 'applideploy-agent-secret';

// Warn loudly when running with default secrets
if (!JWT_SECRET) {
  console.warn(
    '\n⚠️  WARNING: JWT_SECRET is not set. Using insecure default. ' +
    'Set the JWT_SECRET environment variable before deploying to production.\n'
  );
}
if (!AGENT_SECRET) {
  console.warn(
    '\n⚠️  WARNING: AGENT_SECRET is not set. Using insecure default. ' +
    'Set the AGENT_SECRET environment variable before deploying to production.\n'
  );
}

const effectiveJwtSecret = JWT_SECRET || _DEFAULT_JWT_SECRET;
const effectiveAgentSecret = AGENT_SECRET || _DEFAULT_AGENT_SECRET;

// ─── Rate limiters ────────────────────────────────────────────────────────────
// Strict limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez plus tard' },
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, ralentissez' },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-Secret'],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

// Apply rate limiting globally — auth gets a stricter limit
app.use(apiLimiter);
app.use('/api/auth', authLimiter);

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const agentSecret = req.headers['x-agent-secret'];
  if (agentSecret && agentSecret === effectiveAgentSecret) {
    req.user = { role: 'agent', username: 'agent' };
    return next();
  }
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), effectiveJwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user.role === 'agent' && roles.includes('agent')) return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
}

// ─── Authentication ───────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiants manquants' });
    }
    const data = await readData();
    const user = data.users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      effectiveJwtSecret,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json(req.user);
});

// ─── Machines / Inventory ─────────────────────────────────────────────────────
app.get('/api/machines', authenticate, async (req, res) => {
  try {
    const data = await readData();
    res.json(data.inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/machines/:hostname', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const machine = data.inventory.find(m => m.hostname === req.params.hostname);
    if (!machine) return res.status(404).json({ error: 'Machine non trouvée' });
    res.json(machine);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/inventory', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { hostname, ip, domain, os, software, hardware, compatibility, group } = req.body;
    if (!hostname) return res.status(400).json({ error: 'hostname requis' });
    const existing = data.inventory.find(m => m.hostname === hostname);
    if (existing) {
      Object.assign(existing, {
        ip, domain, os,
        software: software || existing.software,
        hardware: hardware || existing.hardware,
        compatibility: compatibility || existing.compatibility,
        group: group || existing.group,
        last_updated: new Date().toISOString(),
      });
    } else {
      data.inventory.push({
        hostname, ip, domain, os,
        software: software || [],
        hardware: hardware || {},
        compatibility: compatibility || {},
        group: group || 'default',
        last_updated: new Date().toISOString(),
      });
    }
    await writeData(data);
    res.status(200).json({ message: 'Inventaire reçu' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/machines/:hostname', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await readData();
    data.inventory = data.inventory.filter(m => m.hostname !== req.params.hostname);
    await writeData(data);
    res.json({ message: 'Machine supprimée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Actions ──────────────────────────────────────────────────────────────────
app.get('/api/actions', authenticate, async (req, res) => {
  try {
    const data = await readData();
    let actions = data.actions;
    if (req.query.hostname) actions = actions.filter(a => a.hostname === req.query.hostname);
    if (req.query.status) actions = actions.filter(a => a.status === req.query.status);
    res.json(actions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Agent polling endpoint – returns only pending actions for a given hostname
app.get('/api/actions/pending/:hostname', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const actions = data.actions.filter(
      a => a.hostname === req.params.hostname && a.status === 'pending'
    );
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/action', authenticate, requireRole('admin', 'tech'), async (req, res) => {
  try {
    const data = await readData();
    const { hostname, action, force, params } = req.body;
    if (!hostname || !action) return res.status(400).json({ error: 'hostname et action requis' });
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    data.actions.push({
      id, hostname, action,
      force: force || false,
      params: params || {},
      status: 'pending',
      created_at: new Date().toISOString(),
      triggered_by: req.user.username,
    });
    await writeData(data);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/actions/:id/status', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const action = data.actions.find(a => a.id === req.params.id);
    if (!action) return res.status(404).json({ error: 'Action non trouvée' });
    const { status, result } = req.body;
    action.status = status || action.status;
    action.result = result || null;
    action.completed_at = new Date().toISOString();
    await writeData(data);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Packages ─────────────────────────────────────────────────────────────────
app.get('/api/packages', authenticate, async (req, res) => {
  try {
    const data = await readData();
    res.json(data.packages);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/packages', authenticate, requireRole('admin', 'tech'), async (req, res) => {
  try {
    const data = await readData();
    const { name, version, description, vendor, type, install_cmd, uninstall_cmd } = req.body;
    if (!name) return res.status(400).json({ error: 'name requis' });
    const pkg = {
      id: Date.now().toString(),
      name, version: version || '1.0.0', description: description || '',
      vendor: vendor || '', type: type || 'exe',
      install_cmd: install_cmd || '', uninstall_cmd: uninstall_cmd || '',
      created_at: new Date().toISOString(),
      created_by: req.user.username,
    };
    data.packages.push(pkg);
    await writeData(data);
    res.status(201).json(pkg);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/packages/:id', authenticate, requireRole('admin', 'tech'), async (req, res) => {
  try {
    const data = await readData();
    const idx = data.packages.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Paquet non trouvé' });
    data.packages[idx] = { ...data.packages[idx], ...req.body, updated_at: new Date().toISOString() };
    await writeData(data);
    res.json(data.packages[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/packages/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await readData();
    data.packages = data.packages.filter(p => p.id !== req.params.id);
    await writeData(data);
    res.json({ message: 'Paquet supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Deployments ──────────────────────────────────────────────────────────────
app.get('/api/deployments', authenticate, async (req, res) => {
  try {
    const data = await readData();
    res.json(data.deployments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/deployments', authenticate, requireRole('admin', 'tech'), async (req, res) => {
  try {
    const data = await readData();
    const { package_id, targets, scheduled_at } = req.body;
    if (!package_id || !targets || !targets.length) {
      return res.status(400).json({ error: 'package_id et targets requis' });
    }
    const pkg = data.packages.find(p => p.id === package_id);
    if (!pkg) return res.status(404).json({ error: 'Paquet non trouvé' });
    if (!pkg.install_cmd) return res.status(400).json({ error: 'Le paquet ne possède pas de commande d\'installation' });
    const deployment = {
      id: Date.now().toString(),
      package_id,
      targets,
      status: 'pending',
      created_at: new Date().toISOString(),
      scheduled_at: scheduled_at || null,
      triggered_by: req.user.username,
      results: {},
    };
    for (const hostname of targets) {
      const actionId = Date.now().toString() + Math.random().toString(36).slice(2, 7);
      data.actions.push({
        id: actionId,
        hostname,
        action: 'install_package',
        params: { package_id, install_cmd: pkg.install_cmd },
        deployment_id: deployment.id,
        force: false,
        status: 'pending',
        created_at: new Date().toISOString(),
        triggered_by: req.user.username,
      });
    }
    data.deployments.push(deployment);
    await writeData(data);
    res.status(201).json(deployment);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Dashboard stats ──────────────────────────────────────────────────────────
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    res.json({
      machines: {
        total: data.inventory.length,
        active: data.inventory.filter(
          m => m.last_updated && new Date(m.last_updated) > dayAgo
        ).length,
      },
      actions: {
        total: data.actions.length,
        pending: data.actions.filter(a => a.status === 'pending').length,
        success: data.actions.filter(a => a.status === 'success').length,
        failed: data.actions.filter(a => a.status === 'failed').length,
      },
      packages: { total: data.packages.length },
      deployments: {
        total: data.deployments.length,
        pending: data.deployments.filter(d => d.status === 'pending').length,
      },
      errors: {
        total: data.errors.length,
        recent: data.errors.filter(e => new Date(e.created_at) > dayAgo).length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Errors ───────────────────────────────────────────────────────────────────
app.post('/api/error', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { hostname, error } = req.body;
    if (!hostname || !error) return res.status(400).json({ error: 'hostname et error requis' });
    data.errors.push({ hostname, error, created_at: new Date().toISOString() });
    await writeData(data);
    res.status(200).json({ message: 'Erreur reçue' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.get('/api/users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await readData();
    res.json(data.users.map(u => ({
      id: u.id, username: u.username, role: u.role, email: u.email, created_at: u.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await readData();
    const { username, password, role, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username et password requis' });
    if (data.users.find(u => u.username === username)) {
      return res.status(409).json({ error: 'Nom d\'utilisateur déjà utilisé' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now().toString(),
      username, password_hash,
      role: role || 'viewer',
      email: email || '',
      created_at: new Date().toISOString(),
    };
    data.users.push(user);
    await writeData(data);
    res.status(201).json({ id: user.id, username: user.username, role: user.role, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const { username, role, email, password } = req.body;
    if (username) user.username = username;
    if (role) user.role = role;
    if (email !== undefined) user.email = email;
    if (password) user.password_hash = await bcrypt.hash(password, 10);
    await writeData(data);
    res.json({ id: user.id, username: user.username, role: user.role, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await readData();
    const admins = data.users.filter(u => u.role === 'admin');
    const user = data.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (user.role === 'admin' && admins.length === 1) {
      return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
    }
    data.users = data.users.filter(u => u.id !== req.params.id);
    await writeData(data);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint non trouvé' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Data helpers ─────────────────────────────────────────────────────────────
async function readData() {
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

async function initDataFile() {
  let data;
  try {
    await fs.access(dataFile);
    data = await readData();
  } catch {
    data = {};
  }
  let changed = false;
  if (!data.users) { data.users = []; changed = true; }
  if (!data.inventory) { data.inventory = []; changed = true; }
  if (!data.actions) { data.actions = []; changed = true; }
  if (!data.packages) { data.packages = []; changed = true; }
  if (!data.deployments) { data.deployments = []; changed = true; }
  if (!data.errors) { data.errors = []; changed = true; }

  if (data.users.length === 0) {
    // Generate a random secure initial password if ADMIN_PASSWORD is not set
    const initialPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
    const password_hash = await bcrypt.hash(initialPassword, 10);
    data.users.push({
      id: '1',
      username: 'admin',
      password_hash,
      role: 'admin',
      email: 'admin@example.com',
      created_at: new Date().toISOString(),
    });
    changed = true;
    if (!process.env.ADMIN_PASSWORD) {
      console.log(
        '\n✅ Compte admin créé.\n' +
        `   Identifiants : admin / ${initialPassword}\n` +
        '   Changez ce mot de passe dès votre première connexion.\n'
      );
    }
  } else if (process.env.ADMIN_PASSWORD) {
    // If ADMIN_PASSWORD is set and admin user already exists, sync the password hash
    const adminUser = data.users.find(u => u.username === 'admin');
    if (adminUser) {
      const matches = await bcrypt.compare(process.env.ADMIN_PASSWORD, adminUser.password_hash);
      if (!matches) {
        adminUser.password_hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        changed = true;
        console.log('\n✅ Mot de passe admin mis à jour depuis ADMIN_PASSWORD.\n');
      }
    }
  }
  if (changed) await writeData(data);
}

initDataFile().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`AppliDeploy Server démarré sur http://0.0.0.0:${port}`);
  });
}).catch(err => {
  console.error('Erreur d\'initialisation:', err);
  process.exit(1);
});