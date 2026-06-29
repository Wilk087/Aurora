<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-1">
      <div>
        <h2 class="text-lg font-semibold text-white">Aurora Hub</h2>
        <p class="text-xs text-white/30 mt-0.5">
          Community plugins &amp; themes ·
          <button class="underline underline-offset-2 hover:text-white/50 transition-colors" @click="openRegistry">Aurora-Hub</button>
        </p>
      </div>
      <button
        @click="refresh"
        :disabled="registry.loading"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        title="Refresh registry"
      >
        <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': registry.loading }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0 1 15-6.7M20 15a9 9 0 0 1-15 6.7" />
        </svg>
        Refresh
      </button>
    </div>

    <!-- Search + tabs row -->
    <div class="flex items-center gap-3 mb-5 mt-4">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search Hub…"
          class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.07] text-sm text-white placeholder:text-white/25 outline-none focus:border-accent/40 transition-colors"
        />
      </div>
      <div class="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0">
        <button
          v-for="t in ['Plugins', 'Themes']"
          :key="t"
          @click="activeTab = t as 'Plugins' | 'Themes'"
          class="px-3 py-1 rounded-md text-xs font-medium transition-all"
          :class="activeTab === t ? 'bg-accent/15 text-accent' : 'text-white/40 hover:text-white/70'"
        >
          {{ t }}
          <span v-if="t === 'Plugins' && updateCountPlugins > 0" class="ml-1 px-1 py-px rounded text-[10px] bg-accent/20 text-accent">{{ updateCountPlugins }}</span>
          <span v-if="t === 'Themes' && updateCountThemes > 0" class="ml-1 px-1 py-px rounded text-[10px] bg-accent/20 text-accent">{{ updateCountThemes }}</span>
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="registry.loading && items.length === 0" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-20 rounded-xl bg-white/[0.04] animate-pulse" />
    </div>

    <!-- Error state -->
    <div v-else-if="registry.error && items.length === 0" class="py-12 text-center">
      <p class="text-white/40 text-sm mb-3">{{ registry.error }}</p>
      <button @click="refresh" class="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-sm text-white/60 transition-colors">Try again</button>
    </div>

    <!-- Empty initial state -->
    <div v-else-if="!hasFetched" class="py-12 text-center">
      <p class="text-white/30 text-sm mb-3">Fetch the registry to browse community {{ activeTab.toLowerCase() }}</p>
      <button @click="doFetch" class="px-4 py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 text-sm text-accent transition-colors">Browse Hub</button>
    </div>

    <!-- No search results -->
    <div v-else-if="filtered.length === 0" class="py-12 text-center">
      <p class="text-white/30 text-sm">No {{ activeTab.toLowerCase() }} match "<span class="text-white/50">{{ search }}</span>"</p>
    </div>

    <!-- Items list -->
    <div v-else class="space-y-2">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="flex items-start gap-4 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.06] transition-colors group"
      >
        <!-- Swatch / icon -->
        <div
          v-if="activeTab === 'Themes' && (item as any).preview"
          class="w-9 h-9 rounded-lg shrink-0 mt-0.5 border border-white/10"
          :style="{ background: `linear-gradient(135deg, rgb(${(item as any).preview.bg}) 0%, rgb(${(item as any).preview.accent}) 100%)` }"
        />
        <div v-else class="w-9 h-9 rounded-lg shrink-0 mt-0.5 bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
          <svg v-if="activeTab === 'Plugins'" class="w-4 h-4 text-white/30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
          </svg>
          <svg v-else class="w-4 h-4 text-white/30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
          </svg>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-white">{{ item.name }}</span>
            <span class="text-xs text-white/30">by {{ item.author }}</span>
            <span v-if="(item as any).updateAvailable" class="px-1.5 py-px rounded text-[10px] font-medium bg-accent/15 text-accent">Update available</span>
            <span v-else-if="(item as any).installed" class="flex items-center gap-1 text-[10px] text-white/30">
              <svg class="w-3 h-3 text-green-400/70" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>
              Installed
            </span>
          </div>
          <p class="text-xs text-white/45 mt-0.5 line-clamp-2">{{ item.description }}</p>
          <!-- Post-install hint -->
          <p v-if="justInstalled.has(item.id) && activeTab === 'Plugins'" class="text-[11px] text-accent/80 mt-1">
            Installed — enable it in the <strong>Plugins</strong> tab
          </p>
          <p v-else-if="justInstalled.has(item.id) && activeTab === 'Themes'" class="text-[11px] text-accent/80 mt-1">
            Installed — select it in <strong>Appearance → Themes</strong>
          </p>
          <div v-if="item.tags && item.tags.length" class="flex flex-wrap gap-1 mt-1.5">
            <span v-for="tag in item.tags.slice(0, 5)" :key="tag" class="px-1.5 py-px rounded text-[10px] bg-white/[0.05] text-white/35">{{ tag }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0 self-center">
          <button
            v-if="item.homepageUrl"
            @click="openUrl(item.homepageUrl!)"
            class="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
            title="View homepage"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>

          <button
            v-if="(item as any).updateAvailable"
            @click="handleUpdate(item)"
            :disabled="registry.isInstalling(item.id)"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 hover:bg-accent/25 text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[72px] text-center"
          >
            <span v-if="registry.isInstalling(item.id)">Updating…</span>
            <span v-else>Update</span>
          </button>

          <button
            v-else-if="!(item as any).installed"
            @click="handleInstall(item)"
            :disabled="registry.isInstalling(item.id)"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.07] hover:bg-white/[0.12] text-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[72px] text-center"
          >
            <span v-if="registry.isInstalling(item.id)">Installing…</span>
            <span v-else>Install</span>
          </button>

          <span v-else-if="!justInstalled.has(item.id)" class="px-3 py-1.5 text-xs text-white/20 min-w-[72px] text-center">
            Installed
          </span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <p v-if="hasFetched && !registry.error" class="text-xs text-white/20 mt-4 text-center">
      <span v-if="registry.updatedAt">Registry updated {{ formatDate(registry.updatedAt) }} · </span>
      Submit yours at
      <button class="underline underline-offset-2 hover:text-white/40 transition-colors" @click="openRegistry">github.com/Wilk087/Aurora-Hub</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRegistryStore } from '@/stores/registry'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  defaultTab?: 'Plugins' | 'Themes'
}>()

