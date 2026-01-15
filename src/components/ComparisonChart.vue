<script setup lang="ts">
import { computed } from 'vue'
import { NetworkResult } from '../types'

const props = defineProps<{ data: NetworkResult[] }>()
const maxVal = computed(() =>
  Math.max(...props.data.map((d) => Math.max(d.download, d.upload, d.latency)), 10),
)
</script>

<template>
  <div class="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 mt-10">
    <h3 class="text-sm font-black text-slate-100 uppercase italic tracking-widest mb-8">
      Direct Comparison
    </h3>
    <div class="flex items-end gap-6 h-50 px-4">
      <div v-for="res in data" :key="res.id" class="flex-1 flex flex-col items-center gap-2 group">
        <div class="w-full flex items-end gap-1 h-full">
          <div
            :style="{ height: (res.download / maxVal) * 100 + '%' }"
            class="flex-1 bg-emerald-400 rounded-t-md transition-all duration-500"
          ></div>
          <div
            :style="{ height: (res.upload / maxVal) * 100 + '%' }"
            class="flex-1 bg-cyan-400 rounded-t-md transition-all duration-500"
          ></div>
          <div
            :style="{ height: (res.latency / maxVal) * 100 + '%' }"
            class="flex-1 bg-amber-400 rounded-t-md transition-all duration-500"
          ></div>
        </div>
        <span class="text-[8px] text-slate-500 mono whitespace-nowrap">{{
          new Date(res.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }}</span>
      </div>
    </div>
  </div>
</template>
