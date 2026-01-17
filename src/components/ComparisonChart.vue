<script setup lang="ts">
import { computed, ref } from 'vue'
import { type NetworkResult } from '../types'

const props = defineProps<{ data: NetworkResult[] }>()

// show up to this many recent items for comparison
const MAX_ITEMS = 8

const displayData = computed(() =>
  [...props.data].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_ITEMS),
)

// maximum used for bar heights (keeps latency on same scale)
const maxVal = computed(() =>
  Math.max(...props.data.map((d) => Math.max(d.download, d.upload, d.latency)), 10),
)

// For stacked mode, compute the max combined throughput (download+upload)
const maxThroughput = computed(() => Math.max(...props.data.map((d) => d.download + d.upload), 1))

const isSameDay = computed(() => {
  const arr = displayData.value
  if (!arr || arr.length <= 1) return true
  const first = new Date(arr[0]!.timestamp).toDateString()
  return arr.every((d) => new Date(d.timestamp).toDateString() === first)
})

const fmtShortTime = (ts: number) => {
  const d = new Date(ts)
  if (isSameDay.value) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
const fmtNum = (v: number) => (v ? v.toFixed(1) : '0.0')

// view mode: 'clustered' (three side-by-side bars) or 'stacked' (download+upload stacked)
const viewMode = ref<'clustered' | 'stacked'>('clustered')
</script>

<template>
  <div class="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 mt-10">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-sm font-black text-slate-100 uppercase italic tracking-widest">
        Direct Comparison
      </h3>
      <div class="flex items-center gap-3 text-[12px] text-slate-300">
        <span class="inline-flex items-center gap-2"
          ><span class="w-2 h-2 rounded-full bg-emerald-400"></span>Down</span
        >
        <span class="inline-flex items-center gap-2"
          ><span class="w-2 h-2 rounded-full bg-cyan-400"></span>Up</span
        >
        <span class="inline-flex items-center gap-2"
          ><span class="w-2 h-2 rounded-full bg-amber-400"></span>Latency</span
        >

        <!-- view mode toggle -->
        <div class="ml-4 inline-flex items-center bg-slate-800 rounded-md p-1">
          <button
            :class="[
              'px-3 py-1 text-xs rounded',
              viewMode === 'clustered' ? 'bg-slate-700 text-white' : 'text-slate-400',
            ]"
            @click="viewMode = 'clustered'"
          >
            Clustered
          </button>
          <button
            :class="[
              'px-3 py-1 text-xs rounded',
              viewMode === 'stacked' ? 'bg-slate-700 text-white' : 'text-slate-400',
            ]"
            @click="viewMode = 'stacked'"
          >
            Stacked
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="!props.data || props.data.length === 0"
      class="text-slate-500 text-sm py-10 text-center"
    >
      No data yet — run a test to populate comparison.
    </div>

    <div v-else class="flex items-end gap-6 h-50 px-4">
      <div
        v-for="res in displayData"
        :key="res.id"
        class="flex-1 flex flex-col items-center gap-2 group"
      >
        <div class="w-full h-full relative flex items-end justify-center">
          <!-- Clustered mode: three bars side-by-side -->
          <div v-if="viewMode === 'clustered'" class="w-full flex items-end gap-1 h-full">
            <div
              :style="{ height: (res.download / maxVal) * 100 + '%' }"
              class="flex-1 bg-emerald-400 rounded-t-md transition-all duration-500 flex items-end justify-center"
              title="Download (Mbps)"
              aria-label="Download"
            >
              <span class="text-[10px] text-slate-900 font-bold py-1">{{
                fmtNum(res.download)
              }}</span>
            </div>
            <div
              :style="{ height: (res.upload / maxVal) * 100 + '%' }"
              class="flex-1 bg-cyan-400 rounded-t-md transition-all duration-500 flex items-end justify-center"
              title="Upload (Mbps)"
              aria-label="Upload"
            >
              <span class="text-[10px] text-slate-900 font-bold py-1">{{
                fmtNum(res.upload)
              }}</span>
            </div>
            <div
              :style="{ height: (res.latency / maxVal) * 100 + '%' }"
              class="flex-1 bg-amber-400 rounded-t-md transition-all duration-500 flex items-end justify-center"
              title="Latency (ms)"
              aria-label="Latency"
            >
              <span class="text-[10px] text-slate-900 font-bold py-1">{{
                fmtNum(res.latency)
              }}</span>
            </div>
          </div>

          <!-- Stacked mode: download + upload stacked; latency shown as thin horizontal indicator -->
          <div v-else class="w-full h-full flex items-end justify-center">
            <div class="relative w-3/4 h-full flex flex-col-reverse rounded-md overflow-hidden">
              <div
                :style="{ height: (res.latency / maxVal) * 100 + '%' }"
                class="bg-amber-400 transition-all duration-500 flex items-end justify-center"
                title="Download (Mbps)"
              >
                <span class="text-[10px] text-slate-900 font-bold py-1">{{
                  fmtNum(res.latency)
                }}</span>
              </div>
              <div
                :style="{ height: (res.download / maxThroughput) * 100 + '%' }"
                class="bg-emerald-400 transition-all duration-500 flex items-end justify-center"
                title="Download (Mbps)"
              >
                <span class="text-[10px] text-slate-900 font-bold py-1">{{
                  fmtNum(res.download)
                }}</span>
              </div>
              <div
                :style="{ height: (res.upload / maxThroughput) * 100 + '%' }"
                class="bg-cyan-400 transition-all duration-500 flex items-end justify-center"
                title="Upload (Mbps)"
              >
                <span class="text-[10px] text-slate-900 font-bold py-1">{{
                  fmtNum(res.upload)
                }}</span>
              </div>
            </div>

            <!-- latency indicator (positioned relative to column using maxVal) -->
          </div>
        </div>

        <span
          class="text-[10px] text-slate-400 mono truncate block max-w-18 text-center"
          :title="fmtShortTime(res.timestamp)"
        >
          {{ fmtShortTime(res.timestamp) }}
        </span>
      </div>
    </div>
  </div>
</template>
