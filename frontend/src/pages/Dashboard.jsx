import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ArrowRight,
  TrendingUp,
  Cpu,
  AlertCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { fetchDashboardStats, analyzeDNS } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick lookup state
  const [quickDomain, setQuickDomain] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState(null);

  // Selected diagnostic modal state
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardStats();
      if (res.success) {
        setStatsData(res.stats);
      } else {
        setError(res.error || 'Failed to load dashboard metrics');
      }
    } catch (err) {
      setError(err.message || 'Could not connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleQuickLookup = async (e) => {
    e.preventDefault();
    if (!quickDomain.trim()) return;

    setQuickLoading(true);
    setQuickError(null);
    try {
      // Navigate to DNS Lookup pre-filled, or execute direct lookup
      navigate(`/lookup?domain=${encodeURIComponent(quickDomain.trim())}&type=A`);
    } catch (err) {
      setQuickError(err.message);
      setQuickLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-navy-900/60 rounded-2xl border border-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-navy-900/60 rounded-2xl border border-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-navy-900/60 rounded-2xl border border-slate-800" />
          <div className="h-80 bg-navy-900/60 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border-rose-500/30 max-w-xl mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-100">Backend Communication Issue</h3>
        <p className="text-sm text-slate-400 mt-2 mb-6">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm inline-flex items-center gap-2 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const {
    totalLookups = 0,
    uniqueDomains = 0,
    avgDurationMs = 0,
    successCount = 0,
    failedCount = 0,
    topDomains = [],
    recentLookups = [],
    recentComparisons = [],
    recentDiagnostics = [],
    responseTimeHistory = [],
  } = statsData || {};

  return (
    <div className="space-y-8">
      {/* Hero Banner with Quick Lookup */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-slate-800 p-6 lg:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 text-xs font-semibold mb-3">
              <Activity className="w-3.5 h-3.5" />
              <span>Real-Time Network Operations Center</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              DNS Resolution & Latency Analyzer
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Execute genuine DNS queries via Node.js native sockets, compare public and system resolvers, and inspect evidence-based diagnostic findings backed by MongoDB.
            </p>
          </div>

          {/* Quick Lookup Input Form */}
          <form
            onSubmit={handleQuickLookup}
            className="w-full lg:w-96 flex flex-col sm:flex-row gap-2 bg-navy-950/80 p-2 rounded-xl border border-slate-800 shadow-inner"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={quickDomain}
                onChange={(e) => setQuickDomain(e.target.value)}
                placeholder="Quick resolve (e.g., cloudflare.com)..."
                className="w-full bg-transparent pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={quickLoading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-md shadow-cyan-500/20"
            >
              <span>Analyze</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Queries */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Recorded Lookups
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-white mt-1">
              {totalLookups.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{successCount}</span> success /{' '}
              <span className="text-rose-400 font-semibold">{failedCount}</span> exceptions
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Unique Domains */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Unique Hosts Tested
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-white mt-1">
              {uniqueDomains.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active zones in database
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Avg Duration */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Average Query Latency
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-cyan-300 mt-1 font-mono">
              {avgDurationMs} <span className="text-sm font-sans text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Across system & public DNS
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Resolution Success Rate */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Query Success Ratio
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 mt-1">
              {totalLookups > 0 ? Math.round((successCount / totalLookups) * 100) : 100}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Verified authoritative answers
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Response Time History Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Query Response-Time Chronology (ms)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Observed round-trip socket duration over recent historical lookups
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono px-2 py-1 rounded bg-navy-850 border border-slate-800">
              Live Mongo Feed
            </span>
          </div>

          <div className="h-64 w-full">
            {responseTimeHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={responseTimeHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="durationGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="domain"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => (val && val.length > 12 ? `${val.slice(0, 10)}…` : val)}
                  />
                  <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} ms`, 'Latency']}
                    labelFormatter={(label) => `Domain: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="durationMs"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#durationGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <p>No queries recorded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Run a lookup above to start populating real telemetry.</p>
              </div>
            )}
          </div>

          {/* Top Queried Domains Pills */}
          <div className="pt-4 border-t border-slate-800/80 mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Top Domains:</span>
            {topDomains.length > 0 ? (
              topDomains.map((item) => (
                <button
                  key={item.domain}
                  onClick={() => navigate(`/lookup?domain=${encodeURIComponent(item.domain)}&type=A`)}
                  className="px-2.5 py-1 rounded-lg bg-navy-850 hover:bg-slate-800 text-xs font-mono text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition flex items-center gap-1.5"
                >
                  <span>{item.domain}</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1 rounded">
                    {item.count}
                  </span>
                </button>
              ))
            ) : (
              <span className="text-xs text-slate-400 font-mono">None yet</span>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Resolver Benchmarking Summary */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                Resolver Lab Summary
              </h3>
              <button
                onClick={() => navigate('/resolver-lab')}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Lab</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Recent comparative benchmarks evaluated across Google, Cloudflare, and local resolvers:
            </p>

            <div className="space-y-3">
              {recentComparisons.length > 0 ? (
                recentComparisons.map((comp) => (
                  <div
                    key={comp._id}
                    className="p-3 rounded-xl bg-navy-850/80 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold text-slate-200">{comp.domain}</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60 text-[10px]">
                        {comp.recordType}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400">
                      Fastest: <span className="text-emerald-400 font-semibold">{comp.fastestResolver || 'N/A'}</span> ({comp.fastestDurationMs || 0} ms)
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 truncate">
                      {comp.summaryOfDifferences}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-navy-850/50 border border-slate-800 text-center text-xs text-slate-400">
                  No multi-resolver comparisons recorded yet.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/resolver-lab')}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 flex items-center justify-center gap-2 transition"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Launch Multi-Resolver Test
          </button>
        </div>
      </div>

      {/* Recent Diagnostic Findings & Recent Lookups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagnostic Findings */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Rule-Based Diagnostic Findings
            </h3>
            <button
              onClick={() => navigate('/history-reports')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>All Reports</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Deterministic diagnostic analysis generated from genuine DNS lookup observations:
          </p>

          <div className="space-y-3">
            {recentDiagnostics.length > 0 ? (
              recentDiagnostics.map((diag) => (
                <div
                  key={diag._id}
                  onClick={() => setSelectedDiagnostic(diag)}
                  className="p-3.5 rounded-xl bg-navy-850/70 hover:bg-navy-800 border border-slate-800/80 hover:border-cyan-500/30 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-slate-200">
                      {diag.domain}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        diag.certaintyLevel === 'CONFIRMED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : diag.certaintyLevel === 'HIGH_PROBABILITY'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {diag.certaintyLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-1.5 line-clamp-1">
                    {diag.observedCondition}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {diag.possibleExplanation}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl bg-navy-850/50 border border-slate-800 text-center text-xs text-slate-400">
                No diagnostic reports yet. Perform DNS lookups to generate automated rule evaluations.
              </div>
            )}
          </div>
        </div>

        {/* Recent Lookups Feed */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Recent Lookup Stream
            </h3>
            <button
              onClick={() => navigate('/history-reports')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>View History</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Latest authoritative and recursive operations logged in MongoDB:
          </p>

          <div className="space-y-2.5">
            {recentLookups.length > 0 ? (
              recentLookups.map((lookup) => (
                <div
                  key={lookup._id}
                  onClick={() => navigate(`/lookup?domain=${encodeURIComponent(lookup.domain)}&type=${lookup.recordType}&resolver=${lookup.resolver}`)}
                  className="p-3 rounded-xl bg-navy-850/70 hover:bg-navy-800 border border-slate-800/80 hover:border-blue-500/30 cursor-pointer flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        lookup.queryStatus === 'SUCCESS'
                          ? 'bg-emerald-400'
                          : lookup.queryStatus === 'NXDOMAIN'
                          ? 'bg-rose-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <div>
                      <div className="font-mono font-semibold text-slate-200">
                        {lookup.domain}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lookup.resolverName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-cyan-300 font-medium">
                      {lookup.responseDurationMs} ms
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 text-slate-400 border border-slate-800">
                      {lookup.recordType}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl bg-navy-850/50 border border-slate-800 text-center text-xs text-slate-400">
                No DNS lookups found in database.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diagnostic Modal when clicking a diagnostic card */}
      {selectedDiagnostic && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border-cyan-500/30 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  Diagnostic Report Detail
                </span>
                <h3 className="text-lg font-bold text-white font-mono mt-0.5">
                  {selectedDiagnostic.domain}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDiagnostic(null)}
                className="px-3 py-1 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Close
              </button>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold">Observed Condition:</span>
              <p className="text-sm text-slate-200 font-medium mt-1 p-2.5 rounded-lg bg-navy-900 border border-slate-800">
                {selectedDiagnostic.observedCondition}
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold">Supporting Evidence:</span>
              <ul className="mt-1 space-y-1 text-xs text-slate-300">
                {selectedDiagnostic.supportingEvidence?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold">Possible Explanation:</span>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {selectedDiagnostic.possibleExplanation}
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold">Recommended Actions:</span>
              <ul className="mt-1 space-y-1 text-xs text-slate-300">
                {selectedDiagnostic.recommendedActions?.map((act, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  const dom = selectedDiagnostic.domain;
                  setSelectedDiagnostic(null);
                  navigate(`/troubleshooting?domain=${encodeURIComponent(dom)}`);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
              >
                Open in Guided Troubleshooting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
