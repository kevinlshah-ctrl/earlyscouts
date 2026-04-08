'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'

// ── Password requirements ─────────────────────────────────────────────────────

const PWD_REQS = [
  { label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { label: '1 uppercase letter',      test: (p: string) => /[A-Z]/.test(p) },
  { label: '1 lowercase letter',      test: (p: string) => /[a-z]/.test(p) },
  { label: '1 number',                test: (p: string) => /[0-9]/.test(p) },
  { label: '1 special character',     test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

// ── Delete modal ──────────────────────────────────────────────────────────────

function DeleteModal({
  profile,
  onConfirm,
  onCancel,
  onPortalClick,
  portalLoading,
  deleteLoading,
}: {
  profile: UserProfile
  onConfirm: () => Promise<void>
  onCancel: () => void
  onPortalClick: () => Promise<void>
  portalLoading: boolean
  deleteLoading: boolean
}) {
  const hasActiveSubscription =
    profile.subscription_tier === 'extended' &&
    (profile.subscription_status === 'active' || profile.subscription_status === 'trialing')

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <h3 className="font-serif text-xl text-charcoal mb-2">Delete your account?</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            This will permanently delete your account and all saved schools.
            This cannot be undone.
          </p>

          {hasActiveSubscription && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-amber-800 leading-relaxed mb-2">
                You have an active subscription — please cancel it in the Stripe portal
                first to avoid future charges.
              </p>
              <button
                onClick={onPortalClick}
                disabled={portalLoading}
                className="text-sm font-semibold text-amber-700 hover:underline"
              >
                {portalLoading ? 'Opening…' : 'Go to Stripe Portal →'}
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-charcoal hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleteLoading || hasActiveSubscription}
              className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {deleteLoading && (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function Card({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border ${danger ? 'border-red-100' : 'border-gray-100'}`}>
      {children}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-charcoal ' +
  'outline-none focus:border-scout-green transition-colors bg-white'

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  user: User
  profile: UserProfile
  onDeleteAccount: () => Promise<{ error: string | null }>
  onStripePortal: () => Promise<void>
  stripePortalLoading: boolean
}

export default function AccountTab({
  user,
  profile,
  onDeleteAccount,
  onStripePortal,
  stripePortalLoading,
}: Props) {
  // ── Password change state ─────────────────────────────────────────────────
  const [newPwd,      setNewPwd]      = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [pwdLoading,  setPwdLoading]  = useState(false)
  const [pwdSuccess,  setPwdSuccess]  = useState(false)
  const [pwdError,    setPwdError]    = useState<string | null>(null)

  // ── Recovery phone state ──────────────────────────────────────────────────
  const initialPhone = (user.user_metadata?.phone as string | undefined) ?? ''
  const [phone,        setPhone]        = useState(initialPhone)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneSuccess, setPhoneSuccess] = useState(false)
  const [phoneError,   setPhoneError]   = useState<string | null>(null)

  // ── Delete modal state ────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading,   setDeleteLoading]   = useState(false)

  // ── Password change handler ───────────────────────────────────────────────

  const pwdChecks  = PWD_REQS.map(r => ({ ...r, met: r.test(newPwd) }))
  const allPwdMet  = pwdChecks.every(c => c.met)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(false)

    if (!allPwdMet) {
      setPwdError('New password does not meet all requirements.')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New passwords do not match.')
      return
    }

    setPwdLoading(true)
    // Active session proves identity — call updateUser directly.
    const { error: updateErr } = await getBrowserClient().auth.updateUser({ password: newPwd })
    if (updateErr) {
      setPwdError('Could not update password. Please try again.')
    } else {
      setPwdSuccess(true)
      setNewPwd('')
      setConfirmPwd('')
    }
    setPwdLoading(false)
  }

  // ── Phone save handler ────────────────────────────────────────────────────

  async function handlePhoneSave() {
    setPhoneError(null)
    setPhoneSuccess(false)
    setPhoneLoading(true)

    const { error } = await getBrowserClient().auth.updateUser({
      data: { phone: phone.trim() || null },
    })

    if (error) {
      setPhoneError('Could not save phone number. Please try again.')
    } else {
      setPhoneSuccess(true)
    }
    setPhoneLoading(false)
  }

  // ── Delete account handler ────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    setDeleteLoading(true)
    const { error } = await onDeleteAccount()
    setDeleteLoading(false)
    if (error) {
      // deleteAccount in auth-context handles signOut and redirect on success;
      // if it fails we just close the modal
      setShowDeleteModal(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col gap-4 max-w-xl">

        {/* Change password */}
        <Card>
          <h2 className="font-semibold text-charcoal mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="New password"
                required
                className={inputCls}
              />
              {newPwd.length > 0 && (
                <ul className="flex flex-col gap-0.5 pl-0.5">
                  {pwdChecks.map(c => (
                    <li
                      key={c.label}
                      className={`text-xs flex items-center gap-1.5 transition-colors ${
                        c.met ? 'text-scout-green' : 'text-gray-400'
                      }`}
                    >
                      <span className="w-3 text-center shrink-0">{c.met ? '✓' : '○'}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Confirm new password"
              required
              className={inputCls}
            />

            {pwdError   && <p className="text-xs text-red-500">{pwdError}</p>}
            {pwdSuccess && <p className="text-xs text-scout-green">Password updated successfully.</p>}

            <button
              type="submit"
              disabled={pwdLoading || !newPwd || !confirmPwd}
              className="py-2.5 bg-scout-green text-white text-sm font-semibold rounded-full disabled:opacity-50 hover:bg-scout-green-dark transition-colors flex items-center justify-center gap-2"
            >
              {pwdLoading && (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {pwdLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </Card>

        {/* Email (read-only) */}
        <Card>
          <h2 className="font-semibold text-charcoal mb-3">Email Address</h2>
          <p className="text-sm text-charcoal bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
            {user.email}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            To change your email contact{' '}
            <a href="mailto:hello@earlyscouts.com" className="text-scout-green hover:underline">
              hello@earlyscouts.com
            </a>
          </p>
        </Card>

        {/* Recovery phone */}
        <Card>
          <h2 className="font-semibold text-charcoal mb-3">Recovery Phone</h2>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setPhoneSuccess(false); setPhoneError(null) }}
              placeholder="Phone (optional)"
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={handlePhoneSave}
              disabled={phoneLoading}
              className="px-4 py-2.5 bg-scout-green text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-scout-green-dark transition-colors shrink-0 flex items-center gap-1.5"
            >
              {phoneLoading && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {phoneLoading ? 'Saving…' : 'Save'}
            </button>
          </div>
          {phoneError   && <p className="text-xs text-red-500 mt-1.5">{phoneError}</p>}
          {phoneSuccess && <p className="text-xs text-scout-green mt-1.5">Phone number saved.</p>}
          <p className="text-xs text-gray-400 mt-2">Used for account recovery only — never shared.</p>
        </Card>

        {/* Delete account */}
        <Card danger>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-charcoal mb-0.5">Delete Account</h2>
              <p className="text-xs text-gray-400">Permanently remove your account and all data.</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
            >
              Delete my account
            </button>
          </div>
        </Card>

      </div>

      {showDeleteModal && (
        <DeleteModal
          profile={profile}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          onPortalClick={onStripePortal}
          portalLoading={stripePortalLoading}
          deleteLoading={deleteLoading}
        />
      )}
    </>
  )
}
