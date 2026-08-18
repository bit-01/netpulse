export const SERVERS = [
  { id: 'sf', name: 'San Francisco, CA', provider: 'Cloudflare' },
  { id: 'ny', name: 'New York, NY', provider: 'AWS' },
  { id: 'ldn', name: 'London, UK', provider: 'Google Cloud' },
  { id: 'tky', name: 'Tokyo, JP', provider: 'Azure' },
  { id: 'fra', name: 'Frankfurt, DE', provider: 'DigitalOcean' },
]

export const DOWNLOAD_TEST_URL = process.env.DOWNLOAD_TEST_URL

export const UPLOAD_TEST_URL = process.env.UPLOAD_TEST_URL

export const SIZES = {
  '10MB': 10_000_000,
  '50MB': 50_000_000,
  '100MB': 100_000_000,
  '1GB': 1_000_000_000,
}

export const DOWNLOAD_CANDIDATES = []
