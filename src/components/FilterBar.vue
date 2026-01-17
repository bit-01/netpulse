<script setup lang="ts">
import type { FilterOptions } from '@/types'
import { SIZES } from '@/constants'
import { computed } from 'vue'
const props = defineProps<{ modelValue: FilterOptions }>()
const emit = defineEmits(['update:modelValue', 'reset'])

const local = computed<FilterOptions>({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const labelClasses = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block'
const inputClasses =
  'bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100'
</script>

<template>
  <div
    class="bg-slate-900/40 border border-slate-800 rounded-4xl p-6 mb-8 backdrop-blur-md flex flex-wrap gap-4 items-end"
  >
    <div class="flex-1 min-w-50">
      <label :class="labelClasses">Date Range</label>
      <div class="flex flex-wrap gap-2">
        <input
          type="date"
          v-model="local.startDate"
          class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 w-full"
        />
        <input
          type="date"
          v-model="local.endDate"
          class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 w-full"
        />
      </div>
    </div>
    <div class="flex-1 min-w-37.5">
      <label :class="labelClasses">Type</label>
      <select
        v-model="local.testType"
        class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 w-full"
      >
        <option value="" class="bg-slate-800">All Types</option>
        <option value="Full" class="bg-slate-800">Full Pulse</option>
        <option value="Download" class="bg-slate-800">Download</option>
        <option value="Upload" class="bg-slate-800">Upload</option>
        <option value="Latency" class="bg-slate-800">Latency</option>
      </select>
    </div>
    <div className="flex-1 min-w-[100px]">
      <label :class="labelClasses">Min Dn</label>
      <input
        type="number"
        name="minDownload"
        placeholder="Mbps"
        value="{filters.minDownload}"
        v-model="local.minDownload"
        :class="`${inputClasses} w-full`"
      />
    </div>

    <div className="flex-1 min-w-[100px]">
      <label :class="labelClasses">Max Lat</label>
      <input
        type="number"
        name="maxLatency"
        placeholder="ms"
        value="{filters.maxLatency}"
        v-model="local.maxLatency"
        :class="`${inputClasses} w-full`"
      />
    </div>
    <div class="flex-1 min-w-45">
      <label :class="labelClasses">Packet Size</label>
      <select
        name="location"
        v-model="local.size"
        :class="`${inputClasses} w-full appearance-none cursor-pointer`"
      >
        <option value="" class="bg-slate-800">All Sizes</option>
        <option v-for="(s, k) of SIZES" :key="k" :value="`${k}`" className="bg-slate-800">
          {{ k }}
        </option>
      </select>
    </div>
    <button
      @click="$emit('reset')"
      class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700/50"
    >
      Reset
    </button>
  </div>
</template>
