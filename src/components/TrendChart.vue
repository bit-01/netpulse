<script setup lang="ts">
import { computed } from 'vue'
import { type NetworkResult } from '@/types'

const props = defineProps<{ data: NetworkResult[] }>()

const sorted = computed(() => [...props.data].sort((a, b) => a.timestamp - b.timestamp))
const maxVal = computed(() =>
  Math.max(...sorted.value.map((d) => Math.max(d.download, d.upload)), 100),
)

const getPoints = (key: 'download' | 'upload') => {
  const width = 1000
  const height = 200
  if (sorted.value.length < 2) return ''
  return sorted.value
    .map((d, i) => {
      const x = (i / (sorted.value.length - 1)) * width
      const y = height - (d[key] / maxVal.value) * height
      return `${x},${y}`
    })
    .join(' ')
}

const downPoints = computed(() => getPoints('download'))
const upPoints = computed(() => getPoints('upload'))
</script>

<template>
  <div class="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 mt-10">
    <div class="flex justify-between mb-8">
      <h3 class="text-sm font-black text-slate-100 uppercase italic tracking-widest">
        Throughput Trajectory
      </h3>
      <div class="flex gap-4">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Down</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-cyan-400"></div>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Up</span>
        </div>
      </div>
    </div>
    <svg viewBox="0 0 1000 200" class="w-full h-62.5 overflow-visible">
      <polyline
        :points="downPoints"
        fill="none"
        stroke="#34d399"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <polyline
        :points="upPoints"
        fill="none"
        stroke="#22d3ee"
        stroke-width="4"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>
