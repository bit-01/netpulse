<script setup lang="ts">
import { SERVERS } from '@/constants'

defineProps<{ modelValue: string; disabled?: boolean }>()
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative group">
    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1"
      >Target Node</label
    >
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      :disabled="disabled"
      class="appearance-none bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-slate-200 focus:outline-none focus:border-cyan-500 min-w-[200px] w-full disabled:opacity-50"
    >
      <option v-for="s in SERVERS" :key="s.id" :value="s.id" class="bg-slate-900">
        {{ s.name }} ({{ s.provider }})
      </option>
    </select>
  </div>
</template>
