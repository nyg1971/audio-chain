<script setup>
defineProps({
  features: Object,
  hash: String,
  block: Object,
})

const labels = {
  zero_crossing_rate: { label: 'Zero Crossing Rate', desc: '音の粗さ・明瞭さ' },
  rms_energy:         { label: 'RMS Energy',         desc: '平均音量' },
  spectral_centroid:  { label: 'Spectral Centroid',  desc: '音の明るさ (Hz)' },
  tempo_bpm:          { label: 'Tempo',              desc: 'テンポ (BPM)' },
}
</script>

<template>
  <div class="card">
    <h2>解析結果 & ブロック情報</h2>

    <div class="grid">
      <!-- 特徴量 -->
      <div>
        <h3>特徴量</h3>
        <div class="feature-list">
          <div v-for="(meta, key) in labels" :key="key" class="feature-item">
            <span class="feat-label">{{ meta.label }}</span>
            <span class="feat-desc">{{ meta.desc }}</span>
            <span class="feat-val">{{ features?.[key] }}</span>
          </div>
        </div>
      </div>

      <!-- ブロック情報 -->
      <div>
        <h3>ブロック情報</h3>
        <div v-if="block" class="block-info">
          <div class="bi-row"><span>Index</span><code>#{{ block.index }}</code></div>
          <div class="bi-row"><span>Timestamp</span><code>{{ block.timestamp }}</code></div>
          <div class="bi-row"><span>Audio Hash</span><code class="hash">{{ hash }}</code></div>
          <div class="bi-row"><span>Block Hash</span><code class="hash">{{ block.hash }}</code></div>
          <div class="bi-row"><span>Prev Hash</span><code class="hash">{{ block.previousHash }}</code></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }

.feature-list { display: flex; flex-direction: column; gap: 8px; }
.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f172a;
  border-radius: 6px;
  padding: 8px 12px;
}
.feat-label { font-size: 0.82rem; color: #7dd3fc; min-width: 140px; }
.feat-desc  { font-size: 0.75rem; color: #475569; flex: 1; }
.feat-val   { font-size: 0.85rem; font-weight: 700; color: #e2e8f0; }

.block-info { display: flex; flex-direction: column; gap: 8px; }
.bi-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #0f172a;
  border-radius: 6px;
  padding: 8px 12px;
}
.bi-row > span { font-size: 0.72rem; color: #475569; }
code {
  font-size: 0.78rem;
  color: #a5f3fc;
  background: none;
  font-family: ui-monospace, monospace;
}
code.hash {
  word-break: break-all;
  font-size: 0.7rem;
  color: #818cf8;
}
</style>
