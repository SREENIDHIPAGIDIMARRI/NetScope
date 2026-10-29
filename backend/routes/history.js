import express from 'express';
import DNSLookup from '../models/DNSLookup.js';
import DiagnosticReport from '../models/DiagnosticReport.js';
import ResolverComparison from '../models/ResolverComparison.js';
import { getDBStatus } from '../config/database.js';

const router = express.Router();

// GET /api/history/stats - Dashboard analytics and aggregated statistics
router.get('/stats', async (req, res) => {
  try {
    const dbStatus = getDBStatus();
    if (!dbStatus.isConnected) {
      return res.json({
        success: true,
        stats: {
          totalLookups: 0,
          uniqueDomains: 0,
          avgDurationMs: 0,
          successCount: 0,
          failedCount: 0,
          topDomains: [],
          recentLookups: [],
          recentComparisons: [],
          recentDiagnostics: [],
          responseTimeHistory: [],
        },
        dbConnected: false,
      });
    }

    // Aggregations
    const totalLookups = await DNSLookup.countDocuments();
    
    const uniqueDomainsList = await DNSLookup.distinct('domain');
    const uniqueDomains = uniqueDomainsList.length;

    const avgDurationAgg = await DNSLookup.aggregate([
      { $group: { _id: null, avgDuration: { $avg: '$responseDurationMs' } } },
    ]);
    const avgDurationMs = avgDurationAgg.length > 0 ? Math.round(avgDurationAgg[0].avgDuration * 10) / 10 : 0;

    const successCount = await DNSLookup.countDocuments({
      queryStatus: { $in: ['SUCCESS', 'PARTIAL'] },
    });
    const failedCount = await DNSLookup.countDocuments({
      queryStatus: { $nin: ['SUCCESS', 'PARTIAL'] },
    });

    // Top queried domains
    const topDomains = await DNSLookup.aggregate([
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { domain: '$_id', count: 1, _id: 0 } },
    ]);

    // Recent lookups
    const recentLookups = await DNSLookup.find()
      .sort({ queryTimestamp: -1 })
      .limit(6)
      .lean();

    // Recent comparisons
    const recentComparisons = await ResolverComparison.find()
      .sort({ comparisonTimestamp: -1 })
      .limit(4)
      .lean();

    // Recent diagnostic reports
    const recentDiagnostics = await DiagnosticReport.find()
      .sort({ diagnosticTimestamp: -1 })
      .limit(5)
      .lean();

    // Response time history points for chart
    const responseTimeHistory = await DNSLookup.aggregate([
      { $sort: { queryTimestamp: -1 } },
      { $limit: 20 },
      {
        $project: {
          domain: 1,
          recordType: 1,
          durationMs: '$responseDurationMs',
          status: '$queryStatus',
          timestamp: '$queryTimestamp',
          resolverName: 1,
        },
      },
    ]);

    // Reverse to show chronological order on chart
    responseTimeHistory.reverse();

    return res.json({
      success: true,
      stats: {
        totalLookups,
        uniqueDomains,
        avgDurationMs,
        successCount,
        failedCount,
        topDomains,
        recentLookups,
        recentComparisons,
        recentDiagnostics,
        responseTimeHistory,
      },
      dbConnected: true,
    });
  } catch (error) {
    console.error('API /history/stats error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/history - Paginated & filtered lookups list
router.get('/', async (req, res) => {
  try {
    const dbStatus = getDBStatus();
    if (!dbStatus.isConnected) {
      return res.json({
        success: true,
        lookups: [],
        total: 0,
        page: 1,
        totalPages: 0,
        dbConnected: false,
      });
    }

    const {
      page = 1,
      limit = 10,
      domain = '',
      recordType = '',
      resolver = '',
      status = '',
      sortBy = 'queryTimestamp',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const filter = {};

    if (domain) {
      filter.domain = { $regex: domain.trim(), $options: 'i' };
    }
    if (recordType && recordType !== 'ALL_TYPES') {
      filter.recordType = recordType.toUpperCase();
    }
    if (resolver && resolver !== 'ALL_RESOLVERS') {
      filter.resolver = resolver;
    }
    if (status && status !== 'ALL_STATUSES') {
      filter.queryStatus = status.toUpperCase();
    }

    const sortField = sortBy === 'duration' ? 'responseDurationMs' : 'queryTimestamp';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const total = await DNSLookup.countDocuments(filter);
    const totalPages = Math.ceil(total / pageLimit);

    const lookups = await DNSLookup.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip((pageNum - 1) * pageLimit)
      .limit(pageLimit)
      .lean();

    return res.json({
      success: true,
      lookups,
      total,
      page: pageNum,
      totalPages,
      dbConnected: true,
    });
  } catch (error) {
    console.error('API /history error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/history/:id - Retrieve lookup details with linked report
router.get('/:id', async (req, res) => {
  try {
    const lookup = await DNSLookup.findById(req.params.id);
    if (!lookup) {
      return res.status(404).json({ success: false, error: 'DNS Lookup record not found.' });
    }

    const linkedReport = await DiagnosticReport.findOne({ lookupId: lookup._id });

    return res.json({
      success: true,
      lookup,
      linkedReport,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/history/:id - Delete a single lookup
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await DNSLookup.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }

    // Also remove associated diagnostic reports
    await DiagnosticReport.deleteMany({ lookupId: req.params.id });

    return res.json({ success: true, message: 'Lookup and linked reports deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/history - Clear entire history with confirmation
router.delete('/', async (req, res) => {
  try {
    const { confirmed } = req.body;
    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Pass { confirmed: true } in request body.',
      });
    }

    await DNSLookup.deleteMany({});
    await DiagnosticReport.deleteMany({ lookupId: { $ne: null } });

    return res.json({ success: true, message: 'Lookup history cleared successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
