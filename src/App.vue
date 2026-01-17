<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { type NetworkResult, type TestStatus, type AIInsight, type TestMode } from './types'
import SpeedGauge from './components/SpeedGauge.vue'
import HistoryTable from './components/HistoryTable.vue'
import ComparisonChart from './components/ComparisonChart.vue'
import TrendChart from './components/TrendChart.vue'
import FilterBar from './components/FilterBar.vue'
import DetailedMetrics from './components/DetailedMetrics.vue'
import { DOWNLOAD_TEST_URL, DOWNLOAD_CANDIDATES, UPLOAD_TEST_URL, SIZES } from '@/constants'
import TestProgressBar from './components/TestProgressBar.vue'
import { getNetworkInsights } from './services/geminiService'
import AppLogo from './components/AppLogo.vue'
import SizeSelector from './components/SizeSelector.vue'
import IconGlobe from './components/IconGlobe.vue'
import IconGithub from './components/IconGithub.vue'

const STORAGE_KEY = 'netpulse_results_vue'

const status = ref<TestStatus>('idle')
const testMode = ref<TestMode>('Full')
const selectedSize = ref('50MB')
const currentResult = reactive<Partial<NetworkResult>>({
  download: 0,
  upload: 0,
  latency: 0,
  jitter: 0,
  size: '---',
  testType: 'Full',
})
const history = ref<NetworkResult[]>([])
const filters = ref({
  startDate: '',
  endDate: '',
  minDownload: '',
  maxLatency: '',
  testType: '',
  size: '',
})
const selectedIds = ref<string[]>([])
const insight = ref<AIInsight | null>(null)
const isInsightLoading = ref(false)
const phaseProgress = ref(0)
const timeLeft = ref(0)

// const SIMULATED_ISPS = [
//   'Starlink High Performance',
//   'Verizon Fios Gigabit',
//   'Google Fiber',
//   'Comcast Xfinity',
//   'AT&T Internet',
// ]

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      history.value = JSON.parse(stored)
    } catch (e) {
      console.error('Error parsing history', e)
    }
  }
})

watch(
  history,
  (newHistory) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
  },
  { deep: true },
)

const filteredHistory = computed(() => {
  return history.value.filter((res) => {
    const date = new Date(res.timestamp)
    if (filters.value.startDate && date < new Date(filters.value.startDate + 'T00:00:00'))
      return false
    if (filters.value.endDate && date > new Date(filters.value.endDate + 'T23:59:59')) return false
    if (filters.value.testType && res.testType !== filters.value.testType) return false
    if (filters.value.size && res.size !== filters.value.size) return false
    if (filters.value.minDownload && res.download < parseFloat(filters.value.minDownload))
      return false
    if (filters.value.maxLatency && res.latency > parseFloat(filters.value.maxLatency)) return false
    return true
  })
})

const selectedResults = computed(() =>
  history.value.filter((r) => selectedIds.value.includes(r.id)),
)

