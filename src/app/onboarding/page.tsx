'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NEIGHBORHOOD_LABEL_TO_ID } from '@/data/neighborhood-schools'

// ── Types ────────────────────────────────────────────────────────────────────

interface Kid {
  name: string
  grade: string
  midYear: boolean
}

interface OnboardingData {
  locationType: 'zip' | 'neighborhood'
  locationValue: string
  address: string
  kids: Kid[]
  schoolTypes: string[]
  programs: string[]
  languages: string[]
  priorities: string[]
  transfer: string | null
  activities: string[]
  completedAt: string | null
}

const DEFAULT_DATA: OnboardingData = {
  locationType: 'neighborhood',
  locationValue: '',
  address: '',
  kids: [{ name: '', grade: '', midYear: false }],
  schoolTypes: [],
  programs: [],
  languages: [],
  priorities: [],
  transfer: null,
  activities: [],
  completedAt: null,
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GEO_CLUSTERS = [
  {
    id: 'westside',
    name: 'Westside',
    subtitle: 'Mar Vista, Venice, Santa Monica, Culver City, and more',
    bg: 'bg-[#5B9A6F]/5',
    border: 'border-[#5B9A6F]/20',
    activeBg: 'bg-[#5B9A6F]/10',
    activeBorder: 'border-[#5B9A6F]/40',
    neighborhoods: [
      'Mar Vista', 'Venice', 'Palms / Cheviot Hills', 'Playa Vista / Playa del Rey',
      'Santa Monica', 'Culver City', 'Malibu', 'West LA', 'Brentwood / Palisades',
    ],
    comingSoon: false,
  },
  {
    id: 'beach',
    name: 'Beach Cities',
    subtitle: 'Manhattan Beach, El Segundo, Hermosa Beach, Redondo Beach',
    bg: 'bg-[#6BB3D9]/5',
    border: 'border-[#6BB3D9]/20',
    activeBg: 'bg-[#6BB3D9]/10',
    activeBorder: 'border-[#6BB3D9]/40',
    neighborhoods: ['Manhattan Beach', 'El Segundo', 'Hermosa Beach', 'Redondo Beach'],
    comingSoon: false,
  },
  {
    id: 'east-la',
    name: 'East LA',
    subtitle: 'Silver Lake, Los Feliz, Eagle Rock, South Pasadena',
    bg: 'bg-[#A78BCA]/5',
    border: 'border-[#A78BCA]/20',
    activeBg: 'bg-[#A78BCA]/10',
    activeBorder: 'border-[#A78BCA]/40',
    neighborhoods: [
      'Silver Lake / Echo Park', 'Los Feliz', 'Eagle Rock / Highland Park',
      'Atwater Village / Mt. Washington', 'South Pasadena',
    ],
    comingSoon: false,
  },
]

const GRADES = ['Not school age yet', 'TK', 'Kindergarten', '1st–2nd', '3rd–5th', 'Middle School', 'High School']

const SCHOOL_TYPES = [
  { id: 'public',  label: '🏫', name: 'Public',  desc: 'Neighborhood-assigned, tuition-free' },
  { id: 'charter', label: '🎯', name: 'Charter', desc: 'Tuition-free, lottery entry' },
  { id: 'private', label: '🏛️', name: 'Private', desc: 'Application + tuition' },
]

const PROGRAMS   = ['🌍 Dual Language', '⭐ Gifted/GATE', '🔬 STEM/Coding', '🎨 Arts', '📘 IB', '🌱 Montessori', '🧲 Magnet']
const LANGUAGES  = ['Spanish', 'Mandarin', 'French', 'Korean', 'Japanese', 'Other']
const PRIORITIES = ['📊 Strong test scores', '🤝 Diverse community', '👥 Small class sizes', '🚶 Walking distance', '🌅 After-school programs', '♿ Special needs support', '🌳 Outdoor space', '🔒 Safety & security']
const ACTIVITIES = ['🏊 Swimming', '⚽ Soccer', '🤖 Robotics', '🎵 Music', '💃 Dance', '💻 Coding', '📚 Reading', '🎨 Art', '🤸 Gymnastics', '🏀 Basketball', '🎭 Theater', '♟️ Chess']

// ── Chip component ────────────────────────────────────────────────────────────

function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all active:scale-[0.97] ${
        selected
          ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white'
          : 'bg-white border-[#D4D0CC] text-[#3D3A36] hover:border-[#5B9A6F] hover:text-[#5B9A6F]'
      }`}
    >
      {label}
    </button>
  )
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            i < step ? 'bg-[#5B9A6F]' : 'bg-[#E8E5E1]'
          }`}
        />
      ))}
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function OnboardingHeader({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center justify-between">
        <span className="font-serif text-xl text-[#1A1A2E]">
          Early<span className="text-[#5B9A6F]">Scouts</span>
        </span>
        <span className="text-xs text-[#9B9690] font-mono">{step} of 4</span>
      </div>
      <ProgressBar step={step} total={4} />
      {step === 1 && (
        <div className="bg-[#FEF3E8] border border-[#F2C49A] rounded-full px-4 py-1.5 text-center">
          <span className="text-xs text-[#C97B3A] font-medium">
            Helping <strong>325+</strong> families across LA make smarter school decisions
          </span>
        </div>
      )}
    </div>
  )
}

