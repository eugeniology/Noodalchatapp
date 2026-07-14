<!--
First SR-18 recovery record for this repo (noodal-chat-app / GitHub eugeniology/Noodalchatapp).
No CI/deploy automation exists here (proven-manual recipe, see project_noodals_com_launch_infra
memory) — "push type" below is a manual S3 sync + CloudFront invalidation, not an image deploy.
Adapted from membrane's docs/recovery/RECOVERY_RECORD_TEMPLATE.md for that shape. The SRE-at-3am
bar still applies: someone who is NOT the author must be able to diagnose and roll this back from
this record alone.
-->

# Recovery record — noodals.com (apex) SPA: temp-password login fix + FIRST real prod-API wiring

| | |
|---|---|
| **Deploy target** | S3 bucket `noodals-com-spa` (us-east-1) fronted by CloudFront `EW5OUTEI6HA1H` (aliases `noodals.com`, `www.noodals.com`) |
| **Env** | prod (apex) — SR-18-gated |
| **Source commit** | `d53451e6` on branch `loop/eng-temp-password-login-fix-v0` (GitHub, PR not yet opened — no `gh auth` in the building session; manual PR creation or `gh auth login` still pending) |
| **Date / author** | 2026-07-13 / sagacity-sre (recovery record + sign-off) |
| **Loop** | `3722374d` (`eng-temp-password-login-fix-v0`), status LEARNING — self-report `52ebec88`, ratifier sagacity-lead (SR-4) |
| **Push type** | **manual S3 sync + CloudFront invalidation** (no CI exists for this repo — proven recipe from `project_noodals_com_launch_infra` memory, originally documented for `dev.noodals.com`, applied here to the apex for the first time). No schema/migration (frontend has none) — but see §1b, this is NOT a simple content update. |
| **Break-glass?** | No — planned ride. |

## 1a. What changed (the fix itself)

`src/app/lib/membraneSession.ts`: added `completeTempPassword()`, wired to the already-existing (never-consumed until now) `POST /auth/complete-temp-password`. `src/app/components/LoginScreen.tsx`: catches the new `409 password_change_required` from `/auth/login` (companion backend ride, `membrane/docs/recovery/RECOVERY-sr18-temp-password-login-fix.md`) and shows a minimal "set a new password" step, submits via `completeTempPassword`, then proceeds exactly like a normal login. `npm run build` clean (this repo has no lint/test script — `build` is the only available mechanical check). Dev-validated via a full UI dry-run through the actual React app (local vite dev server + a temporary `kubectl port-forward` proxy to the live dev membrane pod, reverted before commit — not part of the shipped diff): real throwaway `FORCE_CHANGE_PASSWORD` account, real "Invalid email or password" dead-end reproduced pre-fix, real "set a new password" screen + successful completion post-fix, real tokens in `localStorage`, Cognito status flipped to `CONFIRMED`. Account torn down after.

## 1b. CRITICAL — this ride is not a content update, it's the FIRST TIME noodals.com has ever pointed at prod

Checked what's actually live right now, not what memory/loop framing assumed:

- **`noodals.com`'s current deployed bundle (`index-BXZrIefY.js`, S3 `LastModified: 2026-06-19T18:43:48Z`, unchanged since the initial hosting-complete deploy) is wired to `https://dev.sagacityapps.com`, NOT `https://api-prod.sagacityapps.com`.** Confirmed by fetching the live JS bundle and grepping for the API host string — it resolves to dev.
- **Root cause:** `src/app/lib/membraneBase.ts` hardcodes the fallback: `BASE = import.meta.env.VITE_MEMBRANE_BASE ?? "https://dev.sagacityapps.com"`. No `.env.production` file exists in this repo, no build script sets `VITE_MEMBRANE_BASE` at build time. Every build ever produced from this repo — including the one currently live at the apex — defaults to dev unless the env var is explicitly passed at `npm run build` time. It never has been, for this bucket.
- **Practical consequence: nobody has ever completed a real transaction against prod through `noodals.com`.** The apex has been serving a fully-functional-looking SPA for almost a month that silently talks to the DEV backend/DEV Cognito pool (`us-east-1_a5hP8hHp4`) no matter what a real visitor does. This is a **pre-existing gap, independent of and predating this specific fix** — flagging it here because shipping "just the login fix" to the apex is meaningless without also fixing this, and fixing this for the first time is a materially bigger action than the ticket's own framing ("minimal frontend set-password step") suggests.
- **What IS already correctly configured for a prod-wired build to work:** prod membrane's CORS allowlist (`MEMBRANE_FRONTEND_URL` in `membrane/k8s/prod/configmap.yaml`) already includes `https://noodals.com`, `https://www.noodals.com`, `https://app.noodals.com` — confirmed by direct read. No membrane-side config change is needed; only the frontend build needs the correct `VITE_MEMBRANE_BASE`.
- **Framed as favorable, not just risky:** because nothing has ever worked prod-wired at this URL, there is no real prod user behavior to regress. This is a **first activation**, not a change to something people currently depend on. Treat it with first-activation rigor (extra smoke, explicit go decision) rather than routine-update rigor — but it is not "risky" in the sense of breaking something real.

