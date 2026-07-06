# Timeline

A visual resource planner for macOS, built with Electron.

Plan who is working on what, and when — across a 52-week timeline. See tasks, milestones, and team allocation at a glance.

---

## Features

- **Multi-person timeline** — drag and assign tasks per resource across a full year view
- **Milestones** — date-precise milestone markers with names, notes, and history tracking
- **Teams** — save and reload team rosters as reusable JSON files
- **Projects** — manage multiple projects, archive old ones, switch between them
- **Zoom** — adjustable day-width for detailed or high-level views
- **Undo/Redo** — full history stack
- **PDF Export** — exports a cropped timeline image + formatted report (milestones, resource summary, project stats)
- **Project Overview** — quick stats panel showing start/end dates, duration, resources, and milestones
- **File format** — saves as `.json`, portable and shareable

---

## Installation (macOS)

1. Download `Timeline-v1.0-mac-arm64.zip` from [Releases](../../releases)
2. Unzip and place `Timeline.app` alongside your `data/` and `team/` folders
3. **First launch:** right-click → Open (required to bypass Gatekeeper on unsigned apps)

> Requires Apple Silicon (M1/M2/M3). macOS 12 Monterey or later recommended.

**Important:** Keep `Timeline.app`, `data/`, and `team/` in the same folder — the app reads and writes data relative to its own location so everything stays together and is easy to share.

---

## Building from source

```bash
cd app
npm install
npm start          # run in dev mode
npm run build      # build Timeline.app
```

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘S | Save |
| ⌘Z | Undo |
| ⌘⇧Z | Redo |

---

## Data & sharing

All project data lives in `data/` and team rosters in `team/` — both sit next to `Timeline.app`. To share a project, zip the whole folder. To back up, copy the folder. No hidden files, no cloud sync required.

---

Designed by **Colm McKeon** · Built with [Claude](https://claude.ai/claude-code) (Anthropic)
