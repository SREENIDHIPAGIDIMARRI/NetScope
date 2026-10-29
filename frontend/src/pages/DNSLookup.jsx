import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Server,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Download,
  Wrench,
  ShieldCheck,
  HelpCircle,
  Database,
  Share2,
} from 'lucide-react';
import { analyzeDNS } from '../services/api';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'ALL'];

const RESOLVER_OPTIONS = [
  { id: 'system', name: 'System Default Resolver', description: 'Local OS resolver stack' },
  { id: '8.8.8.8', name: 'Google Public DNS (8.8.8.8)', description: 'Global Anycast primary' },
  { id: '1.1.1.1', name: 'Cloudflare DNS (1.1.1.1)', description: 'Fast, privacy-focused Anycast' },
  { id: 'custom', name: 'Custom IP Resolver', description: 'Specify arbitrary IPv4 address' },
];

export default function DNSLookup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [domain, setDomain] = useState(searchParams.get('domain') || 'google.com');
  const [recordType, setRecordType] = useState(searchParams.get('type') || 'A');
  const [selectedResolver, setSelectedResolver] = useState(searchParams.get('resolver') || 'system');
  const [customResolverIp, setCustomResolverIp] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [persisted, setPersisted] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-run if query params present and initial load
  useEffect(() => {
    const paramDomain = searchParams.get('domain');
    if (paramDomain) {
      setDomain(paramDomain);
      if (searchParams.get('type')) setRecordType(searchParams.get('type'));
      if (searchParams.get('resolver')) setSelectedResolver(searchParams.get('resolver'));
      handleExecuteLookup(paramDomain, searchParams.get('type') || 'A', searchParams.get('resolver') || 'system');
    }
  }, []);

  const handleExecuteLookup = async (targetDomain = domain, targetType = recordType, targetRes = selectedResolver) => {
    if (!targetDomain.trim()) {
      setError('Please provide a valid domain name.');
      return;
    }

    const effectiveResolver = targetRes === 'custom' ? customResolverIp.trim() : targetRes;
    if (targetRes === 'custom' && !effectiveResolver) {
      setError('Please provide a valid custom resolver IP address.');
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await analyzeDNS(targetDomain.trim(), targetType, effectiveResolver);
      if (res.success) {
        setResult(res.lookup);
        setDiagnosis(res.diagnosis);
        setPersisted(res.persisted);

        // Update URL query params without reloading
        setSearchParams({
          domain: targetDomain.trim(),
          type: targetType,
          resolver: effectiveResolver,
        });
      } else {
        setError(res.error || 'Failed to resolve DNS query.');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with DNS analysis service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleExecuteLookup();
  };

  const handleCopyRecords = () => {
    if (!result) return;
    const content = JSON.stringify(result.records, null, 2);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = (format = 'json') => {
    if (!result || !diagnosis) return;

    let blob;
    let filename;

    if (format === 'json') {
      const data = {
        project: 'NetScope — Interactive DNS & Network Resolution Analyzer',
        lookup: result,
        diagnosis,
        exportedAt: new Date().toISOString(),
      };
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      filename = `netscope_${result.domain}_${result.recordType}.json`;
    } else {
      const textLines = [
        '==================================================================',
        'NetScope — DNS Resolution & Diagnostic Report',
        '==================================================================',
        `Domain:           ${result.domain}`,
        `Record Type:      ${result.recordType}`,
        `Resolver:         ${result.resolverName} (${result.resolver})`,
        `Query Timestamp:  ${result.timestamp}`,
        `Duration:         ${result.durationMs} ms`,
        `Status:           ${result.status}`,
        `Record Count:     ${result.recordCount || 0}`,
        '',
        '--- RETURNED RECORDS ---',
        JSON.stringify(result.records, null, 2),
        '',
        '--- RULE-BASED DIAGNOSTIC EVALUATION ---',
        `Condition:        ${diagnosis.observedCondition}`,
        `Certainty:        ${diagnosis.certaintyLevel}`,
        '',
        'Supporting Evidence:',
        ...(diagnosis.supportingEvidence || []).map((e) => `  • ${e}`),
        '',
        'Possible Explanation:',
        `  ${diagnosis.possibleExplanation}`,
        '',
        'Recommended Actions:',
        ...(diagnosis.recommendedActions || []).map((a) => `  [ ] ${a}`),
        '==================================================================',
      ];
      blob = new Blob([textLines.join('\n')], { type: 'text/plain' });
      filename = `netscope_${result.domain}_${result.recordType}.txt`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          <Search className="w-3.5 h-3.5" />
          <span>Authoritative & Recursive Query Workbench</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-extrabold text-white mt-1">
          DNS Lookup & Record Analyzer
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Query live domain records through Node.js asynchronous DNS resolution. Inspect exact network latency, returned resource data, and automatic deterministic rule-based diagnostics.
        </p>
      </div>

      {/* Query Configuration Form Card */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Domain input */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Domain Name / Hostname</span>
                <span className="text-[11px] text-slate-400">FQDN (e.g. google.com)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. example.com, github.com"
                  className="w-full bg-navy-950/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono transition focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            {/* Record type selection */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Record Type</span>
              </label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="w-full bg-navy-950/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 font-mono transition focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                {RECORD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type} {type === 'ALL' ? '(All Types Multi-Query)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolver selection */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Target Resolver</span>
              </label>
              <select
                value={selectedResolver}
                onChange={(e) => setSelectedResolver(e.target.value)}
                className="w-full bg-navy-950/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 transition focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                {RESOLVER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom IP Input if selected */}
          {selectedResolver === 'custom' && (
            <div className="p-3.5 rounded-xl bg-navy-850/80 border border-slate-800 space-y-1">
              <label className="text-xs font-semibold text-slate-300">Custom Resolver IPv4 Address:</label>
              <input
                type="text"
                value={customResolverIp}
                onChange={(e) => setCustomResolverIp(e.target.value)}
                placeholder="e.g. 208.67.222.222 (OpenDNS)"
                className="w-full max-w-sm bg-navy-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
              />
            </div>
          )}

          {/* Quick presets & action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold">Test Presets:</span>
              {['google.com', 'cloudflare.com', 'wikipedia.org', 'invalid-domain-xyz.net'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setDomain(preset);
                    handleExecuteLookup(preset, recordType, selectedResolver);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-800 hover:border-slate-700 transition"
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Querying Socket...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Resolve DNS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-start gap-3 text-rose-200 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">DNS Query Execution Error:</span> {error}
          </div>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Main Resolution Summary Card */}
          <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold font-mono text-white">
                    {result.domain}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase ${
                      result.status === 'SUCCESS'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : result.status === 'PARTIAL'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800/60'
                        : result.status === 'NO_RECORDS'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        : result.status === 'NXDOMAIN'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                        : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1.5">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    Resolver: <strong className="text-slate-200">{result.resolverName}</strong> ({result.resolver})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Measured Latency:{' '}
                    <strong className="text-cyan-300 font-mono text-sm">{result.durationMs} ms</strong>
                  </span>
                  {persisted && (
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Database className="w-3.5 h-3.5" />
                      Saved to MongoDB
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyRecords}
                  className="px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-800 flex items-center gap-1.5 transition"
                  title="Copy raw record JSON to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => handleExecuteLookup()}
                  className="px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-800 flex items-center gap-1.5 transition"
                  title="Repeat lookup"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Repeat</span>
                </button>

                <div className="relative group">
                  <button className="px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-800 flex items-center gap-1.5 transition">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export</span>
                  </button>
                  <div className="absolute right-0 mt-1 w-36 bg-navy-900 border border-slate-800 rounded-xl shadow-xl py-1 hidden group-hover:block z-20">
                    <button
                      onClick={() => handleDownloadReport('json')}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>JSON Report</span>
                      <span className="text-[10px] text-slate-400">.json</span>
                    </button>
                    <button
                      onClick={() => handleDownloadReport('txt')}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Plain Text</span>
                      <span className="text-[10px] text-slate-400">.txt</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/troubleshooting?domain=${encodeURIComponent(result.domain)}`)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-medium border border-cyan-800/80 flex items-center gap-1.5 transition"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Troubleshoot</span>
                </button>
              </div>
            </div>

            {/* Records Data Display */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Returned Resource Records ({result.recordType})
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {result.recordType === 'ALL'
                    ? `${result.successfulCount || 0} / ${result.totalAttempted || 6} Types Successful`
                    : `${result.recordCount || 0} Records`}
                </span>
              </div>

              {/* View for ALL Record Types */}
              {result.recordType === 'ALL' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(result.records || {}).map(([type, data]) => (
                    <div
                      key={type}
                      className="p-4 rounded-xl bg-navy-950/90 border border-slate-800/90 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-cyan-300">{type}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{data.durationMs}ms</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            data.status === 'SUCCESS'
                              ? 'bg-emerald-950 text-emerald-400'
                              : data.status === 'NO_RECORDS'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {data.status}
                        </span>
                      </div>

                      <div className="text-xs font-mono space-y-1 overflow-x-auto max-h-36">
                        {data.records && data.records.length > 0 ? (
                          data.records.map((r, idx) => (
                            <div key={idx} className="p-1.5 rounded bg-navy-900 border border-slate-800/60 text-slate-300 truncate">
                              {typeof r === 'object' ? JSON.stringify(r) : String(r)}
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No records found</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* View for Single Record Type */
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-navy-950/90">
                  {result.records && result.records.length > 0 ? (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-navy-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">#</th>
                          <th className="px-4 py-2.5">Record Content</th>
                          {result.records[0]?.ttl !== undefined && <th className="px-4 py-2.5">TTL</th>}
                          {result.recordType === 'MX' && <th className="px-4 py-2.5">Priority</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {result.records.map((rec, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/60 transition">
                            <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3 text-cyan-300 font-semibold break-all">
                              {typeof rec === 'object'
                                ? rec.address || rec.exchange || JSON.stringify(rec)
                                : String(rec)}
                            </td>
                            {rec.ttl !== undefined && (
                              <td className="px-4 py-3 text-slate-300">{rec.ttl}s</td>
                            )}
                            {rec.priority !== undefined && (
                              <td className="px-4 py-3 text-amber-400 font-bold">{rec.priority}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-400 space-y-1">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
                      <p className="text-sm font-semibold text-slate-200">
                        No {result.recordType} records found for {result.domain}
                      </p>
                      <p className="text-xs">
                        {result.status === 'NXDOMAIN'
                          ? 'The domain does not exist in DNS.'
                          : 'The domain exists, but does not publish this specific record type.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rule-Based Diagnostic Engine Output Card */}
          {diagnosis && (
            <div className="glass-panel p-6 rounded-2xl border-cyan-500/30 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-base font-bold text-white">
                    Deterministic DNS Diagnosis
                  </h4>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                    diagnosis.certaintyLevel === 'CONFIRMED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : diagnosis.certaintyLevel === 'HIGH_PROBABILITY'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Certainty: {diagnosis.certaintyLevel}
                </span>
              </div>

              {/* Observed Condition */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Observed Condition:
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-100 p-3 rounded-xl bg-navy-950 border border-slate-800">
                  {diagnosis.observedCondition}
                </p>
              </div>

              {/* Supporting Evidence */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Supporting Evidence:
                </span>
                <ul className="mt-1.5 space-y-1.5 text-xs text-slate-300">
                  {diagnosis.supportingEvidence?.map((ev, i) => (
                    <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-navy-950/60 border border-slate-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Possible Explanation */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Possible Explanation:
                </span>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed p-3 rounded-xl bg-navy-950/80 border border-slate-800">
                  {diagnosis.possibleExplanation}
                </p>
              </div>

              {/* Recommended Next Steps */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recommended Next Actions:
                </span>
                <div className="mt-1.5 space-y-1.5">
                  {diagnosis.recommendedActions?.map((act, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 p-2.5 rounded-lg bg-navy-900/80 border border-slate-800/80">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
