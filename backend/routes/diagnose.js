import express from 'express';
import { diagnoseDNSResult } from '../services/diagnosticService.js';
import DiagnosticReport from '../models/DiagnosticReport.js';
import { getDBStatus } from '../config/database.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { lookupData, persist = true } = req.body;

    if (!lookupData || !lookupData.domain) {
      return res.status(400).json({
        success: false,
        error: 'Valid lookupData object with domain is required.',
      });
    }

    const diagnosis = diagnoseDNSResult(lookupData);
    let savedReport = null;

    const dbStatus = getDBStatus();
    if (persist && dbStatus.isConnected) {
      try {
        savedReport = await DiagnosticReport.create({
          lookupId: lookupData._id || lookupData.id || null,
          domain: diagnosis.domain,
          recordType: diagnosis.recordType,
          resolver: diagnosis.resolver,
          observedCondition: diagnosis.observedCondition,
          supportingEvidence: diagnosis.supportingEvidence,
          possibleExplanation: diagnosis.possibleExplanation,
          certaintyLevel: diagnosis.certaintyLevel,
          recommendedActions: diagnosis.recommendedActions,
          diagnosticTimestamp: diagnosis.diagnosticTimestamp,
          technicalDetails: diagnosis.technicalDetails,
        });
      } catch (err) {
        console.error('Error saving standalone diagnostic report:', err.message);
      }
    }

    return res.json({
      success: true,
      diagnosis,
      savedReportId: savedReport ? savedReport._id : null,
      persisted: !!savedReport,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
