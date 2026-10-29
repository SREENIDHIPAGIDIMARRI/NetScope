import express from 'express';
import { getDBStatus } from '../config/database.js';
import { RESOLVER_PRESETS } from '../services/dnsService.js';

const router = express.Router();

router.get('/', (req, res) => {
  const dbStatus = getDBStatus();
  
  res.json({
    status: 'ok',
    service: 'NetScope DNS & Network Resolution Analyzer',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    database: dbStatus,
    resolvers: Object.entries(RESOLVER_PRESETS).map(([ip, data]) => ({
      ip,
      name: data.name,
    })),
    timestamp: new Date().toISOString(),
  });
});

export default router;
