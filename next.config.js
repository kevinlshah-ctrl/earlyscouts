/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['fonts.googleapis.com'],
  },
  async redirects() {
    return [
      // Legacy slug redirect (old name for the LA playbook)
      {
        source: '/schools/la-school-selection-playbook',
        destination: '/guides/playbook',
        permanent: true,
      },
      // Move all Supabase-backed guide pages from /schools/* to /guides/*
      {
        source: '/schools/smmusd-transfer-playbook',
        destination: '/guides/smmusd-transfer-playbook',
        permanent: true,
      },
      {
        source: '/schools/ccusd-transfer-playbook',
        destination: '/guides/ccusd-transfer-playbook',
        permanent: true,
      },
      {
        source: '/schools/lausd-school-choice-playbook',
        destination: '/guides/lausd-school-choice-playbook',
        permanent: true,
      },
      {
        source: '/schools/beach-cities-school-choice-blueprint',
        destination: '/guides/beach-cities-school-choice-blueprint',
        permanent: true,
      },
      // Move the static playbook to /guides/
      {
        source: '/schools/playbook',
        destination: '/guides/playbook',
        permanent: true,
      },
    ]
  },
}
module.exports = nextConfig
