import dnsPromises from 'node:dns/promises';
import { performance } from 'node:perf_hooks';

// Resolver mapping
export const RESOLVER_PRESETS = {
  system: { name: 'System Default Resolver', ip: 'system' },
  '8.8.8.8': { name: 'Google Public DNS', ip: '8.8.8.8' },
  '1.1.1.1': { name: 'Cloudflare DNS', ip: '1.1.1.1' },
  '9.9.9.9': { name: 'Quad9 DNS', ip: '9.9.9.9' },
};

/**
 * Creates an instance of dnsPromises.Resolver or returns default system resolver
 */
export function getResolverInstance(resolverIp = 'system') {
  if (!resolverIp || resolverIp === 'system') {
    return {
      resolver: dnsPromises,
      isCustom: false,
      name: 'System Default Resolver',
      ip: 'system',
    };
  }

  const resolver = new dnsPromises.Resolver();
  resolver.setServers([resolverIp]);
  const preset = RESOLVER_PRESETS[resolverIp];
  return {
    resolver,
    isCustom: true,
    name: preset ? preset.name : `Custom DNS (${resolverIp})`,
    ip: resolverIp,
  };
}

/**
 * Clean and validate domain name
 */
export function validateAndCleanDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain name is required.');
  }

  let cleaned = domain.trim().toLowerCase();
  // Strip protocol if user pasted URL
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  // Strip path/query if present
  cleaned = cleaned.split('/')[0].split(':')[0];

  // Regex check for basic hostname rules
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
  // Also allow 'localhost' or single label for local development tests
  if (!domainRegex.test(cleaned) && cleaned !== 'localhost') {
    throw new Error(`Invalid domain name format: "${domain}". Please provide a valid hostname (e.g. google.com).`);
  }

  return cleaned;
}

/**
 * Promise wrapper with timeout
 */
async function withTimeout(promise, ms = 6000) {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      const err = new Error(`DNS query timed out after ${ms}ms`);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timerId);
    return result;
  } catch (err) {
    clearTimeout(timerId);
    throw err;
  }
}

/**
 * Perform a single record resolution with high-resolution timing
 */
