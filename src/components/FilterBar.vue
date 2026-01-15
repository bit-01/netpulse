<script setup lang="ts">
import type { FilterOptions } from '@/types'
import { SERVERS } from '@/constants'
import { ref, watch } from 'vue'
const props = defineProps<{ modelValue: FilterOptions }>()
const emit = defineEmits(['update:modelValue', 'reset'])

const local = ref<FilterOptions>({
  startDate: props.modelValue.startDate,
  endDate: props.modelValue.endDate,
  testType: props.modelValue.testType,
  location: props.modelValue.location,
  minDownload: props.modelValue.minDownload,
  maxLatency: props.modelValue.maxLatency,
})

watch(
  () => local.value,
  (newVal: FilterOptions) => {
    emit('update:modelValue', newVal)
  },
  { deep: true },
)

watch(
  () => props.modelValue,
  (newVal: FilterOptions) => {
    local.value = { ...newVal }
  },
  { deep: true },
)

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
    <div class="flex-1 min-w-45">
      <label :class="labelClasses">Target Node</label>
      <select
        name="location"
        v-model="local.location"
        :class="`${inputClasses} w-full appearance-none cursor-pointer`"
      >
        <option value="" class="bg-slate-800">All Nodes</option>
        <option
          v-for="s in SERVERS"
          :key="s.id"
          :value="`${s.name} (${s.provider})`"
          className="bg-slate-800"
        >
          {{ s.name }}
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
