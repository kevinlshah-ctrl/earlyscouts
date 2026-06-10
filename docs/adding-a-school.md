# Adding a school

Since the regions refactor (migration `011`) discovery reads from Supabase at request
time, and reports are fetched at request time. So **adding a school is a SQL paste — no
code change and no deploy** for either the report page or its appearance in discovery.

- **Report page** (`/schools/<slug>`) is live the moment the `schools` row with
  `report_data` is inserted.
- **Discovery** (the "Select your area" tabs/cards) updates the moment the slug is added
  to a neighborhood's tier array in the `neighborhoods` table.

Both require `DISCOVERY_SOURCE=db` in the deployed environment (the default for production).
See the note on the static fallback at the bottom.

## The flow

### 1. Insert the report row into `schools`
Run your report INSERT as usual (idempotent on the primary key):

```sql
INSERT INTO schools (id, slug, name, ... , report_data)
VALUES ('<slug>', '<slug>', '<Name>', ... , '<report_data jsonb>')
ON CONFLICT (id) DO UPDATE
SET report_data = EXCLUDED.report_data,
    updated_at  = now();
```

The page is live immediately after this.

### 2. Map it into discovery — one call per tier
Use the `add_school_to_neighborhood(neighborhood_id, tier, slug)` helper (migration `012`).
It appends the slug **only if not already present**, **preserving existing order** (no
reshuffle of the tabs), and is safe to re-run (a slug already there is a no-op):

```sql
SELECT add_school_to_neighborhood('<neighborhood_id>', '<tier>', '<slug>');

-- e.g. a high school in Studio City:
SELECT add_school_to_neighborhood('studio-city', 'high', 'north-hollywood-high-school-los-angeles-ca');
```

Call it once per tier the school belongs to. **Tiers** (the only valid values):

| tier         | array column      | shows under                          |
|--------------|-------------------|--------------------------------------|
| `elementary` | `elementary_slugs`| Public Elementary / Charter & Private|
| `middle`     | `middle_slugs`    | Middle & High                        |
| `high`       | `high_slugs`      | Middle & High                        |
| `private`    | `private_slugs`   | Charter & Private                    |
| `pipeline`   | `pipeline_slugs`  | (sorts the slug to the FRONT of its tier row — optional) |

Add the slug to `pipeline` as well if you want it to lead its row (the default-pipeline
ordering). A bad `neighborhood_id` raises an error; an invalid tier raises an error.

### 3. Verify the mapping
```sql
SELECT id, elementary_slugs, middle_slugs, high_slugs, private_slugs, pipeline_slugs
FROM neighborhoods
WHERE id = '<neighborhood_id>';
```

### 4. Audit
```
npm run audit:discovery
```
Expect **0 orphans / 0 dead links / 0 duplicates**. (Orphan = report row not mapped
anywhere; dead link = a mapped slug with no `schools` row; duplicate = two `schools` rows
for the same school.) The audit exits non-zero on any failure, so it can gate CI.

## Valid `neighborhood_id`s
The `id` column of the `neighborhoods` table. Current set (also: `SELECT id, label, region_id
FROM neighborhoods ORDER BY sort_order;`):

- **Westside** — `mar-vista`, `playa-vista`, `venice`, `palms`, `westchester`, `santa-monica`, `malibu`, `culver-city`, `brentwood`, `palisades`, `beverly-hills`, `west-la`, `pico-robertson`, `westwood`, `brentwood-palisades`
- **Beach Cities** — `manhattan-beach`, `hermosa-beach`, `redondo-beach`, `el-segundo`
- **Hollywood & Mid-City** — `hollywood`, `hancock-park`, `los-feliz`, `mid-city`, `hollywood-hills`, `studio-city`
- **Northeast LA & Pasadena** — `silver-lake`, `eagle-rock`, `highland-park`, `atwater-village`, `south-pasadena`
- **South & Southwest LA** — `view-park-baldwin-hills`
- **San Fernando Valley** — `sherman-oaks`

A neighborhood shows as a town chip only if it has a `scout_take`. To add a brand-new
neighborhood (or region), insert a row into `neighborhoods` (and `regions`) directly — the
loader picks it up at request time.

## Note: the static fallback has frozen
`src/data/neighborhood-schools.ts` / `neighborhood-scout-takes.ts` are the `DISCOVERY_SOURCE=static`
fallback only. They are **no longer the source of truth** and will NOT reflect DB-only
additions made via this flow. If you ever flip `DISCOVERY_SOURCE` back to `static`, schools
added through `add_school_to_neighborhood` (and any new neighborhoods) will not appear until
the static files are regenerated. Keep production on `db`.
