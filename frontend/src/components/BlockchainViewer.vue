<script setup>
import { ref, onMounted } from 'vue'

const chain = ref([])
const isValid = ref(true)
const loading = ref(false)

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
        <div class="block-header">
          <span class="block-index">#{{ block.index }}</span>
          <span class="block-ts">{{ block.timestamp }}</span>
        </div>
        <div class="block-body">
          <div v-if="block.index === 0" class="genesis">Genesis Block</div>
          <template v-else>
            <div class="row"><label>Filename</label><span>{{ block.data.filename }}</span></div>
            <div class="row"><label>Duration</label><span>{{ block.data.duration }}s</span></div>
            <div class="row"><label>Audio Hash</label><span class="mono">{{ block.data.audioHash }}</span></div>
          </template>
          <div class="row"><label>Block Hash</label><span class="mono hi">{{ block.hash }}</span></div>
        </div>
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
  padding: 8px 14px;
  background: #1e3a4a;
}
.block-index { font-weight: 700; color: #38bdf8; font-size: 0.9rem; }
.block-ts    { font-size: 0.75rem; color: #64748b; }

.block-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }

.genesis { color: #94a3b8; font-size: 0.85rem; }

.row { display: flex; gap: 8px; align-items: flex-start; }
label { font-size: 0.72rem; color: #475569; min-width: 80px; padding-top: 2px; }
span  { font-size: 0.82rem; color: #e2e8f0; word-break: break-all; }
.mono { font-family: ui-monospace, monospace; font-size: 0.7rem; color: #818cf8; }
.hi   { color: #a5f3fc; }

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
