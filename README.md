# Legal Matter Workspace

A local-first Vermont appellate matter workspace: one case holds its drafts, research, exhibits, deadlines, filing preparation, people, notes, and audit history. Built from `AGENTS.md` (product specification v1.0).

## What is implemented

- **Cases** — caption, court, number, role, Client ID, judge, parties, trigger event, archive/restore/delete through one deletion service. Case sections: Overview, Documents, Research, Exhibits, Filings, Deadlines, People, Notes.
- **Deadlines** — rule-driven calculation from trigger events, business-day roll for court holidays, per-rule view/edit, logged overrides with reasons, due-soon/overdue states. The six seed rules are labeled as samples and must be confirmed against the current V.R.A.P.
- **Drafting** — templates (appellate brief, motion, statement of questions, TOC, TOA, certificate of service, blank), block editor with section formatting, version history/restore/compare, Find and Replace, live generated TOC/TOA/exhibit index/certificate, `.docx` and PDF export, print. `.docx` uses real Word heading styles, a TOC field, and page-number footer.
- **Research** — shared authority records, per-case saved-authority notes, opt-in CourtListener search, Cite insertion with pinpoint, citation statuses (Verified / Unverified / Flagged), logged verification source and date, Citation Scan for unverified/unrecorded/raw citations and broken exhibit links, Table of Authorities.
- **Exhibits** — PDF upload, combine, extract, reorder, rotate, Bates numbering with prefix/start/placement, live exhibit cross-references (`Ex. 4, p. 12`), exhibit index, in-app PDF viewer.
- **Filing** — eFile Only / eFile and Serve / Serve Only, filing code, fees, payment account, filing attorney(s), Under Seal and Limited Appearance, service-contact selection, Preflight (filing code, attorney, payment, service addresses, omissions, document, certificate, citations with logged override, exhibits, flattening, naming), Stage Filing to a real ZIP packet with checklist, Record Filing Result with envelope number/status/rejection reason/Proof of Service. Filed statuses are locked from deletion and edit.
- **Calendar** — all-case month view plus Today (next seven days, drafts, filings awaiting result, rejected filings), Filing Queue (rejected first), global Library, and full-text workspace search.
- **Security** — AES-256-GCM encrypted local database and file store, PBKDF2-SHA-256 (310,000 iterations), passphrase verifier, auto-lock, encrypted backup/restore, append-only audit log, and one deletion service for every object with Recently Deleted, restore, retention, and typed permanent-delete confirmation.
- **Interface** — Windows-style menu bar, Navigation Pane, ribbon in the editor, side panel, status bar, Segoe UI, Cambria reading text, familiar Word/Acrobat/Westlaw/Odyssey names, icon-plus-word statuses, keyboard shortcuts, command search (`Ctrl+Shift+P`), and workspace search (`Ctrl+Shift+F`).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # typecheck + production build in dist/
```

On first run, create the workspace name and passphrase. The passphrase cannot be recovered. Data stays in this browser profile's encrypted IndexedDB vault; sample authority records are examples, not a citator.

## Architecture

- `src/core/` — domain model, deadline engine, citations, preflight, crypto/vault/IndexedDB, store/actions, search, seed data.
- `src/export/` — two-pass PDF layout, DOCX generation, packet ZIP builder.
- `src/pdf/ops.ts` — local PDF combine/extract/reorder/rotate/split/Bates/flatten.
- `src/ui/` — design tokens, component kit, menus, navigation, dialogs, router, editor utilities.
- `src/views/` — session, Today/Cases/Calendar/Queue/Library/Trash, case sections, settings, audit log, editor.

No CSS framework; styling uses custom tokens in `src/styles/tokens.css` and `src/styles/app.css`.

## Platform notes and limitations

This repository is the working application built in a Linux cloud workspace. The specification targets a signed Windows `.exe`; this build is a web interface designed to be wrapped by a Tauri (or WinUI) shell, but **no signed Windows installer is produced here**. In the browser build:

- Encrypted storage uses IndexedDB rather than SQLite/SQLCipher and the browser's key handling rather than Windows DPAPI/Credential Manager. Data does not leave the machine, but it is scoped to the browser profile.
- Filing integration and submission are intentionally absent, as specified. Stage Filing produces the packet; the attorney submits in eFile & Serve and records the result.
- Westlaw, citators, and CourtListener bulk/offline indexes are not integrated. CourtListener search is opt-in and sends only the typed query.
- OCR, Quick Check, Citing References, Outline, presentations, Track Changes/Comments, reminders, and Caselaw Access Project import are v1.1 items. Quick Check is present as a checklist helper; the other deferred commands explain their status.
- Seed deadline rules and sample authorities are explicitly marked as starting points. Verify every period and citation before relying on it.

## Verification

- `npx tsc --noEmit -p tsconfig.json` — passes.
- `npm run build` — passes (Vite production build, ~1.1 MB JS before gzip).
- The dev server is run with Vite's `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` environment variable for the cloud preview origin.
