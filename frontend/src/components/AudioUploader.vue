<script setup>
import { ref } from 'vue'

const emit = defineEmits(['analyzed', 'analyzing'])

const isDragging = ref(false)
const isLoading = ref(false)
const error = ref(null)
const selectedFile = ref(null)
const analyzingStep = ref('')

const ANALYZING_STEPS = [
  '音声ファイルを読み込んでいます...',
  'librosa で波形・特徴量を解析中...',
  'SHA-256 ハッシュを生成中...',
  'ブロックチェーンに記録しています...',
]

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
}

function onChange(e) {
  const file = e.target.files[0]
  if (file) handleFile(file)
}

function handleFile(file) {
  selectedFile.value = file
  error.value = null
}

async function analyze() {
  if (!selectedFile.value) return
  isLoading.value = true
  error.value = null
  emit('analyzing', true)

  // ステップメッセージを順に切り替え
  let stepIndex = 0
  analyzingStep.value = ANALYZING_STEPS[0]
  const stepTimer = setInterval(() => {
    stepIndex = Math.min(stepIndex + 1, ANALYZING_STEPS.length - 1)
    analyzingStep.value = ANALYZING_STEPS[stepIndex]
  }, 600)

  const formData = new FormData()
  formData.append('audio', selectedFile.value)

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'サーバーエラー')
    emit('analyzed', { analysis: data.analysis, block: data.block })
  } catch (e) {
    error.value = e.message
  } finally {
    clearInterval(stepTimer)
    isLoading.value = false
    analyzingStep.value = ''
    emit('analyzing', false)
  }
}
</script>

<template>
  <div class="card">
    <h2>音声ファイルをアップロード</h2>

    <div
      class="drop-zone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
    >
      <p v-if="!selectedFile">ここにファイルをドロップ、または</p>
      <p v-else class="selected-name">{{ selectedFile.name }}</p>
      <label class="btn-outline">
        ファイルを選択
        <input type="file" accept=".mp3,.wav,.ogg,.flac" @change="onChange" hidden />
      </label>
    </div>

    <!-- 解析中インジケーター -->
    <div v-if="isLoading" class="analyzing-banner">
      <div class="pulse-dots">
        <span></span><span></span><span></span>
      </div>
      <div class="analyzing-step">
        <div class="step-label">解析中</div>
        <div class="step-text">{{ analyzingStep }}</div>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <button class="btn-primary" :disabled="!selectedFile || isLoading" @click="analyze">
      {{ isLoading ? '解析中…' : '解析 & ブロックチェーンに記録' }}
    </button>
  </div>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed #334155;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  margin-bottom: 16px;
  transition: border-color 0.2s;
  color: #64748b;
}
.drop-zone.active { border-color: #38bdf8; background: #0c2034; }
.selected-name { color: #7dd3fc; font-weight: 600; margin-bottom: 8px; }

.btn-outline {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 16px;
  border: 1px solid #475569;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #94a3b8;
  transition: border-color 0.2s, color 0.2s;
}
.btn-outline:hover { border-color: #38bdf8; color: #38bdf8; }

.btn-primary {
  display: block;
  width: 100%;
  padding: 12px;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover:not(:disabled) { background: #0284c7; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── 解析中インジケーター ────────────────── */
.analyzing-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #091e35;
  border: 1px solid #1e4a6a;
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 12px;
}

.pulse-dots {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}
.pulse-dots span {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  animation: pulse-dot 1.4s ease-in-out infinite;
}
.pulse-dots span:nth-child(2) { animation-delay: 0.22s; }
.pulse-dots span:nth-child(3) { animation-delay: 0.44s; }

@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.15; transform: scale(0.75); }
  40%            { opacity: 1;    transform: scale(1);    }
}

.analyzing-step .step-label {
  font-size: 0.72rem;
  color: #64748b;
  margin-bottom: 2px;
}
.analyzing-step .step-text {
  font-size: 0.88rem;
  font-weight: 500;
  color: #38bdf8;
}

.error-msg {
  color: #f87171;
  background: #1f0d0d;
  border: 1px solid #7f1d1d;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 0.88rem;
}
</style>
