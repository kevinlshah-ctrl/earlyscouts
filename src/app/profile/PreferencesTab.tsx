'use client'

import { useState, useEffect } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

// ── Constants (mirrored from onboarding) ──────────────────────────────────────

const GRADES       = ['Not school age yet', 'TK', 'Kindergarten', '1st–2nd', '3rd–5th', 'Middle School', 'High School']
const SCHOOL_TYPES = ['Public', 'Charter', 'Private']
const PROGRAMS     = ['🌍 Dual Language', '⭐ Gifted/GATE', '🔬 STEM/Coding', '🎨 Arts', '📘 IB', '🌱 Montessori', '🧲 Magnet']
const PRIORITIES   = ['📊 Strong test scores', '🤝 Diverse community', '👥 Small class sizes', '🚶 Walking distance', '🌅 After-school programs', '♿ Special needs support', '🌳 Outdoor space', '🔒 Safety & security']
const ACTIVITIES   = ['🏊 Swimming', '⚽ Soccer', '🤖 Robotics', '🎵 Music', '💃 Dance', '💻 Coding', '📚 Reading', '🎨 Art', '🤸 Gymnastics', '🏀 Basketball', '🎭 Theater', '♟️ Chess']

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prefs {
  locationType?: 'zip' | 'neighborhood' | string
  locationValue?: string
  kids?: { grade: string }[]
  schoolTypes?: string[]
  programs?: string[]
  priorities?: string[]
  activities?: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toggleItem<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

// ── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-[0.97] ${
        selected
          ? 'bg-scout-green border-scout-green text-white'
          : 'bg-white border-gray-200 text-charcoal hover:border-scout-green hover:text-scout-green'
      }`}
    >
      {label}
    </button>
  )
}

// ── Preference card wrapper ───────────────────────────────────────────────────

function PrefCard({
  title,
  display,
  isEmpty,
  emptyText,
  editContent,
  editing,
  onEdit,
  onSave,
  onCancel,
  saving,
}: {
  title: string
  display: React.ReactNode
  isEmpty: boolean
  emptyText: string
  editContent: React.ReactNode
  editing: boolean
  onEdit: () => void
  onSave: () => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">{title}</h3>
        {!editing && (
          <button
            onClick={onEdit}
            className="text-xs font-medium text-scout-green hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          {editContent}
          <div className="flex gap-2 pt-1 border-t border-gray-100">
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-scout-green text-white text-sm font-semibold rounded-full disabled:opacity-50 hover:bg-scout-green-dark transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-200 text-sm text-charcoal rounded-full hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
      ) : (
        display
      )}
    </div>
  )
}

// ── Chip row display ──────────────────────────────────────────────────────────

function ChipRow({ items, colorClass }: { items: string[]; colorClass: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span key={item} className={`text-sm px-3 py-1 rounded-full ${colorClass}`}>{item}</span>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  userId: string
  initialPrefs: Record<string, unknown> | null
}

export default function PreferencesTab({ userId, initialPrefs }: Props) {
  const [prefs, setPrefs]                   = useState<Prefs>((initialPrefs as Prefs) ?? {})
  const [draft, setDraft]                   = useState<Prefs>({})
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [saving, setSaving]                 = useState(false)

  // Fallback: load from localStorage if Supabase preferences are empty
  useEffect(() => {
    if (initialPrefs && Object.keys(initialPrefs).length > 0) return
    try {
      const raw = localStorage.getItem('earlyscouts_onboarding')
      if (raw) setPrefs(JSON.parse(raw) as Prefs)
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(section: string) {
    setDraft({ ...prefs })
    setEditingSection(section)
  }

  function cancelEdit() {
    setDraft({})
    setEditingSection(null)
  }

  async function saveSection(patch: Prefs) {
    setSaving(true)
    const merged: Prefs = { ...prefs, ...patch }
    try {
      await getBrowserClient()
        .from('user_profiles')
        .update({ preferences: merged } as never)
        .eq('id', userId)
      try {
        const ls = JSON.parse(localStorage.getItem('earlyscouts_onboarding') || '{}')
        localStorage.setItem('earlyscouts_onboarding', JSON.stringify({ ...ls, ...patch }))
      } catch {}
      setPrefs(merged)
    } finally {
      setSaving(false)
      setEditingSection(null)
      setDraft({})
    }
  }

  // ── Derived display values ────────────────────────────────────────────────

  const allGrades = (prefs.kids ?? []).map(k => k.grade).filter(Boolean)
  const isAllEmpty =
    !prefs.locationValue &&
    allGrades.length === 0 &&
    !prefs.schoolTypes?.length &&
    !prefs.programs?.length &&
    !prefs.priorities?.length &&
    !prefs.activities?.length

  // ── All-empty state ───────────────────────────────────────────────────────

  if (isAllEmpty && !editingSection) {
    return (
      <div className="py-16 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-peach/15 flex items-center justify-center">
          <svg
            width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className="text-peach"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="max-w-xs">
          <p className="font-semibold text-charcoal mb-1">No preferences saved yet.</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Tell us about your family so we can show you the most relevant schools.
          </p>
        </div>
        <button
          onClick={() => startEdit('location')}
          className="inline-block bg-scout-green text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-scout-green-dark transition-colors"
        >
          Tell us about your family →
        </button>
      </div>
    )
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* Location */}
      <PrefCard
        title="Location"
        isEmpty={!prefs.locationValue}
        emptyText="No location set — tap Edit to add."
        display={
          <div className="flex flex-wrap gap-2">
            <span className="text-sm bg-scout-green/10 text-scout-green px-3 py-1 rounded-full">
              {prefs.locationValue}
              {prefs.locationType === 'zip' ? ' (ZIP)' : ''}
            </span>
          </div>
        }
        editing={editingSection === 'location'}
        onEdit={() => startEdit('location')}
        onSave={() => saveSection({ locationValue: draft.locationValue, locationType: draft.locationType })}
        onCancel={cancelEdit}
        saving={saving}
        editContent={
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-gray-400 block mb-1.5">ZIP Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={draft.locationType === 'zip' ? (draft.locationValue ?? '') : ''}
                onChange={e => setDraft(d => ({ ...d, locationValue: e.target.value.replace(/\D/g, ''), locationType: 'zip' }))}
                placeholder="e.g. 90066"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-scout-green font-mono transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-gray-400 block mb-1.5">Or neighborhood</label>
              <input
                type="text"
                value={draft.locationType !== 'zip' ? (draft.locationValue ?? '') : ''}
                onChange={e => setDraft(d => ({ ...d, locationValue: e.target.value, locationType: 'neighborhood' }))}
                placeholder="e.g. Mar Vista, Santa Monica…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-scout-green transition-colors"
              />
            </div>
          </div>
        }
      />

      {/* Child grades */}
      <PrefCard
        title="Child grade(s)"
        isEmpty={allGrades.length === 0}
        emptyText="No grades added — tap Edit to add."
        display={<ChipRow items={allGrades} colorClass="bg-gray-100 text-gray-600" />}
        editing={editingSection === 'grades'}
        onEdit={() => startEdit('grades')}
        onSave={() => {
          const grades = (draft.kids ?? []).map(k => k.grade).filter(Boolean)
          return saveSection({ kids: grades.map(g => ({ grade: g })) })
        }}
        onCancel={cancelEdit}
        saving={saving}
        editContent={
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-400">Select all grades that apply.</p>
            <div className="flex flex-wrap gap-2">
              {GRADES.map(g => {
                const draftGrades = (draft.kids ?? []).map(k => k.grade)
                return (
                  <Chip
                    key={g}
                    label={g}
                    selected={draftGrades.includes(g)}
                    onToggle={() =>
                      setDraft(d => ({
                        ...d,
                        kids: toggleItem(draftGrades, g).map(grade => ({ grade })),
                      }))
                    }
                  />
                )
              })}
            </div>
          </div>
        }
      />

      {/* School type preferences */}
      <PrefCard
        title="School type preferences"
        isEmpty={!prefs.schoolTypes?.length}
        emptyText="No types selected — tap Edit to add."
        display={<ChipRow items={prefs.schoolTypes ?? []} colorClass="bg-scout-green/10 text-scout-green" />}
        editing={editingSection === 'schoolTypes'}
        onEdit={() => startEdit('schoolTypes')}
        onSave={() => saveSection({ schoolTypes: draft.schoolTypes ?? [] })}
        onCancel={cancelEdit}
        saving={saving}
        editContent={
          <div className="flex flex-wrap gap-2">
            {SCHOOL_TYPES.map(t => (
              <Chip
                key={t}
                label={t}
                selected={(draft.schoolTypes ?? []).includes(t)}
                onToggle={() => setDraft(d => ({ ...d, schoolTypes: toggleItem(d.schoolTypes ?? [], t) }))}
              />
            ))}
          </div>
        }
      />

      {/* Programs of interest */}
      <PrefCard
        title="Programs of interest"
        isEmpty={!prefs.programs?.length}
        emptyText="No programs selected — tap Edit to add."
        display={<ChipRow items={prefs.programs ?? []} colorClass="bg-sky/10 text-sky" />}
        editing={editingSection === 'programs'}
        onEdit={() => startEdit('programs')}
        onSave={() => saveSection({ programs: draft.programs ?? [] })}
        onCancel={cancelEdit}
        saving={saving}
        editContent={
          <div className="flex flex-wrap gap-2">
            {PROGRAMS.map(p => (
              <Chip
                key={p}
                label={p}
                selected={(draft.programs ?? []).includes(p)}
                onToggle={() => setDraft(d => ({ ...d, programs: toggleItem(d.programs ?? [], p) }))}
              />
            ))}
          </div>
        }
      />

      {/* Priorities */}
      <PrefCard
        title="Priorities"
        isEmpty={!prefs.priorities?.length}
        emptyText="No priorities selected — tap Edit to add."
        display={<ChipRow items={prefs.priorities ?? []} colorClass="bg-honey/10 text-honey" />}
        editing={editingSection === 'priorities'}
        onEdit={() => startEdit('priorities')}
        onSave={() => saveSection({ priorities: draft.priorities ?? [] })}
        onCancel={cancelEdit}
        saving={saving}
        editContent={
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map(p => (
              <Chip
                key={p}
                label={p}
                selected={(draft.priorities ?? []).includes(p)}
                onToggle={() => setDraft(d => ({ ...d, priorities: toggleItem(d.priorities ?? [], p) }))}
              />
            ))}
          </div>
        }
      />

      {/* Activities */}
      <PrefCard
        title="Activities"
        isEmpty={!prefs.activities?.length}
        emptyText="No activities selected — tap Edit to add."
        display={<ChipRow items={prefs.activities ?? []} colorClass="bg-lavender/10 text-lavender" />}
        editing={editingSection === 'activities'}
        onEdit={() => startEdit('activities')}
        onSave={() => saveSection({ activities: draft.activities ?? [] })}
        onCancel={cancelEdit}
        saving={saving}
        editContent={
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map(a => (
              <Chip
                key={a}
                label={a}
                selected={(draft.activities ?? []).includes(a)}
                onToggle={() => setDraft(d => ({ ...d, activities: toggleItem(d.activities ?? [], a) }))}
              />
            ))}
          </div>
        }
      />

    </div>
  )
}
