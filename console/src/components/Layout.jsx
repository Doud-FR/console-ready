import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, Package, Rocket,
  Settings, LogOut, Menu, X, ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/inventory', icon: Monitor, label: 'Inventaire' },
  { to: '/packages', icon: Package, label: 'Paquets' },
  { to: '/deployments', icon: Rocket, label: 'Déploiements' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
];

const ROLE_COLORS = {
  admin: 'bg-purple-600',
  tech: 'bg-blue-600',
  viewer: 'bg-gray-500',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-zinc-900 border-r border-zinc-800
          flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <ShieldCheck className="text-blue-500" size={26} />
          <span className="text-lg font-bold tracking-tight">AppliDeploy</span>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {NAV.map((navItem) => {
            const NavIcon = navItem.icon;
            return (
              <NavLink
                key={navItem.to}
                to={navItem.to}
                end={navItem.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`
                }
              >
                <NavIcon size={18} />
                {navItem.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold uppercase">
              {user?.username?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded ${ROLE_COLORS[user?.role] ?? 'bg-gray-500'}`}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-zinc-500 hover:text-white transition-colors"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <button onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="font-semibold">AppliDeploy</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
