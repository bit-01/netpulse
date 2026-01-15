<script setup lang="ts">
import { computed } from 'vue'
import { type TestStatus } from '@/types'

const props = defineProps<{
  status: TestStatus
  progress: number
  timeLeft: number
  testMode: string
}>()

const phases = computed(() => {
  const p = []
  if (props.testMode === 'Full' || props.testMode === 'Latency') p.push('latency')
  if (props.testMode === 'Full' || props.testMode === 'Download') p.push('download')
  if (props.testMode === 'Full' || props.testMode === 'Upload') p.push('upload')
  return p
})

const label = computed(() => {
  if (props.status === 'latency') return 'Signal Latency'
  if (props.status === 'download') return 'Download Stream'
  if (props.status === 'upload') return 'Upload Stream'
  return ''
})
</script>

<template>
  <div
    v-if="status !== 'idle' && status !== 'completed'"
    class="w-full max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-top-4"
  >
    <div class="flex justify-between items-end mb-3 px-1">
      <div class="flex flex-col">
        <span class="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]"
          >Phase {{ phases.indexOf(status) + 1 }} of {{ phases.length }}</span
        >
        <h4 class="text-lg font-black text-slate-100 uppercase italic tracking-tight">
          {{ label }}
        </h4>
      </div>
      <div class="text-right">
        <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1"
          >Estimated Remaining</span
        >
        <span class="text-xl font-black mono text-cyan-400">{{ timeLeft }}s</span>
      </div>
    </div>
    <div
      class="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50 p-0.5"
    >
      <div
        class="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-indigo-400 rounded-full transition-all duration-300"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </div>
</template>
