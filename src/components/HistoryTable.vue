<script setup lang="ts">
import { computed } from 'vue'
import { type NetworkResult } from '@/types'

const props = defineProps<{ results: NetworkResult[]; selectedIds: string[] }>()
const emit = defineEmits(['delete', 'select', 'select-all'])

const isAllSelected = computed(
  () => props.results.length > 0 && props.results.every((r) => props.selectedIds.includes(r.id)),
)

const toggleAll = () => {
  if (isAllSelected.value)
    emit(
      'select-all',
      props.selectedIds.filter((id) => !props.results.find((r) => r.id === id)),
    )
  else
    emit(
      'select-all',
      Array.from(new Set([...props.selectedIds, ...props.results.map((r) => r.id)])),
    )
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
    <table class="w-full text-left min-w-[900px]">
      <thead class="bg-slate-800/50 text-slate-400 text-[10px] uppercase tracking-wider">
        <tr>
          <th class="px-6 py-4 w-16">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleAll"
              class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-400"
            />
          </th>
          <th class="px-6 py-4">Timestamp</th>
          <th class="px-6 py-4">Node</th>
          <th class="px-6 py-4">Down (Mbps)</th>
          <th class="px-6 py-4">Up (Mbps)</th>
          <th class="px-6 py-4">Latency (ms)</th>
          <th class="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/50">
        <tr
          v-for="res in results"
          :key="res.id"
          :class="[
            'transition-colors',
            selectedIds.includes(res.id) ? 'bg-cyan-400/10' : 'hover:bg-slate-800/20',
          ]"
        >
          <td class="px-6 py-4">
            <input
              type="checkbox"
              :checked="selectedIds.includes(res.id)"
              @change="$emit('select', res.id)"
              class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-400"
            />
          </td>
          <td class="px-6 py-4 text-xs text-slate-300 mono">
            {{ new Date(res.timestamp).toLocaleString() }}
          </td>
          <td class="px-6 py-4 text-xs font-bold text-slate-200">{{ res.location }}</td>
          <td class="px-6 py-4 font-bold mono text-cyan-400">{{ res.download.toFixed(2) }}</td>
          <td class="px-6 py-4 font-bold mono text-indigo-400">{{ res.upload.toFixed(2) }}</td>
          <td class="px-6 py-4 font-bold mono text-amber-400">{{ res.latency.toFixed(0) }}</td>
          <td class="px-6 py-4 text-right">
            <button @click="$emit('delete', res.id)" class="text-slate-600 hover:text-rose-500 p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
