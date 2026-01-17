export interface NetworkResult {
  id: string
  timestamp: number
  download: number // Mbps
  upload: number // Mbps
  latency: number // ms
  jitter: number // ms
  size?: string
  testType: 'Full' | 'Download' | 'Upload' | 'Latency'
}

export type TestStatus = 'idle' | 'latency' | 'download' | 'upload' | 'completed' | 'error'

export interface AIInsight {
  status: 'excellent' | 'good' | 'fair' | 'poor'
  summary: string
  recommendations: string[]
}

export interface FilterOptions {
  startDate: string
  endDate: string
  minDownload: string
  maxLatency: string
  testType: string
  size: string
}

export type TestMode = 'Full' | 'Download' | 'Upload' | 'Latency'
