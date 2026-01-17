<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { type NetworkResult } from '@/types'

const props = defineProps<{ data: NetworkResult[] }>()

// responsive dimensions for the svg coordinate system
const WIDTH = ref(1000)
const HEIGHT = ref(200)
const M_LEFT = 60
const M_RIGHT = 20
const M_TOP = 10
const M_BOTTOM = 40
const INNER_W = computed(() => WIDTH.value - M_LEFT - M_RIGHT)
const INNER_H = computed(() => HEIGHT.value - M_TOP - M_BOTTOM)

const sorted = computed(() => [...props.data].sort((a, b) => a.timestamp - b.timestamp))
const count = computed(() => Math.max(1, sorted.value.length))
const maxVal = computed(() =>
  Math.max(...sorted.value.map((d) => Math.max(d.download, d.upload)), 100),
)

const getXY = (i: number, key: 'download' | 'upload') => {
  const item = sorted.value[i]
  const x = M_LEFT + (i / (count.value - 1)) * INNER_W.value
  const val = item ? item[key] : 0
  const y = M_TOP + INNER_H.value * (1 - (maxVal.value > 0 ? val / maxVal.value : 0))
  return { x, y }
}

// Catmull-Rom to Bezier conversion for smooth curves
// source: adapted common implementation
const catmullRom2bezier = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return ''
  const d = [] as string[]
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    if (i === 0) {
      d.push(`M ${p.x} ${p.y}`)
    } else if (i === 1) {
      // simple line to second point; the cubic will start from point 0
      d.push(`L ${p.x} ${p.y}`)
    } else {
      const p0 = points[i - 2]!
      const p1 = points[i - 1]!
      const p2 = points[i]!
      const p3 = points[i + 1] || p2
      const x1 = p1.x + (p2.x - p0.x) / 6
      const y1 = p1.y + (p2.y - p0.y) / 6
      const x2 = p2.x - (p3.x - p1.x) / 6
      const y2 = p2.y - (p3.y - p1.y) / 6
      d.push(`C ${x1} ${y1} ${x2} ${y2} ${p2.x} ${p2.y}`)
    }
  }
  return d.join(' ')
}

const buildPath = (key: 'download' | 'upload') => {
  if (sorted.value.length === 0) return ''
  const pts = sorted.value.map((_, i) => getXY(i, key))
  return catmullRom2bezier(pts)
}

const downPath = computed(() => buildPath('download'))
const upPath = computed(() => buildPath('upload'))

// moving average smoothing (windowed)
const movingAverage = (key: 'download' | 'upload', window = 3) => {
  const vals = sorted.value.map((d) => d[key])
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < vals.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2))
    const end = Math.min(vals.length - 1, i + Math.floor(window / 2))
    const slice = vals.slice(start, end + 1)
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length
    // map into inner chart area using same transforms as getXY
    const { x: gx } = getXY(i, 'download')
    const x = gx
    const y = M_TOP + INNER_H.value * (1 - (maxVal.value > 0 ? avg / maxVal.value : 0))
    out.push({ x, y })
  }
  return out
}

const downAvgPath = computed(() => catmullRom2bezier(movingAverage('download')))
const upAvgPath = computed(() => catmullRom2bezier(movingAverage('upload')))

// interactivity
const hoverIndex = ref<number | null>(null)
const showDown = ref(true)
const showUp = ref(true)

const nearestIndexFromX = (clientX: number, svgRect: DOMRect) => {
  const x = ((clientX - svgRect.left) / svgRect.width) * WIDTH.value
  // convert client x -> chart index using M_LEFT/INNER_W
  const rel = (x - M_LEFT) / INNER_W.value
  const idx = Math.round(rel * (count.value - 1))
  return Math.max(0, Math.min(count.value - 1, idx))
}
const svgRef = ref<SVGSVGElement | null>(null)

// Resize observer keeps WIDTH/HEIGHT in sync with the rendered SVG size
let ro: ResizeObserver | null = null
const updateSize = () => {
  const svg = svgRef.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  // guard against zero sizes
  WIDTH.value = rect.width > 0 ? rect.width : WIDTH.value || 1000
  HEIGHT.value = rect.height > 0 ? rect.height : HEIGHT.value || 200
}

onMounted(() => {
  updateSize()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver((entries) => {
      for (const ent of entries) {
        const cr = ent.contentRect
        if (cr.width) WIDTH.value = cr.width
        if (cr.height) HEIGHT.value = cr.height || HEIGHT.value
      }
    })
    if (svgRef.value) ro.observe(svgRef.value)
  } else {
    // fallback: window resize
    window.addEventListener('resize', updateSize)
  }
})

onUnmounted(() => {
  if (ro && svgRef.value) ro.unobserve(svgRef.value)
  if (!ro) window.removeEventListener('resize', updateSize)
})

const onSvgMove = (e: MouseEvent) => {
  const svg = svgRef.value
  if (!svg || sorted.value.length === 0) return
  const rect = svg.getBoundingClientRect()
  hoverIndex.value = nearestIndexFromX(e.clientX, rect)
}

const onSvgLeave = () => {
  hoverIndex.value = null
}

const hoverData = computed(() =>
  hoverIndex.value !== null ? sorted.value[hoverIndex.value] : null,
)
const hoverDownPoint = computed(() =>
  hoverIndex.value !== null ? getXY(hoverIndex.value, 'download') : null,
)
const hoverUpPoint = computed(() =>
  hoverIndex.value !== null ? getXY(hoverIndex.value, 'upload') : null,
)
const tooltipX = computed(() => {
  if (hoverDownPoint.value) return hoverDownPoint.value.x
  if (hoverUpPoint.value) return hoverUpPoint.value.x
  return 0
})

