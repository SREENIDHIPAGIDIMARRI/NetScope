import express from 'express';
import { resolveSingleRecord, compareResolvers, validateAndCleanDomain } from '../services/dnsService.js';
import TroubleshootingSession from '../models/TroubleshootingSession.js';
import { getDBStatus } from '../config/database.js';

const router = express.Router();

// Defined Scenarios
export const TROUBLESHOOTING_SCENARIOS = {
  no_resolution: {
    id: 'no_resolution',
    title: 'Domain Does Not Resolve',
    description: 'Diagnose why a domain fails to resolve to any IP address (NXDOMAIN, SERVFAIL, or zone misconfiguration).',
    steps: [
      {
        stepIndex: 1,
        name: 'Validate Syntax & TLD Check',
        prompt: 'Check whether the domain syntax is compliant and query the system resolver for IPv4 (A) records.',
        queryType: 'A',
        resolver: 'system',
      },
      {
        stepIndex: 2,
        name: 'Cross-Check Public Resolvers',
        prompt: 'Query Google DNS (8.8.8.8) and Cloudflare DNS (1.1.1.1) to isolate local resolver failure vs global non-existence.',
        queryType: 'COMPARE',
        resolvers: ['8.8.8.8', '1.1.1.1'],
      },
      {
        stepIndex: 3,
        name: 'Check Authoritative Nameservers',
        prompt: 'Query NS records to verify if the zone has delegated authoritative nameservers.',
        queryType: 'NS',
        resolver: '8.8.8.8',
      },
    ],
  },
  a_exists_no_aaaa: {
    id: 'a_exists_no_aaaa',
    title: 'A Record Exists but AAAA Missing',
    description: 'Investigate IPv6 readiness and understand dual-stack vs IPv4-only network reachability.',
    steps: [
      {
        stepIndex: 1,
        name: 'Verify IPv4 (A Record) Availability',
        prompt: 'Confirm that standard IPv4 A records exist and resolve normally.',
        queryType: 'A',
        resolver: 'system',
      },
      {
        stepIndex: 2,
        name: 'Query IPv6 (AAAA Record)',
        prompt: 'Inspect whether the authoritative zone advertises IPv6 AAAA records.',
        queryType: 'AAAA',
        resolver: 'system',
      },
      {
        stepIndex: 3,
        name: 'Dual-Stack Readiness Evaluation',
        prompt: 'Analyze client impact: IPv6-only networks (NAT64/DNS64 required) vs dual-stack clients.',
        queryType: 'EVALUATE',
      },
    ],
  },
  dns_timeout: {
    id: 'dns_timeout',
    title: 'DNS Query Times Out',
    description: 'Detect whether DNS timeouts are caused by resolver unresponsiveness, firewall packet drops, or port 53 blockage.',
    steps: [
      {
        stepIndex: 1,
        name: 'Baseline System Resolver Query',
        prompt: 'Attempt resolution via the system default resolver with strict timing capture.',
        queryType: 'A',
        resolver: 'system',
      },
      {
        stepIndex: 2,
        name: 'Test Alternate Recursive Server (1.1.1.1)',
        prompt: 'Bypass default resolver and query Cloudflare (1.1.1.1) to rule out ISP resolver failure.',
        queryType: 'A',
        resolver: '1.1.1.1',
      },
      {
        stepIndex: 3,
        name: 'Test Secondary Server (8.8.8.8)',
        prompt: 'Query Google DNS (8.8.8.8) to compare latency and verify upstream UDP routing.',
        queryType: 'A',
        resolver: '8.8.8.8',
      },
    ],
  },
  resolver_diff: {
    id: 'resolver_diff',
    title: 'Resolver Responses Differ',
    description: 'Analyze why Google DNS, Cloudflare, and local resolvers return different IPs or TTLs (GeoDNS, CDN Anycast, or split-horizon).',
    steps: [
      {
        stepIndex: 1,
        name: 'Direct Multi-Resolver Probe',
        prompt: 'Simultaneously query System, Google (8.8.8.8), and Cloudflare (1.1.1.1) for A records.',
        queryType: 'COMPARE',
        resolvers: ['system', '8.8.8.8', '1.1.1.1'],
      },
      {
        stepIndex: 2,
        name: 'Inspect CNAME Alias Chain',
        prompt: 'Query CNAME records to detect if the domain is fronted by a CDN (Cloudflare, Fastly, AWS CloudFront, Akamai).',
        queryType: 'CNAME',
        resolver: '8.8.8.8',
      },
    ],
  },
  high_latency: {
    id: 'high_latency',
    title: 'DNS Response Time Is Unusually High',
    description: 'Pinpoint why DNS resolution is taking longer than expected (cache miss, recursive depth, or routing bottlenecks).',
    steps: [
      {
        stepIndex: 1,
        name: 'Cold Cache vs Warm Cache Probe',
        prompt: 'Perform consecutive queries to detect latency reduction from resolver caching.',
        queryType: 'CONSECUTIVE_A',
        resolver: 'system',
      },
      {
        stepIndex: 2,
        name: 'Benchmark against Fast Public Anycast (1.1.1.1)',
        prompt: 'Compare response time against Anycast edge resolver.',
        queryType: 'A',
        resolver: '1.1.1.1',
      },
    ],
  },
};

