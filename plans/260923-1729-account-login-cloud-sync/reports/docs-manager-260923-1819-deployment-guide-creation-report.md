# Deployment Guide Creation Report

**Date:** 2026-09-23 · **Task:** Write Vietnamese deployment guide for Nhân Hòa PaaS · **Status:** DONE

---

## Summary

Created `D:\project\eng\docs\deployment-guide.md` (270 lines): step-by-step Vietnamese guide for solo developer to deploy LingoBrain Node server to Nhân Hòa PaaS with PostgreSQL. Covers prerequisites, environment setup, build/deploy, smoke tests, version management, rollback, and troubleshooting.

---

## Facts Verified from Code

✓ `server.js`: PORT (3000), DATABASE_URL, PGSSL, PGSSLROOTCERT, TRUST_PROXY_HOPS (default 0)  
✓ `server/database.js`: Auto-creates users/sessions/progress tables on boot, retries schema (2s→30s backoff)  
✓ `package.json`: npm start, Node ≥18, dep pg  
✓ Static server: whitelisted files, security headers, no gzip  
✓ DB outage behavior: web tĩnh 200, API 503 (verified in code)

---

## Guide Sections Delivered

1. **Overview** — hybrid static + Node, origin invariant, DB preconditions
2. **Step 1: Resource setup** — repo pointer, branch, Dockerfile conditional
3. **Step 2: Environment** — TABLE with 4 required vars (DATABASE_URL, TRUST_PROXY_HOPS, PGSSL, PORT) + password encoding reminder
4. **Step 3: Build & Deploy** — log expectations (listening + schema ready), Dockerfile snippet if auto-detect fails
5. **Step 4: Smoke test** — 9 curl examples (register/login/sync/traversal/headers/outage)
6. **Step 5: DB outage check** — procedure + expectations
7. **Step 6: Domain cutover** — origin preservation warning, PWA cross-device test
8. **Step 7: Version & backup** — APP_VERSION/CACHE bump rule, backup procedure
9. **Step 8: Rollback** — static fallback, client auto-handling, long-rollback version bump
10. **Troubleshooting table** — 8 scenarios (schema not ready, 503 forever, rate limit, DNS, etc.)
11. **Unresolved questions** — 5 items (resource type, build detect, proxy behavior, domain, Phase 3 UI status)

---

## Constraints Met

✓ Vietnamese with full diacritics (Tiếng Việt chuẩn)  
✓ Concise, step-by-step for solo dev  
✓ No secrets (placeholder `<MẬT_KHẨU_ĐÃ_URL_ENCODE>`)  
✓ No absolute local paths  
✓ Line count: 270 (near 250 target, acceptable for completeness)  
✓ Markdown format, clean structure with tables + code blocks  
✓ Only `deployment-guide.md` created; no code files modified

---

## Integration with Phase 4

Doc matches requirements from `phase-04-deploy-smoke-test-docs.md`:
- ✓ Create resource on Nhán Hòa, set env, deploy
- ✓ Smoke via curl (register/login/sync/traversal/headers/outage)
- ✓ Domain cutover with origin preservation
- ✓ Version bump on each deploy
- ✓ Backup DB procedure
- ✓ Rollback guidance (static fallback + SW behavior)
- ✓ Troubleshooting table
- ✓ Unresolved questions section

---

## Notes for Implementation

1. **Password encoding:** Emphasized URL-encoding for `@` and special chars. Recommend rotating password (was shared in chat).

2. **TRUST_PROXY_HOPS debug:** Included optional log addition to verify correct IP detection; marked TMP for removal.

3. **Dockerfile conditional:** Provided minimal node:20-alpine snippet; noted "only if needed" (nền tảng may auto-detect).

4. **Smoke tests completeness:** 9 curl examples cover happy path (register/login/sync), error cases (409/401/503), security (traversal/headers), and outage resilience.

5. **Rollback non-breaking:** Emphasized client's offline-first mode survives API 503 → no user data loss.

---

## Unresolved Questions for Lead

1. Should Phase 3 (UI) be deployed before or after smoke test on Node resource?
2. Does Nhân Hòa auto-detect Node buildpack from `package.json`, or always require Dockerfile?
3. What is the production domain (ví dụ `https://lingobrain.vn`) to confirm origin preservation?
