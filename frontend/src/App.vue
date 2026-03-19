<script setup>
import AudioUploader from './components/AudioUploader.vue'
import WaveformViewer from './components/WaveformViewer.vue'
import FeaturesViewer from './components/FeaturesViewer.vue'
import BlockchainViewer from './components/BlockchainViewer.vue'
import { ref } from 'vue'

const analysisResult = ref(null)
const currentBlock = ref(null)
const isAnalyzing = ref(false)

function onAnalyzed({ analysis, block }) {
  analysisResult.value = analysis
  currentBlock.value = block
}
</script>

<template>
  <div id="app">
    <header style="margin-bottom: 32px;">
      <h1>🎵 Audio Chain <span class="badge">Prototype</span></h1>
      <p style="color: #64748b; margin-top: 6px; font-size: 0.9rem;">
        音声解析 × ブロックチェーン記録 — Python + Node.js + Vue.js
      </p>
    </header>

    <AudioUploader @analyzed="onAnalyzed" @analyzing="isAnalyzing = $event" />

    <template v-if="analysisResult">
      <div :class="{ 'result-dimmed': isAnalyzing }">
        <WaveformViewer :waveform="analysisResult.waveform" :duration="analysisResult.duration" />
        <FeaturesViewer :features="analysisResult.features" :hash="analysisResult.hash" :block="currentBlock" />
      </div>
    </template>

    <BlockchainViewer />
  </div>
</template>

<style>
.result-dimmed {
  opacity: 0.35;
  pointer-events: none;
  transition: opacity 0.2s;
}
</style>