**Scope decision for this record:** build and ship the prod-wired bundle (this fix + `VITE_MEMBRANE_BASE=https://api-prod.sagacityapps.com`) as ONE ride, since shipping either half alone is not meaningfully useful (a login fix nobody's build can reach prod through; or a prod-wired build with the old broken login dead-end still in it). Flagging this scope expansion explicitly rather than silently narrowing to "just the diff the loop described."

## 2. Rollback (MUST be executable, not just named)

- **No S3 versioning on the target bucket** — checked directly (`aws s3api get-bucket-versioning --bucket noodals-com-spa` returns empty/never-enabled status, vs. `noodals-com-spa-dev` which IS `Enabled`). This is a real gap: a plain `s3 sync --delete` cannot be undone via S3 object versions.
- **Rollback mechanism for this ride:** before syncing, download and locally archive the 4 objects currently live (`assets/index-BXZrIefY.js`, `assets/__vite-browser-external-BIHI7g3E.js`, `assets/index-TjdwE_Ad.css`, `index.html` — full listing confirmed via `aws s3 ls s3://noodals-com-spa/ --recursive`). Rollback = re-sync those exact 4 objects back, then `aws cloudfront create-invalidation --distribution-id EW5OUTEI6HA1H --paths "/*"`. **This restores the OLD dev-wired placeholder, not a working prod-wired-but-pre-fix state** — there is no such intermediate state to roll back to, since this ride is the first prod-wired build ever. That's an acceptable rollback target given §1b's framing (nothing currently depends on prod-wired behavior), but it is NOT equivalent to "undo just the login fix, keep everything else" — flagging so nobody assumes a partial rollback is possible.
- **Recommend enabling S3 versioning on `noodals-com-spa` as a fast-follow**, independent of this ride, so future rides don't need a manual pre-sync backup step. Non-blocking for this ride (the manual backup covers it), but worth a follow-on.

## 3. Config / secret deltas

- **New: `VITE_MEMBRANE_BASE=https://api-prod.sagacityapps.com` at build time** (build-time only, baked into the static JS bundle — not a runtime env var, not stored anywhere post-build). This is the §1b activation. No membrane-side config change (CORS already correct, confirmed §1b).

## 4. Blast radius

- **Every visitor to `noodals.com` / `www.noodals.com`, immediately on CloudFront invalidation completing.** The SPA now actually talks to prod. Anyone who was silently using the dev-wired build for anything (unlikely — no evidence of real usage found; this is a placeholder that's been live ~1 month with the wrong backend) would see a behavior change (their session, if any, would not carry over — dev and prod Cognito pools are entirely separate user directories).
- **This activates real prod signup/login traffic through the apex for the first time.** `MEMBRANE_PUBLIC_SIGNUP_ENABLED=false` on prod (confirmed live) means the self-service signup form will get a rejection, not a working account — consistent with the invite-only launch model, not a regression this ride introduces. Manual/operator-provisioned accounts (Kaleb's path) work regardless of that flag.
- **The login fix itself** — same as the backend record's §4: unconditional, every-login-call code path, narrow behavioral change (only alters the UI shown for the specific `409` case; normal login and wrong-password paths unaffected, confirmed via the dev UI dry-run).
- CloudFront invalidation is not instant (typically completes within a few minutes) — there's a brief window where some edge locations serve the old bundle and others serve the new one. Not a correctness issue (both bundles are internally consistent), just a propagation-delay note.

## 5. New / relevant gotchas

- **No CI/deploy automation for this repo** — every deploy is a manual `npm run build` + `aws s3 sync` + `aws cloudfront create-invalidation`, run from a local checkout. Follow the proven recipe (`project_noodals_com_launch_infra` memory), adapted here for the apex bucket/distro instead of dev's.
- **git push to this repo uses the ambient SSH config**, not a specific deploy key (a prior session found `-i id_github` 403s; plain `git push` works) — relevant if opening the PR or pushing further commits as part of this ride.
- **No lint/test script in `package.json`** — `npm run build` succeeding is the only mechanical pre-deploy check available. The real verification is the live UI dry-run (already done on dev in the self-report) plus this ride's own post-deploy smoke (§6).
- `VITE_MEMBRANE_BASE` is baked in at build time — if this is ever wrong, there is no runtime fix short of a full rebuild+redeploy. Worth double-checking the exact string before building (`https://api-prod.sagacityapps.com`, no trailing slash, matching `membraneBase.ts`'s expected format).

## 6. Verification (post-deploy)

- [x] **Build produced with the correct env:** `VITE_MEMBRANE_BASE=https://api-prod.sagacityapps.com npm run build` → new bundle `index-DbCB2XcV.js`. Grepped: `api-prod.sagacityapps.com` present (1 match), `dev.sagacityapps.com` absent (0 matches).
- [x] **Old objects backed up locally** before sync — all 4 (`assets/index-BXZrIefY.js`, `assets/__vite-browser-external-BIHI7g3E.js`, `assets/index-TjdwE_Ad.css`, `index.html`) downloaded and verified byte-size-matching before any sync.
- [x] **Deployed and propagated:** CloudFront invalidation `IE1ZJSXCCO9S7JBSEZE3TVZERV` completed. `curl -s https://noodals.com/ | grep -o 'assets/index-[a-zA-Z0-9]*\.js'` → `index-DbCB2XcV.js` (new hash, not `index-BXZrIefY.js`); fetched bundle from the live URL contains `api-prod.sagacityapps.com`.
- [x] **Real signup-shaped smoke through the ACTUAL live URL:** created throwaway `sr18-apex-smoke-f31fa97f@noodals.com` on the PROD Cognito pool, drove `https://noodals.com` in a real browser (hit a caching gotcha first — the tab initially served the stale pre-sync bundle from an earlier same-tab load; a cache-busted force-navigate fixed it, worth noting for future rides). Confirmed: temp-password login → **"Set a new password" screen appeared** (the dead-end is gone) → submitted → real `id_token`/`refresh_token` in `localStorage`, `user_id` matching the account's sub → Cognito `UserStatus` FORCE_CHANGE_PASSWORD → **CONFIRMED**. Throwaway account (Cognito + all DB rows) fully torn down after.
- [x] **SPA-fallback routing still works:** `/pricing` and `/login` both return 200 (CloudFront fallback intact).
- [x] **No regression on `www.noodals.com`:** confirmed 200, serving the same new bundle (`index-DbCB2XcV.js`) automatically.

## 7. Loop-close conditions

- [x] (a) prod verified (new bundle live + propagated + real signup-shaped smoke through the actual URL) — §6, all green
- [x] (b) this recovery record filed (this file) — first one for this repo; establishes the pattern for future noodal-chat-app prod rides
- [x] (c) doc impact: this record itself is the delta (no pre-existing runbook for this repo to update)
- [ ] (d) "main reconciliation" doesn't map cleanly to this repo's convention yet — the shipped commit (`d53451e6`) is on a loop branch, still not merged via PR (`gh auth` still not configured in this session as of execution). PR link: `https://github.com/eugeniology/Noodalchatapp/pull/new/loop/eng-temp-password-login-fix-v0`. Recommend opening + merging as a fast-follow — the live deploy itself is already correct and verified (built off the branch commit), this is audit-trail hygiene, not a functional gap.

## 8. Break-glass

Not applicable — planned ride.

## 9. SRE sign-off (the gate)

**Change-class confirmation:** no backend schema/migration involved (frontend-only repo). The push type is a manual S3 sync, not an image deploy — verified there's no CI to route around, this genuinely is the established manual mechanism for this repo.

**Scope flag (the load-bearing finding of this review):** what was framed as "ship the login fix to the live noodals.com SPA" is actually two things bundled together: (1) the login fix itself (small, low-risk, well-tested on dev), and (2) the FIRST-EVER prod-API wiring of the apex frontend (materially bigger — first activation of real prod traffic through this URL, no prior working state to compare against or partially roll back to). Both are necessary for Kaleb's unblock to actually work; neither alone is sufficient. Recommend proceeding with both as one ride (per §1b's scope decision) rather than silently narrowing scope, but this is exactly the kind of finding that should get an explicit go/no-go from the founder before execution, not just from SRE — the apex going prod-wired for the first time is a launch-adjacent milestone in its own right, independent of this specific bug fix.

**Rollback:** executable given the no-versioning gap is compensated by a manual pre-sync backup of the 4 currently-live objects (§2). Recommend enabling S3 versioning on this bucket as a non-blocking fast-follow.

**Blast radius:** understood (§4) — genuinely low-risk in the "nothing currently depends on this working" sense, but high-significance as a launch milestone.

**VERDICT: GO**, conditioned on (a) executing as a paired ride with the backend record (`membrane/docs/recovery/RECOVERY-sr18-temp-password-login-fix.md`) — not one without the other, (b) backing up the 4 current objects before sync, (c) building with the correct `VITE_MEMBRANE_BASE` and verifying it landed in the bundle before syncing, (d) full §6 verification including a real-browser smoke against the actual live URL, not just a proxied/local check, and (e) **explicit founder confirmation before execution**, given this is the first time noodals.com goes prod-wired — a milestone worth a deliberate go/no-go beyond routine SRE sign-off, not something to execute silently even with SRE GO in hand.

- **SRE approval:** sagacity-sre, 2026-07-13, this record.
- **Close token:** to be filed once the ride runs and the PR (§7d) is opened/merged.
