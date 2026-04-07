import { redirect } from 'next/navigation'

// Onboarding removed for MVP — go straight to schools.
export default function OnboardingPage() {
  redirect('/schools')
}
