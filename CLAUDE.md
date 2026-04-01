# CLAUDE.md — EarlyScouts / SchoolScout

## What This Project Is

EarlyScouts is a consumer platform for parents navigating LA Westside school choice. Two products under one brand:

1. **SchoolScout** (earlyscouts.com/schools) — Deep dive school reports and transfer playbooks. 34 school reports + 3 playbooks live in Supabase. This is the primary active product.
2. **WeekendScouts** (weekendscouts.com) — Family activity newsletter. Separate stack (Railway backend, Netlify frontend). NOT in this codebase.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (project: `tuelwjxrlgmpxukmxgfk.supabase.co`)
- **Styling:** Tailwind CSS + custom design system
- **Fonts:** DM Sans (body), DM Serif Display (headlines), DM Mono (data)
- **Deployment:** Not yet deployed to Vercel — runs on localhost:3000 for now
- **Env file:** `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## Design System

```
Background:     #FFFAF6 (light cream)
Primary green:  #5B9A6F (sage)
Peach accent:   #F2945C
Sky accent:     #6BB3D9
Lavender:       #A78BCA
Honey:          #E8B84B
Mint:           #7ECAB0
Dark text:      #1a1a1a
Card bg:        white with subtle shadow
Verdict card:   #2D3436 (dark charcoal)
```

## Key Files

```
src/
├── app/
│   ├── schools/
│   │   └── [slug]/page.tsx        ← School detail page (renders SchoolReport)
│   └── api/
│       └── schools/
│           └── [id]/route.ts      ← API route — fetches from Supabase
├── components/
│   └── SchoolReport.tsx           ← THE main component — renders report_data JSON
├── lib/
│   └── supabase.ts                ← Supabase client + rowToSchool mapping
```

## Database Schema (schools table)

```sql
id                  TEXT PRIMARY KEY   -- e.g., 'mar-vista-elementary-school-los-angeles-ca'
name                TEXT
slug                TEXT               -- same as id
address             TEXT
city                TEXT
state               TEXT
zip                 TEXT
district            TEXT
type                TEXT               -- MUST be 'public' (DB constraint)
grades              TEXT               -- 'K-5', '6-8', '9-12', 'TK-8', etc.
lat                 FLOAT
lng                 FLOAT
enrollment          INT
greatschools_rating INT                -- 1-10 or NULL (0 is rejected by constraint)
website             TEXT
report_data         JSONB              -- THE structured report content (see schema below)
```

## report_data JSON Schema

The `report_data` column contains the entire school report as structured JSON. The `SchoolReport.tsx` component reads this and renders each content block. Key structure:

```json
{
  "generated_at": "YYYY-MM-DD",
  "version": 2,
  "hero": { "street_view_query": "...", "heading": 0, "fov": 90 },
  "quick_stats": [{ "label": "Math", "value": "86%", "accent": true }],
  "alerts": [{ "icon": "star|construction|calendar|info", "title": "...", "text": "...", "cta_text": "...", "cta_url": "..." }],
  "related_schools": [{ "name": "...", "slug": "full-slug-format", "tag": "..." }],
  "sections": [
    {
      "id": "overview",
      "number": 1,
      "tag": "Overview",
      "title": "Section Title",
      "subtitle": "...",
      "content": [
        { "type": "callout", "variant": "green|amber|sky|red", "label": "Scout Take", "text": "..." },
        { "type": "paragraph", "text": "... supports **bold** markdown ..." },
        { "type": "heading", "text": "..." },
        { "type": "stats_grid", "items": [{ "label": "...", "value": "...", "context": "...", "green": true }] },
        { "type": "comparison_table", "columns": [...], "rows": [{ "cells": [...], "highlight": true }] },
        { "type": "feeder_flow", "schools": [{ "name": "...", "level": "current|middle|high", "detail": "..." }] },
        { "type": "tour_questions", "title": "...", "subtitle": "...", "questions": [...] },
        { "type": "photo_grid", "photos": [{ "src": "URL", "alt": "...", "caption": "..." }] }
      ]
    }
  ],
  "verdict": {
    "paragraphs": ["...", "..."],
    "best_for": "...",
    "consider_alternatives": "..."
  }
}
```

## Content Block Types Supported by SchoolReport.tsx

The component renders these block types from `report_data.sections[n].content`:

- `callout` — colored box (green = Scout Take, amber = warning, sky = info, red = critical)
- `paragraph` — text with **bold** markdown support
- `heading` — section subheading
- `stats_grid` — 4-item stat display with labels, values, context, and green/red coloring
- `comparison_table` — table with column headers and row data, optional row highlight
- `feeder_flow` — visual pipeline diagram (elementary → middle → high)
- `tour_questions` — numbered list of parent questions to ask on tour
- `photo_grid` — image grid (photos must be hosted on Supabase Storage or hotlinkable CDNs)

If you add a new block type, you MUST update SchoolReport.tsx to render it.

## Important Patterns

### Supabase Queries
- All school data comes from the `schools` table
- The API route at `src/app/api/schools/[id]/route.ts` fetches by id
- `rowToSchool()` in `supabase.ts` maps DB rows to the TypeScript School type
- If you add a new column, you MUST update both the SELECT query AND rowToSchool

### Photos
- Photos are embedded INSIDE `report_data.sections[n].content` as `photo_grid` blocks
- The `photos` column in the schools table is NOT used by the frontend — it's dead
- Supabase Storage bucket: `school-photos`, path: `school-photos/{school-slug}/{filename}`
- WordPress sites block hotlinking — those images must be manually downloaded and re-hosted

### Google Maps
- Street View hero images use the Google Maps Static API
- API key: `AIzaSyCkqvCW3lrcveaWyD7MgNNYlucMzFH-C3s` (SchoolScout project)
- Satellite duotone hero images render at 0.65-0.70 opacity

### Related Schools Navigation
- `related_schools` slugs MUST match actual `id` values in the schools table
- Format: `school-name-city-state` (e.g., `mar-vista-elementary-school-los-angeles-ca`)
- Short slugs like `mar-vista-elementary` will produce broken links

## Known Gotchas

1. **`.next` cache corruption** — happens regularly. Always clear before restarting dev:
   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

2. **`deep_report` field** — was an older column that is NOT returned by the API route and NOT mapped in `rowToSchool`. All report content lives in `report_data` now.

3. **`type` column constraint** — must be `'public'`. Values like `'charter'`, `'magnet'`, or `'guide'` are rejected by the DB constraint. Even charter schools and playbooks use `type = 'public'`.

4. **`greatschools_rating` constraint** — must be 1-10 or NULL. Value of 0 is rejected.

5. **Single quotes in SQL** — when inserting JSON into Supabase via SQL, escape single quotes as `''` (double single quote).

6. **Mobile testing** — use PowerShell to find local IP, then access via `http://<local-ip>:3000` on phone.

## Deployment

- **Not yet deployed** — runs on localhost:3000
- **Future:** Vercel deployment planned
- **Frontend changes require** clearing `.next` cache and restarting dev server
- **Database changes** are made via Supabase SQL Editor (paste SQL, hit Run)

## Current State (March 2026)

- 34 school reports live (15 LAUSD, 10 SMMUSD, 7 CCUSD, 2 Charter)
- 4 playbooks (SMMUSD Transfer, CCUSD Transfer, LAUSD School Choice, + 1 duplicate to delete)
- 5 schools have photos (Mar Vista, Grant, McKinley, Roosevelt, Venice High)
- 0 schools have tour dates in alerts (Tier 3 data gap)
- SchoolReport.tsx renders the full design system with stat grids, score bars, callouts, comparison tables, feeder flow diagrams, and verdict cards
- The header has a "Guides" row and an SMMUSD transfer banner on Santa Monica school pages
- Related schools render as clickable pills at the bottom ("Continue Researching")

## What NOT to Touch Without Asking

- `SchoolReport.tsx` render logic (changes affect all 34 reports)
- Supabase table schema (column changes require API route + type updates)
- The `report_data` JSON schema (content blocks must match what SchoolReport.tsx expects)
