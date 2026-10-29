import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Network,
  Cpu,
  Wrench,
  FileText,
  GraduationCap,
  Database,
  Radio,
  Menu,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
} from 'lucide-react';
import { fetchHealth } from '../services/api';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { path: '/lookup', label: 'DNS Lookup', icon: Search, badge: 'Live' },
  { path: '/explorer', label: 'DNS Explorer', icon: Network, badge: 'Interactive' },
  { path: '/resolver-lab', label: 'Resolver Lab', icon: Cpu, badge: 'Benchmark' },
  { path: '/troubleshooting', label: 'Troubleshooting Center', icon: Wrench, badge: 'Guided' },
  { path: '/history-reports', label: 'History & Reports', icon: FileText, badge: 'MongoDB' },
  { path: '/learning-center', label: 'Learning Center', icon: GraduationCap, badge: 'Quiz' },
];

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    loading: true,
    backendOnline: false,
    dbConnected: false,
    dbState: 'connecting',
    uptimeSeconds: 0,
  });
  const location = useLocation();

  const checkStatus = async () => {
    try {
      const res = await fetchHealth();
      setSystemHealth({
        loading: false,
        backendOnline: res.status === 'ok',
        dbConnected: res.database?.isConnected || false,
        dbState: res.database?.state || 'disconnected',
        uptimeSeconds: res.uptimeSeconds || 0,
      });
    } catch {
      setSystemHealth({
        loading: false,
        backendOnline: false,
        dbConnected: false,
        dbState: 'disconnected',
        uptimeSeconds: 0,
      });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-navy-950 text-slate-100 font-sans">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Persistent Sidebar & Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-navy-900 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 px-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Radio className="w-5 h-5 text-white animate-pulse-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  NetScope
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                DNS & Network Resolution Analyzer
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Academic Course Badge */}
        <div className="mx-4 my-3 px-3.5 py-2.5 rounded-lg bg-navy-850/80 border border-slate-800/80 flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400">Project:</span>{' '}
            <span className="text-cyan-300 font-semibold">Computer Networks</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom System & Database Status Panel */}
        <div className="p-4 border-t border-slate-800/80 bg-navy-950/40">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                Backend API
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  systemHealth.backendOnline
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    systemHealth.backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                {systemHealth.backendOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                MongoDB Store
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  systemHealth.dbConnected
                    ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    systemHealth.dbConnected ? 'bg-cyan-400' : 'bg-amber-400'
                  }`}
                />
                {systemHealth.dbConnected ? 'Connected' : 'Degraded'}
              </span>
            </div>
          </div>

          <button
            onClick={checkStatus}
            className="mt-3 w-full py-1.5 px-3 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-2 border border-slate-800 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh Connectivity
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-navy-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-semibold text-slate-100 flex items-center gap-2">
                <span>NetScope Analyzer</span>
                <span className="text-xs font-normal text-slate-400 hidden sm:inline">
                  — Real-Time DNS Diagnostics & Resolution Intelligence
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-850 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>DNS</span>
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
