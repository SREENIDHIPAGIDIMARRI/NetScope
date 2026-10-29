# NetScope — Interactive DNS & Network Resolution Analyzer

NetScope is an academic Computer Networks case-study web application for genuine DNS lookups, multi-resolver latency benchmarking, rule-based diagnostic analysis, conceptual resolution exploration, and MongoDB-backed persistence.

---

## 🌟 Key Features

### 1. Genuine DNS Lookup Engine (`/lookup`)
- Performs real socket queries using Node.js `node:dns/promises` and `node:perf_hooks`.
- Supports **A**, **AAAA**, **CNAME**, **MX**, **NS**, **TXT**, and **ALL** record types.
- Queries against:
  - **System Default Resolver** (local OS stack)
  - **Google Public DNS** (`8.8.8.8`)
  - **Cloudflare DNS** (`1.1.1.1`)
  - **Custom Resolver IPv4** (arbitrary DNS server)
- Independent multi-query processing for **ALL** mode so missing records do not fail the request.
- One-click copy, repeatable query, JSON/Text report export, and direct link to troubleshooting.

### 2. Rule-Based DNS Diagnostic Engine (Novelty Feature 1)
- Evaluates actual returned socket outcomes and raw error codes:
  - **Confirmed NXDOMAIN (`ENOTFOUND`)**: Authoritative non-existence analysis.
  - **DNS Timeout (`ETIMEDOUT`)**: UDP drop, firewall filtering, port 53 blockage.
  - **Missing Record Types (`ENODATA` / `NO_RECORDS`)**: Explains domain validity vs unconfigured RR.
  - **Server Failure (`SERVFAIL` / `ESERVFAIL`)**: Upstream delegation or DNSSEC signature errors.
  - **Query Refused (`REFUSED`)**: Closed recursion policy.
  - **Resolver Discrepancies**: Geographic CDN / Anycast steering vs split-horizon.
  - **High Latency (>250ms)**: Cache misses vs recursive depth.
  - **Successful Queries**: Technical interpretation of IPv4, IPv6 dual-stack, MX priorities, CNAME chains, and SPF/DKIM TXT payloads.
- Strictly provides **Observed Condition**, **Supporting Evidence**, **Possible Explanation**, **Certainty Level** (`CONFIRMED`, `HIGH_PROBABILITY`, `POSSIBLE`), and **Recommended Actions**.

### 3. Resolver Performance Lab & Evidence-Based Comparison (Novelty Feature 2)
- Dispatches parallel queries across selected recursive resolvers.
- Measures high-resolution socket latency in milliseconds.
- Visual comparative bar chart (Recharts).
- Fastest resolver highlight accompanied by scientific disclaimers: explains that single tests do not imply universal superiority and depend on Anycast routes, network hops, and cache warming.
- Record difference analyzer flags exact IP variances.

### 4. Interactive DNS Resolution Explorer (Novelty Feature 3)
- 4-Stage educational model:
  1. **Client Stub Query** (UDP port 53, RD flag).
  2. **Recursive Resolver & Cache Inspection** (Cache hit vs miss, RA flag).
  3. **Iterative Hierarchy Traversal** (Root `.` ➔ TLD `.com` ➔ Authoritative nameservers, Glue records).
  4. **Authoritative Answer & Delivery** (AA flag, Resource Records, TTL countdown, client caching).
- **Live Resolution Probe Sandbox**: Run real DNS lookups right inside the explorer and inspect actual returned records side-by-side with the conceptual model.
- Technical concept reference cards on DNS Tree Hierarchy, TTL Invalidation, Passive Propagation, and GeoDNS.

### 5. Guided Troubleshooting Center (Novelty Feature 4)
- Step-by-step diagnostic workflows for 5 network scenarios:
  1. `Domain Does Not Resolve`
  2. `A Record Exists but AAAA Missing`
  3. `DNS Query Times Out`
  4. `Resolver Responses Differ`
  5. `DNS Response Time Is Unusually High`
