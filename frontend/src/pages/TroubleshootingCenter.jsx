import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wrench,
  HelpCircle,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Save,
  ArrowRight,
  ShieldCheck,
  History,
  Trash2,
  Database,
} from 'lucide-react';
import {
  fetchTroubleshootingScenarios,
  runTroubleshootingStep,
  saveTroubleshootingSession,
  fetchTroubleshootingSessions,
  deleteTroubleshootingSession,
} from '../services/api';

export default function TroubleshootingCenter() {
  const [searchParams] = useSearchParams();
  const [domain, setDomain] = useState(searchParams.get('domain') || 'example.com');
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('no_resolution');

  // Active step execution state
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [executing, setExecuting] = useState(false);
  const [stepResults, setStepResults] = useState([]);
  const [finalSummary, setFinalSummary] = useState('');
  const [sessionSaved, setSessionSaved] = useState(false);
  const [error, setError] = useState(null);

  // Past sessions state
  const [pastSessions, setPastSessions] = useState([]);
  const [activeSessionDetail, setActiveSessionDetail] = useState(null);

  useEffect(() => {
    loadScenarios();
    loadPastSessions();
  }, []);

  const loadScenarios = async () => {
    try {
      const res = await fetchTroubleshootingScenarios();
      if (res.success) {
        setScenarios(res.scenarios || []);
      }
    } catch (err) {
      setError('Failed to fetch troubleshooting scenario definitions');
    }
  };

  const loadPastSessions = async () => {
    try {
      const res = await fetchTroubleshootingSessions();
      if (res.success) {
        setPastSessions(res.sessions || []);
      }
    } catch {
      // Non-fatal
    }
  };

  const currentScenario = scenarios.find((s) => s.id === selectedScenarioId);

  const handleStartWorkflow = () => {
    setStepResults([]);
    setCurrentStepIndex(1);
    setFinalSummary('');
    setSessionSaved(false);
    setError(null);
  };

  const handleExecuteCurrentStep = async () => {
    if (!domain.trim()) {
      setError('Please provide a domain to troubleshoot.');
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      const res = await runTroubleshootingStep({
        scenarioId: selectedScenarioId,
        stepIndex: currentStepIndex,
        domain: domain.trim(),
        userAnswer: 'Executed real diagnostic step probe',
      });

      if (res.success) {
        const newResults = [...stepResults, res.step];
        setStepResults(newResults);

        const totalSteps = currentScenario?.steps?.length || 3;
        if (currentStepIndex < totalSteps) {
          setCurrentStepIndex(currentStepIndex + 1);
        } else {
          // Completed all steps
          const summary = `Completed guided diagnostic workflow for "${domain}". Analyzed ${newResults.length} verification steps with genuine DNS socket probes.`;
          setFinalSummary(summary);
        }
      } else {
        setError(res.error || 'Step execution encountered an error.');
      }
    } catch (err) {
      setError(err.message || 'Communication error executing diagnostic step.');
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveSession = async () => {
    if (!domain || stepResults.length === 0) return;

    try {
      const payload = {
        scenarioId: selectedScenarioId,
        scenarioTitle: currentScenario?.title || selectedScenarioId,
        domain: domain.trim(),
        stepsCompleted: stepResults,
        testObservations: stepResults.map((s) => s.observation),
        finalSummary,
        recommendedNextSteps: stepResults.map((s) => s.nextRecommendation).filter(Boolean),
        resolved: true,
      };

      const res = await saveTroubleshootingSession(payload);
      if (res.success) {
        setSessionSaved(true);
        loadPastSessions();
      }
    } catch (err) {
      setError('Failed to persist troubleshooting session.');
    }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteTroubleshootingSession(id);
      loadPastSessions();
      if (activeSessionDetail?._id === id) {
        setActiveSessionDetail(null);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          <Wrench className="w-3.5 h-3.5" />
          <span>Interactive Computer Networks Workflows</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-extrabold text-white mt-1">
          Guided DNS Troubleshooting Center
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Step-by-step diagnostic workflows executing actual DNS queries to isolate domain non-existence, IPv6 gaps, timeout causes, Anycast divergence, and latency bottlenecks.
        </p>
      </div>

      {/* Scenario Selector & Input Bar */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., example.com"
              className="w-full bg-navy-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <div className="md:col-span-7 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Select Troubleshooting Scenario
            </label>
            <select
              value={selectedScenarioId}
              onChange={(e) => {
                setSelectedScenarioId(e.target.value);
                handleStartWorkflow();
              }}
              className="w-full bg-navy-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none cursor-pointer"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Scenario Description */}
        {currentScenario && (
          <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>Scenario Objective: {currentScenario.title}</span>
            </div>
            <p className="leading-relaxed">{currentScenario.description}</p>
          </div>
        )}

        {/* Start / Reset Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            {currentScenario?.steps?.length || 3} verification steps in this workflow.
          </span>
          <button
            onClick={handleStartWorkflow}
            className="px-4 py-2 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition"
          >
            Reset Workflow
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Stepper Execution Panel */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" />
            Diagnostic Execution Pipeline
          </h3>
          <span className="text-xs font-mono text-cyan-400">
            Completed {stepResults.length} of {currentScenario?.steps?.length || 3} steps
          </span>
        </div>

        {/* Completed Steps Feed */}
        <div className="space-y-4">
          {stepResults.map((step) => (
            <div
              key={step.stepIndex}
              className="p-4 rounded-xl bg-navy-950/90 border border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-cyan-300 font-mono">
                  Step {step.stepIndex}: {step.stepName}
                </span>
                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              </div>

              <p className="text-xs text-slate-300 italic">{step.question}</p>

              <div className="p-2.5 rounded-lg bg-navy-900 border border-slate-800/80 text-xs font-mono text-slate-200">
                <strong className="text-cyan-400">Action:</strong> {step.actionTaken}
              </div>

              <div className="p-2.5 rounded-lg bg-navy-900 border border-slate-800/80 text-xs text-slate-200">
                <strong className="text-emerald-400">Observation:</strong> {step.observation}
              </div>

              {step.nextRecommendation && (
                <div className="text-xs text-slate-400 pt-1">
                  <strong>Recommendation:</strong> {step.nextRecommendation}
                </div>
              )}
            </div>
          ))}

          {/* Current Pending Step */}
          {stepResults.length < (currentScenario?.steps?.length || 3) && (
            <div className="p-5 rounded-xl bg-navy-950/60 border border-dashed border-cyan-500/40 space-y-4 text-center">
              <div>
                <span className="text-xs font-mono text-cyan-400">
                  Ready to execute Step {currentStepIndex}:
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {currentScenario?.steps?.[currentStepIndex - 1]?.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xl mx-auto">
                  {currentScenario?.steps?.[currentStepIndex - 1]?.prompt}
                </p>
              </div>

              <button
                onClick={handleExecuteCurrentStep}
                disabled={executing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-md shadow-cyan-500/20 transition disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing DNS Probe...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Execute Step {currentStepIndex}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* All steps finished */}
          {finalSummary && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/50 to-blue-950/50 border border-cyan-500/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-base">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  Diagnostic Workflow Completed
                </div>
                {sessionSaved ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                    <Database className="w-3.5 h-3.5" />
                    Saved in MongoDB
                  </span>
                ) : (
                  <button
                    onClick={handleSaveSession}
                    className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Session to Database</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{finalSummary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Past Troubleshooting Sessions in Database */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Persisted Troubleshooting Sessions (MongoDB)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {pastSessions.length} sessions logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pastSessions.length > 0 ? (
            pastSessions.map((session) => (
              <div
                key={session._id}
                onClick={() => setActiveSessionDetail(session)}
                className="p-4 rounded-xl bg-navy-950/80 hover:bg-navy-900 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-200">
                      {session.domain}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(session._id, e)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-cyan-400 mt-1">
                    {session.scenarioTitle}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {session.stepsCompleted?.length || 0} diagnostic steps completed
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                  <span className="text-cyan-400">View Details ➔</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-6 text-xs text-slate-400">
              No saved sessions in database. Complete a troubleshooting workflow to persist results.
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {activeSessionDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border-cyan-500/30 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400">Saved Session</span>
                <h3 className="text-lg font-bold text-white font-mono">
                  {activeSessionDetail.domain} — {activeSessionDetail.scenarioTitle}
                </h3>
              </div>
              <button
                onClick={() => setActiveSessionDetail(null)}
                className="px-3 py-1 rounded-lg bg-navy-850 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {activeSessionDetail.stepsCompleted?.map((step, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-navy-900 border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-cyan-300">
                    Step {step.stepIndex}: {step.stepName}
                  </div>
                  <div className="text-slate-300">{step.observation}</div>
                  {step.nextRecommendation && (
                    <div className="text-slate-400 text-[11px]">Next: {step.nextRecommendation}</div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-300 p-3 rounded-xl bg-navy-950 border border-slate-800">
              {activeSessionDetail.finalSummary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
