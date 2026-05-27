<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useValidationStore } from '@/stores/validation'
import { useUserStore } from '@/stores/user'
import { useDatasetStore } from '@/stores/dataset'
import ValidationSlots from '@/components/ValidationSlots.vue'
import SuccessToast from '@/components/SuccessToast.vue'

const validationStore = useValidationStore()
const userStore = useUserStore()
const datasetStore = useDatasetStore()

const isPlaying = ref(false)
const hasPlayed = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const audioRef = ref<HTMLAudioElement | null>(null)

const activeSlot = computed(() => validationStore.activeSlot)
const canVote = computed(() => hasPlayed.value && !validationStore.loading)

// Instruction text above the card
const statusText = computed(() => {
  if (validationStore.loading) return 'Loading clips…'
  if (validationStore.allDone) return 'All done! Submit your validations below.'
  if (isPlaying.value) return 'Listening…'
  if (hasPlayed.value) return 'Did they accurately speak the sentence?'
  return 'Click ▶ to listen, then vote yes or no'
})

// Reset played state whenever the active clip changes
watch(
  () => validationStore.activeIndex,
  () => {
    hasPlayed.value = false
    isPlaying.value = false
    stopAudio()
  },
)

watch(
  () => datasetStore.selectedCode,
  (code) => {
    validationStore.reset()
    validationStore.fetchBatch(code)
  },
  { immediate: true },
)

function stopAudio() {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
    audioRef.value = null
  }
}

function onPlayClick() {
  if (validationStore.loading || !activeSlot.value?.audioUrl) return

  if (isPlaying.value) {
    stopAudio()
    isPlaying.value = false
    return
  }

  const audio = new Audio(activeSlot.value.audioUrl)
  audioRef.value = audio

  audio.addEventListener('ended', () => {
    isPlaying.value = false
    hasPlayed.value = true
    audioRef.value = null
  })

  audio.addEventListener('error', () => {
    isPlaying.value = false
    audioRef.value = null
  })

  audio.play()
  isPlaying.value = true
}

function onVote(vote: 'yes' | 'no') {
  if (!canVote.value) return
  const idx = validationStore.activeIndex
  validationStore.castVote(idx, vote)
  hasPlayed.value = false
}

function onSkip() {
  stopAudio()
  isPlaying.value = false
  hasPlayed.value = false
  validationStore.skipClip(validationStore.activeIndex)
}

async function onSubmit() {
  if (!validationStore.allDone && validationStore.votedCount === 0) return
  await validationStore.submitVotes(userStore.userId ?? '', datasetStore.selectedCode)
  if (!validationStore.error) {
    toastMessage.value = '🎉 Validations submitted!'
    showToast.value = true
    setTimeout(() => {
      validationStore.reset()
      validationStore.fetchBatch(datasetStore.selectedCode)
    }, 1500)
  }
}

const canSubmit = computed(
  () => validationStore.allDone && !validationStore.submitting,
)

onUnmounted(() => {
  stopAudio()
})
</script>

<template>
  <div class="listen-view">
    <!-- Status text -->
    <div class="status-bar">
      <p class="status-text">{{ statusText }}</p>
    </div>

    <div v-if="validationStore.error" class="error-banner">{{ validationStore.error }}</div>

    <!-- Main content row -->
    <div class="content-row">
      <!-- Sentence card -->
      <div class="card-area">
        <div v-if="validationStore.loading" class="sentence-card skeleton">
          <div class="skeleton-line" />
          <div class="skeleton-line short" />
        </div>
        <div v-else-if="activeSlot?.sentenceText" class="sentence-card">
          <p class="sentence-text">{{ activeSlot.sentenceText }}</p>
        </div>
        <div v-else-if="validationStore.allDone && validationStore.votedCount === 0" class="sentence-card empty-card">
          <p>No clips to validate yet.</p>
        </div>
        <div v-else-if="validationStore.allDone" class="sentence-card done-card">
          <p>All clips reviewed for this batch.</p>
        </div>
        <div v-else class="sentence-card empty-card">
          <p>No clip loaded</p>
        </div>
      </div>

      <!-- Validation slots (right) -->
      <ValidationSlots />
    </div>

    <!-- Action buttons: YES · PLAY · NO -->
    <div class="vote-row">
      <button
        class="vote-btn yes-btn"
        :class="{ active: canVote }"
        :disabled="!canVote || validationStore.allDone"
        @click="onVote('yes')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
        </svg>
        YES
      </button>

      <!-- Play button -->
      <button
        class="play-btn"
        :class="{ playing: isPlaying, disabled: validationStore.loading || validationStore.allDone || !activeSlot?.audioUrl }"
        :disabled="validationStore.loading || validationStore.allDone || !activeSlot?.audioUrl"
        :aria-label="isPlaying ? 'Stop' : 'Play clip'"
        @click="onPlayClick"
      >
        <div v-if="isPlaying" class="pulse-ring" />
        <div v-if="isPlaying" class="pulse-ring delay" />
        <div class="play-circle">
          <!-- Stop icon when playing, play icon otherwise -->
          <svg v-if="isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </button>

      <button
        class="vote-btn no-btn"
        :class="{ active: canVote }"
        :disabled="!canVote || validationStore.allDone"
        @click="onVote('no')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
        </svg>
        NO
      </button>
    </div>

    <!-- Bottom action bar -->
    <div class="action-bar">
      <div class="action-bar-left">
        <button class="bar-btn" disabled>Guidelines</button>
        <button class="bar-btn" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83zM3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z"/>
          </svg>
          Report
        </button>
      </div>

      <div class="action-bar-right">
        <button
          class="skip-btn"
          :disabled="validationStore.loading || validationStore.allDone"
          @click="onSkip"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6l12 6-12 6V6z"/>
          </svg>
          Skip
        </button>

        <button
          class="submit-btn"
          :disabled="!canSubmit"
          @click="onSubmit"
        >
          <span v-if="validationStore.submitting" class="spinner" />
          <span v-else>Submit</span>
        </button>
      </div>
    </div>

    <SuccessToast
      v-if="showToast"
      :message="toastMessage"
      @close="showToast = false"
    />
  </div>