// Axis ticks
const Y_TICK_COUNT = 5
const yTicks = computed(() => {
  const max = Math.max(1, maxVal.value)
  return Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const frac = i / (Y_TICK_COUNT - 1)
    const value = frac * max
    const y = M_TOP + INNER_H.value * (1 - frac)
    return { value, y }
  }).reverse()
})

const xTicks = computed(() => {
  const ticks = Math.min(6, count.value)
  if (count.value === 0) return [] as { label: string; x: number }[]
  return Array.from({ length: ticks }, (_, i) => {
    const idx = Math.round((i / (ticks - 1 || 1)) * (count.value - 1))
    const item = sorted.value[idx]
    const label = item ? new Date(item.timestamp).toLocaleTimeString() : ''
    const { x } = getXY(idx, 'download')
    return { label, x }
  })
})
</script>

<template>
  <div class="relative bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 mt-10">
    <div class="flex flex-wrap gap-4 justify-between mb-8">
      <h3 class="text-sm font-black text-slate-100 uppercase italic tracking-widest">
        Throughput Trajectory
      </h3>
      <div class="flex flex-wrap gap-4 items-center">
        <label class="inline-flex items-center gap-2 text-[12px] text-slate-300">
          <input type="checkbox" v-model="showDown" class="accent-emerald-400" />
          <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Down</span>
        </label>
        <label class="inline-flex items-center gap-2 text-[12px] text-slate-300">
          <input type="checkbox" v-model="showUp" class="accent-cyan-400" />
          <span class="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Up</span>
        </label>
      </div>
    </div>
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="w-full h-62.5 overflow-visible"
      @mousemove.prevent="onSvgMove"
      @mouseleave.prevent="onSvgLeave"
    >
      <!-- grid lines (Y) -->
      <g>
        <line
          v-for="(t, i) in yTicks"
          :key="i"
          :x1="M_LEFT"
          :x2="WIDTH - M_RIGHT"
          :y1="t.y"
          :y2="t.y"
          stroke="#0f172a"
          stroke-width="1"
          opacity="0.6"
        />
        <text
          v-for="(t, i) in yTicks"
          :key="'yl' + i"
          :x="12"
          :y="t.y + 4"
          fill="#94a3b8"
          font-size="11"
        >
          {{ t.value.toFixed(0) }}
        </text>
      </g>

      <!-- grid lines (X) -->
      <g>
        <line
          v-for="(t, i) in xTicks"
          :key="'xl' + i"
          :x1="t.x"
          :x2="t.x"
          :y1="M_TOP"
          :y2="M_TOP + INNER_H"
          stroke="#0f172a"
          stroke-width="1"
          opacity="0.6"
        />
        <text
          v-for="(t, i) in xTicks"
          :key="'xlbl' + i"
          :x="t.x - 28"
          :y="M_TOP + INNER_H + 18"
          fill="#94a3b8"
          font-size="11"
        >
          {{ t.label }}
        </text>
      </g>

      <!-- smoothed main lines -->
      <path
        v-if="showDown && downPath"
        :d="downPath"
        fill="none"
        stroke="#34d399"
        stroke-width="4"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <path
        v-if="showUp && upPath"
        :d="upPath"
        fill="none"
        stroke="#22d3ee"
        stroke-width="4"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- moving average (subtle) -->
      <path
        v-if="showDown && downAvgPath"
        :d="downAvgPath"
        fill="none"
        stroke="#059669"
        stroke-width="2"
        stroke-dasharray="6 4"
        opacity="0.8"
      />
      <path
        v-if="showUp && upAvgPath"
        :d="upAvgPath"
        fill="none"
        stroke="#0891b2"
        stroke-width="2"
        stroke-dasharray="6 4"
        opacity="0.8"
      />

      <!-- hover markers and vertical guide -->
      <g v-if="hoverIndex !== null">
        <line
          :x1="hoverDownPoint ? hoverDownPoint.x : 0"
          :x2="hoverDownPoint ? hoverDownPoint.x : 0"
          :y1="M_TOP"
          :y2="M_TOP + INNER_H"
          stroke="#94a3b8"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
        <circle
          v-if="showDown && hoverDownPoint"
          :cx="hoverDownPoint.x"
          :cy="hoverDownPoint.y"
          r="5"
          fill="#10b981"
          stroke="#072f14"
          stroke-width="1"
        />
        <circle
          v-if="showUp && hoverUpPoint"
          :cx="hoverUpPoint.x"
          :cy="hoverUpPoint.y"
          r="5"
          fill="#06b6d4"
          stroke="#022026"
          stroke-width="1"
        />

        <!-- tooltip box (SVG) -->
        <g v-if="hoverData">
          <rect
            :x="tooltipX + 8"
            :y="8"
            width="160"
            height="56"
            rx="8"
            fill="#0f172a"
            opacity="0.95"
            stroke="#334155"
          />
          <text :x="tooltipX + 16" :y="28" fill="#cbd5e1" font-size="11">
            {{ new Date(hoverData.timestamp).toLocaleString() }}
          </text>
          <text :x="tooltipX + 16" :y="44" fill="#a3e635" font-size="13">
            D: {{ (hoverData.download || 0).toFixed(2) }} Mbps
          </text>
          <text :x="tooltipX + 16" :y="58" fill="#7dd3fc" font-size="13">
            U: {{ (hoverData.upload || 0).toFixed(2) }} Mbps
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>
