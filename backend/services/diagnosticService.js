/**
 * Rule-Based DNS Diagnostic Engine
 * Evaluates genuine DNS outcomes without fabricating findings or making unsupported claims.
 */

export function diagnoseDNSResult(queryResult) {
  const {
    domain,
    recordType,
    resolverName,
    resolver,
    status,
    records,
    recordCount,
    durationMs,
    errorCode,
    errorMessage,
    subQueries,
  } = queryResult;

  const timestamp = new Date().toISOString();
  const evidence = [];
  const recommendedActions = [];
  let observedCondition = '';
  let possibleExplanation = '';
  let certaintyLevel = 'CONFIRMED';
  let severity = 'info'; // 'info', 'warning', 'error', 'success'

  // SCENARIO 1: Confirmed NXDOMAIN (Nonexistent domain)
  if (status === 'NXDOMAIN' || errorCode === 'ENOTFOUND') {
    observedCondition = `Domain "${domain}" does not exist in DNS (NXDOMAIN / ENOTFOUND).`;
    evidence.push(`Resolver "${resolverName}" returned authoritative response code NXDOMAIN (ENOTFOUND).`);
    evidence.push(`Query failed at duration: ${durationMs} ms.`);
    
    possibleExplanation = 
      'The requested fully qualified domain name is not registered, its registration has expired, or the authoritative name servers have no zone record for this host. Typos in top-level domain (TLD) or hostname are the most frequent causes.';
    
    certaintyLevel = 'CONFIRMED';
    severity = 'error';

    recommendedActions.push('Verify exact spelling of the domain and top-level domain.');
    recommendedActions.push('Check WHOIS / RDAP registration records to verify if the domain is registered and active.');
    recommendedActions.push('Check authoritative nameservers (NS records) assigned at the registrar level.');
  }

  // SCENARIO 2: DNS Query Timeout
  else if (status === 'TIMEOUT' || errorCode === 'ETIMEDOUT' || errorCode === 'ETIMEOUT') {
    observedCondition = `DNS query to resolver "${resolverName}" timed out (${durationMs} ms).`;
    evidence.push(`Query exceeded maximum timeout threshold.`);
    evidence.push(`Resolver IP queried: ${resolver}.`);
    
    possibleExplanation = 
      'The DNS resolver did not respond within the allocated time window. This commonly occurs due to local UDP port 53 filtering, intermediate network packet loss, firewall blocking, or resolver overload.';
    
    certaintyLevel = 'HIGH_PROBABILITY';
    severity = 'error';

    recommendedActions.push('Test the same domain using alternate public resolvers (e.g., Google 8.8.8.8, Cloudflare 1.1.1.1).');
    recommendedActions.push('Verify local network connectivity and check whether port 53 (UDP/TCP) is filtered.');
    recommendedActions.push('Inspect whether local security software or corporate VPN proxies DNS traffic.');
  }

  // SCENARIO 3: SERVFAIL (Server Failure)
  else if (status === 'SERVFAIL' || errorCode === 'ESERVFAIL') {
    observedCondition = `Resolver returned SERVFAIL (Server Failure).`;
    evidence.push(`Resolver "${resolverName}" reported error code ESERVFAIL.`);
    evidence.push(`Query duration: ${durationMs} ms.`);

    possibleExplanation = 
      'The recursive resolver was unable to obtain an answer from the authoritative nameservers. Possible causes include DNSSEC signature validation failure (expired RRSIG), unreachable authoritative nameservers, or resolver misconfiguration. SERVFAIL indicates an infrastructure breakdown, not necessarily a non-existent domain.';
    
    certaintyLevel = 'HIGH_PROBABILITY';
    severity = 'error';

    recommendedActions.push('Verify if DNSSEC validation is failing by testing on a resolver with DNSSEC debugging enabled (e.g., dnsviz.net).');
    recommendedActions.push('Compare results across multiple independent recursive resolvers.');
    recommendedActions.push('Check authoritative nameservers for zone delegation errors (Lame Delegation).');
  }

  // SCENARIO 4: Query Refused
  else if (status === 'REFUSED' || errorCode === 'EREFUSED') {
    observedCondition = `DNS query was refused by the resolver (REFUSED / EREFUSED).`;
    evidence.push(`Resolver "${resolverName}" actively refused processing the query.`);
    
    possibleExplanation = 
      'The resolver server policy refused the recursion request. This typically happens when querying a closed resolver from an unauthorized subnet or when recursive queries are disabled for external clients.';
    
    certaintyLevel = 'CONFIRMED';
    severity = 'error';

    recommendedActions.push('Ensure public recursive resolvers (e.g. 1.1.1.1 or 8.8.8.8) are used instead of restricted private recursive servers.');
  }

  // SCENARIO 5: Missing Record Type (ENODATA / NO_RECORDS)
  else if (status === 'NO_RECORDS' || errorCode === 'ENODATA' || recordCount === 0) {
    observedCondition = `Domain "${domain}" exists, but requested record type [${recordType}] was not found (NOERROR with 0 records / NODATA).`;
    evidence.push(`Query completed in ${durationMs} ms without returning [${recordType}] records.`);
    evidence.push(`The domain itself is valid and resolvable, but does not publish [${recordType}] data.`);

    possibleExplanation = 
      `The domain name is validly registered and configured in DNS, but the zone owner has not published any ${recordType} resource records. For example, a domain may have IPv4 (A) records but no IPv6 (AAAA) records, or may not host direct email exchange (MX) on this specific hostname.`;
    
    certaintyLevel = 'CONFIRMED';
    severity = 'warning';

    recommendedActions.push(`Query record type "A" or "ALL" to inspect other active DNS records for "${domain}".`);
    recommendedActions.push(`If ${recordType} is expected (e.g. MX for email or AAAA for IPv6), verify the zone configuration in the DNS provider control panel.`);
    recommendedActions.push('Check if the service relies on a CNAME alias pointing to a canonical name.');
  }

  // SCENARIO 6: Partial resolution in ALL mode
  else if (recordType === 'ALL' && status === 'PARTIAL') {
    const presentTypes = [];
    const missingTypes = [];
    if (records && typeof records === 'object') {
      Object.entries(records).forEach(([type, data]) => {
        if (data.status === 'SUCCESS' && data.count > 0) {
          presentTypes.push(type);
        } else {
          missingTypes.push(type);
        }
      });
    }

    observedCondition = `Partial DNS resolution: Found records for [${presentTypes.join(', ')}], no records for [${missingTypes.join(', ')}].`;
    evidence.push(`Domain "${domain}" resolved successfully across ${presentTypes.length} record categories.`);
    evidence.push(`Absent record categories: ${missingTypes.join(', ')}.`);
    evidence.push(`Total resolution duration: ${durationMs} ms.`);

    possibleExplanation = 
      `The domain is fully functional for services represented by ${presentTypes.join(', ')}. The absence of ${missingTypes.join(', ')} simply reflects typical service architecture (e.g., bare domains commonly lack CNAME due to RFC 1034 constraints, or services may lack native IPv6 / AAAA deployment).`;
    
    certaintyLevel = 'CONFIRMED';
    severity = 'info';

    recommendedActions.push('Review whether missing types are needed for planned services (e.g., AAAA for IPv6, MX for email delivery).');
    recommendedActions.push('No immediate remediation required if existing records cover operational needs.');
  }

  // SCENARIO 7: Successful Resolution
  else if (status === 'SUCCESS') {
    observedCondition = `Successful resolution: ${recordCount} [${recordType}] record(s) returned in ${durationMs} ms.`;
    evidence.push(`Resolver: ${resolverName} (${resolver}).`);
    evidence.push(`Returned record count: ${recordCount}.`);
    
    let typeMeaning = '';
    if (recordType === 'A') {
      typeMeaning = 'Maps the human-readable domain name to 32-bit IPv4 address(es) for direct IP packet routing.';
      evidence.push(`Resolved IPv4 address(es): ${JSON.stringify(records.map(r => r.address || r))}`);
    } else if (recordType === 'AAAA') {
      typeMeaning = 'Maps the domain name to 128-bit IPv6 address(es), enabling modern dual-stack Internet routing.';
      evidence.push(`Resolved IPv6 address(es): ${JSON.stringify(records.map(r => r.address || r))}`);
    } else if (recordType === 'CNAME') {
      typeMeaning = 'Canonical Name record aliasing this hostname to another target domain.';
      evidence.push(`Canonical target: ${JSON.stringify(records)}`);
    } else if (recordType === 'MX') {
      typeMeaning = 'Mail Exchange records specifying mail server hostnames and their delivery priorities.';
      evidence.push(`Mail servers: ${JSON.stringify(records)}`);
    } else if (recordType === 'NS') {
      typeMeaning = 'Authoritative Name Server records delegating authority for this DNS zone.';
      evidence.push(`Authoritative nameservers: ${JSON.stringify(records)}`);
    } else if (recordType === 'TXT') {
      typeMeaning = 'Text records commonly utilized for SPF (Sender Policy Framework), DKIM, DMARC, and domain ownership verification.';
      evidence.push(`TXT payload entries count: ${recordCount}`);
    } else {
      typeMeaning = 'DNS Resource Records returned successfully.';
    }

    possibleExplanation = `DNS resolution completed normally. ${typeMeaning}`;
    certaintyLevel = 'CONFIRMED';
    severity = 'success';

    // Latency evaluation
    if (durationMs > 250) {
      evidence.push(`Notice: Response time of ${durationMs} ms is relatively high (>250ms), suggesting either an initial recursive cache miss, high round-trip latency to upstream nameservers, or network throttling.`);
      recommendedActions.push('Repeat the query to check whether cached response time drops below 30ms.');
    } else {
      evidence.push(`Response time of ${durationMs} ms indicates low latency and active resolver caching.`);
    }

    recommendedActions.push('Configuration is operational. Copy records or compare across public resolvers if verifying propagation.');
  }

  // SCENARIO 8: Generic or unexpected error
  else {
    observedCondition = `DNS query encountered an unexpected error: ${errorMessage || 'Unknown error'}.`;
    evidence.push(`Error code: ${errorCode || 'N/A'}`);
    evidence.push(`Duration before failure: ${durationMs} ms.`);
    
    possibleExplanation = 
      'An unexpected protocol or networking error occurred while processing the DNS query. Network socket limits, transport failures, or non-standard protocol responses could be involved.';
    
    certaintyLevel = 'POSSIBLE';
    severity = 'error';

    recommendedActions.push('Retry the query with standard public resolvers (8.8.8.8, 1.1.1.1).');
    recommendedActions.push('Inspect local system network adapter configuration.');
  }

  return {
    domain,
    recordType,
    resolver,
    resolverName,
    observedCondition,
    supportingEvidence: evidence,
    possibleExplanation,
    certaintyLevel,
    severity,
    recommendedActions,
    diagnosticTimestamp: timestamp,
    technicalDetails: {
      durationMs,
      status,
      errorCode,
      recordCount,
    },
  };
}

