# HireLens V4 — Completion Checklist

## Audit results (existing, working — DO NOT rebuild)
- [x] Marketing site: Home + auth pages (Login, SignUp, ForgotPassword, VerifyEmail, RequestDemo)
- [x] Dashboard: KPIs, trend chart, pending review, campaigns, AI suggestions, interviews, activity
- [x] Campaigns list: search, status filter, create dialog, empty state
- [x] Campaign detail: stats, kanban pipeline, about, settings tabs, upload dialog (basic)
- [x] Candidates: sortable table, filters, bulk actions, preview drawer
- [x] Candidate detail: AI analysis, evidence, skills, resume, interview kit, timeline, notes
- [x] Compare: side-by-side, dimension reasoning, verdict
- [x] Copilot: streaming chat, prompts, history, sources
- [x] Analytics: funnel, conversions, time-to-hire, dept comparison
- [x] Settings: 9 tabs (profile/team/org/billing/notifications/appearance/apikeys/integrations/audit)

## Gaps found in audit → V4 work items
- [x] Interviews workspace page (/app/interviews): tabs, scorecard dialog with star ratings + verdict, AI question kit
- [x] Resume upload wizard (/app/upload): 3-step wizard, drag&drop, per-file progress, simulated error + retry, success state
- [x] Notifications page (/app/notifications): read/unread, filter pills, mark-all, empty state
- [x] Help center (/app/help): searchable docs, support, feedback dialog, release notes
- [x] Global search upgrade: cmd+K now searches candidates (with scores) and campaigns
- [x] Page transitions: fade/slide on route change in AppLayout main
- [x] Loading skeletons: dashboard initial skeleton pass
- [x] Animated counters on dashboard KPIs (framer motionValue)
- [x] Source analytics + skills supply/demand added to Analytics
- [x] Sidebar: Interviews, Upload nav items; Help in footer; notif drawer links to page
- [x] prefers-reduced-motion: MotionConfig reducedMotion="user"
- [x] Browser verification of new pages (6 screenshots verified)

## V5 — Production polish pass
- [x] Audit all 13 pages: dead buttons, toasts-only actions, missing states, table gaps
- [x] Candidates table: pagination (10/page with page numbers), loading skeleton, page-aware select-all
- [x] Campaigns: loading skeleton, per-card menu (edit/duplicate/archive/delete with confirm dialog), edit dialog
- [x] Campaign Detail: kanban stage-move dropdown per card, close-campaign confirmation dialog
- [x] Candidate Detail: email compose dialog, schedule-interview dialog added to header actions
- [x] Dashboard: quick actions navigate, skeleton + animated counters (from V4)
- [x] Compare: strength/weakness matrix added; selectors and profile links verified
- [x] Copilot: history items now restore conversations; new chat works
- [x] Analytics: export toast, source + skills sections (from V4)
- [x] Interviews: schedule-new-interview dialog with candidate/type/time; adds to list
- [x] Upload/Notifications/Help: states verified complete in screenshots
- [x] Settings: invite-member dialog replaces stub toast
- [x] Keyboard accessibility: role=button + Enter handlers on card divs, aria-labels on icon buttons
- [x] Browser verification: 6 screenshots verified, TS clean

## V6 — Deep quality pass (Linear/Stripe/Apple bar)
- [x] Mock data realism: 5 role archetypes × 2 variants — distinct summaries/strengths/risks/skills (verified on CND-1003, enterprise seller evidence)
- [x] Global button press feel: scale(0.97) + 160ms ease-out transitions in index.css
- [x] Dashboard verified: KPIs, chart tooltip, AI suggestion links, pending review rows
- [x] Candidates: pagination + skeleton verified; Export CSV downloads real file
- [x] Candidate Detail: role-specific evidence visible; email + schedule dialogs
- [x] Campaign cards menus verified; /app now routes to Dashboard (was 404)
- [x] Notifications page + drawer both functional
- [x] Analytics export downloads real multi-section CSV
- [x] Interviews: schedule dialog adds to list; scorecard flow present
- [x] Help center: 6 full articles open in reader dialog with real content
- [x] Copilot: 4 topic-matched responses (top candidates, risks, questions, pipeline health); attach opens real file picker
- [x] Settings: avatar file picker, invoice CSV download, upgrade/card actions reworded to real outcomes
- [x] Final click-through: 9 screenshots verified across dashboard/candidates/detail/copilot/help/settings/notifications/interviews/upload

## V7 — Enterprise Admin Console
### Phase 1: Architecture
- [ ] Audit existing app (recruiter portal untouched; admin is net-new under /admin)
- [ ] Admin mock data module (orgs, users, invoices, tickets, flags, audit events, usage, system health)
- [ ] AdminLayout shell: grouped sidebar nav (Overview / Management / Commercial / Platform / Engagement), header, search
- [ ] Shared admin components: DataTable (sort/filter/search/paginate/select/bulk), PageHeader, StatCard, StatusBadge, EmptyState, Skeleton
### Phase 2: Core management
- [ ] Admin Dashboard (KPIs, MRR, org growth, activity, system health strip)
- [ ] Organizations (list + detail drawer: profile, members, usage, subscription, activity)
- [ ] Users (search/filter/invite/suspend/delete/reset password/profile drawer)
- [ ] Teams · Roles & Permissions (matrix)
### Phase 3: Commercial
- [ ] Subscriptions · Billing · Invoices (table + PDF-style preview) · Usage Analytics · AI Usage · Customer Accounts
### Phase 4: Platform
- [ ] Feature Flags (env, rollout %, toggles) · API Keys · Audit Logs (searchable timeline, severity)
- [ ] Security Center · System Status (health indicators) · Monitoring · Error Logs · Backups · Storage · Data Residency · Exports · Import Jobs
### Phase 5: Engagement
- [ ] Support Tickets (list + conversation view, priority, assignment) · Activity Feed · Integrations
- [ ] Notifications · Email Templates · Release Notes · Settings (General/Appearance/Security/Branding/Email/API/Webhooks) · Developer Settings
### Phase 6: QA
- [ ] All routes wired in App.tsx, TS clean
- [ ] Browser click-through of every admin page; fix issues; checkpoint; deliver