</template>

<style scoped>
.listen-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 56px);
  background: #f5f5f5;
  padding: 32px 24px 140px;
  gap: 24px;
}

.status-bar {
  text-align: center;
}

.status-text {
  font-size: 0.95rem;
  color: #555;
  margin: 0;
}

.error-banner {
  background: #fff3f3;
  border: 1px solid #ffcdd2;
  color: #c62828;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  max-width: 760px;
  width: 100%;
  text-align: center;
}

/* Content row */
.content-row {
  display: flex;
  align-items: flex-start;
  gap: 32px;
  width: 100%;
  max-width: 920px;
  justify-content: center;
}

.card-area {
  flex: 1;
  max-width: 640px;
}

/* Sentence card */
.sentence-card {
  background: #fff;
  border-radius: 12px;
  padding: 48px 40px;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.sentence-text {
  font-size: 1.5rem;
  font-weight: 500;
  color: #0f0f0f;
  line-height: 1.5;
  text-align: center;
  margin: 0;
}

.done-card p,
.empty-card p {
  color: #aaa;
  font-size: 1rem;
  margin: 0;
}

.empty-hint {
  font-size: 0.85rem !important;
  margin-top: 8px !important;
}

/* Skeleton loader */
.skeleton {
  flex-direction: column;
  gap: 16px;
}

.skeleton-line {
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: shimmer 1.5s infinite;
  width: 100%;
}

.skeleton-line.short { width: 60%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Vote row (YES / PLAY / NO) ─────────────────────────────────────────────── */
.vote-row {
  display: flex;
  align-items: center;
  gap: 32px;
  justify-content: center;
}

/* YES / NO pill buttons */
.vote-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 32px;
  border: 2px solid #ddd;
  background: #fff;
  color: #888;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: not-allowed;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.vote-btn.active {
  cursor: pointer;
}

.yes-btn.active:hover,
.yes-btn.active:focus-visible {
  border-color: #43a047;
  color: #43a047;
  background: #f1f8f1;
  box-shadow: 0 2px 8px rgba(67,160,71,0.18);
}

.no-btn.active:hover,
.no-btn.active:focus-visible {
  border-color: #e53935;
  color: #e53935;
  background: #fff5f5;
  box-shadow: 0 2px 8px rgba(229,57,53,0.18);
}

.vote-btn:disabled {
  opacity: 0.45;
}

/* Play button */
.play-btn {
  position: relative;
  width: 80px;
  height: 80px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.play-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4caf50;
  position: relative;
  z-index: 1;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.play-btn:not(.disabled):hover .play-circle {
  border-color: #4caf50;
  box-shadow: 0 4px 16px rgba(76,175,80,0.25);
}

.play-btn.playing .play-circle {
  border-color: #0095ff;
  color: #0095ff;
  box-shadow: 0 0 0 4px rgba(0,149,255,0.15);
}

.pulse-ring {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid rgba(0, 149, 255, 0.4);
  animation: pulse-out 1.8s ease-out infinite;
}

.pulse-ring.delay { animation-delay: 0.6s; }

@keyframes pulse-out {
  0%   { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2); opacity: 0; }
}

/* ── Bottom action bar ────────────────────────────────────────────────────────── */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 40px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
}

.action-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-bar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.bar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 24px;
  padding: 8px 14px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #555;
  cursor: default;
  opacity: 0.6;
}

.skip-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #444;
  padding: 10px 16px;
  border-radius: 24px;
  transition: background 0.15s;
}

.skip-btn:hover:not(:disabled) { background: #e8e8e8; }

.skip-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.submit-btn {
  padding: 12px 28px;
  background: #ccc;
  color: #888;
  border: none;
  border-radius: 24px;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: not-allowed;
  transition: background 0.2s, color 0.2s;
  min-width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:not(:disabled) {
  background: #0f0f0f;
  color: #fff;
  cursor: pointer;
}

.submit-btn:not(:disabled):hover { background: #333; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ───────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .listen-view {
    padding: 16px 16px 120px;
    gap: 16px;
  }

  .content-row {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .card-area { max-width: 100%; }

  .sentence-card {
    padding: 24px 20px;
    min-height: 120px;
  }

  .sentence-text { font-size: 1.2rem; }

  .vote-row { gap: 16px; }

  .vote-btn {
    padding: 10px 16px;
    font-size: 0.8rem;
  }

  .play-btn,
  .play-circle {
    width: 68px;
    height: 68px;
  }

  .pulse-ring { width: 68px; height: 68px; }

  .action-bar {
    padding: 12px 16px;
  }

  .submit-btn {
    padding: 10px 20px;
    min-width: 100px;
    font-size: 0.85rem;
  }
}
</style>
