<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  waveform: Array,
  duration: Number,
})

const canvas = ref(null)

function draw() {
  const el = canvas.value
  if (!el || !props.waveform?.length) return
  const ctx = el.getContext('2d')
  const W = el.width
  const H = el.height
  ctx.clearRect(0, 0, W, H)

  const data = props.waveform
  const step = W / data.length
  const mid = H / 2

  // グラデーション
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0, '#38bdf8')
  grad.addColorStop(1, '#818cf8')

  ctx.beginPath()
  ctx.strokeStyle = grad
  ctx.lineWidth = 1.2

  data.forEach((v, i) => {
    const x = i * step
    const y = mid - v * mid * 0.9
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()

  // センターライン
  ctx.beginPath()
  ctx.strokeStyle = '#1e3a4a'
  ctx.lineWidth = 0.5
  ctx.moveTo(0, mid)
  ctx.lineTo(W, mid)
  ctx.stroke()
}

onMounted(draw)
watch(() => props.waveform, draw)
</script>

<template>
  <div class="card">
    <h2>波形</h2>
    <p class="sub">Duration: {{ duration?.toFixed(2) }}s</p>
    <canvas ref="canvas" width="900" height="140" style="width:100%; height:140px; border-radius:6px; background:#0f172a;" />
  </div>
</template>

<style scoped>
.sub { font-size: 0.82rem; color: #64748b; margin-bottom: 12px; }
</style>