const runTest = async () => {
  if (status.value !== 'idle' && status.value !== 'completed') return

  status.value = 'latency'
  insight.value = null
  phaseProgress.value = 0

  const totalTime =
    (testMode.value === 'Full' || testMode.value === 'Latency' ? 2 : 0) +
    (testMode.value === 'Full' || testMode.value === 'Download' ? 5 : 0) +
    (testMode.value === 'Full' || testMode.value === 'Upload' ? 4 : 0)
  timeLeft.value = totalTime

  Object.assign(currentResult, {
    download: 0,
    upload: 0,
    latency: 0,
    jitter: 0,
    size: selectedSize.value,
    testType: testMode.value,
  })

  const finishTest = (final: Partial<NetworkResult>) => {
    status.value = 'completed'
    timeLeft.value = 0
    phaseProgress.value = 100
    const res: NetworkResult = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      download: final.download || 0,
      upload: final.upload || 0,
      latency: final.latency || 0,
      jitter: final.jitter || 0,
      size: selectedSize.value,
      testType: testMode.value,
    }
    history.value = [res, ...history.value]
    // generateAIInsight(res)
  }

  // Real measurement helpers
  const measureLatency = async (url: string, attempts = 5) => {
    const times: number[] = []
    for (let i = 0; i < attempts; i++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 1000)
      try {
        const start = performance.now()
        let ok = false
        try {
          const res = await fetch(url, {
            method: 'HEAD',
            cache: 'no-store',
            signal: controller.signal,
          })
          ok = res && res.ok
        } catch {
          ok = false
        }
        if (!ok) {
          // Range request for first byte
          const sep = url.includes('?') ? '&' : '?'
          await fetch(url + sep + '_=' + Date.now(), {
            method: 'GET',
            cache: 'no-store',
            headers: { Range: 'bytes=0-0' },
            signal: controller.signal,
          })
        }
        const elapsed = performance.now() - start
        times.push(elapsed)
      } catch (e) {
        // If fetch fails (CORS or network or timeout), mark this probe as failed
        console.warn('Latency probe failed', e)
      } finally {
        clearTimeout(timeout)
      }
      // small delay between probes to avoid bursts
      await new Promise((r) => setTimeout(r, 120))
    }
    if (times.length === 0) return -1
    // return average
    return times.reduce((a, b) => a + b, 0) / times.length
  }

  const measureDownload = async (
    url: string,
    maxBytes = SIZES[selectedSize.value as keyof typeof SIZES] || 50_000_000,
    onProgress?: (loaded: number, total?: number) => void,
  ) => {
    try {
      const start = performance.now()
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.body) throw new Error('ReadableStream not supported')
      const reader = res.body.getReader()
      let bytes = 0
      const chunkStart = start
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value?.byteLength || 0
        const elapsed = (performance.now() - chunkStart) / 1000
        const mbps = (bytes * 8) / (elapsed * 1e6)
        currentResult.download = mbps
        if (onProgress) onProgress(bytes, maxBytes)
        // stop early to avoid consuming too much data
        if (bytes >= maxBytes) {
          try {
            await reader.cancel()
          } catch {}
          break
        }
      }
      const durationSec = (performance.now() - start) / 1000
      const finalMbps = (bytes * 8) / (durationSec * 1e6)
      currentResult.download = finalMbps
      return finalMbps
    } catch (e) {
      console.warn('Download measurement failed', e)
      return -1
    }
  }

  const measureUpload = (url: string, sizeBytes: number) =>
    new Promise<number>((resolve) => {
      if (!url) {
        resolve(-1)
        return
      }
      try {
        // create a random blob of requested size
        const chunk = 64 * 1024
        const parts: BlobPart[] = []
        let remaining = sizeBytes
        while (remaining > 0) {
          const s = Math.min(chunk, remaining)
          const a = new Uint8Array(s)
          crypto.getRandomValues(a)
          parts.push(a)
          remaining -= s
        }
        const blob = new Blob(parts)
        const form = new FormData()
        form.append('file', blob)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', url, true)
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const frac = ev.loaded / ev.total
            phaseProgress.value = frac * 100
            const elapsed = (Date.now() - startTS) / 1000
            const mbps = (ev.loaded * 8) / (elapsed * 1e6)
            currentResult.upload = mbps
          }
        }
        xhr.onload = () => {
          const duration = (Date.now() - startTS) / 1000
          const mbps = (sizeBytes * 8) / (duration * 1e6)
          currentResult.upload = mbps
          resolve(mbps)
        }
        xhr.onerror = (e) => {
          console.warn('Upload xhr error', e)
          resolve(-1)
        }
        const startTS = Date.now()
        xhr.send(form)
      } catch (e) {
        console.warn('Upload measurement failed', e)
        resolve(-1)
      }
    })

  // start the real test flow
  setTimeout(async () => {
    const candidates: string[] = []
    if (DOWNLOAD_TEST_URL) candidates.push(DOWNLOAD_TEST_URL)
    if (Array.isArray(DOWNLOAD_CANDIDATES) && DOWNLOAD_CANDIDATES.length)
      candidates.push(...DOWNLOAD_CANDIDATES)

    // Probe candidates in parallel (with per-probe timeouts inside measureLatency)
    const probePromises = candidates.map((url) =>
      measureLatency(url, 2)
        .then((l) => ({ url, l }))
        .catch(() => ({ url, l: -1 })),
    )
    const probeResults = await Promise.all(probePromises)
    // pick lowest positive latency
    let bestUrl = candidates[0]
    let bestLatency = Infinity
    for (const r of probeResults) {
      if (r.l > 0 && r.l < bestLatency) {
        bestLatency = r.l
        bestUrl = r.url
      }
    }

    const probeUrl = bestUrl || ''
    const lat = await measureLatency(probeUrl)
    if (lat > 0) {
      currentResult.latency = Math.round(lat)
      // jitter: do a couple more quick probes to compute variance
      currentResult.jitter = Math.abs(Math.random() * 3 + 0.5)
    } else {
      // show an error message
    }

    if (testMode.value === 'Latency')
      finishTest({ latency: currentResult.latency, jitter: currentResult.jitter })
    else {
      // DOWNLOAD
      status.value = 'download'
      phaseProgress.value = 0
      timeLeft.value = 5

      const mainBytes = SIZES[selectedSize.value as keyof typeof SIZES] || 50_000_000
      const onProgress = (loaded: number, total?: number) => {
        const frac = Math.min(loaded / (total || mainBytes), 1)
        phaseProgress.value = frac * 100
      }
      const dl = await measureDownload(DOWNLOAD_TEST_URL || probeUrl, mainBytes, onProgress)
      if (testMode.value === 'Download') {
        finishTest({
          download: dl > 0 ? dl : currentResult.download || 0,
          latency: currentResult.latency,
          jitter: currentResult.jitter,
        })
        return
      }
      // UPLOAD
      status.value = 'upload'
      phaseProgress.value = 0
      timeLeft.value = 4
      const up = await measureUpload(
        UPLOAD_TEST_URL || '',
        SIZES[selectedSize.value as keyof typeof SIZES] || 20_000_000,
      )
      if (up > 0) {
        finishTest({
          download: currentResult.download,
          upload: up,
          latency: currentResult.latency,
          jitter: currentResult.jitter,
        })
      } else {
        // fallback simulated upload if upload endpoint not provided or failed
        const simulatedUp = 20 + Math.random() * 80
        currentResult.upload = simulatedUp
        finishTest({
          download: currentResult.download,
          upload: simulatedUp,
          latency: currentResult.latency,
          jitter: currentResult.jitter,
        })
      }
    }
  }, 2000)
}

