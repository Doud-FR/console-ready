import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, Layers, Monitor, ChevronRight,
  RotateCcw, Download, Rocket, X, Check,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function isActive(lastUpdated) {
  if (!lastUpdated) return false;
  return Date.now() - new Date(lastUpdated).getTime() < 24 * 60 * 60 * 1000;
}

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [machines, setMachines] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [deployModal, setDeployModal] = useState(null); // { group }
  const [selectedPackage, setSelectedPackage] = useState('');
  const [expanded, setExpanded] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    setLoading(true);
    Promise.all([api.getGroups(), api.getMachines(), api.getPackages()])
      .then(([g, m, p]) => {
        setGroups(g);
        setMachines(m);
        setPackages(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const getMachineDetails = (hostname) => machines.find(m => m.hostname === hostname);

  const toggleExpand = (groupName) => {
    setExpanded(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleGroupUpdate = async (groupName) => {
    setActionLoading(`update-${groupName}`);
    try {
      const res = await api.triggerGroupAction(groupName, 'update_windows');
      showToast(`Mise à jour déclenchée sur ${res.count} machine(s) du groupe "${groupName}"`);
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setActionLoading('');
    }
  };

  const handleGroupReboot = async (groupName) => {
    setActionLoading(`reboot-${groupName}`);
    try {
      const res = await api.triggerGroupAction(groupName, 'restart');
      showToast(`Redémarrage planifié pour ${res.count} machine(s) du groupe "${groupName}"`);
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setActionLoading('');
    }
  };

  const openDeployModal = (groupName) => {
    setDeployModal({ group: groupName });
    setSelectedPackage(packages[0]?.id || '');
  };

  const confirmDeploy = async () => {
    if (!deployModal || !selectedPackage) return;
    const groupName = deployModal.group;
    setActionLoading(`deploy-${groupName}`);
    const group = groups.find(g => g.name === groupName);
    if (!group) return;
    try {
      await api.createDeployment({ package_id: selectedPackage, targets: group.machines });
      showToast(`Déploiement lancé sur ${group.machines.length} machine(s) du groupe "${groupName}"`);
      setDeployModal(null);
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setActionLoading('');
    }
  };

  const canAct = ['admin', 'tech'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Groupes</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {groups.length} groupe{groups.length !== 1 ? 's' : ''} —{' '}
            {machines.length} machine{machines.length !== 1 ? 's' : ''}
          </p>
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

      {/* Groups list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} /> Chargement…
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-zinc-500 gap-3">
          <Layers size={40} className="opacity-30" />
          <p>Aucun groupe trouvé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const isExpanded = expanded[group.name];
            const isActing = actionLoading.endsWith(`-${group.name}`);
            const activeCount = group.machines.filter(h => isActive(getMachineDetails(h)?.last_updated)).length;

            return (
              <div key={group.name} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {/* Group header */}
                <div className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => toggleExpand(group.name)}
                  >
                    <Layers size={18} className="text-blue-400 shrink-0" />
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <span className="font-semibold text-white text-lg">{group.name}</span>
                      <span className="text-sm text-zinc-400">
                        {group.machines.length} machine{group.machines.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-green-400">
                        {activeCount} active{activeCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-zinc-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {canAct && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        disabled={isActing}
                        onClick={() => handleGroupUpdate(group.name)}
                        title="Pousser les mises à jour Windows sur toutes les machines du groupe"
                        className="flex items-center gap-1.5 text-xs bg-blue-700 hover:bg-blue-600
                          disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        <Download size={13} />
                        MàJ groupe
                      </button>
                      <button
                        disabled={isActing || packages.length === 0}
                        onClick={() => openDeployModal(group.name)}
                        title="Déployer une application sur toutes les machines du groupe"
                        className="flex items-center gap-1.5 text-xs bg-purple-700 hover:bg-purple-600
                          disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        <Rocket size={13} />
                        Déployer
                      </button>
                      <button
                        disabled={isActing}
                        onClick={() => handleGroupReboot(group.name)}
                        title="Redémarrer toutes les machines du groupe"
                        className="flex items-center gap-1.5 text-xs bg-orange-700 hover:bg-orange-600
                          disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        <RotateCcw size={13} className={isActing ? 'animate-spin' : ''} />
                        Redémarrer tout
                      </button>
                    </div>
                  )}
                </div>

                {/* Machine list (expanded) */}
                {isExpanded && (
                  <div className="border-t border-zinc-800">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                            <th className="px-4 py-2.5 font-medium">Statut</th>
                            <th className="px-4 py-2.5 font-medium">Hostname</th>
                            <th className="px-4 py-2.5 font-medium">IP</th>
                            <th className="px-4 py-2.5 font-medium">OS</th>
                            <th className="px-4 py-2.5 font-medium">RAM</th>
                            <th className="px-4 py-2.5 font-medium">Dernière mise à jour</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {group.machines.map(hostname => {
                            const m = getMachineDetails(hostname);
                            if (!m) return (
                              <tr key={hostname}>
                                <td colSpan={6} className="px-4 py-2.5 text-zinc-500">{hostname}</td>
                              </tr>
                            );
                            return (
                              <tr
                                key={hostname}
                                className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                onClick={() => navigate(`/inventory/${encodeURIComponent(hostname)}`)}
                              >
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`inline-block w-2 h-2 rounded-full ${
                                      isActive(m.last_updated) ? 'bg-green-400' : 'bg-zinc-600'
                                    }`}
                                  />
                                </td>
                                <td className="px-4 py-2.5 font-medium text-white">{m.hostname}</td>
                                <td className="px-4 py-2.5 text-zinc-300">{m.ip || '—'}</td>
                                <td className="px-4 py-2.5 text-zinc-300">
                                  {m.os?.name
                                    ? `${m.os.name} ${m.os.version || ''}`
                                    : typeof m.os === 'string' ? m.os : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-zinc-300">
                                  {m.hardware?.ram ? `${m.hardware.ram} Go` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-zinc-500 text-xs">
                                  {m.last_updated
                                    ? new Date(m.last_updated).toLocaleString('fr-FR')
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy modal */}
      {deployModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Déployer sur le groupe</h3>
              <button
                onClick={() => setDeployModal(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-zinc-400 text-sm mb-4">
              Groupe : <strong className="text-white">{deployModal.group}</strong>
              {' '}({groups.find(g => g.name === deployModal.group)?.machines.length ?? 0} machine(s))
            </p>
            <label className="block text-sm text-zinc-400 mb-1">Application</label>
            <select
              value={selectedPackage}
              onChange={e => setSelectedPackage(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5"
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.version}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setDeployModal(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition text-sm"
              >
                Annuler
              </button>
              <button
                disabled={!selectedPackage || !!actionLoading}
                onClick={confirmDeploy}
                className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white py-2
                  rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                <Rocket size={14} />
                Déployer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl
          text-sm text-white border transition-all
          ${toast.ok
            ? 'bg-green-900/90 border-green-700'
            : 'bg-red-900/90 border-red-700'}`}
        >
          {toast.ok
            ? <Check size={16} className="text-green-400 shrink-0" />
            : <X size={16} className="text-red-400 shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