const registry = useRegistryStore()
const toast = useToast()

const activeTab = ref<'Plugins' | 'Themes'>(props.defaultTab ?? 'Plugins')
const search = ref('')
const hasFetched = ref(false)
const justInstalled = ref(new Set<string>())

watch(() => props.defaultTab, (val) => {
  if (val) activeTab.value = val
})

const items = computed(() =>
  activeTab.value === 'Plugins' ? registry.pluginsWithStatus : registry.themesWithStatus
)

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return items.value
  return items.value.filter(item =>
    item.name.toLowerCase().includes(q) ||
    item.author.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.tags?.some(t => t.toLowerCase().includes(q))
  )
})

const updateCountPlugins = computed(() => registry.pluginsWithStatus.filter(p => p.updateAvailable).length)
const updateCountThemes = computed(() => registry.themesWithStatus.filter(t => t.updateAvailable).length)

async function doFetch() {
  await registry.fetch()
  hasFetched.value = true
}

async function refresh() {
  await registry.fetch(true)
  hasFetched.value = true
  if (!registry.error) toast.success('Registry refreshed')
}

async function handleInstall(item: any) {
  try {
    if (activeTab.value === 'Plugins') {
      await registry.installPlugin(item)
      markJustInstalled(item.id)
    } else {
      await registry.installTheme(item)
      markJustInstalled(item.id)
    }
  } catch (err: any) {
    toast.error(`Install failed: ${err?.message ?? 'Unknown error'}`)
  }
}

async function handleUpdate(item: any) {
  try {
    if (activeTab.value === 'Plugins') {
      await registry.updatePlugin(item)
      toast.success(`${item.name} updated`)
    } else {
      await registry.updateTheme(item)
      toast.success(`${item.name} updated — select it in Appearance → Themes`)
    }
  } catch (err: any) {
    toast.error(`Update failed: ${err?.message ?? 'Unknown error'}`)
  }
}

function markJustInstalled(id: string) {
  const next = new Set(justInstalled.value)
  next.add(id)
  justInstalled.value = next
  setTimeout(() => {
    const s = new Set(justInstalled.value)
    s.delete(id)
    justInstalled.value = s
  }, 15_000)
}

function openUrl(url: string) {
  window.api.openExternal(url)
}

function openRegistry() {
  window.api.openExternal('https://github.com/Wilk087/Aurora-Hub')
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

onMounted(async () => {
  if (registry.plugins.length === 0 && registry.themes.length === 0) {
    await registry.fetch()
    hasFetched.value = true
  } else {
    hasFetched.value = true
  }
})
</script>
