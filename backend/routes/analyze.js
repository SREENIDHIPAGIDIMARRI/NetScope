import express from 'express';
import { resolveSingleRecord, resolveAllRecords, validateAndCleanDomain } from '../services/dnsService.js';
import { diagnoseDNSResult } from '../services/diagnosticService.js';
import DNSLookup from '../models/DNSLookup.js';
import DiagnosticReport from '../models/DiagnosticReport.js';
import { getDBStatus } from '../config/database.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { domain, recordType = 'A', resolver = 'system' } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Domain name is required.',
      });
    }

    let cleanedDomain;
    try {
      cleanedDomain = validateAndCleanDomain(domain);
    } catch (validationErr) {
      return res.status(400).json({
        success: false,
        error: validationErr.message,
      });
    }

    const type = recordType.toUpperCase();
    const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'ALL'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid record type "${recordType}". Allowed: ${validTypes.join(', ')}`,
      });
    }

    // Perform actual DNS resolution
    let dnsResult;
    if (type === 'ALL') {
      dnsResult = await resolveAllRecords(cleanedDomain, resolver);
    } else {
      dnsResult = await resolveSingleRecord(cleanedDomain, type, resolver);
    }

    // Run deterministic rule-based diagnosis
    const diagnosis = diagnoseDNSResult(dnsResult);

    // Persist to MongoDB if connected
    let savedLookup = null;
    let savedReport = null;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      try {
        savedLookup = await DNSLookup.create({
          domain: dnsResult.domain,
          recordType: dnsResult.recordType,
          resolver: dnsResult.resolver,
          resolverName: dnsResult.resolverName,
          queryTimestamp: dnsResult.timestamp,
          responseDurationMs: dnsResult.durationMs,
          returnedRecords: dnsResult.records,
          recordCount: dnsResult.recordCount || (dnsResult.successfulCount || 0),
          queryStatus: dnsResult.status,
          errorCode: dnsResult.errorCode || null,
          errorMessage: dnsResult.errorMessage || null,
          metadata: {
            subQueries: dnsResult.subQueries || [],
            clientIp: req.ip || req.headers['x-forwarded-for'],
          },
        });

        // Save diagnostic report associated with this lookup
        savedReport = await DiagnosticReport.create({
          lookupId: savedLookup._id,
          domain: dnsResult.domain,
          recordType: dnsResult.recordType,
          resolver: dnsResult.resolver,
          observedCondition: diagnosis.observedCondition,
          supportingEvidence: diagnosis.supportingEvidence,
          possibleExplanation: diagnosis.possibleExplanation,
          certaintyLevel: diagnosis.certaintyLevel,
          recommendedActions: diagnosis.recommendedActions,
          diagnosticTimestamp: diagnosis.diagnosticTimestamp,
          technicalDetails: diagnosis.technicalDetails,
        });
      } catch (dbErr) {
        console.error('Failed to save DNS lookup to MongoDB:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      lookup: dnsResult,
      diagnosis,
      savedLookupId: savedLookup ? savedLookup._id : null,
      savedReportId: savedReport ? savedReport._id : null,
      persisted: !!savedLookup,
    });
  } catch (error) {
    console.error('API /analyze error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during DNS lookup.',
    });
  }
});

export default router;
