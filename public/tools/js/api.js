// Amazon Ops SaaS API Client
const API_BASE = '/api';

function getToken() { return localStorage.getItem('amz_token'); }
function setToken(t) { localStorage.setItem('amz_token', t); }
function clearToken() { localStorage.removeItem('amz_token'); }

async function apiRequest(method, path, body) {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : null
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login.html';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const OpsAPI = {
  auth: {
    async register(username, password) {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Register failed');
      setToken(data.token);
      return data;
    },
    async login(username, password) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setToken(data.token);
      return data;
    },
    logout() { clearToken(); window.location.href = '/login.html'; },
    isLoggedIn() { return !!getToken(); }
  },

  async list(entity, params = {}) {
    const qs = new URLSearchParams({ entity, ...params });
    return apiRequest('GET', `/ops?${qs}`);
  },

  async get(entity, id) {
    const qs = new URLSearchParams({ entity, id });
    return apiRequest('GET', `/ops?${qs}`);
  },

  async create(entity, data) {
    const qs = new URLSearchParams({ entity });
    return apiRequest('POST', `/ops?${qs}`, data);
  },

  async update(entity, id, data) {
    const qs = new URLSearchParams({ entity, id });
    return apiRequest('PUT', `/ops?${qs}`, data);
  },

  async remove(entity, id) {
    const qs = new URLSearchParams({ entity, id });
    return apiRequest('DELETE', `/ops?${qs}`);
  },

  async getSettings() {
    const qs = new URLSearchParams({ entity: 'settings' });
    return apiRequest('GET', `/ops?${qs}`);
  },

  async saveSettings(data) {
    const qs = new URLSearchParams({ entity: 'settings' });
    return apiRequest('POST', `/ops?${qs}`, data);
  },

  // Legacy-compatible helpers for smoother migration
  async loadAll() {
    const [taskRes, excRes, asinRes, appRes, folderRes] = await Promise.all([
      this.list('tasks').catch(() => ({ data: [] })),
      this.list('exceptions').catch(() => ({ data: [] })),
      this.list('asins').catch(() => ({ data: [] })),
      this.list('approvals').catch(() => ({ data: [] })),
      this.list('folders').catch(() => ({ data: [] })),
    ]);
    return {
      tasks: taskRes.data || [],
      exceptions: excRes.data || [],
      asins: asinRes.data || [],
      approvals: appRes.data || [],
      folders: folderRes.data || [],
    };
  }
};

// Auto-redirect to login if not authenticated (on protected pages)
function requireAuth() {
  if (!OpsAPI.auth.isLoggedIn() && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
  }
}

// Badge updater helper
async function updateBadges() {
  try {
    const [tasks, exc, app] = await Promise.all([
      OpsAPI.list('tasks').catch(() => ({ data: [] })),
      OpsAPI.list('exceptions').catch(() => ({ data: [] })),
      OpsAPI.list('approvals').catch(() => ({ data: [] })),
    ]);
    const pendingTasks = (tasks.data || []).filter(t => t.status === 'pending').length;
    const openExc = (exc.data || []).filter(e => e.status === 'open').length;
    const pendingApp = (app.data || []).filter(a => a.status === 'pending').length;

    ['taskBadge', 'approvalBadge', 'exceptionBadge'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const v = [pendingTasks, pendingApp, openExc][i];
      if (v > 0) { el.classList.remove('hidden'); el.textContent = v; }
      else { el.classList.add('hidden'); }
    });
    const nb = document.getElementById('notifBadge');
    if (nb) {
      if (pendingTasks + openExc + pendingApp > 0) nb.classList.remove('hidden');
      else nb.classList.add('hidden');
    }
    const htc = document.getElementById('headerTaskCount');
    const hec = document.getElementById('headerExceptionCount');
    const hac = document.getElementById('headerApprovalCount');
    if (htc) htc.textContent = pendingTasks;
    if (hec) hec.textContent = openExc;
    if (hac) hac.textContent = pendingApp;
  } catch (e) { /* ignore */ }
}

window.OpsAPI = OpsAPI;
window.requireAuth = requireAuth;
window.updateBadges = updateBadges;
