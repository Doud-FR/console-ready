import { useState, useEffect } from 'react';
import {
  Package, Plus, Pencil, Trash2, X, RefreshCw, Save,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  name: '', version: '1.0.0', description: '', vendor: '',
  type: 'exe', install_cmd: '', uninstall_cmd: '',
};

const TYPES = ['exe', 'msi', 'script', 'zip', 'other'];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
  placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500`;

export default function Packages() {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | {pkg}
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.getPackages()
      .then(setPackages)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY); setError(''); setModal('create'); };
  const openEdit = (pkg) => { setForm({ ...pkg }); setError(''); setModal(pkg); };
  const closeModal = () => setModal(null);

  const save = async () => {
    if (!form.name.trim()) { setError('Le nom est requis'); return; }
    setSaving(true);
    setError('');
    try {
      if (modal === 'create') {
        const created = await api.createPackage(form);
        setPackages(prev => [...prev, created]);
      } else {
        const updated = await api.updatePackage(modal.id, form);
        setPackages(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deletePackage(deleteTarget);
      setPackages(prev => prev.filter(p => p.id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const canEdit = ['admin', 'tech'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Paquets logiciels</h1>
          <p className="text-zinc-400 text-sm mt-1">{packages.length} paquet{packages.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-800
              hover:bg-zinc-700 px-4 py-2 rounded-lg transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white
                px-4 py-2 rounded-lg transition"
            >
              <Plus size={15} />
              Nouveau paquet
            </button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} /> Chargement…
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-zinc-500 gap-3">
          <Package size={40} className="opacity-30" />
          <p>Aucun paquet disponible</p>
          {canEdit && (
            <button onClick={openCreate} className="text-sm text-blue-400 hover:text-blue-300">
              Créer le premier paquet →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-900/40 border border-purple-800/40 rounded-lg
                    flex items-center justify-center">
                    <Package size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{pkg.name}</p>
                    <p className="text-xs text-zinc-500">{pkg.version} — {pkg.vendor || 'N/A'}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(pkg)}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition"
                    >
                      <Pencil size={14} />
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setDeleteTarget(pkg.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {pkg.description && (
                <p className="text-xs text-zinc-400 line-clamp-2">{pkg.description}</p>
              )}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800">
                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                  {pkg.type || 'exe'}
                </span>
                <span className="text-xs text-zinc-600">
                  {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('fr-FR') : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal !== null && (
        <Modal
          title={modal === 'create' ? 'Nouveau paquet' : `Modifier — ${modal.name}`}
          onClose={closeModal}
        >
          <div className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Nom *">
                <input className={inputCls} value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Version">
                <input className={inputCls} value={form.version}
                  onChange={e => setForm({ ...form, version: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Éditeur">
                <input className={inputCls} value={form.vendor}
                  onChange={e => setForm({ ...form, vendor: e.target.value })} />
              </Field>
              <Field label="Type">
                <select className={inputCls} value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </Field>

            <Field label="Commande d'installation">
              <input className={inputCls + ' font-mono text-xs'} value={form.install_cmd}
                placeholder="msiexec /i setup.msi /quiet"
                onChange={e => setForm({ ...form, install_cmd: e.target.value })} />
            </Field>

            <Field label="Commande de désinstallation">
              <input className={inputCls + ' font-mono text-xs'} value={form.uninstall_cmd}
                placeholder="msiexec /x {GUID} /quiet"
                onChange={e => setForm({ ...form, uninstall_cmd: e.target.value })} />
            </Field>

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal}
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
        <Modal title="Supprimer le paquet ?" onClose={() => setDeleteTarget(null)}>
          <p className="text-zinc-400 text-sm mb-6">
            Cette action est irréversible et supprimera également les déploiements associés.
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
