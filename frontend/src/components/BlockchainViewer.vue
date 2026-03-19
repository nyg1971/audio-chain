<script setup>
import { ref, onMounted } from 'vue'

const chain = ref([])
const isValid = ref(true)
const loading = ref(false)
const expanded = ref(new Set())

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function toggle(index) {
  if (expanded.value.has(index)) {
    expanded.value.delete(index)
  } else {
    expanded.value.add(index)
  }
  // Vue のリアクティビティを反映させるため参照を更新
  expanded.value = new Set(expanded.value)
}

async function fetchChain() {
  loading.value = true
  try {
    const res = await fetch('/api/blockchain')
    const data = await res.json()
    chain.value = data.chain
    isValid.value = data.isValid
  } catch {
    // サーバー未起動の場合は無視
  } finally {
    loading.value = false
  }
}

onMounted(fetchChain)
</script>

<template>
  <div class="card">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <h2 style="margin-bottom:0;">
        ブロックチェーン
        <span class="badge" :class="isValid ? 'green' : 'red'">
          {{ isValid ? 'VALID' : 'INVALID' }}
        </span>
      </h2>
      <button class="btn-refresh" @click="fetchChain" :disabled="loading">
        {{ loading ? '…' : '↻ 更新' }}
      </button>
    </div>

    <div class="chain-scroll">
      <div v-for="block in chain" :key="block.index" class="block-card">
        <div class="block-header" @click="toggle(block.index)" role="button">
          <span class="block-index">#{{ block.index }}</span>
          <div class="header-right">
            <span class="block-ts">{{ formatTimestamp(block.timestamp) }}</span>
            <span class="chevron" :class="{ open: expanded.has(block.index) }">›</span>
          </div>
        </div>
        <Transition name="slide">
          <div v-if="expanded.has(block.index)" class="block-body">
            <div v-if="block.index === 0" class="genesis">Genesis Block</div>
            <template v-else>
              <div class="row"><label>Filename</label><span>{{ block.data.filename }}</span></div>
              <div class="row"><label>Duration</label><span>{{ block.data.duration }}s</span></div>
              <div class="row"><label>Audio Hash</label><span class="mono">{{ block.data.audioHash }}</span></div>
            </template>
            <div class="row"><label>Block Hash</label><span class="mono hi">{{ block.hash }}</span></div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chain-scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}

.block-card {
  background: #0f172a;
  border: 1px solid #1e3a4a;
  border-radius: 8px;
  overflow: hidden;
}
.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #1e3a4a;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.block-header:hover { background: #254d63; }
.block-index { font-weight: 700; color: #38bdf8; font-size: 0.9rem; }
.header-right { display: flex; align-items: center; gap: 10px; }
.block-ts    { font-size: 0.75rem; color: #64748b; }
.chevron {
  color: #64748b;
  font-size: 1.1rem;
  transform: rotate(90deg);
  transition: transform 0.2s;
  line-height: 1;
}
.chevron.open { transform: rotate(270deg); }

.block-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }

.genesis { color: #94a3b8; font-size: 0.85rem; }

.row { display: flex; gap: 8px; align-items: flex-start; }
label { font-size: 0.72rem; color: #475569; min-width: 80px; padding-top: 2px; }
span  { font-size: 0.82rem; color: #e2e8f0; word-break: break-all; }
.mono { font-family: ui-monospace, monospace; font-size: 0.7rem; color: #818cf8; }
.hi   { color: #a5f3fc; }

.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.22s ease, opacity 0.22s ease;
  overflow: hidden;
  max-height: 200px;
}
.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.btn-refresh {
  padding: 5px 14px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.85rem;
  transition: border-color 0.2s, color 0.2s;
}
.btn-refresh:hover:not(:disabled) { border-color: #38bdf8; color: #38bdf8; }
.btn-refresh:disabled { opacity: 0.4; }
</style>
