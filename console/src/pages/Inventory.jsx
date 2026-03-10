import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RefreshCw, Monitor, Trash2,
  ChevronRight, Wifi, WifiOff, RotateCcw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function isActive(lastUpdated) {
  if (!lastUpdated) return false;
  return Date.now() - new Date(lastUpdated).getTime() < 24 * 60 * 60 * 1000;
}

export default function Inventory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    api.getMachines()
      .then(setMachines)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const groups = [...new Set(machines.map(m => m.group).filter(Boolean))].sort();

  const filtered = machines.filter(m => {
    const matchSearch =
      !search ||
      m.hostname?.toLowerCase().includes(search.toLowerCase()) ||
      m.ip?.includes(search) ||
      m.domain?.toLowerCase().includes(search.toLowerCase());
    const matchGroup = !groupFilter || m.group === groupFilter;
    return matchSearch && matchGroup;
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteMachine(deleteTarget);
      setMachines(prev => prev.filter(m => m.hostname !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const triggerUpdate = async (hostname) => {
    try {
      await api.triggerAction(hostname, 'update_windows');
      alert(`Action "update_windows" déclenchée pour ${hostname}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const triggerReboot = async (hostname) => {
    try {
      await api.triggerAction(hostname, 'restart');
      alert(`Redémarrage planifié pour ${hostname}`);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventaire</h1>
          <p className="text-zinc-400 text-sm mt-1">{machines.length} machine{machines.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700
            px-4 py-2 rounded-lg transition"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, IP, domaine…"
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm
              text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {groups.length > 0 && (
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les groupes</option>
            {groups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <RefreshCw className="animate-spin mr-2" size={20} /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-zinc-500 gap-3">
            <Monitor size={40} className="opacity-30" />
            <p>Aucune machine trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Hostname</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">OS</th>
                  <th className="px-4 py-3 font-medium">RAM</th>
                  <th className="px-4 py-3 font-medium">Groupe</th>
                  <th className="px-4 py-3 font-medium">Dernière mise à jour</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map(m => (
                  <tr
                    key={m.hostname}
                    className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/inventory/${encodeURIComponent(m.hostname)}`)}
                  >
                    <td className="px-4 py-3">
                      {isActive(m.last_updated)
                        ? <Wifi size={16} className="text-green-400" />
                        : <WifiOff size={16} className="text-zinc-600" />
                      }
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{m.hostname}</td>
                    <td className="px-4 py-3 text-zinc-300">{m.ip || '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {m.os?.name
                        ? `${m.os.name} ${m.os.version || ''}`
                        : typeof m.os === 'string' ? m.os : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {m.hardware?.ram ? `${m.hardware.ram} Go` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {m.group && (
                        <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                          {m.group}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {m.last_updated
                        ? new Date(m.last_updated).toLocaleString('fr-FR')
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {['admin', 'tech'].includes(user?.role) && (
                          <button
                            onClick={() => triggerUpdate(m.hostname)}
                            className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2.5 py-1 rounded
                              transition"
                          >
                            MàJ
                          </button>
                        )}
                        {['admin', 'tech'].includes(user?.role) && (
                          <button
                            onClick={() => triggerReboot(m.hostname)}
                            title="Redémarrer"
                            className="p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-orange-900/20 rounded transition"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => setDeleteTarget(m.hostname)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-zinc-600 ml-1" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Supprimer la machine ?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Voulez-vous vraiment supprimer <strong className="text-white">{deleteTarget}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition text-sm"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg transition text-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
