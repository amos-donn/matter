Legal Matter Workspace: Product Specification
Version 1.0 · November 8, 2026 · Supersedes the functional spec v0.1 and the design spec v0.1
Platform: Windows desktop application, delivered as a signed .exe installer. This product is not for Mac. Data: Stored locally on the attorney’s computer. No firm data is stored on a server operated by us.
1. Purpose
A Vermont attorney’s work on a case is spread across four tools that do not talk to each other: Odyssey File & Serve (eFile & Serve) for filing, Adobe for exhibits and presentations, Westlaw for research, and Word for drafting. Deadlines, service lists, citations, and exhibits are re-entered or checked by hand in each one. Errors follow: a rejected filing, a missed service contact, an unverified citation, or an exhibit reference that no longer matches the exhibit.
The product puts everything for a case in one Windows application. The case is the container. Drafts, research, exhibits, deadlines, contacts, and filings live inside it and link to each other. Filing is prepared from the same data, checked before submission, and submitted by the attorney in eFile & Serve.
The product is built to feel familiar to someone who already uses Word, Adobe Acrobat, Westlaw, and Odyssey. Menus, tab names, and key terms stay where those tools already put them, so there is little to learn.
1.1 Goals
1. Cut the time to prepare a standard appellate filing by half, measured against a baseline taken in week 1.
2. Eliminate filings rejected for preventable reasons (wrong filing code, missing service contact, unflattened PDF, unverified citation).
3. No cited authority reaches a filing as unverified without an explicit, logged override.
4. Each fact (deadline, party, contact, citation, exhibit) is entered once and referenced everywhere it appears.
5. No recurring software cost beyond the attorney’s existing Westlaw and eFile & Serve fees.
1.2 Non-goals (version 1)
• No filing integration. The product does not submit to eFile & Serve. Vermont’s terms for third-party filing software are unconfirmed.
• No Westlaw integration. Research in Westlaw stays in Westlaw. The product holds the citations and notes the attorney copies over.
• Not a citator. Validity checks are recorded manually until a licensed citator is added.
• No multi-user or cloud sync. One attorney, one machine, one local data store.
• No AI drafting in version 1. Deferred until data terms are approved (section 6.3).
• No billing or time tracking.
• No Mac or mobile version.
2. Users
User
Who
What they need
Attorney (primary)
The lawyer who files, drafts, researches, and appears in court
Fast drafting, reliable filing, deadlines he can trust
Administrator
The person who installs, backs up, and maintains the app (often the attorney’s IT contact)
Install, updates, backups, restore, audit log
3. Capabilities
The product has eight modules. Each is reachable from the menu bar and from inside a case, and each reads from the same case data.
3.1 Case management
• Create a case with caption, court, case number, role (appellant, appellee, petitioner, and so on), and parties.
• Enter a trigger event (judgment date, notice of appeal, and so on). Deadlines are calculated from a rule set the attorney can view and edit. Each deadline records the rule that produced it.
• Override a deadline with a reason. Overrides are logged.
• A Client ID field (matching Westlaw’s term) groups matters by client for reference and conflict review. It is free text, not a billing function.
• A case has Overview, Documents, Research, Exhibits, Filings, Deadlines, People, and Notes.
• Cases can be archived (read-only) or moved to Recently Deleted (section 8.6).
3.2 Drafting
• Templates for each document type in scope: appellate brief, motion, statement of questions, table of contents, table of authorities, certificate of service. Court formatting (margins, font, spacing, caption layout, page limits) lives in the template.
• Edit in a Word-style editor with a ribbon. Export .docx and PDF.
• Find and Replace, Styles, Navigation Pane (heading outline), Track Changes and Comments (version 1.1), and version History with compare and restore.
• A deadline appears in the document header with a countdown.
3.3 Research
• Search an index of Vermont Supreme Court opinions and a CourtListener source (federal and other state appellate opinions) from inside the case.
• Save an authority to a case. Saved authorities are shared across cases as records. Notes are kept per case, so one client’s notes never appear in another client’s case.
• Highlight text in a draft and choose Cite to insert an authority in correct form, with a pinpoint and a link to the saved record.
• Each citation carries a status: Verified, Unverified, or Flagged. The attorney marks a status after checking it elsewhere (for example in Westlaw’s KeyCite or by reading the opinion). The product never sets Verified automatically.
• Citation Scan lists any citation in a draft that has no record.
• Quick Check (version 1.1) runs a checklist over a draft: citation status, pinpoints, required sections, length limits, and template formatting. Output is a checklist, not a judgment on the argument.
• Citing References (version 1.1) lists later cases in the index that cite a saved case. This is a lookup aid, not a treatment analysis.
• Outline (version 1.1) lets the attorney drag saved passages into a structured outline with citations kept linked.
3.4 Exhibits
• Combine, split, reorder, rotate, and extract PDF pages.
• Bates Numbering with a prefix, starting number, and placement, matching Adobe’s term.
• Exhibit cross-references. Inserting a reference such as Ex. 4, p. 12 (through Insert > Cross-reference or Ctrl+Shift+E) creates a live link to the exhibit page. Renumbering an exhibit updates every reference.
• Exhibit index generated from the exhibit list.
• Recognize Text (OCR) for scanned exhibits, producing searchable PDF.
• Slide-style presentations for hearings, exported to PDF (version 1.1).
3.5 Filing
• Filing type is one of three options, using Odyssey’s terms: eFile Only, eFile and Serve, or Serve Only.
• The Service Contacts list for a filing is chosen from the case’s contacts, which draw from the firm’s Master Service List or a Public list the attorney maintains.
• Filing Code, Fees, Payment Account, Filing Attorney, and Additional Attorneys are entered per filing, using the same fields Odyssey asks for.
• Flags for Under Seal and Limited Appearance.
• Preflight checks the filing before anything is staged. Preflight does not submit anything.
• Stage Filing builds the packet in a folder: named PDFs, the certificate of service, the exhibit index, and a checklist. It then opens eFile & Serve in the default browser with the checklist beside it.
• After submission, the attorney records the envelope number, status (Accepted, Rejected, or Served), any rejection reason, and the Proof of Service PDF from eFile & Serve. Those are stored against the filing.
• Filing Queue lists every filing across cases by status. Rejected filings appear at the top.
3.6 Deadlines and calendar
• One calendar across all cases in Month, Week, and Agenda views. Read-only: deadlines change only inside their case.
• Today view lists deadlines due within seven days, drafts in progress, filings awaiting a recorded result, and rejected filings.
• Reminders at configurable intervals (version 1.1).
3.7 People and service
• Three lists: Parties, Counsel, Service Contacts.
• Each contact keeps its name, address, and source (Case, Firm, or Public).
• A Service toggle on each contact decides whether it receives a filing. Removing a contact from a case keeps it in the master list and keeps its history.
• Preflight blocks a filing if a required recipient has no service address.
3.8 Notes and records
• Free-form notes per case, linkable to drafts, authorities, and exhibits with @.
• Audit log of opens, edits, exports, filings, and deletions with user, time, and object.
• Recently Deleted for every deletable object.
4. Platform and delivery
4.1 Windows application
• Format: a signed Windows installer (.exe) and a portable build. The installer runs per user without administrator rights.
• Supported systems: 64-bit Windows 11, and Windows 10 version 22H2 or later.
• Build approach (recommended, to be confirmed in DQ-1): a native Windows shell with a web-technology interface, such as Tauri, or a .NET WinUI 3 app. Both can use the local stores and libraries in section 5. The choice affects the look of the menus and the size of the installer, not the features.
• Signing: the installer is signed with a code-signing certificate. Without one, Windows SmartScreen shows a warning on first run.
• Updates: the app checks for signed updates on launch and asks before installing. Updates can be turned off.
• Data location: application data is kept in a folder chosen at setup, by default under the user’s Documents folder. The attorney can point it at an encrypted drive.
4.2 Requirements
• Windows 11, or Windows 10 (22H2 or later), 64-bit. 8 GB RAM recommended. 2 GB free disk space plus space for documents.
• Microsoft Edge (for eFile & Serve and Westlaw, which run in a browser), or whichever browser is set as default.
• Recommended: BitLocker enabled on the drive that holds the data folder.
5. Architecture and data
5.1 Overview
┌─────────────── Windows application ─────────────────────────┐
│  Interface: menus, ribbon, panes, editor, viewers                   │
│  Domain layer: deadlines · citations · preflight · filing packet      │
│  Services: document engine · PDF engine · OCR · search · backup · audit│
│  Local stores: encrypted database · document folders · search index   │
└────────┬─────────────────────────────────────┬──────────────────┘
         │ optional, off by default         │ user-initiated, in browser
         ▼                                  ▼
  Opinion sources (CourtListener,      eFile & Serve · Westlaw
  Vermont opinions) · AI model API     (the attorney signs in; the app does not)
