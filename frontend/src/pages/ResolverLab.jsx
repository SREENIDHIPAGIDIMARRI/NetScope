import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  RefreshCw,
  Database,
  History,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { compareResolvers, fetchCompareHistory } from '../services/api';

const AVAILABLE_RESOLVERS = [
  { id: 'system', name: 'System Default', ip: 'system', desc: 'Host Operating System stub resolver' },
  { id: '8.8.8.8', name: 'Google Public DNS', ip: '8.8.8.8', desc: 'Anycast global resolution platform' },
  { id: '1.1.1.1', name: 'Cloudflare DNS', ip: '1.1.1.1', desc: 'Privacy-first, low-latency Anycast' },
  { id: '9.9.9.9', name: 'Quad9 DNS', ip: '9.9.9.9', desc: 'Security-oriented recursive resolver' },
];

export default function ResolverLab() {
  const [domain, setDomain] = useState('github.com');
  const [recordType, setRecordType] = useState('A');
  const [selectedResolvers, setSelectedResolvers] = useState(['system', '8.8.8.8', '1.1.1.1']);
  
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [persisted, setPersisted] = useState(false);
  const [error, setError] = useState(null);

  // Past comparisons history
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPastComparisons = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetchCompareHistory(6);
      if (res.success) {
        setHistory(res.comparisons || []);
      }
    } catch {
      // Ignored non-fatal
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadPastComparisons();
  }, []);

  const toggleResolver = (id) => {
    if (selectedResolvers.includes(id)) {
      if (selectedResolvers.length > 1) {
        setSelectedResolvers(selectedResolvers.filter((r) => r !== id));
      }
    } else {
      setSelectedResolvers([...selectedResolvers, id]);
    }
  };

  const handleRunComparison = async (targetDomain = domain) => {
    if (!targetDomain.trim()) {
      setError('Please provide a domain to benchmark.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await compareResolvers(targetDomain.trim(), recordType, selectedResolvers);
      if (res.success) {
        setComparison(res.comparison);
        setDiagnosis(res.diagnosis);
        setPersisted(res.persisted);
        loadPastComparisons();
      } else {
        setError(res.error || 'Failed to benchmark resolvers.');
      }
    } catch (err) {
      setError(err.message || 'Error executing comparison benchmark.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = comparison?.results?.map((r) => ({
    name: r.resolverName.replace(' Resolver', '').replace(' Public DNS', ''),
    latency: r.durationMs,
    status: r.status,
    records: r.recordCount,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          <Cpu className="w-3.5 h-3.5" />
          <span>Resolver Performance Lab & Telemetry</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-extrabold text-white mt-1">
          Multi-Resolver Latency & Integrity Lab
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Simultaneously dispatch independent DNS queries across multiple recursive resolver implementations. Measure socket duration, detect Anycast and CDN divergence, and evaluate caching behavior.
        </p>
      </div>

      {/* Benchmark Control Form */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Domain Input */}
          <div className="md:col-span-7 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Benchmark Target Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., github.com, microsoft.com"
              className="w-full bg-navy-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 focus:outline-none"
            />
          </div>

          {/* Record Type */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Record Type
            </label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
              className="w-full bg-navy-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-100 focus:outline-none cursor-pointer"
            >
              {['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resolver Selector Cards */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Selected Resolvers to Benchmark:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AVAILABLE_RESOLVERS.map((res) => {
              const isSelected = selectedResolvers.includes(res.id);
              return (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => toggleResolver(res.id)}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-950/70 to-blue-950/70 border-cyan-500/80 shadow-sm'
                      : 'bg-navy-950/60 border-slate-800 hover:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-white">
                      {res.name}
                    </span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                        isSelected ? 'bg-cyan-500 text-white' : 'border border-slate-700'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {res.ip === 'system' ? 'Local OS' : res.ip}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                    {res.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            {selectedResolvers.length} resolvers selected for parallel measurement.
          </span>
          <button
            onClick={() => handleRunComparison()}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Benchmark Resolvers</span>
          </button>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-start gap-3 text-rose-200 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Benchmark Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Top Comparative Bar Chart & Fastest Observation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Latency Comparison Chart (2 Cols) */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Observed Query Latency Comparison (ms)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Lower is faster
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} />
                    <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [`${val} ms`, 'Response Time']}
                    />
                    <Bar dataKey="latency" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name.toLowerCase().includes(comparison.fastestResolver) ||
                            (comparison.fastestResolver === '1.1.1.1' && entry.name.includes('Cloudflare')) ||
                            (comparison.fastestResolver === '8.8.8.8' && entry.name.includes('Google')) ||
                            (comparison.fastestResolver === 'system' && entry.name.includes('System'))
                              ? '#06b6d4'
                              : '#3b82f6'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fastest Observed Callout & Academic Disclaimer (1 Col) */}
            <div className="glass-panel p-6 rounded-2xl border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  Test Finding
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Observed Fastest Resolver
                </h3>

                <div className="mt-3 p-4 rounded-xl bg-navy-950 border border-cyan-500/30 text-center">
                  <div className="text-2xl font-extrabold text-cyan-300 font-mono">
                    {comparison.fastestResolver || 'N/A'}
                  </div>
                  <div className="text-xs text-emerald-400 font-mono mt-1 font-semibold">
                    {comparison.fastestDurationMs} ms round-trip
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-navy-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Scientific Context Note</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    This single measurement only reflects network latency, cache warming, and routing conditions at the precise instant of this query. It does not establish that this resolver is universally superior under all workloads.
                  </p>
                </div>
              </div>

              {persisted && (
                <div className="text-[11px] text-cyan-400 font-mono flex items-center justify-center gap-1.5 pt-2 border-t border-slate-800">
                  <Database className="w-3 h-3" />
                  Benchmark persisted to MongoDB
                </div>
              )}
            </div>
          </div>

          {/* Individual Resolver Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparison.results.map((resItem) => (
              <div
                key={resItem.resolver}
                className="glass-panel p-5 rounded-2xl border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="font-mono font-bold text-sm text-slate-100">
                      {resItem.resolverName}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {resItem.resolver}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      resItem.status === 'SUCCESS'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                    }`}
                  >
                    {resItem.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Response Duration:</span>
                  <span className="text-cyan-300 font-bold">{resItem.durationMs} ms</span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Records Returned:</span>
                  <span className="text-slate-200">{resItem.recordCount || 0}</span>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-mono">Records:</span>
                  <div className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                    {resItem.records && resItem.records.length > 0 ? (
                      resItem.records.map((r, i) => (
                        <div key={i} className="p-1 rounded bg-navy-950 text-[11px] font-mono text-slate-300 truncate">
                          {typeof r === 'object' ? r.address || JSON.stringify(r) : String(r)}
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs italic">No records</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Record Difference Analyzer */}
          <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-3">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Evidence-Based Resolver Comparison & Integrity Analysis
            </h4>
            <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 text-xs text-slate-200 leading-relaxed">
              <span className="font-semibold text-cyan-300">Analysis Summary: </span>
              {comparison.summaryOfDifferences}
            </div>

            <div className="space-y-1.5 text-xs text-slate-400">
              {comparison.evidenceNotes?.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-navy-950/60 border border-slate-800/60 font-mono">
                  <span className="text-cyan-400">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Past Benchmarks History from Database */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Recent Resolver Comparisons (MongoDB)
            </h3>
          </div>
          <button
            onClick={loadPastComparisons}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {history.length > 0 ? (
            history.map((hist) => (
              <div
                key={hist._id}
                onClick={() => {
                  setDomain(hist.domain);
                  setRecordType(hist.recordType);
                  setSelectedResolvers(hist.selectedResolvers || ['system', '8.8.8.8', '1.1.1.1']);
                  handleRunComparison(hist.domain);
                }}
                className="p-3.5 rounded-xl bg-navy-950/80 hover:bg-navy-900 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition text-xs space-y-2"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-200">{hist.domain}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300">
                    {hist.recordType}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Fastest: <strong className="text-emerald-400">{hist.fastestResolver}</strong> ({hist.fastestDurationMs} ms)
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {hist.summaryOfDifferences}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-6 text-xs text-slate-400">
              No saved comparison sessions found in MongoDB.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
