<script setup lang="ts">
import { computed, ref } from 'vue'
import { type NetworkResult } from '@/types'

const props = defineProps<{ results: NetworkResult[]; selectedIds: string[] }>()
const emit = defineEmits(['delete', 'select', 'select-all'])

// sorting
const sortKey = ref<'timestamp' | 'size' | 'download' | 'upload' | 'latency'>('timestamp')
const sortDir = ref<-1 | 1>(-1)
const setSort = (key: typeof sortKey.value) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = key
    sortDir.value = -1
  }
}

// pagination
const page = ref(1)
const pageSize = ref(10)

const sortedResults = computed(() => {
  const arr = [...props.results]
  arr.sort((a, b) => {
    const va = (a as unknown as Record<string, unknown>)[sortKey.value]
    const vb = (b as unknown as Record<string, unknown>)[sortKey.value]
    // sizes might be strings (like "100MB")
    if (sortKey.value === 'size') {
      const pa = parseFloat(String(va ?? '')) || 0
      const pb = parseFloat(String(vb ?? '')) || 0
      return (pa - pb) * sortDir.value
    }
    if (typeof va === 'string' || typeof vb === 'string') {
      return String(va ?? '').localeCompare(String(vb ?? '')) * sortDir.value
    }
    return ((Number(va) || 0) - (Number(vb) || 0)) * sortDir.value
  })
  return arr
})

const pageCount = computed(() =>
  Math.max(1, Math.ceil(sortedResults.value.length / pageSize.value)),
)
const currentPageResults = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedResults.value.slice(start, start + pageSize.value)
})

const isAllSelected = computed(
  () =>
    currentPageResults.value.length > 0 &&
    currentPageResults.value.every((r) => props.selectedIds.includes(r.id)),
)

const toggleAll = () => {
  const idsOnPage = currentPageResults.value.map((r) => r.id)
  if (isAllSelected.value) {
    // deselect page items
    emit(
      'select-all',
      props.selectedIds.filter((id) => !idsOnPage.includes(id)),
    )
  } else {
    // select page items (merge)
    emit('select-all', Array.from(new Set([...props.selectedIds, ...idsOnPage])))
  }
}

const goToPage = (p: number) => {
  page.value = Math.max(1, Math.min(pageCount.value, p))
}

// reset page if results change (optional) - clamp page when pageCount changes
// keep a simple watcher-less clamp on navigation actions; Vue template will re-compute pageCount
</script>

<template>
  <div
    v-if="results.length > 0"
    class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm"
  >
    <table class="w-full text-left min-w-225">
      <thead class="bg-slate-800/50 text-slate-400 text-[10px] capitalize tracking-wider">
        <tr>
          <th class="px-6 py-4 w-16">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleAll"
              class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-400"
            />
          </th>
          <th class="px-6 py-4 cursor-pointer" @click="setSort('timestamp')">
            Timestamp
            <span class="ml-2 text-xs">{{
              sortKey === 'timestamp' ? (sortDir === 1 ? '▲' : '▼') : ''
            }}</span>
          </th>
          <th class="px-6 py-4 cursor-pointer" @click="setSort('size')">
            Size
            <span class="ml-2 text-xs">{{
              sortKey === 'size' ? (sortDir === 1 ? '▲' : '▼') : ''
            }}</span>
          </th>
          <th class="px-6 py-4 cursor-pointer" @click="setSort('download')">
            Down (Mbps)
            <span class="ml-2 text-xs">{{
              sortKey === 'download' ? (sortDir === 1 ? '▲' : '▼') : ''
            }}</span>
          </th>
          <th class="px-6 py-4 cursor-pointer" @click="setSort('upload')">
            Up (Mbps)
            <span class="ml-2 text-xs">{{
              sortKey === 'upload' ? (sortDir === 1 ? '▲' : '▼') : ''
            }}</span>
          </th>
          <th class="px-6 py-4 cursor-pointer" @click="setSort('latency')">
            Latency (ms)
            <span class="ml-2 text-xs">{{
              sortKey === 'latency' ? (sortDir === 1 ? '▲' : '▼') : ''
            }}</span>
          </th>
          <th class="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/50">
        <tr
          v-for="res in currentPageResults"
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
          <td class="px-6 py-4 text-xs font-bold text-slate-200">{{ res.size }}</td>
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

    <!-- pagination controls -->
    <div class="flex items-center justify-between gap-4 p-3">
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1 bg-slate-800 rounded-xl"
          :disabled="page === 1"
          @click="goToPage(page - 1)"
        >
          Prev
        </button>
        <span class="text-sm text-slate-400">Page {{ page }} of {{ pageCount }}</span>
        <button
          class="px-3 py-1 bg-slate-800 rounded-xl"
          :disabled="page >= pageCount"
          @click="goToPage(page + 1)"
        >
          Next
        </button>
      </div>
      <div class="flex items-center gap-2 text-sm text-slate-400">
        <label class="text-xs">Per page</label>
        <select v-model.number="pageSize" class="bg-slate-800 text-slate-200 rounded-xl px-2 py-1">
          <option v-for="opt in [5, 10, 20]" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
    </div>
  </div>
  <div
    v-else
    class="text-center py-12 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl"
  >
    <p class="text-slate-500 font-medium">No diagnostic logs found.</p>
  </div>
</template>
