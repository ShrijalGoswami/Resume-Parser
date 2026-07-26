# HireLens Build Progress

## Project
- Path: /home/ubuntu/hirelens (web-static, React 19 + Tailwind 4 + shadcn/ui + wouter + framer-motion)
- Checkpoints: f5af603d (MVP), 6cec2125 (anchor fix), d18f07c0 (auth), 3d1ac850 (typography)

## Design System (ideas.md)
- "Institutional Clarity": deep slate primary oklch(0.25 0.02 240), teal accent oklch(0.55 0.15 200)
- Marketing hero: Playfair Display via `.hero-h1` class (LISTIAN substitute), clamp(48px,8vw,96px)
- App: Inter ONLY (no serif in app), JetBrains Mono for IDs/scores/dates (font-mono)
- index.css has base h1/h2/h3/p styles with margins — inside app use style={{marginBottom:0}} or text-* utilities to override where needed

## Generated assets (use exact URLs)
- Logo: /manus-storage/hirelens-logo_48bb43c6.png
- Hero bg: /manus-storage/hero-background_0371a26f.png
- Dashboard hero: /manus-storage/dashboard-hero_30b1c95a.png
- Evidence viz: /manus-storage/evidence-visualization_deb27103.png
- Comparison viz: /manus-storage/candidate-comparison_70fc3778.png

## User requirements (pasted_content_4.txt) — CURRENT FOCUS
- NO more marketing work. Build the complete authenticated app only.
- Pages: Dashboard, Campaigns (+details/create/pipeline), Candidates (table+drawer),
  Candidate Detail (resume, AI summary, strengths/risks/evidence, timeline, notes, interview kit, export),
  AI Copilot (chat, prompts, history), Compare workspace, Analytics (funnel, conversion, time-to-hire, dept comparison),
  Settings (profile, team, org, roles, API keys, billing, notifications, appearance, integrations)
- No dead buttons: every button works or disabled with reason (toast "coming soon" NOT allowed per user — use real interactions)
- Quality bar: Linear/Notion/Ashby. Mock realistic data. Frontend-only (future FastAPI+Supabase).

## Done (full app rebuild complete, verified via screenshots)
- [x] mockData.ts: campaigns(6), candidates(40 full detail), activityFeed, interviews, notifications,
  funnelData, hiringTrend, departmentStats, teamMembers, apiKeys, integrations, auditLogs, currentUser
- [x] AppLayout.tsx: sidebar (Workspace/Intelligence), cmd+K palette, notifications drawer, user menu. Props: { children, title }
- [x] Dashboard.tsx: KPIs, trend chart, pending review, active campaigns, AI suggestions, interviews, activity
- [x] Campaigns.tsx: cards grid, search/status filter, create dialog (?new=1), empty state
- [x] CampaignDetail.tsx: /app/campaigns/:id — stats, kanban pipeline, about, settings tabs, upload dialog (?upload=1)
- [x] Candidates.tsx: sortable table, filters, bulk actions bar, preview drawer -> full profile
- [x] CandidateDetail.tsx: /app/candidates/:id — AI analysis, evidence/skills/resume/interview-kit tabs, timeline, notes
- [x] Compare.tsx: side-by-side with per-dimension AI reasoning + verdict
- [x] Copilot.tsx: chat with simulated streaming, prompts, history sidebar, sources
- [x] Analytics.tsx: conversion cards, funnel, time-to-hire, volume, department table
- [x] SettingsPage.tsx: profile/team/org/billing/notifications/appearance/apikeys/integrations/audit tabs
- [x] App.tsx routes all wired; TS clean; all 9 pages screenshot-verified

## V6 in progress (deep quality pass)
- [x] mockData.ts: role-specific evidence (roleProfiles map — 5 roles × 2 variants; distinct summaries/strengths/risks/skills)
- Remaining V6 items tracked in todo.md: button press feel CSS, real CSV export (Candidates + Analytics),
  Help article dialog, Copilot varied responses, notif drawer/page sync check, final click-through
- Checkpoints: 61ebd0aa (V5), 163f5f2e (V4), 1968f6e4 (app rebuild)
- Design: light theme, primary deep slate/blue, accent teal; Playfair Display hero (marketing only), Inter body, JetBrains Mono technical

## V7 — Enterprise Admin Console (in progress)
- Data: client/src/lib/adminData.ts (orgs, adminUsers, invoices, tickets, featureFlags, auditEvents, systemComponents, usageTrend, mrrTrend, apiKeys, integrations, errorLogs, backups, emailTemplates, exportJobs, importJobs)
- Shell: components/AdminLayout.tsx (grouped nav: Overview/Management/Commercial/Platform/Engagement, page-finder search, back-to-portal link, header with degraded-AI pill)
- Shared: components/admin/Shared.tsx (PageHeader, StatCard, StatusBadge, EmptyState, AdminTable with sort/search/paginate/select/bulk)
- Pages (all in pages/admin/): AdminDashboard, AdminOrganizations (drawer w/5 tabs), AdminUsers (invite/suspend/delete/reset), AdminTeamsRoles (permission matrix), AdminBilling (routes: /admin/billing|subscriptions|invoices|accounts), AdminUsage (/admin/usage|ai-usage), AdminFlags (/admin/flags|api-keys), AdminAudit (timeline), AdminOps (/admin/status|monitoring|security|errors), AdminData (/admin/backups|storage|residency|data-jobs), AdminSupport (conversation view), AdminEngagement (/admin/activity|integrations|notifications|emails|releases|brand|settings)
- Routes wired in App.tsx (31 admin routes). QA verified via screenshots on 22 admin pages + recruiter dashboard regression. All pages render correctly.
- V7 COMPLETE

## Route map planned
- /app/dashboard — Dashboard
- /app/campaigns — list; /app/campaigns/:id — detail w/ pipeline kanban
- /app/candidates — table w/ filters+bulk; /app/candidates/:id — full detail
- /app/copilot — chat; /app/compare — comparison workspace
- /app/analytics — analytics; /app/settings — tabbed settings suite
