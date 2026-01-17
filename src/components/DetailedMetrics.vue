<script setup lang="ts">
import { type NetworkResult } from '@/types'
defineProps<{ result: Partial<NetworkResult>; isActive: boolean }>()

//  the sizes are 50MB, 100MB and 1GB
const sizeMap: Record<string, Record<'size' | 'unit', string>> = {
  '50MB': { size: '50', unit: 'MB' },
  '100MB': { size: '100', unit: 'MB' },
  '1GB': { size: '1', unit: 'GB' },
}
</script>

<template>
  <div
    :class="[
      'mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-700',
      !result.id && !isActive ? 'opacity-50 grayscale' : '',
    ]"
  >
    <div
      v-for="item in [
        { label: 'Mode', val: result.testType, unit: '' },
        {
          label: 'Size',
          val: sizeMap[result.size || '50MB']?.size,
          unit: sizeMap[result.size || '50MB']?.unit,
        },
        { label: 'Latency', val: result.latency?.toFixed(1), unit: 'ms' },
        { label: 'Jitter', val: result.jitter?.toFixed(2), unit: 'ms' },
      ]"
      :key="item.label"
      class="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl"
    >
      <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
        {{ item.label }}
      </p>
      <p class="text-sm font-bold text-slate-200 mt-0.5">
        {{ item.val || '---' }} <span class="text-[10px] text-slate-600">{{ item.unit }}</span>
      </p>
    </div>
  </div>
</template>