/**
 * Diagnostic analysis for resolver comparison
 */
export function diagnoseComparison(comparisonResult) {
  const { domain, recordType, results, fastestResolver, fastestDurationMs, recordsMatch } = comparisonResult;
  const timestamp = new Date().toISOString();
  const evidence = [];
  const recommendedActions = [];
  let observedCondition = '';
  let possibleExplanation = '';
  let certaintyLevel = 'CONFIRMED';
  let severity = 'info';

  const successfulCount = results.filter((r) => r.status === 'SUCCESS' || r.status === 'PARTIAL').length;
  const totalCount = results.length;

  evidence.push(`Tested ${totalCount} resolvers: ${results.map(r => `${r.resolverName} (${r.durationMs}ms)`).join(', ')}.`);

  if (successfulCount === 0) {
    observedCondition = `All ${totalCount} resolvers failed to resolve "${domain}" for record type [${recordType}].`;
    possibleExplanation = 'Consistent failure across independent resolvers strongly indicates a domain-level issue (such as unconfigured zone, missing records, or expired domain) rather than a single resolver outage.';
    severity = 'error';
    certaintyLevel = 'HIGH_PROBABILITY';
    recommendedActions.push('Verify domain registration and authoritative nameserver configuration.');
  } else if (successfulCount < totalCount) {
    const failed = results.filter((r) => r.status !== 'SUCCESS' && r.status !== 'PARTIAL');
    observedCondition = `Discrepancy: ${successfulCount} resolver(s) succeeded, but ${failed.length} failed (${failed.map(f => f.resolverName).join(', ')}).`;
    possibleExplanation = 'Inconsistent resolver availability may stem from localized DNS filtering, resolver rate limits, or in-progress global DNS propagation changes.';
    severity = 'warning';
    certaintyLevel = 'HIGH_PROBABILITY';
    recommendedActions.push('Check TTL values and wait for DNS propagation if records were modified recently.');
    recommendedActions.push('Inspect local firewall or ISP DNS redirection for the failing resolver.');
  } else if (!recordsMatch) {
    observedCondition = `Different resolver responses: Resolvers returned differing record sets for "${domain}".`;
    evidence.push('Record contents vary between queried public/system resolvers.');
    possibleExplanation = 
      'Different record values across resolvers are common for major web properties employing Content Delivery Networks (CDNs), Anycast routing, or GeoDNS (where users are steered to the nearest regional data center). It can also indicate active DNS record propagation after recent modifications.';
    severity = 'info';
    certaintyLevel = 'CONFIRMED';
    recommendedActions.push('Check if the domain uses GeoDNS / CDN (e.g. Cloudflare, Akamai, AWS CloudFront).');
    recommendedActions.push('Verify whether a recent DNS record change is still propagating across cache TTLs.');
  } else {
    observedCondition = `All ${totalCount} resolvers returned consistent record sets.`;
    evidence.push(`Fastest observed resolver in this test: ${fastestResolver} (${fastestDurationMs} ms).`);
    evidence.push('Record sets matched identically across all resolvers.');
    possibleExplanation = 
      `All tested resolvers agree on the zone data for "${domain}". Latency differences reflect current network distance, routing hops, and whether the record was pre-warmed in that resolver\'s cache. This single test does not imply universal superiority for any resolver.`;
    severity = 'success';
    certaintyLevel = 'CONFIRMED';
    recommendedActions.push('Records are globally consistent across the tested resolvers.');
  }

  return {
    domain,
    recordType,
    observedCondition,
    supportingEvidence: evidence,
    possibleExplanation,
    certaintyLevel,
    severity,
    recommendedActions,
    diagnosticTimestamp: timestamp,
    technicalDetails: {
      fastestResolver,
      fastestDurationMs,
      recordsMatch,
      testedResolversCount: totalCount,
    },
  };
}