// GET /api/troubleshooting/scenarios
router.get('/scenarios', (req, res) => {
  res.json({
    success: true,
    scenarios: Object.values(TROUBLESHOOTING_SCENARIOS),
  });
});

// POST /api/troubleshooting/run-step - Execute actual diagnostic step
router.post('/run-step', async (req, res) => {
  try {
    const { scenarioId, stepIndex, domain, userAnswer } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain name is required.' });
    }

    const cleanDomain = validateAndCleanDomain(domain);
    const scenario = TROUBLESHOOTING_SCENARIOS[scenarioId];
    if (!scenario) {
      return res.status(404).json({ success: false, error: 'Scenario not found.' });
    }

    const stepDef = scenario.steps.find((s) => s.stepIndex === stepIndex);
    if (!stepDef) {
      return res.status(404).json({ success: false, error: 'Step index not found in scenario.' });
    }

    let actionTaken = '';
    let observation = '';
    let resultData = null;
    let nextRecommendation = '';

    if (stepDef.queryType === 'A' || stepDef.queryType === 'AAAA' || stepDef.queryType === 'NS' || stepDef.queryType === 'CNAME') {
      const qRes = await resolveSingleRecord(cleanDomain, stepDef.queryType, stepDef.resolver || 'system');
      resultData = qRes;
      actionTaken = `Queried [${stepDef.queryType}] record using resolver ${qRes.resolverName}.`;

      if (qRes.status === 'SUCCESS') {
        observation = `Observed SUCCESS: Returned ${qRes.recordCount} record(s) in ${qRes.durationMs} ms.`;
        nextRecommendation = 'Proceed to next diagnostic stage to verify consistency.';
      } else if (qRes.status === 'NXDOMAIN') {
        observation = `Observed NXDOMAIN: Domain "${cleanDomain}" does not exist according to authoritative servers.`;
        nextRecommendation = 'Verify domain registration and typo status.';
      } else if (qRes.status === 'NO_RECORDS') {
        observation = `Observed NO_RECORDS: Domain exists, but has no published [${stepDef.queryType}] records.`;
        nextRecommendation = 'Check DNS zone configuration for missing records.';
      } else if (qRes.status === 'TIMEOUT') {
        observation = `Observed TIMEOUT: Resolver failed to respond within 6000ms.`;
        nextRecommendation = 'Test alternate public resolvers to isolate network vs server issues.';
      } else {
        observation = `Observed ${qRes.status}: ${qRes.errorMessage || 'Query failed'}`;
        nextRecommendation = 'Inspect nameserver delegation and firewall status.';
      }
    } else if (stepDef.queryType === 'COMPARE') {
      const compRes = await compareResolvers(cleanDomain, 'A', stepDef.resolvers || ['8.8.8.8', '1.1.1.1']);
      resultData = compRes;
      actionTaken = `Queried resolvers (${(stepDef.resolvers || []).join(', ')}) simultaneously.`;
      
      if (compRes.recordsMatch) {
        observation = `All tested resolvers agreed on record answers. Fastest was ${compRes.fastestResolver} (${compRes.fastestDurationMs} ms).`;
        nextRecommendation = 'DNS data is consistent across major public resolvers.';
      } else {
        observation = `Resolver differences detected: Records vary across resolvers. ${compRes.summaryOfDifferences}`;
        nextRecommendation = 'Investigate CDN Anycast or GeoDNS routing.';
      }
    } else if (stepDef.queryType === 'CONSECUTIVE_A') {
      // Run two consecutive queries to test cache hit
      const first = await resolveSingleRecord(cleanDomain, 'A', stepDef.resolver || 'system');
      const second = await resolveSingleRecord(cleanDomain, 'A', stepDef.resolver || 'system');
      resultData = { first, second };
      actionTaken = `Executed back-to-back queries via ${first.resolverName}: Query 1 = ${first.durationMs} ms, Query 2 = ${second.durationMs} ms.`;
      
      const diff = first.durationMs - second.durationMs;
      if (diff > 15) {
        observation = `Observed cache acceleration: Response time decreased by ${Math.round(diff)} ms on the second lookup, demonstrating active resolver caching.`;
      } else {
        observation = `Both queries resolved in comparable time (${first.durationMs} ms vs ${second.durationMs} ms), indicating low network latency or already-warmed cache.`;
      }
      nextRecommendation = 'Inspect DNS TTL values to understand caching retention.';
    } else if (stepDef.queryType === 'EVALUATE') {
      actionTaken = 'Analyzed dual-stack compatibility.';
      observation = 'Evaluated IPv4 vs IPv6 configuration. While IPv4 ensures reachability for legacy and current clients, missing AAAA records prevent direct routing over IPv6-only mobile carrier networks without NAT64.';
      nextRecommendation = 'Publish AAAA records with your DNS provider to achieve dual-stack compliance.';
    }

    return res.json({
      success: true,
      step: {
        stepIndex,
        stepName: stepDef.name,
        question: stepDef.prompt,
        userAnswer: userAnswer || 'Default test parameters',
        actionTaken,
        observation,
        resultData,
        nextRecommendation,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/troubleshooting/save - Persist completed troubleshooting session
router.post('/save', async (req, res) => {
  try {
    const {
      scenarioId,
      scenarioTitle,
      domain,
      stepsCompleted = [],
      testObservations = [],
      diagnosticResults = {},
      finalSummary = '',
      recommendedNextSteps = [],
      resolved = false,
    } = req.body;

    if (!domain || !scenarioId) {
      return res.status(400).json({ success: false, error: 'Domain and scenarioId are required.' });
    }

    let savedSession = null;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      savedSession = await TroubleshootingSession.create({
        scenarioId,
        scenarioTitle: scenarioTitle || scenarioId,
        domain,
        stepsCompleted,
        testObservations,
        diagnosticResults,
        finalSummary,
        recommendedNextSteps,
        resolved,
      });
    }

    return res.json({
      success: true,
      session: savedSession || {
        scenarioId,
        domain,
        finalSummary,
        savedLocally: true,
      },
      persisted: !!savedSession,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/troubleshooting/sessions - Fetch saved troubleshooting sessions
router.get('/sessions', async (req, res) => {
  try {
    const dbStatus = getDBStatus();
    if (!dbStatus.isConnected) {
      return res.json({ success: true, sessions: [], persisted: false });
    }

    const sessions = await TroubleshootingSession.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({ success: true, sessions, persisted: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/troubleshooting/sessions/:id
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await TroubleshootingSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/troubleshooting/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  try {
    const deleted = await TroubleshootingSession.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }
    return res.json({ success: true, message: 'Session deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
