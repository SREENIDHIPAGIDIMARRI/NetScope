import express from 'express';
import DiagnosticReport from '../models/DiagnosticReport.js';
import { getDBStatus } from '../config/database.js';

const router = express.Router();

// GET /api/reports - Paginated diagnostic reports
router.get('/', async (req, res) => {
  try {
    const dbStatus = getDBStatus();
    if (!dbStatus.isConnected) {
      return res.json({
        success: true,
        reports: [],
        total: 0,
        page: 1,
        totalPages: 0,
        dbConnected: false,
      });
    }

    const { page = 1, limit = 10, domain = '', certainty = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const filter = {};

    if (domain) {
      filter.domain = { $regex: domain.trim(), $options: 'i' };
    }
    if (certainty) {
      filter.certaintyLevel = certainty.toUpperCase();
    }

    const total = await DiagnosticReport.countDocuments(filter);
    const totalPages = Math.ceil(total / pageLimit);

    const reports = await DiagnosticReport.find(filter)
      .sort({ diagnosticTimestamp: -1 })
      .skip((pageNum - 1) * pageLimit)
      .limit(pageLimit)
      .populate('lookupId')
      .populate('comparisonId')
      .lean();

    return res.json({
      success: true,
      reports,
      total,
      page: pageNum,
      totalPages,
      dbConnected: true,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/:id - Retrieve single report
router.get('/:id', async (req, res) => {
  try {
    const report = await DiagnosticReport.findById(req.params.id)
      .populate('lookupId')
      .populate('comparisonId');

    if (!report) {
      return res.status(404).json({ success: false, error: 'Diagnostic report not found.' });
    }

    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/reports/:id - Delete single report
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await DiagnosticReport.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }
    return res.json({ success: true, message: 'Report deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
