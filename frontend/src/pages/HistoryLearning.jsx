import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Trash2,
  Download,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  GraduationCap,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  ShieldCheck,
  Award,
} from 'lucide-react';
import {
  fetchHistory,
  deleteLookup,
  clearHistory,
  fetchReports,
  deleteReport,
} from '../services/api';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'Which DNS record type specifies mail servers responsible for accepting email on behalf of a domain name?',
    options: ['A Record', 'MX Record', 'CNAME Record', 'NS Record'],
    correctIndex: 1,
    explanation: 'MX (Mail Exchange) records specify mail transfer agents (MTAs) and their preference priorities for email delivery.',
  },
  {
    id: 2,
    question: 'What does a response code of NXDOMAIN (RCODE 3 / ENOTFOUND) strictly signify?',
    options: [
      'The DNS server is down.',
      'The requested fully qualified domain name does not exist in authoritative zones.',
      'The domain exists but has no IPv6 records.',
      'The network connection timed out.',
    ],
    correctIndex: 1,
    explanation: 'NXDOMAIN (Non-Existent Domain) is an authoritative assertion that the domain name is not registered or present in the zone file.',
  },
  {
    id: 3,
    question: 'How does DNS caching utilize the TTL (Time-To-Live) field?',
    options: [
      'TTL dictates the physical distance in routing hops.',
      'TTL sets the maximum number of seconds recursive resolvers may cache and serve the record before re-querying.',
      'TTL is the maximum packet size in bytes.',
      'TTL specifies how many times a domain can be queried per hour.',
    ],
    correctIndex: 1,
    explanation: 'TTL is a 32-bit integer in seconds defined by the zone administrator indicating how long a resolver can safely cache the response.',
  },
  {
    id: 4,
    question: 'Why might Google DNS (8.8.8.8) and Cloudflare DNS (1.1.1.1) return different IP addresses for the same domain?',
    options: [
      'One resolver is always broken.',
      'The domain uses Anycast CDN or GeoDNS to steer users to the nearest regional data center.',
      'DNS records can only have one IP globally.',
      'DNS packets are corrupted in transit.',
    ],
    correctIndex: 1,
    explanation: 'CDNs and GeoDNS utilize EDNS Client Subnet (ECS) and Anycast to return IP addresses optimized for the resolver location or client subnet.',
  },
  {
    id: 5,
    question: 'What is the primary difference between recursive and authoritative resolvers?',
    options: [
      'Recursive resolvers hold the original zone file; authoritative servers cache answers.',
      'Authoritative servers hold the official zone records; recursive resolvers query the hierarchy on behalf of clients.',
      'There is no difference; they are identical.',
      'Recursive resolvers only resolve IPv6 addresses.',
    ],
    correctIndex: 1,
    explanation: 'Authoritative servers are the master source of truth for their designated zone. Recursive resolvers traverse the DNS tree to fetch answers for clients.',
  },
];