// ── STEP 1: Location ──────────────────────────────────────────────────────────

function Step1({ data, update }: { data: OnboardingData; update: (d: Partial<OnboardingData>) => void }) {
  const [showAddress, setShowAddress] = useState(false)
  const [expandedCluster, setExpandedCluster] = useState<string | null>('westside')

  const schoolCount = data.locationValue
    ? data.locationType === 'zip'
      ? Math.min(40, Math.max(8, (parseInt(data.locationValue.replace(/\D/g, '0').slice(-2)) % 20) + 12))
      : 18
    : 0

  const hasLocation = data.locationValue.length > 0 &&
    (data.locationType === 'zip' ? data.locationValue.replace(/\D/g, '').length === 5 : true)

  function toggleCluster(id: string) {
    setExpandedCluster((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-2xl text-[#1A1A2E] mb-1">Where are you looking?</h2>
        <p className="text-sm text-[#6E6A65]">We'll show you every school with a deep-dive report in your area.</p>
      </div>

      {/* Segmented control — Neighborhood LEFT (default), Zip RIGHT */}
      <div className="flex bg-[#F0EDE8] rounded-full p-1">
        {(['neighborhood', 'zip'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => update({ locationType: type, locationValue: '' })}
            className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
              data.locationType === type
                ? 'bg-[#5B9A6F] text-white shadow-sm'
                : 'text-[#6E6A65] hover:text-[#3D3A36]'
            }`}
          >
            {type === 'neighborhood' ? 'Neighborhood' : 'Zip Code'}
          </button>
        ))}
      </div>

      {/* Geo Cluster Cards */}
      {data.locationType === 'neighborhood' && (
        <div className="flex flex-col gap-2">
          {GEO_CLUSTERS.map((cluster) => {
            const isExpanded = expandedCluster === cluster.id
            const hasSelection = cluster.neighborhoods.includes(data.locationValue)

            if (cluster.comingSoon) {
              return (
                <div
                  key={cluster.id}
                  className={`rounded-2xl border px-4 py-3.5 opacity-60 ${cluster.bg} ${cluster.border}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base text-[#1A1A2E]">{cluster.name}</span>
                        <span className="text-[10px] font-mono uppercase tracking-wider bg-[#A78BCA]/20 text-[#7B5EA7] px-2 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-xs text-[#9B9690] mt-0.5">{cluster.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#9B9690] mt-2">We're expanding. Stay tuned.</p>
                </div>
              )
            }

            return (
              <div key={cluster.id} className="flex flex-col gap-0">
                <button
                  type="button"
                  onClick={() => toggleCluster(cluster.id)}
                  className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${
                    isExpanded
                      ? `${cluster.activeBg} ${cluster.activeBorder} rounded-b-none border-b-0`
                      : `${cluster.bg} ${cluster.border} hover:opacity-80`
                  } ${hasSelection ? 'ring-1 ring-[#5B9A6F]' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif text-base text-[#1A1A2E]">{cluster.name}</span>
                      {hasSelection && (
                        <span className="ml-2 text-[10px] font-mono uppercase tracking-wider bg-[#5B9A6F] text-white px-2 py-0.5 rounded-full">
                          {data.locationValue}
                        </span>
                      )}
                      <p className="text-xs text-[#6E6A65] mt-0.5">{cluster.subtitle}</p>
                    </div>
                    <span className={`text-[#9B9690] text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className={`rounded-b-2xl border border-t-0 px-4 py-3 ${cluster.activeBg} ${cluster.activeBorder}`}>
                    <div className="flex flex-wrap gap-2">
                      {cluster.neighborhoods.map((n) => (
                        <Chip
                          key={n}
                          label={n}
                          selected={data.locationValue === n}
                          onToggle={() => update({ locationValue: data.locationValue === n ? '' : n })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Zip input */}
      {data.locationType === 'zip' && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 90066"
            value={data.locationValue}
            onChange={(e) => update({ locationValue: e.target.value.replace(/\D/g, '') })}
            className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-mono text-[#1A1A2E] bg-white outline-none transition-colors ${
              hasLocation ? 'border-[#5B9A6F]' : 'border-[#D4D0CC] focus:border-[#5B9A6F]'
            }`}
          />
          {!showAddress && (
            <button
              type="button"
              onClick={() => setShowAddress(true)}
              className="text-xs text-[#5B9A6F] hover:underline text-left"
            >
              + Add exact address for precise school zoning
            </button>
          )}
          {showAddress && (
            <input
              type="text"
              placeholder="e.g. 3500 Moore St, Los Angeles"
              value={data.address}
              onChange={(e) => update({ address: e.target.value })}
              className="w-full border-2 border-[#D4D0CC] focus:border-[#5B9A6F] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] bg-white outline-none transition-colors"
            />
          )}
        </div>
      )}

      {/* Dynamic school count */}
      {hasLocation && (
        <div className="bg-[#F0FAF4] border border-[#A3D4B3] rounded-xl px-4 py-3 text-sm text-[#2A4A35]">
          <strong className="text-[#5B9A6F]">{schoolCount} schools</strong> with analyst-written reports in this area.
        </div>
      )}
    </div>
  )
}

// ── STEP 2: Kids ─────────────────────────────────────────────────────────────

function Step2({ data, update }: { data: OnboardingData; update: (d: Partial<OnboardingData>) => void }) {
  function updateKid(i: number, patch: Partial<Kid>) {
    const kids = data.kids.map((k, idx) => idx === i ? { ...k, ...patch } : k)
    update({ kids })
  }
  function addKid() {
    if (data.kids.length < 4) update({ kids: [...data.kids, { name: '', grade: '', midYear: false }] })
  }
  function removeKid(i: number) {
    update({ kids: data.kids.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-2xl text-[#1A1A2E] mb-1">Tell us about your kids.</h2>
        <p className="text-sm text-[#6E6A65]">We&apos;ll match reports to the right grade range. Optional, skip anytime.</p>
      </div>

      <div className="flex flex-col gap-4">
        {data.kids.map((kid, i) => (
          <div key={i} className="border border-[#E8E5E1] rounded-2xl p-4 bg-white flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#9B9690]">Child {i + 1}</span>
              {data.kids.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeKid(i)}
                  className="text-xs text-[#C4BFB9] hover:text-[#9B9690] transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Name (optional)"
              value={kid.name}
              onChange={(e) => updateKid(i, { name: e.target.value })}
              className="w-full border border-[#E8E5E1] rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] bg-[#FFFAF6] outline-none focus:border-[#5B9A6F] transition-colors"
            />

            <div>
              <p className="text-xs text-[#9B9690] mb-2 font-mono uppercase tracking-wider">Current grade</p>
              <div className="flex flex-wrap gap-2">
                {GRADES.map((g) => (
                  <Chip key={g} label={g} selected={kid.grade === g} onToggle={() => updateKid(i, { grade: kid.grade === g ? '' : g })} />
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={kid.midYear}
                onChange={(e) => updateKid(i, { midYear: e.target.checked })}
                className="w-4 h-4 accent-[#5B9A6F] rounded"
              />
              <span className="text-sm text-[#6E6A65]">Entering mid-year</span>
            </label>
          </div>
        ))}

        {data.kids.length < 4 && (
          <button
            type="button"
            onClick={addKid}
            className="border-2 border-dashed border-[#D4D0CC] rounded-2xl py-4 text-sm text-[#9B9690] hover:border-[#5B9A6F] hover:text-[#5B9A6F] transition-colors"
          >
            + Add another child
          </button>
        )}
      </div>
    </div>
  )
}

// ── STEP 3: Education Type ─────────────────────────────────────────────────────

function Step3({ data, update }: { data: OnboardingData; update: (d: Partial<OnboardingData>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-2xl text-[#1A1A2E] mb-1">What kind of education?</h2>
        <p className="text-sm text-[#6E6A65]">Select all that apply. Optional.</p>
      </div>

      {/* School type — 3 horizontal cards */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#9B9690]">School Type</p>
        <div className="grid grid-cols-3 gap-2">
          {SCHOOL_TYPES.map((t) => {
            const sel = data.schoolTypes.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ schoolTypes: toggle(data.schoolTypes, t.id) })}
                className={`flex flex-col items-center gap-1.5 border-2 rounded-xl p-3 transition-all ${
                  sel ? 'border-[#5B9A6F] bg-[#F0FAF4]' : 'border-[#E8E5E1] bg-white hover:border-[#5B9A6F]'
                }`}
              >
                <span className="text-2xl">{t.label}</span>
                <span className={`font-semibold text-sm ${sel ? 'text-[#2A4A35]' : 'text-[#1A1A2E]'}`}>{t.name}</span>
                <span className="text-[10px] text-[#6E6A65] text-center leading-tight">{t.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Transfer toggle */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#9B9690]">Considering a district transfer?</p>
        <div className="flex gap-2">
          {['Yes', 'No'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => update({ transfer: data.transfer === v ? null : v })}
              className={`px-6 py-2.5 rounded-full text-sm font-medium border-2 transition-all ${
                data.transfer === v
                  ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white'
                  : 'bg-white border-[#D4D0CC] text-[#3D3A36] hover:border-[#5B9A6F]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {data.transfer === 'Yes' && (
          <div className="bg-[#F0FAF4] border border-[#A3D4B3] rounded-xl px-4 py-3 text-sm text-[#2A4A35]">
            We have transfer playbooks for <strong>SMMUSD</strong>, <strong>CCUSD</strong>, and <strong>LAUSD</strong>, including every deadline and priority tier.
          </div>
        )}
      </div>

      {/* Programs */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#9B9690]">Programs</p>
        <div className="flex flex-wrap gap-2">
          {PROGRAMS.map((p) => (
            <Chip key={p} label={p} selected={data.programs.includes(p)} onToggle={() => update({ programs: toggle(data.programs, p) })} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── STEP 4: About Your Family ─────────────────────────────────────────────────

function Step4({ data, update }: { data: OnboardingData; update: (d: Partial<OnboardingData>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-2xl text-[#1A1A2E] mb-1">A little more about your family.</h2>
        <p className="text-sm text-[#6E6A65]">Select any that apply. Optional, skip anytime.</p>
      </div>

      {/* Languages */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#9B9690]">Languages spoken at home</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Chip key={l} label={l} selected={data.languages.includes(l)} onToggle={() => update({ languages: toggle(data.languages, l) })} />
          ))}
        </div>
      </div>

      {/* Priorities */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#9B9690]">Priorities</p>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <Chip key={p} label={p} selected={data.priorities.includes(p)} onToggle={() => update({ priorities: toggle(data.priorities, p) })} />
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#9B9690]">Activities your kids love</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map((a) => (
            <Chip key={a} label={a} selected={data.activities.includes(a)} onToggle={() => update({ activities: toggle(data.activities, a) })} />
          ))}
        </div>
      </div>

      {/* Why we ask */}
      <div className="bg-[#FEF9EC] border border-[#E8D07A] rounded-xl px-4 py-3 text-sm text-[#7A6A5A]">
        <strong className="text-[#B08A1A]">Why we ask:</strong> Your monthly update email highlights programs matching your family&apos;s interests, so you only hear about what&apos;s relevant to you.
      </div>
    </div>
  )
}

// ── Main Wizard ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA)

  useEffect(() => {
    document.title = 'Get Started | EarlyScouts'
    return () => { document.title = 'EarlyScouts - For parents who plan ahead.' }
  }, [])

  function update(patch: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...patch }))
  }

  const canContinue = step !== 1 || (
    data.locationValue.length > 0 &&
    (data.locationType === 'zip' ? data.locationValue.replace(/\D/g, '').length === 5 : true)
  )

  function handleContinue() {
    if (step < 4) {
      setStep(step + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      finish()
    }
  }

  function handleSkip() {
    if (step < 4) {
      setStep(step + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      finish()
    }
  }

  function finish() {
    const neighborhoodId =
      data.locationType === 'neighborhood'
        ? (NEIGHBORHOOD_LABEL_TO_ID[data.locationValue] ?? null)
        : null
    const completed = { ...data, neighborhoodId, completedAt: new Date().toISOString() }
    try {
      localStorage.setItem('earlyscouts_onboarding', JSON.stringify(completed))
    } catch {}
    router.push(neighborhoodId ? `/schools?q=${neighborhoodId}` : '/schools')
  }

  return (
    <div className="min-h-screen bg-[#FFFAF6] flex justify-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col">

        <OnboardingHeader step={step} />

        <div className="flex-1 pb-6">
          {step === 1 && <Step1 data={data} update={update} />}
          {step === 2 && <Step2 data={data} update={update} />}
          {step === 3 && <Step3 data={data} update={update} />}
          {step === 4 && <Step4 data={data} update={update} />}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-4 border-t border-[#E8E5E1] bg-[#FFFAF6] sticky bottom-0 pb-4">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full py-4 rounded-full font-semibold text-base transition-all ${
              canContinue
                ? 'bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white shadow-sm'
                : 'bg-[#E8E5E1] text-[#A09A94] cursor-not-allowed'
            }`}
          >
            {step === 4 ? '🏫 See My Schools' : 'Continue'}
          </button>

          {(step > 1 || step === 1) && (
            <button
              type="button"
              onClick={step < 4 ? handleSkip : finish}
              className="w-full py-2.5 text-sm text-[#9B9690] hover:text-[#6E6A65] transition-colors"
            >
              {step === 4 ? 'Skip and browse all schools' : step === 1 ? 'Skip and browse all schools' : 'Skip this step'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
