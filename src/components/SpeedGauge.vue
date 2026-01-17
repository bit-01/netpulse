<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  label: string
  unit: string
  max: number
  color: string
  isActive: boolean
}>()

const radius = 85
const circumference = 2 * Math.PI * radius
const percentage = computed(() => Math.min((props.value / props.max) * 100, 100))
const offset = computed(() => circumference - (percentage.value / 100) * circumference)
const gradientId = computed(() => `grad-${props.label.toLowerCase()}`)
</script>

<template>
  <div
    :class="[
      'relative flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all duration-700 ease-out backdrop-blur-md',
      isActive
        ? 'bg-slate-900 border-cyan-400/40 scale-[1.02] shadow-[0_0_50px_-12px_rgba(34,211,238,0.2)]'
        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60',
    ]"
  >
    <div class="relative w-56 h-56 flex items-center justify-center">
      <svg class="w-full h-full transform -rotate-90">
        <defs>
          <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" :stop-color="color" stop-opacity="0.8" />
            <stop offset="100%" :stop-color="color" />
          </linearGradient>
        </defs>
        <circle
          cx="112"
          cy="112"
          :r="radius"
          stroke="currentColor"
          stroke-width="10"
          fill="transparent"
          class="text-slate-700/30"
        />
        <circle
          cx="112"
          cy="112"
          :r="radius"
          :stroke="`url(#${gradientId})`"
          stroke-width="12"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="offset"
          stroke-linecap="round"
          fill="transparent"
          class="transition-all duration-800"
          :style="{ filter: isActive ? `drop-shadow(0 0 8px ${color}99)` : 'none' }"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          :class="[
            'text-5xl font-black mono tracking-tighter transition-colors',
            isActive ? 'text-slate-100' : 'text-slate-300',
          ]"
          >{{ value > 99 ? Math.floor(value) : value.toFixed(1) }}</span
        >
        <span class="text-[10px] font-bold text-slate-500 capitalize tracking-[0.3em] mt-1">{{
          unit
        }}</span>
      </div>
    </div>
    <div class="mt-6 flex flex-col items-center">
      <div
        :class="[
          'h-1 w-12 rounded-full mb-3 transition-all',
          isActive ? 'bg-cyan-500 w-20' : 'bg-slate-700',
        ]"
      ></div>
      <span
        :class="[
          'text-sm font-bold uppercase tracking-widest',
          isActive ? 'text-slate-100' : 'text-slate-500',
        ]"
        >{{ label }}</span
      >
    </div>
  </div>
</template>