The app runs entirely on the attorney’s computer. The only outbound connections are the ones listed in section 6, and each can be turned off.
5.2 Local data stores
Store
Technology
Holds
Matter database
SQLite, encrypted with SQLCipher (AES-256)
Cases, deadlines and rules, parties, contacts, citations and their status, filings, overrides, audit log, settings
Document store
Folder tree on disk, one folder per case, encrypted with the same key
Drafts (.docx), filed PDFs, exhibits, packets, proof of service
Search index
SQLite FTS5 in the same encrypted store
Full text of drafts, notes, exhibits (via OCR), and saved opinions
Opinion cache
SQLite, encrypted
Saved opinion text and metadata, so saved authorities work offline
Key storage
Windows Credential Manager, protected with DPAPI
The database key, unlocked by the attorney’s passphrase at sign-in
All stores live under the data folder. Nothing is written to the cloud.
5.3 Core records
• Case: id, caption, court, number, role, status, Client ID
• Deadline: id, case, trigger, rule, computed date, override (date, reason, user, time)
• Contact: id, name, address, source, firm-level flag
• Case contact link: case, contact, active, history
• Document: id, case, type, versions, current file
• Citation: id, authority record, pinpoint, status, status checked (date, source), note
• Authority record: id, court, case name, reporter citation, date, source, saved text
• Exhibit: id, case, number, page count, Bates range, file
• Filing: id, case, filing type, documents, service list, filing code, fees, payment account, filing attorney, additional attorneys, flags, status, status history, envelope number, rejection reason, proof of service
• Audit event: id, user, action, object, time
5.4 Document and PDF handling
• Word documents: the app reads and writes .docx files directly, so no Microsoft service is involved. Court formatting is applied from the template.
• PDF: a local PDF engine handles merge, split, reorder, rotate, extract, stamp, and Bates numbering. Flattening of form fields is local and runs during Preflight.
• OCR: a local OCR engine (Tesseract or equivalent) produces searchable PDFs.
• Rendering check: a local renderer produces the PDF from the .docx. Layout fidelity is checked against the template at build time.
6. External connections
No connection sends data unless the attorney starts it, except where the table says it is optional and off by default.
6.1 Sources
Source
Used for
Access
Status
CourtListener (Free Law Project)
Search and retrieval of federal and state appellate opinions; citation lookup; citing references
Public REST API with a free account token; bulk data for an offline index. Check current terms before use
Planned for v1
Vermont Supreme Court opinions
Vermont-specific search and citation
Published on the Vermont Judiciary website. Indexed from published files or with permission. Confirm terms and format (OQ-5)
Planned for v1
Caselaw Access Project (Harvard)
Historical case law by bulk download
Bulk data download
Optional, v1.1
Westlaw (Thomson Reuters)
Research by the attorney in the browser. The product holds citations and notes
No API available without contract. Browser only
Not integrated
eFile & Serve (Tyler Technologies)
Filing and service by the attorney in the browser. The product stages the packet and records the result
No public filing API. Vermont’s terms for third-party filing software are unconfirmed (OQ-1)
Not integrated
AI model API (optional)
Drafting assistance and summaries
Direct call with the attorney’s own API key. Sends only text the attorney selects. Off by default
Deferred. Requires approved data terms (OQ-3)
6.2 Local libraries (no connection)
Document generation (.docx), PDF processing, OCR, search, encryption, and backup all run locally using open-source libraries. No Adobe, Microsoft, or Thomson Reuters service is needed for any of them.
6.3 Data-sending rule
No client content leaves the computer except through an approved source. Before any new external service is added, the attorney records its data terms and approves it in Options > Approved Services. The app blocks outbound requests containing client content until the service is approved. The same check covers the AI module.
7. Security and confidentiality
• Encryption at rest: the database and document store are encrypted with AES-256. The key is protected by Windows DPAPI and unlocked by the attorney’s passphrase.
• Passphrase: required at sign-in. A lost passphrase cannot be recovered, and the app says so at setup.
• Auto-lock: the app locks after a set period of inactivity (default 15 minutes) and when Windows locks.
• Backups: encrypted with the passphrase and written on a schedule to a location the attorney chooses (an external drive or a network share). Restore is tested at setup.
• Audit log: append-only. Records open, edit, export, stage, filing result, and deletion events. Permanent deletions are logged with type and name, never content.
• Matter separation: case notes and drafts are visible only within their case. A shared authority record shows only its citation information.
• No telemetry: the app sends no usage data.
8. User interface
8.1 Principles
1. Familiar first. Where Word, Acrobat, Westlaw, or Odyssey already has a name or location for something, use it.
2. The case is the room. Everything is reached from inside a case.
3. Links, not separate products. Research, exhibits, and filing are reached from the text being written.
4. State is always visible. Status is shown as an icon and a word, never by color alone.
5. The safe path is the easy path. Unverified citations are marked, Preflight runs before filing, and deletion is recoverable.
6. Calm. Restrained motion and plain language.
8.2 Window layout
┌──────────────────────────────────────────────────────────────┐
│ File  Edit  View  Matter  Research  Exhibits  Filing  Tools  Window  Help│  Menu bar
├───────────────────────────────────────────────────────────────────┤
│ [Home][Insert][References][Review][View]   (ribbon appears in the editor)│
├───────────────┬───────────────────────────────────────────┬───────────────┤
│ Navigation   │  Main pane                               │ Side panel    │
│  Today       │  list · editor · viewer · calendar       │ (Authority,   │
│  Cases       │                                          │  Exhibits,    │
│   ▸ Case     │                                          │  Notes,       │
│     Overview │                                          │  Issues)      │
│     Docs     │                                          │               │
├──────────────┴─────────────────────────────────────────┴───────────────┤
│ Status bar: case · draft · issues: 2 · deadline in 12 days · saved       │
└──────────────────────────────────────────────────────────────┘
• Menu bar across the top, in Windows order.
• Ribbon appears when a document is open. Its tabs are Home, Insert, References, Review, and View, which Word users already know.
• Navigation Pane at left, the name Word uses. Global items sit at the top (Today, Cases, Calendar, Filing Queue, Library, Recently Deleted). When a case is open, its sections appear beneath its name, and ‹ All Cases returns to the global list.
• Side panel at right, toggled from View. In the editor it shows Authority, Exhibits, Notes, and Issues.
• Status bar at bottom with case, document, Issues count, next deadline, and save state.
• Minimum window: 1024 × 680 pixels. Below about 1280 pixels, the side panel overlays the editor rather than narrowing it.
8.3 Menu bar
Menu
Items
File
New Case, New Document, Open, Close Case, Save, Save As, Export as PDF, Export as Word, Print, Backup Now, Exit
Edit
Undo, Redo, Cut, Copy, Paste, Find, Replace, Select All, Delete (moves to Recently Deleted)
View
Navigation Pane, Side Panel, Status Bar, Zoom, Full Screen, Show Issues, Show Citation Marks
Matter
Overview, Documents, Research, Exhibits, Filings, Deadlines, People, Notes, Trigger Event, Archive Case, Delete Case
Research
Search Opinions, Save Authority to Case, Cite Selected Text, Mark Citation Verified, Citing References, Quick Check, Outline
Exhibits
Add Exhibit, Combine Files, Organize Pages, Bates Numbering, Recognize Text (OCR), Insert Cross-reference, Exhibit Index
Filing
New Filing, Preflight, Stage Filing, Open eFile & Serve, Record Filing Result, Filing Queue, Service Contacts
Tools
Deadline Rules, Templates, Citation Scan, Audit Log
Options
Approved Services, Recently Deleted Retention, Backups, Motion, Interface Size, Shortcuts
Window
New Window, Arrange, list of open items
Help
Help Topics, Keyboard Shortcuts, Check for Updates, About
Menu names follow the tool each one replaces, so the first search for a command goes where it would in that tool.
8.4 Ribbon tabs (editor)
Tab
Groups and commands
Home
Clipboard · Styles (template paragraph styles, not free font controls) · Find · Navigation
Insert
Exhibit Cross-reference · Table of Authorities · Page Break · Caption Block
References
Cite (Ctrl+Shift+A) · Authorities List · Update Table of Authorities · Citation Scan · Mark Verified
Review
Track Changes · Comments · Compare · History · Quick Check
View
Print Layout · Outline · Zoom · Side Panel · Show Citation Marks
The Home tab leaves out font and size controls by default, because the template owns formatting. An Advanced switch shows them, with a warning that changes may not match court rules.
8.5 Context menus (right-click)
Object
Menu
Citation in text
Open Authority · Open Research Note · Mark Verified… · Flag… · Replace Authority… · Copy Citation · Remove Link (keeps the text)
Exhibit cross-reference
Open Exhibit at Page · Change Exhibit or Page… · Copy Reference · Remove Link
Document (in list)
Open · Open in New Window · Duplicate · Rename · Export · Archive · Delete
Authority (in case)
Open · Cite in Draft… · Add Note · Remove from Case
Filing (in queue)
Open · Duplicate as New Draft · Record Result… · Archive · Delete (drafts only)
Case (in list)
Open · Pin · Archive… · Delete…
Deadline
Open Rule · Override… · Link to Draft…
Service contact
Edit · Deactivate on This Case · Remove from This Case
Destructive items sit last, after a separator. Unavailable items are greyed, with a tooltip that says why.
8.6 Deleting things
Deletion follows Windows Explorer. Pressing Delete moves the item to Recently Deleted, which works like the Recycle Bin. Shift+Delete deletes permanently, after a confirmation.
• A toast appears at the bottom: Moved “Reply brief v3” to Recently Deleted. Undo. It stays for 10 seconds. Ctrl+Z also undoes the move.
• Items referenced elsewhere produce a confirmation first. The sheet states the count, with a Show References button. The default button is Cancel. The confirm button names the action (Move to Recently Deleted), never OK.
• Deleting text never deletes a record. Deleting an authority record never silently changes text: the affected citation is marked Unverified, and an exhibit reference shows as Broken until it is fixed or restored.
• Filed records cannot be deleted. Submitted, accepted, rejected, and served filings are archived only. Filed versions are locked.
• Cases are archived by default. Deleting a case shows its upcoming deadlines first, and the attorney types the case number to confirm. The case then waits in Recently Deleted.
• Recently Deleted is grouped by case, shows days remaining, and keeps items for 30 days by default (7 to 90 days, set in Options). Cases are never removed automatically. Restore puts an item back and re-links its references.
• Permanent deletion logs the item type and name in the audit log, and warns that earlier backups may still contain the item.
8.7 Keyboard shortcuts
These follow Windows conventions and are shown in each menu.
Action
Shortcut
Command search
Ctrl+Shift+P
Save
Ctrl+S
New document
Ctrl+N
New case
Ctrl+Shift+N
Find, Replace
Ctrl+F, Ctrl+H
Find across case
Ctrl+Shift+F
Cite selected text
Ctrl+Shift+A
Exhibit cross-reference
Ctrl+Shift+E
Start filing
Ctrl+Alt+F
Preflight
Ctrl+Alt+P
Navigation Pane, Side Panel
Ctrl+Alt+N, Ctrl+Alt+S
Case sections 1 to 8
Ctrl+1 to Ctrl+8
Delete (to Recently Deleted)
Delete
Delete permanently
Shift+Delete
Undo, Redo
Ctrl+Z, Ctrl+Y
Mark citation verified
No shortcut, on purpose
Delete permanently from Recently Deleted
Button only, on purpose
8.8 Icons and status vocabulary
Icons use Segoe Fluent Icons, which ships with Windows 11 and is available for Windows 10. Every status shows an icon and a word.
Object
States
Icon and color
Citation
Verified, Unverified, Flagged
Check (green), warning (amber), flag (red)
Filing
Draft, Staged, Submitted, Accepted, Rejected, Served
Grey, blue, blue, green, red, green
Deadline
Upcoming, Due Soon (within 7 days), Overdue, Overridden
Grey, amber, red, outlined badge
Preflight check
Pending, Running, Passed, Failed, Overridden
Hollow circle, spinner, check, cross, check with outline
Badges on sidebar items are small counts: red for overdue or rejected, amber for due soon or unverified, grey for information.
8.9 Visual style
• Interface type: Segoe UI, the Windows system font. Numbers in tables, deadlines, Bates ranges, and envelope numbers use tabular figures.
• Reading type: Cambria, which ships with Office, for opinions and notes, at 16 points with comfortable line height. Document pages use the court template.
• Color: the interface follows the Windows light or dark theme. Document pages stay white in both, because the page is what will be filed.
• Accent: one accent color for primary buttons and focus rings, meeting 3:1 contrast on both themes. Highlighter yellow marks the active selection and a citation that was just inserted.
• Shape: 4-pixel corners on controls, 8-pixel on dialogs. Structure comes from alignment and dividers, not boxes or card grids.
• Decoration: none. No gradients, no ornamental icons, no marketing copy in the interface.
8.10 Motion
Motion is limited to what explains a change. The app respects the Windows setting Show animations in Windows and works fully with it off.
• Panels and dialogs fade or slide in within 150 to 250 milliseconds.
• After a deletion, the list closes the gap, and the Undo toast slides up.
• Preflight rows appear one after another as results arrive.
• Progress bars for long work (OCR, merging, staging), with Cancel.
• Cite landing: when a citation is inserted, its text is highlighted and the highlight fades over about 900 milliseconds. With animations off, the highlight stays and fades instantly.
• Nothing loops on an idle screen. No bounce or overshoot.
8.11 Writing
Plain language, sentence case, no exclamation marks, and no jokes in error messages. Each action keeps one name through its flow: Start Filing begins the filing, Stage Filing builds the packet, the message says Packet staged, and Record Filing Result closes it. Errors state what happened and what to do:
• Can’t stage filing. Exhibit 3 is not a PDF. Convert it or replace the file.
• No service address for the opposing party. Add one in People.
• This draft cites 3 authorities that are not verified. Mark them verified, or override with a reason.
8.12 Accessibility
• Every core flow works from the keyboard. Drag operations have menu equivalents.
• Text and background contrast meets 4.5:1. Interface components and focus rings meet 3:1.
• Every icon-only control has a screen-reader label. Citation marks are announced with their case name and status.
• Windows High Contrast themes are supported.
• Options has an interface size setting (Default, Large). Document pages zoom separately.
9. Core flows
9.1 Create a case
1. File > New Case, or Ctrl+Shift+N. The New Case dialog opens.
2. Enter caption, court, number, role, and parties.
3. Enter a trigger event and date. Deadlines appear in the dialog as the date is entered.
4. Click Create. The case opens on Overview with the next deadline shown.
9.2 Cite a precedent from selected text
1. Select a sentence. A small toolbar appears above the selection with Cite, Exhibit, and Note.
2. Choose Cite or press Ctrl+Shift+A. The side panel opens on Authority, with saved authorities for the case listed first.
3. Choose an authority. A preview opens. Select the passage to set the pinpoint.
4. Click Insert. The citation is set in correct form after the selected sentence. Its text is highlighted briefly, and an Unverified mark appears beside it.
5. Later, right-click the citation and choose Mark Verified. A dialog asks where it was checked (Westlaw KeyCite, reading the opinion, or other), records the date, and takes an optional note.
9.3 Reference an exhibit
1. Press Ctrl+Shift+E, or choose Insert > Exhibit Cross-reference.
2. Choose the exhibit and page.
3. The reference appears as Ex. 4, p. 12. Clicking it opens the exhibit at that page.
4. If the exhibit is renumbered, every reference updates, and a status message gives the count.
9.4 Prepare and file
1. From the draft, choose Filing > New Filing (Ctrl+Alt+F). The current draft is included.
2. Choose a filing type: eFile Only, eFile and Serve, or Serve Only.
3. Confirm the Service Contacts, set the Filing Code and Fees, and choose the Filing Attorney.
4. Preflight runs when the filing opens and again after each change. Each failure has a Go To button that takes you to the problem.
5. Click Stage Filing. Files are assembled, named, and written to the staging folder.
6. Click Open eFile & Serve. The browser opens to eFile & Serve, and the checklist stays in the app.
7. After submission, choose Record Filing Result and enter the envelope number, status, any rejection reason, and the Proof of Service PDF.
10. Requirements summary
The functional requirement IDs from the earlier spec (R-MAT, R-SVC, R-FIL, R-DRF, R-RES, R-EXH, R-PKT, R-CAL, R-SEC) still apply. Priority:
• P0, required for first use: case creation and deadlines; contacts and service types; filing type, filing code, Preflight, Stage Filing, Record Filing Result; drafting from templates to .docx and PDF; saved authorities, Cite, verification status, Citation Scan; PDF combine, Bates Numbering, exhibit cross-references, exhibit index; encryption, backup, audit log; Recently Deleted.
• P1, version 1.1: Quick Check, Citing References, Outline, reminders, Recognize Text (OCR), presentations, Track Changes and Comments, Caselaw Access Project import.
• P2, later: AI assistance, a licensed citator, analytics, multi-user access, eFile & Serve integration if Vermont permits it.
11. Success metrics
• Filing preparation time for a standard appellate filing: baseline in week 1, target 50% lower by week 8.
• Preflight passes on first run: 80% by week 8, 95% by week 12.
• Rejected filings for preventable reasons: zero per month after week 8.
• Unlogged citation overrides: zero.
• Missed deadlines: zero.
• Attorney confidence rating after each filing (1 to 5): 4 or higher by month 3.
The attorney records prep time, Preflight result, and rejections in a simple log, reviewed weekly for the first two months.
12. Open questions
ID
Question
Owner
Blocks
OQ-1
Does Vermont permit third-party filing software with eFile & Serve, and what does registration require? Contact efilesupport@vtcourts.gov and Tyler
Attorney
Any filing integration
OQ-2
Current filing codes, fee rules, and file-name requirements for each filing type
Attorney
Filing module
OQ-3
Data terms for any external service that receives client content, including AI
Attorney, with bar ethics guidance if needed
AI module, any new source
OQ-4
Citator source to license, if any
Attorney
Validity workflow beyond manual checks
OQ-5
Vermont and federal opinion sources: terms, format, and access
Builder
Research module
OQ-6
Existing practice-management or calendar data to import
Attorney
Import only
OQ-7
Westlaw tier, and whether trial access is available for comparison
Attorney
Research comparison
OQ-8
Single user, or might other attorneys use it? This changes confidentiality, vendor, and supervision duties
Attorney
Architecture
DQ-1
Build approach: native shell with web interface, or .NET WinUI 3
Builder
Start of build
DQ-2
Court-specific typography for templates
Attorney
Templates
DQ-3
Retention for Recently Deleted (30-day default) and archived cases
Attorney
Deletion settings
DQ-4
Track Changes and Comments in version 1 or 1.1
Attorney
Review tab scope
DQ-5
Code-signing certificate: who holds it and who pays
Attorney
First release
13. Timeline
• Phase 0 (week 0 to 1): resolve OQ-2, OQ-3, OQ-8, DQ-1, DQ-5. Measure the baseline.
• Phase 1 (weeks 2 to 5): application shell, menus and ribbon, encrypted database, case creation, deadlines, contacts, drafting templates, .docx and PDF output.
• Phase 2 (weeks 6 to 8): filing records, Preflight, Stage Filing, Record Filing Result, Filing Queue, saved authorities, Cite, verification status, Citation Scan, search.
• Phase 3 (weeks 9 to 11): PDF tools, Bates numbering, exhibit cross-references, exhibit index, backup and restore, audit log, installer and signing.
• Phase 4 (weeks 12 and later): version 1.1 items in section 10.
Deferred until their gates are met: AI assistance (OQ-3), filing integration (OQ-1), citator and analytics (OQ-4).
14. Build notes for the AI coding tool
1. Define design tokens (color, type, spacing, radius, motion) in one place. No hard-coded values in screens.
2. Build a component gallery first: every control in every state, in light and dark, with system animations on and off.
3. Route all deletion through one service that moves items to Recently Deleted and re-links on restore. No screen deletes records directly.
4. Put Preflight, citation status, and deadline logic in a tested domain layer that the interface reads but cannot bypass.
5. Read the Windows animation setting through one helper.
6. Test the installer on a clean Windows 11 and a clean Windows 10 machine, including the SmartScreen experience with the signed build.
Acceptance checklist
[ ] Installs per user without administrator rights, and runs from a portable build
[ ] Data stays on the local machine; no outbound call carries client content without an approved source
[ ] Database and documents are encrypted; the key is protected by DPAPI and the passphrase
[ ] No record is deleted outside the deletion service
[ ] Filed records cannot be deleted or edited
[ ] No unverified citation reaches a filing without a logged override
[ ] Every status shows an icon and a word
[ ] Keyboard-only path works for the flows in section 9
[ ] Menu and shortcut names match section 8 and the replaced tools
[ ] Restore from backup tested on a second machine
Appendix: Familiar names
Familiar from
Familiar term
Term here
Word
Insert Citation, Table of Authorities
Cite, Table of Authorities
Word
References, Review tabs
References, Review tabs
Word
Navigation Pane
Navigation Pane
Word
Track Changes, Comments, Versions
Track Changes, Comments, History
Acrobat
Combine Files, Organize Pages
Combine Files, Organize Pages
Acrobat
Bates Numbering
Bates Numbering
Acrobat
Recognize Text
Recognize Text (OCR)
Westlaw
Research Trail
Research history per case
Westlaw
KeyCite flag
Verification status (Verified, Unverified, Flagged)
Westlaw
Citing References, Quick Check
Citing References, Quick Check
Westlaw
Client ID
Client ID
Odyssey
Filing Type (eFile Only, eFile and Serve, Serve Only)
Same three options
Odyssey
Service Contacts, Master Service List
Same
Odyssey
Filing Code, Filing Attorney, Additional Attorneys
Same
Odyssey
Payment Account, Fees
Same
Odyssey
Proof of Service
Proof of Service
Windows
Recycle Bin, Delete, Shift+Delete
Recently Deleted, Delete, Shift+Delete
15. Source control
The application source code is developed in a GitHub repository. Each release is tagged in the repository, and the signed installer is built from a tagged commit. Client data is never stored in the repository, and the repository must be private.
