import { useState, useEffect } from 'react';
import {
  Users, Plus, Pencil, Trash2, X, Save, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const ROLES = ['admin', 'tech', 'viewer'];

const ROLE_LABELS = { admin: 'Administrateur', tech: 'Technicien', viewer: 'Observateur' };

const ROLE_COLORS = {
  admin: 'bg-purple-900/40 text-purple-400 border-purple-700',
  tech: 'bg-blue-900/40 text-blue-400 border-blue-700',
  viewer: 'bg-zinc-700 text-zinc-400 border-zinc-600',
};

const EMPTY = { username: '', password: '', role: 'viewer', email: '' };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const inputCls = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
  placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500`;

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    api.getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(EMPTY);
    setShowPwd(false);
    setError('');
    setModal('create');
  };

  const openEdit = (u) => {
    setForm({ username: u.username, role: u.role, email: u.email || '', password: '' });
    setShowPwd(false);
    setError('');
    setModal(u);
  };

  const save = async () => {
    if (!form.username.trim()) { setError('Le nom d\'utilisateur est requis'); return; }
    if (modal === 'create' && !form.password) { setError('Le mot de passe est requis'); return; }
    setSaving(true);
    setError('');
    try {
      if (modal === 'create') {
        const u = await api.createUser(form);
        setUsers(prev => [...prev, u]);
      } else {
        const payload = { username: form.username, role: form.role, email: form.email };
        if (form.password) payload.password = form.password;
        const u = await api.updateUser(modal.id, payload);
        setUsers(prev => prev.map(x => x.id === u.id ? u : x));
      }
      setModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
          Accès réservé aux administrateurs.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-zinc-400 text-sm mt-1">Gestion des utilisateurs et de l&apos;accès</p>
      </div>

      {/* Users */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={18} className="text-blue-400" />
            Utilisateurs ({users.length})
          </h2>
          <div className="flex gap-2">
            <button onClick={load}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-800
                hover:bg-zinc-700 px-3 py-2 rounded-lg transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white
                px-4 py-2 rounded-lg transition">
              <Plus size={14} />
              Ajouter
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <RefreshCw className="animate-spin mr-2" size={20} /> Chargement…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                  <th className="px-4 py-3 font-medium">Utilisateur</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Créé le</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center
                          text-sm font-bold uppercase">
                          {u.username[0]}
                        </div>
                        <span className="text-white font-medium">{u.username}</span>
                        {u.id === currentUser?.id && (
                          <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">vous</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs border rounded px-2 py-0.5 ${ROLE_COLORS[u.role] ?? ''}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition">
                          <Pencil size={14} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button onClick={() => setDeleteTarget(u.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded transition">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Roles legend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Rôles et permissions</h3>
          <div className="space-y-2 text-sm text-zinc-400">
            <div className="flex gap-3">
              <span className="text-xs border rounded px-2 py-0.5 bg-purple-900/40 text-purple-400 border-purple-700 shrink-0">
                admin
              </span>
              <span>Accès complet : gestion des utilisateurs, des paquets, des déploiements et de l&apos;inventaire</span>
            </div>
            <div className="flex gap-3">
              <span className="text-xs border rounded px-2 py-0.5 bg-blue-900/40 text-blue-400 border-blue-700 shrink-0">
                tech
              </span>
              <span>Peut créer des paquets, déclencher des déploiements et des actions</span>
            </div>
            <div className="flex gap-3">
              <span className="text-xs border rounded px-2 py-0.5 bg-zinc-700 text-zinc-400 border-zinc-600 shrink-0">
                viewer
              </span>
              <span>Lecture seule : consultation de l&apos;inventaire, des paquets et des déploiements</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit modal */}
      {modal !== null && (
        <Modal
          title={modal === 'create' ? 'Nouvel utilisateur' : `Modifier — ${modal.username}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <Field label="Nom d'utilisateur *">
              <input className={inputCls} value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} />
            </Field>

            <Field label={modal === 'create' ? 'Mot de passe *' : 'Nouveau mot de passe (laisser vide pour conserver)'}>
              <div className="relative">
                <input className={inputCls + ' pr-10'}
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={modal !== 'create' ? '••••••••' : ''} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Rôle">
              <select className={inputCls} value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>

            <Field label="Email">
              <input className={inputCls} type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </Field>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition text-sm">
                Annuler
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2
                  rounded-lg transition text-sm flex items-center justify-center gap-2">
                <Save size={14} />
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Supprimer l'utilisateur ?" onClose={() => setDeleteTarget(null)}>
          <p className="text-zinc-400 text-sm mb-6">
            Cette action est irréversible.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition text-sm">
              Annuler
            </button>
            <button onClick={confirmDelete}
              className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg transition text-sm">
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
