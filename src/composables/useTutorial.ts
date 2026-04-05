import { ref, computed, onMounted } from 'vue'

// Shared state across all useTutorial instances in the same session
const seenKeys = ref<Set<string>>(new Set())
let loaded = false
let loadPromise: Promise<void> | null = null

async function ensureLoaded(): Promise<void> {
  if (loaded) return
  if (loadPromise) return loadPromise
  loadPromise = window.api.getSettings().then((settings: any) => {
    seenKeys.value = new Set(Array.isArray(settings.tutorialsSeen) ? settings.tutorialsSeen : [])
    loaded = true
  })
  return loadPromise
}

export function useTutorial(key: string) {
  const ready = ref(false)

  const isSeen = computed(() => seenKeys.value.has(key))

  onMounted(async () => {
    await ensureLoaded()
    ready.value = true
  })

  async function markSeen(): Promise<void> {
    seenKeys.value.add(key)
    await window.api.mergeSettings({ tutorialsSeen: [...seenKeys.value] })
  }

  async function resetSeen(): Promise<void> {
    seenKeys.value.delete(key)
    await window.api.mergeSettings({ tutorialsSeen: [...seenKeys.value] })
  }

  return { ready, isSeen, markSeen, resetSeen }
}
