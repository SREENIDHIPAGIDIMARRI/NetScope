import React, { useState } from 'react';
import {
  Network,
  Server,
  Laptop,
  Globe,
  Database,
  ArrowRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { analyzeDNS } from '../services/api';

const STAGES = [
  {
    id: 1,
    title: 'Stage 1: Client Stub Resolver Request',
    subtitle: 'Local OS Socket & Stub Resolver',
    shortTitle: 'Client Query',
    icon: Laptop,
    description:
      'The application (browser or OS service) checks the local OS DNS cache and hosts file. On a cache miss, the stub resolver constructs a standard DNS request packet over UDP port 53 and transmits it to the configured Recursive Resolver.',
    technicalDetails: [
      'Transport Protocol: UDP Port 53 (falls back to TCP Port 53 if packet exceeds 512 bytes without EDNS0).',
      'Recursion Desired (RD) bit set to 1 in DNS header flag.',
      'Query contains Question section: Domain name, QTYPE (e.g. A), and QCLASS (IN for Internet).',
    ],
  },
  {
    id: 2,
    title: 'Stage 2: Recursive Resolver & Cache Inspection',
    subtitle: 'Recursive Resolver (ISP or Public Anycast)',
    shortTitle: 'Recursive Cache',
    icon: Server,
    description:
      'The recursive resolver (such as your ISP resolver, Google 8.8.8.8, or Cloudflare 1.1.1.1) receives the query. It first inspects its local memory cache. If a valid, non-expired record exists with positive TTL, it replies immediately (Cache Hit). If expired or not present, it initiates iterative traversal.',
    technicalDetails: [
      'Cache Hit Latency: Typically 2 to 15 ms.',
      'Cache Miss: Triggers full iterative walk across the Internet DNS tree hierarchy.',
      'Recursion Available (RA) bit will be returned in the final header to indicate resolver capability.',
    ],
  },
  {
    id: 3,
    title: 'Stage 3: Iterative Hierarchical Traversal',
    subtitle: 'Root Servers (.) ➔ TLD Servers (.com) ➔ Authoritative Servers',
    shortTitle: 'DNS Hierarchy Walk',
    icon: Globe,
    description:
      'The recursive resolver initiates iterative queries down the domain hierarchy:\n1. Queries Root Nameserver (`.`) which responds with a referral to the TLD nameservers (e.g., `.com`).\n2. Queries TLD Nameserver, which provides a referral to the authoritative nameservers for the specific domain.\n3. Queries Authoritative Nameserver hosting the primary zone file.',
    technicalDetails: [
      '13 Root Server clusters (named A through M, distributed globally via BGP Anycast).',
      'Referrals contain NS records in the Authority section and Glue records (IPs) in the Additional section.',
      'Glue records prevent chicken-and-egg resolution loops when a nameserver resides within its own domain.',
    ],
  },
  {
    id: 4,
    title: 'Stage 4: Authoritative Answer & Client Delivery',
    subtitle: 'Zone Master Response & Cache Injection',
    shortTitle: 'Authoritative Response',
    icon: Database,
    description:
      'The authoritative nameserver returns the actual Resource Records along with their assigned Time-to-Live (TTL). The recursive resolver caches these records in its own memory store for the duration of the TTL and delivers the final response back to the client stub resolver.',
    technicalDetails: [
      'Authoritative Answer (AA) bit set to 1 in response from authoritative server.',
      'TTL (Time-To-Live): Dictates how many seconds recursive caches may serve the record before re-querying.',
      'Client OS caches the record locally, allowing subsequent application requests to connect without network DNS overhead.',
    ],
  },
];

const CONCEPT_TOPICS = [
  {
    id: 'hierarchy',
    title: 'DNS Tree Hierarchy',
    content:
      'The Domain Name System is organized as an inverted tree structure with the Root zone (.) at the apex. Below root are Top-Level Domains (TLDs: generic like .com, .org or country-code like .in, .uk). Second-Level Domains (SLDs: e.g. google in google.com) and subdomains follow hierarchically from right to left.',
  },
  {
    id: 'ttl_caching',
    title: 'TTL & Cache Invalidation',
    content:
      'Every DNS record includes a Time-to-Live (TTL) field measured in seconds. Resolvers store responses and decrement this counter until it expires (0), after which a fresh query must be made. Low TTLs allow rapid updates (useful before migrations) but increase query volume. High TTLs optimize latency and reduce authoritative server load.',
  },
  {
    id: 'propagation',
    title: 'DNS Propagation Truth',
    content:
      'Contrary to the popular misconception of an active "push" broadcast, DNS changes propagate passively. When a zone record is modified at the authoritative server, recursive caches around the world only discover the new record after their previously cached copies expire (as dictated by their respective TTL countdowns).',
  },
  {
    id: 'different_answers',
    title: 'Why Resolvers Return Different IPs',
    content:
      'Modern web services utilize Content Delivery Networks (CDNs), Anycast routing, and GeoDNS (steered by EDNS Client Subnet / ECS). A resolver in New York and a resolver in Tokyo may deliberately receive different IPv4/IPv6 addresses from authoritative nameservers to route users to the geographically nearest edge server.',
  },
];

export default function DNSExplorer() {
  const [activeStage, setActiveStage] = useState(1);
  const [activeTopic, setActiveTopic] = useState('hierarchy');

  // Live lookup tool inside explorer
  const [liveDomain, setLiveDomain] = useState('cloudflare.com');
  const [liveType, setLiveType] = useState('A');
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [liveError, setLiveError] = useState(null);

  const handleLiveQuery = async (e) => {
    e?.preventDefault();
    if (!liveDomain.trim()) return;

    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await analyzeDNS(liveDomain.trim(), liveType, 'system');
      if (res.success) {
        setLiveResult(res.lookup);
      } else {
        setLiveError(res.error || 'Lookup failed');
      }
    } catch (err) {
      setLiveError(err.message || 'Lookup failed');
    } finally {
      setLiveLoading(false);
    }
  };

  const currentStageData = STAGES.find((s) => s.id === activeStage);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          <Network className="w-3.5 h-3.5" />
          <span>Interactive Architectural Model</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-extrabold text-white mt-1">
          DNS Resolution Explorer
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Understand how human-readable hostnames translate into routable IP addresses across the global Domain Name System hierarchy. Inspect conceptual stages while executing live queries concurrently.
        </p>
      </div>

      {/* Conceptual Stage Navigation & Diagram */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-slate-300">
              Interactive Resolution Flow
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              Conceptual Model
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Stage {activeStage} of {STAGES.length}
          </div>
        </div>

        {/* 4 Stage Stepper Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const isCurrent = stage.id === activeStage;
            const isCompleted = stage.id < activeStage;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`p-3.5 rounded-xl border text-left transition relative overflow-hidden ${
                  isCurrent
                    ? 'bg-gradient-to-br from-cyan-950/80 to-blue-950/80 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-navy-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isCurrent
                        ? 'bg-cyan-500 text-white'
                        : isCompleted
                        ? 'bg-cyan-950 text-cyan-400'
                        : 'bg-navy-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-400">
                    Step {stage.id}
                  </span>
                </div>
                <div
                  className={`text-xs font-bold leading-tight ${
                    isCurrent ? 'text-cyan-300' : 'text-slate-200'
                  }`}
                >
                  {stage.shortTitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Stage Detailed Explanation View */}
        <div className="p-6 rounded-2xl bg-navy-950/90 border border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-cyan-400">
                {currentStageData.subtitle}
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {currentStageData.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={activeStage === 1}
                onClick={() => setActiveStage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-slate-800 disabled:opacity-30 text-xs text-slate-300 flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                disabled={activeStage === STAGES.length}
                onClick={() => setActiveStage((p) => Math.min(STAGES.length, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-xs text-white font-medium flex items-center gap-1 transition"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {currentStageData.description}
          </p>

          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Technical Protocol Specifications:
            </span>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
              {currentStageData.technicalDetails.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-navy-900/80 border border-slate-800/60 font-mono">
                  <span className="text-cyan-400 font-bold shrink-0">➔</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Live Concurrent Lookup Sandbox */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Live Resolution Probe Sandbox
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Execute a genuine DNS lookup right here to view the actual returned Resource Records alongside the conceptual model.
          </p>
        </div>

        <form onSubmit={handleLiveQuery} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={liveDomain}
            onChange={(e) => setLiveDomain(e.target.value)}
            placeholder="Domain (e.g., wikipedia.org)..."
            className="flex-1 bg-navy-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
          />
          <select
            value={liveType}
            onChange={(e) => setLiveType(e.target.value)}
            className="bg-navy-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={liveLoading}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition"
          >
            {liveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Probe Real DNS</span>
          </button>
        </form>

        {liveError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300">
            {liveError}
          </div>
        )}

        {liveResult && (
          <div className="p-4 rounded-xl bg-navy-950/90 border border-cyan-500/30 space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <span className="text-slate-300">
                Resolved: <strong className="text-cyan-300">{liveResult.domain}</strong> [{liveResult.recordType}]
              </span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Socket Duration: {liveResult.durationMs} ms
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Returned Records:</span>
              <div className="mt-1 space-y-1">
                {liveResult.records && liveResult.records.length > 0 ? (
                  liveResult.records.map((r, i) => (
                    <div key={i} className="p-2 rounded bg-navy-900 border border-slate-800 text-cyan-200">
                      {typeof r === 'object' ? JSON.stringify(r) : String(r)}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic">No records returned ({liveResult.status})</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DNS Conceptual Deep-Dive Reference Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CONCEPT_TOPICS.map((topic) => (
          <div
            key={topic.id}
            className="glass-panel p-5 rounded-2xl border-slate-800/80 space-y-2"
          >
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              {topic.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {topic.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
