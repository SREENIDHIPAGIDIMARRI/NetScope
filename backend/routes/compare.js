import express from 'express';
import { compareResolvers, validateAndCleanDomain } from '../services/dnsService.js';
import { diagnoseComparison } from '../services/diagnosticService.js';
import ResolverComparison from '../models/ResolverComparison.js';
import DiagnosticReport from '../models/DiagnosticReport.js';
import { getDBStatus } from '../config/database.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { domain, recordType = 'A', resolvers = ['system', '8.8.8.8', '1.1.1.1'] } = req.body;

    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain name is required.' });
    }

    let cleanedDomain;
    try {
      cleanedDomain = validateAndCleanDomain(domain);
    } catch (valErr) {
      return res.status(400).json({ success: false, error: valErr.message });
    }

    // Run real comparisons
    const comparisonResult = await compareResolvers(cleanedDomain, recordType, resolvers);
    const diagnosis = diagnoseComparison(comparisonResult);

    let savedComparison = null;
    let savedReport = null;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      try {
        savedComparison = await ResolverComparison.create({
          domain: comparisonResult.domain,
          recordType: comparisonResult.recordType,
          selectedResolvers: comparisonResult.selectedResolvers,
          results: comparisonResult.results.map((r) => ({
            resolver: r.resolver,
            resolverName: r.resolverName,
            durationMs: r.durationMs,
            status: r.status,
            recordCount: r.recordCount || 0,
            records: r.records,
            errorCode: r.errorCode || null,
            errorMessage: r.errorMessage || null,
          })),
          measuredDurations: comparisonResult.measuredDurations,
          fastestResolver: comparisonResult.fastestResolver,
          fastestDurationMs: comparisonResult.fastestDurationMs,
          comparisonTimestamp: comparisonResult.comparisonTimestamp,
          summaryOfDifferences: comparisonResult.summaryOfDifferences,
          recordsMatch: comparisonResult.recordsMatch,
          evidenceNotes: comparisonResult.evidenceNotes,
        });

        savedReport = await DiagnosticReport.create({
          comparisonId: savedComparison._id,
          domain: comparisonResult.domain,
          recordType: comparisonResult.recordType,
          observedCondition: diagnosis.observedCondition,
          supportingEvidence: diagnosis.supportingEvidence,
          possibleExplanation: diagnosis.possibleExplanation,
          certaintyLevel: diagnosis.certaintyLevel,
          recommendedActions: diagnosis.recommendedActions,
          diagnosticTimestamp: diagnosis.diagnosticTimestamp,
          technicalDetails: diagnosis.technicalDetails,
        });
      } catch (dbErr) {
        console.error('Failed to save resolver comparison:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      comparison: comparisonResult,
      diagnosis,
      savedComparisonId: savedComparison ? savedComparison._id : null,
      savedReportId: savedReport ? savedReport._id : null,
      persisted: !!savedComparison,
    });
  } catch (error) {
    console.error('API /compare error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error executing resolver comparison.',
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const dbStatus = getDBStatus();

    if (!dbStatus.isConnected) {
      return res.json({ success: true, comparisons: [], persisted: false });
    }

    const comparisons = await ResolverComparison.find()
      .sort({ comparisonTimestamp: -1 })
      .limit(limit);

    return res.json({ success: true, comparisons, persisted: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
