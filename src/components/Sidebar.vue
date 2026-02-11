<template>
  <nav class="sidebar w-60 shrink-0 border-r border-white/[0.06] flex flex-col py-3 overflow-y-auto">
    <!-- Search -->
    <div class="px-3 mb-4">
      <div class="relative">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          v-model="library.searchQuery"
          type="text"
          placeholder="Search"
          @keydown.escape="library.searchQuery = ''"
          class="w-full bg-white/[0.06] rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-white/30 outline-none focus:bg-white/[0.1] focus:ring-1 focus:ring-white/10 transition-all no-drag"
        />
        <button
          v-if="library.searchQuery"
          @click="library.searchQuery = ''"
          class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <div class="px-2 space-y-0.5">
      <p class="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        Library
      </p>

      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all no-drag"
        :class="
          $route.path === item.path
            ? 'bg-white/[0.1] text-white'
            : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
        "
      >
        <span class="w-5 h-5 flex items-center justify-center" v-html="item.icon" />
        <span>{{ item.label }}</span>
      </router-link>
    </div>

    <!-- Now Playing shortcut -->
    <div v-if="player.currentTrack" class="px-2 mt-4 space-y-0.5">
      <p class="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        Now Playing
      </p>

      <router-link
        to="/now-playing"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all no-drag"
        :class="
          $route.path === '/now-playing'
            ? 'bg-white/[0.1] text-white'
            : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
        "
      >
        <div class="w-8 h-8 rounded-md overflow-hidden bg-white/10 shrink-0">
          <img
            v-if="player.currentTrack.coverArt"
            :src="getCoverUrl(player.currentTrack.coverArt)"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-4 h-4 text-white/30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium truncate">{{ player.currentTrack.title }}</p>
          <p class="text-[10px] text-white/40 truncate">{{ player.currentTrack.artist }}</p>
        </div>
      </router-link>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Settings -->
    <div class="px-2 mt-2">
      <router-link
        to="/settings"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all no-drag"
        :class="
          $route.path === '/settings'
            ? 'bg-white/[0.1] text-white'
            : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
        "
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Settings</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'

const router = useRouter()
const route = useRoute()
const player = usePlayerStore()
const library = useLibraryStore()

function getCoverUrl(path: string) {
  return window.api.getMediaUrl(path)
}

// Debounced search navigation: when user types, auto-switch to the best tab
let searchNavTimer: ReturnType<typeof setTimeout> | null = null
watch(() => library.searchQuery, (q) => {
  if (searchNavTimer) clearTimeout(searchNavTimer)
  if (!q) return
  searchNavTimer = setTimeout(() => {
    const best = library.bestSearchTab
    if (!best) return
    const targetPath = best === 'albums' ? '/albums' : '/'
    // Navigate to the best tab from any page (except fullscreen)
    if (route.path !== '/fullscreen' && route.path !== targetPath) {
      router.push(targetPath)
    }
  }, 300)
})

const navItems = [
  {
    label: 'Songs',
    path: '/',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>',
  },
  {
    label: 'Albums',
    path: '/albums',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>',
  },
  {
    label: 'Playlists',
    path: '/playlists',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>',
  },
]
</script>
