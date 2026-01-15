<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { type NetworkResult, type TestStatus, type AIInsight, type TestMode } from './types'
import SpeedGauge from './components/SpeedGauge.vue'
import HistoryTable from './components/HistoryTable.vue'
import ComparisonChart from './components/ComparisonChart.vue'
import TrendChart from './components/TrendChart.vue'
import FilterBar from './components/FilterBar.vue'
import DetailedMetrics from './components/DetailedMetrics.vue'
import ServerSelector from './components/ServerSelector.vue'
import { SERVERS } from '@/constants'
import TestProgressBar from './components/TestProgressBar.vue'
import { getNetworkInsights } from './services/geminiService'
import AppLogo from './components/AppLogo.vue'

const STORAGE_KEY = 'netpulse_results_vue'

const status = ref<TestStatus>('idle')
const testMode = ref<TestMode>('Full')
const selectedServerId = ref(SERVERS[0]?.id || '')
const currentResult = reactive<Partial<NetworkResult>>({
  download: 0,
  upload: 0,
  latency: 0,
  jitter: 0,
  isp: '---',
  location: '---',
})
const history = ref<NetworkResult[]>([])
const filters = reactive({
  startDate: '',
  endDate: '',
  minDownload: '',
  maxLatency: '',
  testType: '',
  location: '',
})
const selectedIds = ref<string[]>([])
const insight = ref<AIInsight | null>(null)
const isInsightLoading = ref(false)
const phaseProgress = ref(0)
const timeLeft = ref(0)

const SIMULATED_ISPS = [
  'Starlink High Performance',
  'Verizon Fios Gigabit',
  'Google Fiber',
  'Comcast Xfinity',
  'AT&T Internet',
]

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
    if (filters.startDate && date < new Date(filters.startDate + 'T00:00:00')) return false
    if (filters.endDate && date > new Date(filters.endDate + 'T23:59:59')) return false
    if (filters.testType && res.testType !== filters.testType) return false
    if (filters.location && res.location !== filters.location) return false
    if (filters.minDownload && res.download < parseFloat(filters.minDownload)) return false
    if (filters.maxLatency && res.latency > parseFloat(filters.maxLatency)) return false
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

  const randomISP = SIMULATED_ISPS[Math.floor(Math.random() * SIMULATED_ISPS.length)]
  const chosenServer = SERVERS.find((s) => s.id === selectedServerId.value) || SERVERS[0]
  const serverLocation = `${chosenServer?.name} (${chosenServer?.provider})`

  Object.assign(currentResult, {
    download: 0,
    upload: 0,
    latency: 0,
    jitter: 0,
    isp: randomISP,
    location: serverLocation,
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
      isp: randomISP,
      location: serverLocation,
      testType: testMode.value,
    }
    history.value = [res, ...history.value]
    generateAIInsight(res)
  }

  const simulate = (
    target: number,
    key: 'download' | 'upload',
    duration: number,
    callback: () => void,
  ) => {
    const start = Date.now()
    const int = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      phaseProgress.value = progress * 100
      timeLeft.value =
        Math.ceil((duration - elapsed) / 1000) +
        (status.value === 'download' && testMode.value === 'Full' ? 4 : 0)
      const fluctuation = (Math.random() - 0.5) * (target * 0.05)
      currentResult[key] = target * progress + (progress > 0.5 ? fluctuation : 0)
      if (progress >= 1) {
        clearInterval(int)
        currentResult[key] = target
        callback()
      }
    }, 30)
  }

  setTimeout(() => {
    const baseLat =
      chosenServer?.id === 'sf'
        ? 12
        : chosenServer?.id === 'ny'
          ? 45
          : chosenServer?.id === 'ldn'
            ? 110
            : chosenServer?.id === 'tky'
              ? 180
              : 85
    currentResult.latency = baseLat + Math.random() * 20
    currentResult.jitter = 1.5 + Math.random() * 6

    if (testMode.value === 'Latency')
      finishTest({ latency: currentResult.latency, jitter: currentResult.jitter })
    else {
      status.value = 'download'
      simulate(120 + Math.random() * 380, 'download', 5000, () => {
        if (testMode.value === 'Download')
          finishTest({
            download: currentResult.download,
            latency: currentResult.latency,
            jitter: currentResult.jitter,
          })
        else {
          status.value = 'upload'
          simulate(20 + Math.random() * 80, 'upload', 4000, () => {
            finishTest({
              download: currentResult.download,
              upload: currentResult.upload,
              latency: currentResult.latency,
              jitter: currentResult.jitter,
            })
          })
        }
      })
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
  const headers = [
    'Timestamp',
    'Test Type',
    'Node',
    'ISP',
    'Download',
    'Upload',
    'Latency',
    'Jitter',
  ]
  const rows = filteredHistory.value.map((res) => [
    new Date(res.timestamp).toISOString(),
    res.testType,
    res.location,
    res.isp,
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
  Object.assign(filters, {
    startDate: '',
    endDate: '',
    minDownload: '',
    maxLatency: '',
    testType: '',
    location: '',
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
        <ServerSelector
          v-model="selectedServerId"
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
  </div>
</template>
