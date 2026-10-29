const API_BASE = '/api';

/**
 * Helper fetch wrapper with JSON parsing and standardized error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
    throw err;
  }
}

// Health & System
export function fetchHealth() {
  return request('/health');
}

// Live DNS Resolution
export function analyzeDNS(domain, recordType = 'A', resolver = 'system') {
  return request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ domain, recordType, resolver }),
  });
}

// Resolver Performance Benchmark
export function compareResolvers(domain, recordType = 'A', resolvers = ['system', '8.8.8.8', '1.1.1.1']) {
  return request('/compare', {
    method: 'POST',
    body: JSON.stringify({ domain, recordType, resolvers }),
  });
}

export function fetchCompareHistory(limit = 10) {
  return request(`/compare/history?limit=${limit}`);
}

// History & Statistics
export function fetchDashboardStats() {
  return request('/history/stats');
}

export function fetchHistory({
  page = 1,
  limit = 10,
  domain = '',
  recordType = '',
  resolver = '',
  status = '',
  sortBy = 'queryTimestamp',
  sortOrder = 'desc',
} = {}) {
  const query = new URLSearchParams({
    page,
    limit,
    domain,
    recordType,
    resolver,
    status,
    sortBy,
    sortOrder,
  }).toString();
  return request(`/history?${query}`);
}

export function fetchLookupById(id) {
  return request(`/history/${id}`);
}

export function deleteLookup(id) {
  return request(`/history/${id}`, { method: 'DELETE' });
}

export function clearHistory() {
  return request('/history', {
    method: 'DELETE',
    body: JSON.stringify({ confirmed: true }),
  });
}

// Diagnostic Reports
export function runDiagnosis(lookupData, persist = true) {
  return request('/diagnose', {
    method: 'POST',
    body: JSON.stringify({ lookupData, persist }),
  });
}

export function fetchReports({ page = 1, limit = 10, domain = '', certainty = '' } = {}) {
  const query = new URLSearchParams({ page, limit, domain, certainty }).toString();
  return request(`/reports?${query}`);
}

export function fetchReportById(id) {
  return request(`/reports/${id}`);
}

export function deleteReport(id) {
  return request(`/reports/${id}`, { method: 'DELETE' });
}

// Guided Troubleshooting Workflows
export function fetchTroubleshootingScenarios() {
  return request('/troubleshooting/scenarios');
}

export function runTroubleshootingStep(payload) {
  return request('/troubleshooting/run-step', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function saveTroubleshootingSession(payload) {
  return request('/troubleshooting/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchTroubleshootingSessions() {
  return request('/troubleshooting/sessions');
}

export function deleteTroubleshootingSession(id) {
  return request(`/troubleshooting/sessions/${id}`, { method: 'DELETE' });
}
