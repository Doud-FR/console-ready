import { useState, useEffect } from 'react';
import {
  Rocket, Plus, RefreshCw, CheckCircle, Clock,
  XCircle, X, Package,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'En attente', cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-700', icon: Clock },
    success: { label: 'Succès', cls: 'bg-green-900/40 text-green-400 border-green-700', icon: CheckCircle },
    failed: { label: 'Échoué', cls: 'bg-red-900/40 text-red-400 border-red-700', icon: XCircle },
  };
  const { label, cls, icon: Icon } = map[status] || {
    label: status, cls: 'bg-zinc-800 text-zinc-400 border-zinc-700', icon: Clock,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5 ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

export default function Deployments() {
  const { user } = useAuth();
  const [deployments, setDeployments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ package_id: '', targets: [] });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getDeployments(),
      api.getPackages(),
      api.getMachines(),
    ]).then(([d, p, m]) => {
      setDeployments(d);
      setPackages(p);
      setMachines(m);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleTarget = (hostname) => {
    setForm(prev => ({
      ...prev,
      targets: prev.targets.includes(hostname)
        ? prev.targets.filter(h => h !== hostname)
        : [...prev.targets, hostname],
    }));
  };

  const createDeployment = async () => {
    if (!form.package_id) { setError('Sélectionnez un paquet'); return; }
    if (!form.targets.length) { setError('Sélectionnez au moins une machine'); return; }
    setCreating(true);
    setError('');
    try {
      const dep = await api.createDeployment(form);
      setDeployments(prev => [dep, ...prev]);
      setShowModal(false);
      setForm({ package_id: '', targets: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const canDeploy = ['admin', 'tech'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Déploiements</h1>
          <p className="text-zinc-400 text-sm mt-1">{deployments.length} déploiement{deployments.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-800
              hover:bg-zinc-700 px-4 py-2 rounded-lg transition">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          {canDeploy && (
            <button onClick={() => { setShowModal(true); setError(''); }}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white
                px-4 py-2 rounded-lg transition">
              <Plus size={15} />
              Nouveau déploiement
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <RefreshCw className="animate-spin mr-2" size={20} /> Chargement…
          </div>
        ) : deployments.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-zinc-500 gap-3">
            <Rocket size={40} className="opacity-30" />
            <p>Aucun déploiement</p>
            {canDeploy && (
              <button onClick={() => setShowModal(true)} className="text-sm text-blue-400 hover:text-blue-300">
                Créer un déploiement →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {deployments.map(dep => {
              const pkg = packages.find(p => p.id === dep.package_id);
              return (
                <div key={dep.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 bg-blue-900/30 border border-blue-800/30 rounded-lg flex items-center
                      justify-center mt-0.5">
                      <Package size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{pkg?.name ?? `Paquet #${dep.package_id}`}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {dep.targets.length} machine{dep.targets.length !== 1 ? 's' : ''} — par {dep.triggered_by}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {dep.targets.map(h => (
                          <span key={h} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={dep.status} />
                    <span className="text-xs text-zinc-600">
                      {new Date(dep.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Nouveau déploiement</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              {error && (
                <div className="px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Paquet à déployer *</label>
                <select
                  value={form.package_id}
                  onChange={e => setForm({ ...form, package_id: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Sélectionner un paquet —</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} v{p.version}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">
                  Machines cibles * ({form.targets.length} sélectionnée{form.targets.length !== 1 ? 's' : ''})
                </label>
                {machines.length === 0 ? (
                  <p className="text-zinc-500 text-sm">Aucune machine dans l&apos;inventaire</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {machines.map(m => (
                      <label
                        key={m.hostname}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800
                          cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={form.targets.includes(m.hostname)}
                          onChange={() => toggleTarget(m.hostname)}
                          className="accent-blue-500"
                        />
                        <span className="text-sm text-white">{m.hostname}</span>
                        <span className="text-xs text-zinc-500">{m.ip}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition text-sm">
                Annuler
              </button>
              <button onClick={createDeployment} disabled={creating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2
                  rounded-lg transition text-sm flex items-center justify-center gap-2">
                <Rocket size={14} />
                {creating ? 'Déploiement…' : 'Déployer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
