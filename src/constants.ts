export const SERVERS = [
  { id: 'sf', name: 'San Francisco, CA', provider: 'Cloudflare' },
  { id: 'ny', name: 'New York, NY', provider: 'AWS' },
  { id: 'ldn', name: 'London, UK', provider: 'Google Cloud' },
  { id: 'tky', name: 'Tokyo, JP', provider: 'Azure' },
  { id: 'fra', name: 'Frankfurt, DE', provider: 'DigitalOcean' },
]

export const DOWNLOAD_TEST_URL = process.env.DOWNLOAD_TEST_URL

export const DOWNLOAD_FILE_OPTIONS = ['50MB', '100MB', '1GB']

export const UPLOAD_TEST_URL = process.env.UPLOAD_TEST_URL

export const UPLOAD_TEST_SIZE = 100_000_000 // ~10 MB

export const DOWNLOAD_CANDIDATES = []