export default function HistoryLearning() {
  const location = useLocation();
  const navigate = useNavigate();

  // Active Tab state
  const isLearningRoute = location.pathname.includes('learning');
  const [activeTab, setActiveTab] = useState(isLearningRoute ? 'learning' : 'history');

  // History state
  const [historyItems, setHistoryItems] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filters for History
  const [searchDomain, setSearchDomain] = useState('');
  const [filterType, setFilterType] = useState('ALL_TYPES');
  const [filterStatus, setFilterStatus] = useState('ALL_STATUSES');
  const [sortBy, setSortBy] = useState('queryTimestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selected item modal
  const [selectedLookup, setSelectedLookup] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Reports state
  const [reports, setReports] = useState([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);

  // Quiz state
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Load history
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetchHistory({
        page: historyPage,
        limit: 10,
        domain: searchDomain,
        recordType: filterType,
        status: filterStatus,
        sortBy,
        sortOrder,
      });
      if (res.success) {
        setHistoryItems(res.lookups || []);
        setHistoryTotal(res.total || 0);
        setHistoryTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load reports
  const loadReportsData = async () => {
    setReportsLoading(true);
    try {
      const res = await fetchReports({ page: reportsPage, limit: 10 });
      if (res.success) {
        setReports(res.reports || []);
        setReportsTotal(res.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'reports') {
      loadReportsData();
    }
  }, [activeTab, historyPage, filterType, filterStatus, sortBy, sortOrder, reportsPage]);

  // Handle Quiz selection
  const handleSelectOption = (questionId, optionIndex) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleGradeQuiz = () => {
    let score = 0;
    QUIZ_QUESTIONS.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) {
        score += 1;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
    localStorage.setItem('netscope_quiz_score', JSON.stringify({ score, total: QUIZ_QUESTIONS.length }));
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  const handleDeleteItem = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteLookup(id);
      loadHistory();
      if (selectedLookup?._id === id) {
        setSelectedLookup(null);
      }
    } catch {
      // Ignored
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await clearHistory();
      setShowClearConfirm(false);
      loadHistory();
    } catch {
      // Ignored
    }
  };

  const handleExportHistoryReport = (item, format = 'json') => {
    let blob;
    let filename;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
      filename = `report_${item.domain}_${item.recordType}.json`;
    } else {
      const txt = [
        'NetScope Historical Lookup Report',
        `Domain: ${item.domain}`,
        `Record Type: ${item.recordType}`,
        `Resolver: ${item.resolverName} (${item.resolver})`,
        `Timestamp: ${item.queryTimestamp}`,
        `Duration: ${item.responseDurationMs} ms`,
        `Status: ${item.queryStatus}`,
        'Records:',
        JSON.stringify(item.returnedRecords, null, 2),
      ].join('\n');
      blob = new Blob([txt], { type: 'text/plain' });
      filename = `report_${item.domain}_${item.recordType}.txt`;
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
      {/* Page Header with Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <Database className="w-3.5 h-3.5" />
            <span>Persistent Database & Educational Core</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white mt-1">
            History, Reports & Learning Center
          </h2>
        </div>

        {/* Tab switch pills */}
        <div className="flex items-center bg-navy-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'history'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lookup History
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'reports'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Diagnostic Reports
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'learning'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Learning & Quiz
          </button>
        </div>
      </div>

      {/* TAB 1: DNS LOOKUP HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="glass-panel p-4 rounded-2xl border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchDomain}
                  onChange={(e) => setSearchDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadHistory()}
                  placeholder="Filter domain..."
                  className="w-full bg-navy-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Record Type filter */}
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setHistoryPage(1);
                }}
                className="bg-navy-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 cursor-pointer"
              >
                <option value="ALL_TYPES">All Record Types</option>
                {['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'ALL'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setHistoryPage(1);
                }}
                className="bg-navy-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 cursor-pointer"
              >
                <option value="ALL_STATUSES">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="NO_RECORDS">NO_RECORDS</option>
                <option value="NXDOMAIN">NXDOMAIN</option>
                <option value="TIMEOUT">TIMEOUT</option>
              </select>

              {/* Sort selector */}
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split('_');
                  setSortBy(sb);
                  setSortOrder(so);
                }}
                className="bg-navy-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 cursor-pointer"
              >
                <option value="queryTimestamp_desc">Newest First</option>
                <option value="queryTimestamp_asc">Oldest First</option>
                <option value="duration_desc">Highest Latency</option>
                <option value="duration_asc">Lowest Latency</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadHistory}
                className="p-2 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                title="Refresh history"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Database History Table */}
          <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Domain</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Resolver</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {historyItems.length > 0 ? (
                    historyItems.map((item) => (
                      <tr
                        key={item._id}
                        onClick={() => setSelectedLookup(item)}
                        className="hover:bg-slate-900/50 cursor-pointer transition"
                      >
                        <td className="px-5 py-3 font-mono text-slate-400">
                          {new Date(item.queryTimestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-100">
                          {item.domain}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono px-2 py-0.5 rounded bg-navy-950 border border-slate-800 text-cyan-300">
                            {item.recordType}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-300">
                          {item.resolverName}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              item.queryStatus === 'SUCCESS'
                                ? 'bg-emerald-950 text-emerald-400'
                                : item.queryStatus === 'NXDOMAIN'
                                ? 'bg-rose-950 text-rose-400'
                                : 'bg-amber-950 text-amber-400'
                            }`}
                          >
                            {item.queryStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-cyan-300">
                          {item.responseDurationMs} ms
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/lookup?domain=${encodeURIComponent(item.domain)}&type=${item.recordType}&resolver=${item.resolver}`);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-cyan-400"
                              title="Repeat query"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteItem(item._id, e)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        {historyLoading ? 'Loading history...' : 'No lookup records found in MongoDB matching criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing {historyItems.length} of {historyTotal} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded bg-navy-850 hover:bg-slate-800 disabled:opacity-30 border border-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono">
                  Page {historyPage} of {historyTotalPages || 1}
                </span>
                <button
                  disabled={historyPage >= historyTotalPages}
                  onClick={() => setHistoryPage((p) => p + 1)}
                  className="px-3 py-1 rounded bg-navy-850 hover:bg-slate-800 disabled:opacity-30 border border-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIAGNOSTIC REPORTS REPOSITORY */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Total {reportsTotal} diagnostic reports stored in MongoDB
            </span>
            <button
              onClick={loadReportsData}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Reports</span>
            </button>
          </div>

          <div className="space-y-3">
            {reports.length > 0 ? (
              reports.map((rep) => (
                <div
                  key={rep._id}
                  className="glass-panel p-5 rounded-2xl border-slate-800 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-slate-100">
                        {rep.domain}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-950 text-cyan-300 border border-slate-800">
                        {rep.recordType}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          rep.certaintyLevel === 'CONFIRMED'
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-amber-950 text-amber-400'
                        }`}
                      >
                        {rep.certaintyLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(rep.diagnosticTimestamp).toLocaleString()}
                      </span>
                      <button
                        onClick={async () => {
                          await deleteReport(rep._id);
                          loadReportsData();
                        }}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold">Observed Condition:</span>
                    <p className="text-slate-200 mt-0.5 font-medium">{rep.observedCondition}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold">Possible Explanation:</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{rep.possibleExplanation}</p>
                  </div>

                  {rep.recommendedActions && rep.recommendedActions.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold">Recommended Actions:</span>
                      <ul className="mt-1 space-y-0.5 text-slate-300">
                        {rep.recommendedActions.map((act, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400">✓</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="glass-panel p-8 text-center text-xs text-slate-400 rounded-2xl border-slate-800">
                {reportsLoading ? 'Loading reports...' : 'No diagnostic reports found in database.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEARNING CENTER & INTERACTIVE QUIZ */}
      {activeTab === 'learning' && (
        <div className="space-y-8">
          {/* Study Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                DNS Zone Architecture
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Domain Name System is a hierarchical, distributed database. The Root zone delegates to Top-Level Domains (.com, .org), which delegate to Second-Level Domains via Authoritative Name Server (NS) records and glue address records.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                TTL & Latency Optimization
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Resolvers cache resource records for the duration of the Time-To-Live (TTL) field. When cached, resolution takes 2–15 ms without traversing the WAN. Expired records force a recursive walk, introducing network latency.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Common Error Codes (RCODEs)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>NXDOMAIN (3):</strong> Domain non-existent in authoritative zone.<br />
                <strong>SERVFAIL (2):</strong> Server failure, often due to expired DNSSEC signatures or unreachable authoritatives.<br />
                <strong>REFUSED (5):</strong> Resolver refused recursive query by administrative policy.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-400" />
                Resource Record (RR) Anatomy
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>A:</strong> 32-bit IPv4 address.<br />
                <strong>AAAA:</strong> 128-bit IPv6 address.<br />
                <strong>CNAME:</strong> Canonical alias hostname.<br />
                <strong>MX:</strong> Mail exchange priority & host.<br />
                <strong>TXT:</strong> Text payloads for SPF, DKIM, and site verification.
              </p>
            </div>
          </div>

          {/* Interactive Knowledge Assessment Quiz */}
          <div className="glass-panel p-6 rounded-2xl border-cyan-500/30 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  Knowledge Evaluation
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  Computer Networks DNS Assessment Quiz
                </h3>
              </div>

              {quizSubmitted && (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300">
                    Score: {quizScore} / {QUIZ_QUESTIONS.length} (
                    {Math.round((quizScore / QUIZ_QUESTIONS.length) * 100)}%)
                  </div>
                  <button
                    onClick={handleResetQuiz}
                    className="px-3 py-1.5 rounded-xl bg-navy-850 hover:bg-slate-800 text-xs text-slate-300 transition"
                  >
                    Retake Quiz
                  </button>
                </div>
              )}
            </div>

            {/* Questions list */}
            <div className="space-y-6">
              {QUIZ_QUESTIONS.map((q, qIndex) => {
                const selected = userAnswers[q.id];
                const isCorrect = selected === q.correctIndex;

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-xl bg-navy-950/80 border border-slate-800 space-y-3"
                  >
                    <div className="font-semibold text-sm text-slate-100 flex items-start gap-2">
                      <span className="text-cyan-400 font-mono">Q{qIndex + 1}.</span>
                      <span>{q.question}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIndex) => {
                        let btnStyle = 'bg-navy-900 border-slate-800 text-slate-300 hover:bg-slate-800';

                        if (selected === optIndex) {
                          btnStyle = 'bg-cyan-950 border-cyan-500 text-cyan-300 font-semibold';
                        }

                        if (quizSubmitted) {
                          if (optIndex === q.correctIndex) {
                            btnStyle = 'bg-emerald-950 border-emerald-500 text-emerald-300 font-semibold';
                          } else if (selected === optIndex) {
                            btnStyle = 'bg-rose-950 border-rose-500 text-rose-300 line-through';
                          }
                        }

                        return (
                          <button
                            key={optIndex}
                            type="button"
                            onClick={() => handleSelectOption(q.id, optIndex)}
                            className={`p-3 rounded-lg border text-left text-xs transition ${btnStyle}`}
                          >
                            <span className="font-mono text-slate-400 mr-2">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <div
                        className={`p-3 rounded-lg text-xs leading-relaxed ${
                          isCorrect ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-200 border border-rose-800/40'
                        }`}
                      >
                        <strong>{isCorrect ? 'Correct!' : 'Incorrect.'}</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!quizSubmitted && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGradeQuiz}
                  disabled={Object.keys(userAnswers).length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-cyan-500/20"
                >
                  Submit & Score Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lookup Detail Modal */}
      {selectedLookup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border-cyan-500/30 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400">Stored Lookup Detail</span>
                <h3 className="text-lg font-bold text-white font-mono mt-0.5">
                  {selectedLookup.domain} [{selectedLookup.recordType}]
                </h3>
              </div>
              <button
                onClick={() => setSelectedLookup(null)}
                className="px-3 py-1 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
                <span className="text-slate-400">Resolver:</span>
                <div className="font-bold text-slate-200">{selectedLookup.resolverName}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
                <span className="text-slate-400">Latency:</span>
                <div className="font-bold text-cyan-300">{selectedLookup.responseDurationMs} ms</div>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-semibold">Returned Records:</span>
              <pre className="mt-1 p-3 rounded-xl bg-navy-950 border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto max-h-48">
                {JSON.stringify(selectedLookup.returnedRecords, null, 2)}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportHistoryReport(selectedLookup, 'json')}
                  className="px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={() => handleExportHistoryReport(selectedLookup, 'txt')}
                  className="px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Text</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const d = selectedLookup.domain;
                  const t = selectedLookup.recordType;
                  const r = selectedLookup.resolver;
                  setSelectedLookup(null);
                  navigate(`/lookup?domain=${encodeURIComponent(d)}&type=${t}&resolver=${r}`);
                }}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Repeat Lookup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border-rose-500/40 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Confirm Database Cleanup
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete all DNS lookup history and associated diagnostic reports from MongoDB? This action is permanent.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-xl bg-navy-850 hover:bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
