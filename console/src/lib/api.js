const BASE = '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && getToken()) {
    localStorage.removeItem('token');
    // Dispatch a custom event so the AuthContext can handle the redirect
    // without a hard page reload when possible, but fall back to reload
    // if no handler is registered yet (e.g., before React mounts).
    const handled = window.dispatchEvent(new CustomEvent('applideploy:unauthorized'));
    if (!handled) window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  delete: (url) => request('DELETE', url),

  // Auth
  login: (username, password) => request('POST', '/api/auth/login', { username, password }),
  me: () => request('GET', '/api/auth/me'),

  // Stats
  stats: () => request('GET', '/api/stats'),

  // Machines
  getMachines: () => request('GET', '/api/machines'),
  getMachine: (hostname) => request('GET', `/api/machines/${encodeURIComponent(hostname)}`),
  deleteMachine: (hostname) => request('DELETE', `/api/machines/${encodeURIComponent(hostname)}`),
  updateMachine: (hostname, body) => request('PATCH', `/api/machines/${encodeURIComponent(hostname)}`, body),

  // Groups
  getGroups: () => request('GET', '/api/groups'),
  triggerGroupAction: (group, action, force = false, params = {}) =>
    request('POST', `/api/groups/${encodeURIComponent(group)}/action`, { action, force, params }),

  // Actions
  getActions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/actions${qs ? '?' + qs : ''}`);
  },
  triggerAction: (hostname, action, force = false, params = {}) =>
    request('POST', '/api/action', { hostname, action, force, params }),
  updateActionStatus: (id, status, result) =>
    request('PUT', `/api/actions/${id}/status`, { status, result }),

  // Packages
  getPackages: () => request('GET', '/api/packages'),
  createPackage: (pkg) => request('POST', '/api/packages', pkg),
  updatePackage: (id, pkg) => request('PUT', `/api/packages/${id}`, pkg),
  deletePackage: (id) => request('DELETE', `/api/packages/${id}`),

  // Deployments
  getDeployments: () => request('GET', '/api/deployments'),
  createDeployment: (dep) => request('POST', '/api/deployments', dep),

  // Users
  getUsers: () => request('GET', '/api/users'),
  createUser: (user) => request('POST', '/api/users', user),
  updateUser: (id, user) => request('PUT', `/api/users/${id}`, user),
  deleteUser: (id) => request('DELETE', `/api/users/${id}`),
};
