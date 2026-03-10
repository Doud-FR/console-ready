import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Monitor, Cpu, HardDrive, Wifi,
  Package, RefreshCw, CheckCircle, XCircle, Clock,
  Shield, ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'En attente', cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-700' },
    success: { label: 'Succès', cls: 'bg-green-900/40 text-green-400 border-green-700' },
    failed: { label: 'Échoué', cls: 'bg-red-900/40 text-red-400 border-red-700' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
  return <span className={`text-xs border rounded px-2 py-0.5 ${cls}`}>{label}</span>;
}

export default function MachineDetail() {
  const { hostname } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    const h = decodeURIComponent(hostname);
    setLoading(true);
    Promise.all([
      api.getMachine(h),
      api.getActions({ hostname: h }),
    ]).then(([m, a]) => {
      setMachine(m);
      setActions(a);
    }).catch(err => {
      if (err.message?.includes('404') || err.message?.includes('non trouvée')) {
        navigate('/inventory');
      }
    }).finally(() => setLoading(false));
  };

  useEffect(load, [hostname]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerAction = async (action, force = false) => {
    setActionLoading(true);
    try {
      await api.triggerAction(decodeURIComponent(hostname), action, force);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <RefreshCw className="animate-spin mr-2" size={20} /> Chargement…
      </div>
    );
  }

  if (!machine) return null;

  const osVersion = machine.os?.version
    ? `${machine.os.name} ${machine.os.version}`
    : typeof machine.os === 'string' ? machine.os : '—';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link to="/inventory" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition">
        <ArrowLeft size={16} />
        Retour à l&apos;inventaire
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-900/40 border border-blue-800/40 rounded-xl flex items-center justify-center">
            <Monitor className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{machine.hostname}</h1>
            <p className="text-zinc-400 text-sm">{machine.ip} — {machine.domain || machine.hostname}</p>
          </div>
        </div>
        {['admin', 'tech'].includes(user?.role) && (
          <div className="flex gap-2">
            <button
              disabled={actionLoading}
              onClick={() => triggerAction('update_windows')}
              className="bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-sm px-4 py-2
                rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
              Mise à jour Windows
            </button>
            {machine.compatibility?.compatible && (
              <button
                disabled={actionLoading}
                onClick={() => triggerAction('upgrade_windows11', true)}
                className="bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white text-sm px-4 py-2
                  rounded-lg transition"
              >
                Upgrade Win 11
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-1">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Cpu size={16} className="text-blue-400" /> Système
          </h2>
          <InfoRow label="OS" value={osVersion} />
          <InfoRow label="Build" value={machine.os?.build} />
          <InfoRow label="Modèle" value={machine.hardware?.model} />
          <InfoRow label="RAM" value={machine.hardware?.ram ? `${machine.hardware.ram} Go` : null} />
          <InfoRow label="Domaine" value={machine.domain} />
          <InfoRow label="Groupe" value={machine.group} />
          <InfoRow
            label="Dernière mise à jour"
            value={machine.last_updated ? new Date(machine.last_updated).toLocaleString('fr-FR') : null}
          />
        </div>

        {/* Network */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Wifi size={16} className="text-green-400" /> Réseau
          </h2>
          <InfoRow label="Adresse IP" value={machine.ip} />
          <InfoRow label="Hostname" value={machine.hostname} />
          <InfoRow label="Domaine" value={machine.domain} />
        </div>

        {/* Compatibility */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            {machine.compatibility?.compatible
              ? <Shield size={16} className="text-green-400" />
              : <ShieldAlert size={16} className="text-yellow-400" />
            }
            Compatibilité Windows 11
          </h2>
          {machine.compatibility ? (
            <div className="space-y-2">
              {[
                ['TPM', machine.compatibility.tpm],
                ['Secure Boot', machine.compatibility.secure_boot],
                ['RAM ≥ 4 Go', machine.compatibility.ram],
                ['Compatible', machine.compatibility.compatible],
              ].map(([label, ok]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">{label}</span>
                  {ok
                    ? <CheckCircle size={16} className="text-green-400" />
                    : <XCircle size={16} className="text-red-400" />
                  }
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Non disponible</p>
          )}
        </div>
      </div>

      {/* Software */}
      {machine.software && machine.software.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
            <Package size={16} className="text-purple-400" />
            <h2 className="font-semibold text-white">
              Logiciels installés ({machine.software.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Éditeur</th>
                  <th className="px-4 py-3 font-medium">Date d&apos;installation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {machine.software.map((s, i) => (
                  <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-white">{s.name}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{s.version || '—'}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{s.vendor || '—'}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{s.install_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions history */}
      {actions.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
            <Clock size={16} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Historique des actions ({actions.length})</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {actions.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-zinc-300 font-medium">{a.action}</span>
                  {a.triggered_by && (
                    <span className="ml-2 text-xs text-zinc-500">par {a.triggered_by}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">
                    {new Date(a.created_at).toLocaleString('fr-FR')}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
