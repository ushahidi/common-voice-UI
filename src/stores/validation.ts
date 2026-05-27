import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import api from '@/lib/api'
import { useUserStore } from '@/stores/user'
import type { ValidationVotePayload } from '@/types/api'

export type VoteValue = 'yes' | 'no'
export type SlotStatus = 'idle' | 'active' | 'voted' | 'skipped'

export interface ValidationSlot {
  index: number
  clipId: string | null
  sentenceText: string | null
  audioUrl: string | null
  status: SlotStatus
  vote: VoteValue | null
}

const SLOT_COUNT = 5


function makeEmptySlots(): ValidationSlot[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => ({
    index: i,
    clipId: null,
    sentenceText: null,
    audioUrl: null,
    status: (i === 0 ? 'active' : 'idle') as SlotStatus,
    vote: null,
  }))
}

export const useValidationStore = defineStore('validation', () => {
  const slots = ref<ValidationSlot[]>(makeEmptySlots())
  const activeIndex = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const submitting = ref(false)

  const activeSlot = computed(() => slots.value[activeIndex.value] ?? null)
  const allDone = computed(() => slots.value.every(s => s.status === 'voted' || s.status === 'skipped'))
  const votedCount = computed(() => slots.value.filter(s => s.vote !== null).length)

  async function fetchBatch(languageCode: string) {
    loading.value = true
    error.value = null

    const userStore = useUserStore()
    const userId = userStore.userId ?? ''

    try {
      const { data } = await api.get('/audio', {
        params: { datasetCode: languageCode, excludeUserId: userId },
      })

      const clips: { id: string; url?: string; metadata?: { sentence?: string } }[] =
        Array.isArray(data) ? data : (data.data ?? [])

      const loaded: ValidationSlot[] = []
      for (const clip of clips.slice(0, SLOT_COUNT)) {
        if (clip.url) {
          loaded.push({
            index: loaded.length,
            clipId: clip.id,
            sentenceText: clip.metadata?.sentence ?? null,
            audioUrl: clip.url,
            status: (loaded.length === 0 ? 'active' : 'idle') as SlotStatus,
            vote: null,
          })
        }
      }

      while (loaded.length < SLOT_COUNT) {
        const i = loaded.length
        loaded.push({ index: i, clipId: null, sentenceText: null, audioUrl: null, status: 'skipped', vote: null })
      }

      slots.value = loaded
      activeIndex.value = loaded.findIndex(s => s.status === 'active')
    } catch {
      error.value = 'Failed to load clips. Please try again.'
    } finally {
      loading.value = false
    }
  }

  function castVote(index: number, vote: VoteValue) {
    slots.value[index].vote = vote
    slots.value[index].status = 'voted'
    advanceActive()
  }

  function skipClip(index: number) {
    slots.value[index].status = 'skipped'
    advanceActive()
  }

  function advanceActive() {
    const nextIdle = slots.value.findIndex((s, i) => i > activeIndex.value && s.status === 'idle')
    if (nextIdle !== -1) {
      activeIndex.value = nextIdle
      slots.value[nextIdle].status = 'active'
    }
  }

  async function submitVotes(userId: string, languageCode: string) {
    const validationUrl = import.meta.env.VITE_VALIDATION_API_URL
    if (!validationUrl) {
      // Dev: no Lambda URL configured — log what would be sent to DynamoDB
      console.log('[dev] submitVotes (no-op — set VITE_VALIDATION_API_URL to enable):', {
        userId,
        languageCode,
        votes: slots.value.filter(s => s.vote !== null).map(s => ({ clipId: s.clipId, vote: s.vote })),
      })
      return
    }

    submitting.value = true
    error.value = null

    const votedSlots = slots.value.filter(s => s.vote !== null && s.clipId !== null)

    try {
      await Promise.all(
        votedSlots.map(slot => {
          const payload: ValidationVotePayload = {
            userId,
            clipId: slot.clipId!,
            vote: slot.vote!,
            language: languageCode,
            timestamp: new Date().toISOString(),
          }
          return axios.post(`${validationUrl}/votes`, payload)
        }),
      )
    } catch {
      error.value = 'Failed to submit votes. Your progress has been saved locally.'
    } finally {
      submitting.value = false
    }
  }

  function reset() {
    slots.value = makeEmptySlots()
    activeIndex.value = 0
    error.value = null
  }

  return {
    slots, activeIndex, loading, error, submitting,
    activeSlot, allDone, votedCount,
    fetchBatch, castVote, skipClip, submitVotes, reset,
  }
})
