<script setup lang="ts">
import { useValidationStore } from '@/stores/validation'

const validationStore = useValidationStore()
</script>

<template>
  <div class="slots-panel">
    <div
      v-for="slot in validationStore.slots"
      :key="slot.index"
      class="slot"
      :class="{
        active: slot.status === 'active',
        voted: slot.status === 'voted',
        skipped: slot.status === 'skipped',
      }"
    >
      <!-- Active: speaker icon + number -->
      <template v-if="slot.status === 'active'">
        <span class="speaker-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </span>
        <span class="slot-num active-num">{{ slot.index + 1 }}</span>
      </template>

      <!-- Voted yes: thumbs up + number -->
      <template v-else-if="slot.status === 'voted' && slot.vote === 'yes'">
        <span class="vote-icon yes-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
          </svg>
        </span>
        <span class="slot-num voted-num">{{ slot.index + 1 }}</span>
      </template>

      <!-- Voted no: thumbs down + number -->
      <template v-else-if="slot.status === 'voted' && slot.vote === 'no'">
        <span class="vote-icon no-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
          </svg>
        </span>
        <span class="slot-num voted-num">{{ slot.index + 1 }}</span>
      </template>

      <!-- Skipped -->
      <template v-else-if="slot.status === 'skipped'">
        <span class="slot-num skipped-num">{{ slot.index + 1 }}</span>
      </template>

      <!-- Idle -->
      <template v-else>
        <span class="slot-num idle-num">{{ slot.index + 1 }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.slots-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 80px;
  flex-shrink: 0;
  align-items: flex-end;
}

.slot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  height: 44px;
}

.slot-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
}

.idle-num {
  background: transparent;
  color: #aaa;
  border: 2px solid #ddd;
}

.active-num {
  background: #555;
  color: #fff;
  border: 2px solid #555;
}

.voted-num {
  background: #e8f5e9;
  color: #2e7d32;
  border: 2px solid #a5d6a7;
}

.skipped-num {
  background: transparent;
  color: #ccc;
  border: 2px dashed #ddd;
}

.speaker-icon {
  color: #555;
  display: flex;
  align-items: center;
}

.vote-icon {
  display: flex;
  align-items: center;
}

.yes-icon { color: #43a047; }
.no-icon  { color: #e53935; }

@media (max-width: 640px) {
  .slots-panel {
    flex-direction: row;
    width: 100%;
    justify-content: center;
    gap: 8px;
  }
  .slot {
    flex-direction: column;
    height: auto;
    min-height: 56px;
    align-items: center;
    gap: 4px;
  }
}
</style>