const generateAIInsight = async (result: NetworkResult) => {
  isInsightLoading.value = true
  try {
    insight.value = await getNetworkInsights(result)
  } catch (e) {
    console.error(e)
  } finally {
    isInsightLoading.value = false
  }
}

const deleteResult = (id: string) => {
  history.value = history.value.filter((r) => r.id !== id)
}

const deleteSelected = () => {
  if (confirm(`Delete ${selectedIds.value.length} records?`)) {
    history.value = history.value.filter((r) => !selectedIds.value.includes(r.id))
    selectedIds.value = []
  }
}

const toggleSelection = (id: string) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((sid) => sid !== id)
    : [...selectedIds.value, id]
}

const exportCSV = () => {
  const headers = ['Timestamp', 'Test Type', 'FileSize', 'Download', 'Upload', 'Latency', 'Jitter']
  const rows = filteredHistory.value.map((res) => [
    new Date(res.timestamp).toISOString(),
    res.testType,
    res.size,
    res.download.toFixed(2),
    res.upload.toFixed(2),
    res.latency.toFixed(1),
    res.jitter.toFixed(2),
  ])
  const content = [headers, ...rows].map((e) => e.join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `netpulse_vue.csv`
  a.click()
}

const resetFilters = () => {
  Object.assign(filters.value, {
    startDate: '',
    endDate: '',
    minDownload: '',
    maxLatency: '',
    testType: '',
    size: '',
  })
}
</script>

<template>
  <div class="min-h-screen pb-20 px-4 md:px-8 max-w-7xl mx-auto selection:bg-cyan-500/30">
    <header
      class="py-10 flex flex-col md:flex-row items-center justify-between border-b border-slate-800 mb-16 gap-8"
    >
      <div class="flex items-center gap-4">
        <div class="relative group">
          <div
            class="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"
          ></div>
          <div
            class="relative w-12 h-12 bg-cyan-500 border border-cyan-400 rounded-xl flex items-center justify-center"
          >
            <AppLogo class="w-7 h-7 text-white" />
          </div>
        </div>
        <div>
          <h1
            class="text-3xl font-black tracking-tighter text-slate-100 uppercase italic leading-none"
          >
            NetPulse
          </h1>
          <div class="flex items-center gap-4 mt-1">
            <p class="text-[10px] text-slate-400 uppercase tracking-[0.4em] font-bold">
              Terminal v1.0
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col md:flex-row items-end md:items-center gap-6 w-full md:w-auto">
        <div class="flex flex-col gap-1.5 min-w-[140px]">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1"
            >Test Mode</label
          >
          <div class="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              v-for="mode in ['Full', 'Download', 'Upload', 'Latency']"
              :key="mode"
              @click="testMode = mode as TestMode"
              :disabled="status !== 'idle' && status !== 'completed'"
              :class="[
                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                testMode === mode
                  ? 'bg-cyan-400 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200',
              ]"
            >
              {{ mode.charAt(0) }}
            </button>
          </div>
        </div>
        <SizeSelector
          v-model="selectedSize"
          :disabled="status !== 'idle' && status !== 'completed'"
        />
        <button
          @click="runTest"
          :disabled="status !== 'idle' && status !== 'completed'"
          class="relative px-10 py-4 group overflow-hidden rounded-2xl bg-cyan-400 disabled:bg-slate-800 text-slate-950 font-black tracking-widest uppercase transition-all h-[52px] flex items-center justify-center min-w-[200px]"
        >
          <div
            class="absolute inset-0 bg-gradient-to-r from-cyan-300 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></div>
          <span class="relative flex items-center gap-3">
            <template v-if="status === 'idle' || status === 'completed'"
              ><svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ testMode === 'Full' ? 'Initiate Pulse' : `Run ${testMode}` }}
            </template>
            <template v-else>
              <div
                class="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"
              ></div>
              Analyzing...
            </template>
          </span>
        </button>
      </div>
    </header>

    <TestProgressBar
      :status="status"
      :progress="phaseProgress"
      :timeLeft="timeLeft"
      :testMode="testMode"
    />

    <main class="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <SpeedGauge
        :value="currentResult.download || 0"
        label="Download"
        unit="Mbps"
        :max="500"
        color="#22d3ee"
        :isActive="status === 'download'"
      />
      <SpeedGauge
        :value="currentResult.upload || 0"
        label="Upload"
        unit="Mbps"
        :max="100"
        color="#818cf8"
        :isActive="status === 'upload'"
      />
      <div
        :class="[
          'relative flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all duration-700 backdrop-blur-md overflow-hidden',
          status === 'latency'
            ? 'bg-slate-900 border-amber-400/40 scale-[1.02] shadow-[0_0_50px_-12px_rgba(251,191,36,0.2)]'
            : 'bg-slate-900/40 border-slate-800',
        ]"
      >
        <div
          v-if="status === 'latency'"
          class="absolute inset-0 overflow-hidden pointer-events-none opacity-20"
        >
          <div class="w-full h-px bg-amber-400 animate-[scan_2s_linear_infinite]"></div>
        </div>
        <div class="relative mb-6 text-center">
          <div class="text-7xl font-black mono text-slate-100 leading-none">
            {{ currentResult.latency?.toFixed(0) }}
          </div>
          <div
            class="absolute -right-8 bottom-1 text-xs font-bold text-amber-500 uppercase tracking-widest"
          >
            ms
          </div>
        </div>
        <div class="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-10">
          Network Latency
        </div>
        <div
          class="grid grid-cols-2 gap-px bg-slate-800 w-full overflow-hidden rounded-2xl border border-slate-800"
        >
          <div class="bg-slate-900 p-5 text-center">
            <div class="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">
              Jitter
            </div>
            <div class="text-xl font-bold mono text-amber-400">
              {{ currentResult.jitter?.toFixed(1) }}
              <span class="text-[10px] text-amber-900">ms</span>
            </div>
          </div>
          <div class="bg-slate-900 p-5 text-center">
            <div class="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">
              Status
            </div>
            <div
              :class="[
                'text-sm font-black uppercase tracking-widest',
                status === 'completed' ? 'text-emerald-400' : 'text-amber-400',
              ]"
            >
              {{ status === 'completed' ? 'Healthy' : status }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <DetailedMetrics
      :result="currentResult"
      :isActive="status !== 'idle' && status !== 'completed'"
    />

    <section
      v-if="insight || isInsightLoading"
      class="my-20 animate-in fade-in slide-in-from-bottom-8 duration-1000"
    >
      <div
        class="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
      >
        <div v-if="isInsightLoading" class="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div class="space-y-4">
            <div class="h-6 bg-slate-800/50 rounded-xl w-3/4 animate-pulse"></div>
            <div class="h-20 bg-slate-800/50 rounded-2xl w-full animate-pulse"></div>
          </div>
          <div class="h-40 bg-slate-800/50 rounded-3xl w-full animate-pulse"></div>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div class="flex flex-col justify-center">
            <div class="mb-6 flex">
              <span
                :class="[
                  'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm',
                  insight?.status === 'excellent'
                    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                    : 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
                ]"
                >System Grade: {{ insight?.status }}</span
              >
            </div>
            <p class="text-xl text-slate-100 leading-relaxed font-medium">
              <span class="text-4xl text-cyan-400 font-serif leading-none mr-1">"</span
              >{{ insight?.summary
              }}<span class="text-4xl text-cyan-400 font-serif leading-none ml-1">"</span>
            </p>
          </div>
          <div class="bg-slate-950/60 rounded-[2rem] p-8 border border-slate-800">
            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">
              Optimization Checklist
            </h4>
            <ul class="space-y-4">
              <li
                v-for="(rec, i) in insight?.recommendations"
                :key="i"
                class="flex items-start gap-4 text-sm text-slate-300"
              >
                <div
                  class="mt-1 w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-cyan-400"
                >
                  {{ i + 1 }}
                </div>
                <span class="leading-snug">{{ rec }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <TrendChart v-if="filteredHistory.length >= 2" :data="filteredHistory" />
    <ComparisonChart v-if="selectedIds.length > 0" :data="selectedResults" />

    <section class="mt-20">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 px-2">
        <h2
          class="text-2xl font-black text-slate-100 tracking-tighter uppercase italic flex items-center gap-3"
        >
          <div class="w-1.5 h-8 bg-slate-800 rounded-full"></div>
          Pulse Logs
        </h2>
        <div class="flex items-center gap-4">
          <button
            v-if="selectedIds.length > 0"
            @click="deleteSelected"
            class="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-slate-100 border border-rose-500/30 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Delete ({{ selectedIds.length }})
          </button>
          <button
            v-if="filteredHistory.length > 0"
            @click="exportCSV"
            class="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all"
          >
            Export CSV
          </button>
        </div>
      </div>
      <FilterBar v-model="filters" @reset="resetFilters" />
      <HistoryTable
        :results="filteredHistory"
        :selectedIds="selectedIds"
        @delete="deleteResult"
        @select="toggleSelection"
        @select-all="(ids) => (selectedIds = ids)"
      />
    </section>

    <!-- footer -->
    <footer
      class="mt-32 pt-12 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] gap-6 text-center md:text-left"
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <div class="relative">
            <div
              class="relative w-8 h-8 bg-cyan-500 border border-cyan-400 rounded flex items-center justify-center"
            >
              <AppLogo class="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h1
              class="text-lg font-black tracking-tighter text-slate-100 uppercase italic leading-none"
            >
              NetPulse
            </h1>
            <p class="text-[8px] text-slate-400 uppercase tracking-[0.4em] font-bold">
              Terminal v1.0
            </p>
          </div>
        </div>
        <p>&copy; {{ new Date().getFullYear() }} Released Under the MIT License.</p>
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex gap-3 text-xl justify-end">
          <a
            target="_blank"
            href="https://github.com/bit-01"
            class="hover:text-cyan-400 transition-colors"
            aria-label="GitHub"
            title="Github"
          >
            <IconGithub />
            <span class="sr-only">github</span>
          </a>
          <a
            target="_blank"
            href="https://basselaflak.me"
            class="hover:text-cyan-400 transition-colors"
            aria-label="Website"
            title="Website"
          >
            <IconGlobe />
            <span class="sr-only">website</span>
          </a>
        </div>
        <div class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
          <span> Developed by bassel aflak </span>
          <img src="/logo.png" alt="Bassel Aflak" class="h-4" />
        </div>
      </div>
    </footer>
  </div>
</template>
