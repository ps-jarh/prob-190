# NyayaVault (SIH 2026, PS SIH26190): React + Node/Express + PostgreSQL

PROTOTYPE, SIMULATED DATA. Supports integrity and provenance verification; makes no claim of legal admissibility.

## Run with PostgreSQL
    docker compose up -d                      # Postgres on :5432
    cd server && npm install && npm start     # API on :4000, creates tables and seeds synthetic data
    cd client && npm install && npm run dev   # UI on http://localhost:5173 (proxies /api to :4000)
Single-server option: `cd client && npm run build`, then `npm start` in server/ also serves the UI.

## Run without a database (demo only)
    cd server && npm install && npm run dev:mem     # in-memory Postgres emulator (pg-mem)

## Tests
    cd server && npm test     # 9 API tests: isolation, PDF-only upload, lifecycle, tamper, audit chain, AI filter, ledger, shares

## Layout
server/src: app.js (REST API), policy.js (ABAC/RBAC rules), audit.js (hash chain, Merkle batches, proofs, simulated 4-org ledger), crypto.js (SHA-256, AES-256-GCM, simulated ECDSA DSC, PDF helpers), seed.js (3 cases, 12 PDFs), schema.sql
client/src: React + TypeScript + Tailwind + React Router (App.tsx pages, api.ts, ui.tsx)

## Enforced server-side
Every document action passes the policy engine in the API, and allow and deny decisions go into the hash-chained audit log. Users only see cases they are assigned to; other cases return 403 (P-03). Uploads must be real PDFs, new versions need a reason, and approval is maker-checker.

## Honest limits
- Tested with pg-mem only. Not yet run against a real PostgreSQL server, so report any SQL differences.
- Files are AES-256-GCM encrypted and stored as base64 text in Postgres (key from FILE_KEY), not in object storage.
- Signature (ECDSA P-256), timestamp authority, the 4-org ledger and CCTNS/e-Courts/e-Sakshya/ICJS are simulated. Sessions are in memory and MFA is a code shown on screen.
- Not yet ported to this stack: offline verification bundle, QR/public verify page in the UI (the API endpoint exists), break-glass, leak trace, version diff view, anomaly flags, shadcn/ui, Recharts charts, guided demo walkthrough. The earlier single-file version (nyayavault.html) still has most of these.
