import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor, Package, Rocket, AlertTriangle,
  CheckCircle, Clock, XCircle, RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';

function StatCard({ icon, label, value, sub, color = 'blue', to }) {
  const StatIcon = icon;
  const colors = {
    blue: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
    green: 'bg-green-900/30 text-green-400 border-green-800/50',
    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
    red: 'bg-red-900/30 text-red-400 border-red-800/50',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-800/50',
  };

  const content = (
    <div className={`rounded-xl p-5 border ${colors[color]} flex items-start gap-4 hover:scale-[1.02] transition-transform`}>
      <div className={`p-2.5 rounded-lg ${colors[color]} mt-0.5`}>
        <StatIcon size={22} />
      </div>
      <div>
        <p className="text-zinc-400 text-sm">{label}</p>
        <p className="text-3xl font-bold text-white mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : <div>{content}</div>;
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'En attente', color: 'text-yellow-400', icon: Clock },
    success: { label: 'Succès', color: 'text-green-400', icon: CheckCircle },
    failed: { label: 'Échoué', color: 'text-red-400', icon: XCircle },
  };
  const { label, color, icon: Icon } = map[status] || { label: status, color: 'text-zinc-400', icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon size={13} />
      {label}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.stats(),
      api.getActions({ status: 'pending' }),
    ]).then(([s, a]) => {
      setStats(s);
      setActions(a.slice(0, 8));
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <RefreshCw className="animate-spin mr-2" size={20} /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-zinc-400 text-sm mt-1">Vue d&apos;ensemble du parc informatique</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700
            px-4 py-2 rounded-lg transition"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Monitor}
          label="Machines"
          value={stats?.machines.total}
          sub={`${stats?.machines.active ?? 0} actives (24h)`}
          color="blue"
          to="/inventory"
        />
        <StatCard
          icon={Package}
          label="Paquets"
          value={stats?.packages.total}
          color="purple"
          to="/packages"
        />
        <StatCard
          icon={Rocket}
          label="Déploiements"
          value={stats?.deployments.total}
          sub={`${stats?.deployments.pending ?? 0} en cours`}
          color="green"
          to="/deployments"
        />
        <StatCard
          icon={AlertTriangle}
          label="Erreurs récentes"
          value={stats?.errors.recent}
          sub={`${stats?.errors.total ?? 0} au total`}
          color={stats?.errors.recent > 0 ? 'red' : 'yellow'}
        />
      </div>

      {/* Actions summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-5 flex items-center gap-4">
          <CheckCircle className="text-green-400" size={28} />
          <div>
            <p className="text-zinc-400 text-sm">Actions réussies</p>
            <p className="text-2xl font-bold text-white">{stats?.actions.success ?? 0}</p>
          </div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-5 flex items-center gap-4">
          <Clock className="text-yellow-400" size={28} />
          <div>
            <p className="text-zinc-400 text-sm">Actions en attente</p>
            <p className="text-2xl font-bold text-white">{stats?.actions.pending ?? 0}</p>
          </div>
        </div>
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-5 flex items-center gap-4">
          <XCircle className="text-red-400" size={28} />
          <div>
            <p className="text-zinc-400 text-sm">Actions échouées</p>
            <p className="text-2xl font-bold text-white">{stats?.actions.failed ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Recent pending actions */}
      {actions.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Actions en attente</h2>
            <Link to="/inventory" className="text-xs text-blue-400 hover:text-blue-300">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-zinc-800">
            {actions.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white">{a.hostname}</span>
                  <span className="ml-2 text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                    {a.action}
                  </span>
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