- Each workflow asks questions, executes real verification tests, records observations, recommends next steps, and persists sessions to MongoDB.

### 6. MongoDB Persistence & History Repository (Novelty Feature 5)
- Stores lookup records (`DNSLookup`), resolver benchmarks (`ResolverComparison`), diagnostic evaluations (`DiagnosticReport`), and guided workflows (`TroubleshootingSession`).
- Paginated search, record type / resolver / status filtering, latency / timestamp sorting.
- Downloadable JSON and Plain Text reports generated from actual database records.
- Clear history with confirmation modal.
- Built-in **Learning Center Quiz** with immediate scoring and explanations.

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS (Dark Navy `#070B14`, Charcoal, Cyan `#06B6D4`, Electric Blue `#3B82F6`)
- **Routing:** React Router v7 (`/dashboard`, `/lookup`, `/explorer`, `/resolver-lab`, `/troubleshooting`, `/history-reports`, `/learning-center`)
- **Visualization:** Recharts (AreaChart, BarChart)
- **Icons:** Lucide React
- **Network Client:** Fetch API

### Backend
- **Runtime:** Node.js v22
- **Web Framework:** Express.js 4
- **DNS Core:** Native `node:dns/promises` and `node:perf_hooks`
- **Database ODM:** Mongoose 8
- **Middleware:** CORS, dotenv, JSON body parsing, custom request logging

### Database
- **MongoDB** (Local instance on `mongodb://127.0.0.1:27017/netscope` or MongoDB Atlas URI)

---

## 🚀 Installation & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v22 recommended)
- **MongoDB**: Local MongoDB instance (default port `27017`) or MongoDB Atlas connection string.

### 2. Clone / Open Directory
```bash
cd "Cn sreenidhi"
```

### 3. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file in `backend/`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/netscope
FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
NODE_ENV=development
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## 🏃 Running the Application

### Option A: Running Backend & Frontend Individually

1. **Start MongoDB** (if not already running):
   ```powershell
   mongod --dbpath ./backend/mongodb-data --port 27017
   ```

2. **Start Backend Server**:
   ```bash
   cd backend
   npm start
   # Server runs on http://localhost:5000
   # Health check at http://localhost:5000/api/health
   ```

3. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev
   # Vite runs on http://localhost:5173
   ```

4. **Open in Browser**:
   Navigate to [http://localhost:5173](http://localhost:5173)

---

## 🧪 Tested Features & Verification

| Module | Verification Test | Result |
| :--- | :--- | :--- |
| **DNS Lookup** | Query `google.com` (A, CNAME, NS, ALL) | Returned authentic IPs, measured 4–62ms socket latency |
| **Error Handling** | Query non-existent domain (`invalid-domain-xyz.net`) | Correctly diagnosed NXDOMAIN (`ENOTFOUND`) |
| **Resolver Comparison** | Benchmark `cloudflare.com` across System, Google (8.8.8.8), Cloudflare (1.1.1.1) | Measured parallel latency, rendered comparative chart |
| **DNS Explorer** | 4-Stage resolution stepper & live probe sandbox | Interactive traversal and live socket inspection |
| **Troubleshooting** | Guided diagnostic workflow execution | Step-by-step verification, real DNS probe, session saving |
| **Database Persistence** | MongoDB storage of lookups, reports, sessions | Persisted records verified with pagination, search & export |
| **Learning Center** | Knowledge assessment quiz | Interactive grading, explanations, localStorage state |

---

## 📜 Academic Integrity & Design Note
- **No Fabricated Records:** Every DNS latency measurement, record set, and error code is genuinely queried from active DNS resolver sockets.
- **Evidence-Based Telemetry:** Comparisons strictly state observations for that specific query run and avoid universal speed claims.
- **Graceful Degradation:** If MongoDB is unavailable or reconnecting, the backend logs diagnostic warnings and continues servicing live DNS lookups.
