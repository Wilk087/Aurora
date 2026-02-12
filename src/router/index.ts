import { createRouter, createWebHashHistory } from 'vue-router'

const PERSIST_ROUTES = ['/', '/albums', '/playlists', '/settings', '/folders', '/favorites']

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'songs',
      component: () => import('@/views/SongsView.vue'),
    },
    {
      path: '/albums',
      name: 'albums',
      component: () => import('@/views/AlbumsView.vue'),
    },
    {
      path: '/album/:id',
      name: 'album-detail',
      component: () => import('@/views/AlbumDetailView.vue'),
    },
    {
      path: '/artist/:name',
      name: 'artist-detail',
      component: () => import('@/views/ArtistView.vue'),
    },
    {
      path: '/folders',
      name: 'folders',
      component: () => import('@/views/FolderView.vue'),
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('@/views/FavoritesView.vue'),
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: () => import('@/views/PlaylistsView.vue'),
    },
    {
      path: '/playlist/:id',
      name: 'playlist-detail',
      component: () => import('@/views/PlaylistDetailView.vue'),
    },
    {
      path: '/now-playing',
      name: 'now-playing',
      component: () => import('@/views/NowPlayingView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/fullscreen',
      name: 'fullscreen',
      component: () => import('@/views/FullscreenView.vue'),
    },
  ],
})

// Persist tab on navigation & scroll to top for detail views
router.afterEach((to) => {
  if (PERSIST_ROUTES.includes(to.path)) {
    window.api.getSettings().then((s: any) => {
      s.lastTab = to.path
      window.api.saveSettings(s)
    })
  } else {
    // Detail views (album, artist, playlist, now-playing): scroll main to top
    const main = document.querySelector('main')
    if (main) main.scrollTop = 0
  }
})

export default router
