import type { NextConfig } from 'next'

const config: NextConfig = {
  // The dashboard talks to cms-server over HTTP only — it must never gain a
  // direct database dependency, so there is nothing to transpile from the
  // server workspace here.
  reactStrictMode: true,
}

export default config