export async function resolveSingleRecord(domain, recordType, resolverIp = 'system', timeoutMs = 6000) {
  const cleanDomain = validateAndCleanDomain(domain);
  const type = recordType.toUpperCase();
  const { resolver, name: resolverName, ip } = getResolverInstance(resolverIp);

  const startTime = performance.now();
  let rawRecords = [];
  let queryStatus = 'SUCCESS';
  let errorCode = null;
  let errorMessage = null;

  try {
    let queryPromise;
    switch (type) {
      case 'A':
        queryPromise = resolver.resolve4(cleanDomain, { ttl: true }).catch(async (err) => {
          // If ttl: true not supported or fails, fallback to simple resolve4
          if (err.code !== 'ENODATA' && err.code !== 'ENOTFOUND') {
            return await resolver.resolve4(cleanDomain);
          }
          throw err;
        });
        break;
      case 'AAAA':
        queryPromise = resolver.resolve6(cleanDomain, { ttl: true }).catch(async (err) => {
          if (err.code !== 'ENODATA' && err.code !== 'ENOTFOUND') {
            return await resolver.resolve6(cleanDomain);
          }
          throw err;
        });
        break;
      case 'CNAME':
        queryPromise = resolver.resolveCname(cleanDomain);
        break;
      case 'MX':
        queryPromise = resolver.resolveMx(cleanDomain);
        break;
      case 'NS':
        queryPromise = resolver.resolveNs(cleanDomain);
        break;
      case 'TXT':
        queryPromise = resolver.resolveTxt(cleanDomain);
        break;
      default:
        throw new Error(`Unsupported record type: ${type}`);
    }

    const result = await withTimeout(queryPromise, timeoutMs);
    
    // Normalize TXT records (Node returns array of arrays: [["v=spf1 ..."]])
    if (type === 'TXT' && Array.isArray(result)) {
      rawRecords = result.map((chunk) => (Array.isArray(chunk) ? chunk.join('') : chunk));
    } else {
      rawRecords = Array.isArray(result) ? result : [result];
    }

    if (rawRecords.length === 0) {
      queryStatus = 'NO_RECORDS';
    }
  } catch (err) {
    errorCode = err.code || 'UNKNOWN_ERROR';
    errorMessage = err.message || 'DNS resolution failed';

    if (errorCode === 'ENOTFOUND') {
      queryStatus = 'NXDOMAIN';
    } else if (errorCode === 'ENODATA') {
      queryStatus = 'NO_RECORDS';
      rawRecords = [];
    } else if (errorCode === 'ETIMEDOUT' || errorCode === 'ETIMEOUT') {
      queryStatus = 'TIMEOUT';
    } else if (errorCode === 'ESERVFAIL') {
      queryStatus = 'SERVFAIL';
    } else if (errorCode === 'EREFUSED') {
      queryStatus = 'REFUSED';
    } else {
      queryStatus = 'ERROR';
    }
  }

  const endTime = performance.now();
  const durationMs = Math.round((endTime - startTime) * 100) / 100;

  return {
    domain: cleanDomain,
    recordType: type,
    resolver: ip,
    resolverName,
    durationMs,
    records: rawRecords,
    recordCount: rawRecords.length,
    status: queryStatus,
    errorCode,
    errorMessage,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Perform query for ALL supported record types independently
 */
export async function resolveAllRecords(domain, resolverIp = 'system', timeoutMs = 6000) {
  const cleanDomain = validateAndCleanDomain(domain);
  const typesToQuery = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'];
  const overallStart = performance.now();

  const subQueryPromises = typesToQuery.map((type) =>
    resolveSingleRecord(cleanDomain, type, resolverIp, timeoutMs)
  );

  const subResults = await Promise.all(subQueryPromises);
  const overallEnd = performance.now();
  const totalDurationMs = Math.round((overallEnd - overallStart) * 100) / 100;

  const successfulQueries = subResults.filter(
    (res) => res.status === 'SUCCESS' && res.recordCount > 0
  );
  const nxdomainCount = subResults.filter((res) => res.status === 'NXDOMAIN').length;

  let queryStatus = 'SUCCESS';
  if (nxdomainCount === typesToQuery.length) {
    queryStatus = 'NXDOMAIN';
  } else if (successfulQueries.length === 0) {
    queryStatus = 'NO_RECORDS';
  } else if (successfulQueries.length < typesToQuery.length) {
    queryStatus = 'PARTIAL';
  }

  // Group records by type
  const recordsByType = {};
  subResults.forEach((res) => {
    recordsByType[res.recordType] = {
      records: res.records,
      count: res.recordCount,
      durationMs: res.durationMs,
      status: res.status,
      errorCode: res.errorCode,
      errorMessage: res.errorMessage,
    };
  });

  const { name: resolverName, ip } = getResolverInstance(resolverIp);

  return {
    domain: cleanDomain,
    recordType: 'ALL',
    resolver: ip,
    resolverName,
    durationMs: totalDurationMs,
    records: recordsByType,
    subQueries: subResults,
    successfulCount: successfulQueries.length,
    totalAttempted: typesToQuery.length,
    status: queryStatus,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Compare multiple resolvers for a given domain and record type
 */
export async function compareResolvers(domain, recordType = 'A', resolvers = ['system', '8.8.8.8', '1.1.1.1']) {
  const cleanDomain = validateAndCleanDomain(domain);
  const uniqueResolvers = [...new Set(resolvers.filter(Boolean))];

  if (uniqueResolvers.length === 0) {
    uniqueResolvers.push('system', '8.8.8.8', '1.1.1.1');
  }

  const comparisonPromises = uniqueResolvers.map(async (resolverIp) => {
    if (recordType.toUpperCase() === 'ALL') {
      return await resolveAllRecords(cleanDomain, resolverIp);
    }
    return await resolveSingleRecord(cleanDomain, recordType, resolverIp);
  });

  const rawResults = await Promise.all(comparisonPromises);

  // Analyze differences and fastest resolver
  const successfulResults = rawResults.filter((r) => r.status === 'SUCCESS' || r.status === 'PARTIAL');
  let fastest = null;
  let fastestDuration = Infinity;

  successfulResults.forEach((res) => {
    if (res.durationMs < fastestDuration) {
      fastestDuration = res.durationMs;
      fastest = res.resolver;
    }
  });

  // Check if records returned match across resolvers
  const evidenceNotes = [];
  let recordsMatch = true;
  let summaryOfDifferences = 'All queried resolvers returned consistent status.';

  if (rawResults.length > 1) {
    const firstSuccessful = successfulResults[0];
    if (firstSuccessful && recordType.toUpperCase() !== 'ALL') {
      const baseSerialized = JSON.stringify(
        [...(firstSuccessful.records || [])].map((item) =>
          typeof item === 'object' && item.address ? item.address : String(item)
        ).sort()
      );

      for (let i = 1; i < successfulResults.length; i++) {
        const current = successfulResults[i];
        const currentSerialized = JSON.stringify(
          [...(current.records || [])].map((item) =>
            typeof item === 'object' && item.address ? item.address : String(item)
          ).sort()
        );

        if (baseSerialized !== currentSerialized) {
          recordsMatch = false;
          summaryOfDifferences = `Differences detected: ${firstSuccessful.resolverName} and ${current.resolverName} returned different record sets.`;
          evidenceNotes.push(
            `${firstSuccessful.resolverName} returned: ${baseSerialized} while ${current.resolverName} returned: ${currentSerialized}`
          );
        }
      }
    }

    if (recordsMatch && successfulResults.length > 1) {
      summaryOfDifferences = 'All successful resolvers returned identical record sets.';
      evidenceNotes.push('Records match identically across successful resolvers.');
    }
  }

  if (fastest) {
    const fastestResult = rawResults.find((r) => r.resolver === fastest);
    evidenceNotes.push(
      `Observation: ${fastestResult.resolverName} was the fastest in this specific run (${fastestDuration} ms). Note: Latency depends on local network conditions, routing, cache hits, and server proximity.`
    );
  }

  const measuredDurations = {};
  rawResults.forEach((r) => {
    measuredDurations[r.resolver] = r.durationMs;
  });

  return {
    domain: cleanDomain,
    recordType: recordType.toUpperCase(),
    selectedResolvers: uniqueResolvers,
    results: rawResults,
    measuredDurations,
    fastestResolver: fastest,
    fastestDurationMs: fastest ? fastestDuration : null,
    recordsMatch,
    summaryOfDifferences,
    evidenceNotes,
    comparisonTimestamp: new Date().toISOString(),
  };
}
