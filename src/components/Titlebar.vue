<template>
  <div
    class="titlebar drag-region h-10 flex items-center justify-between px-4 shrink-0 border-b border-white/[0.06]"
  >
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-accent/80" />
      <span class="text-xs font-medium text-white/50 tracking-wide">Aurora</span>
    </div>

    <div class="flex items-center gap-1 no-drag">
      <button
        @click="minimize"
        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
        title="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor" class="text-white/60">
          <rect width="10" height="1" />
        </svg>
      </button>

      <button
        @click="maximize"
        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
        title="Maximize"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          class="text-white/60"
          stroke-width="1.2"
        >
          <rect x="0.5" y="0.5" width="9" height="9" rx="1.5" />
        </svg>
      </button>

      <button
        @click="close"
        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 transition-colors group"
        title="Close"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          class="text-white/60 group-hover:text-red-400"
          stroke-width="1.3"
        >
          <line x1="1" y1="1" x2="9" y2="9" />
          <line x1="9" y1="1" x2="1" y2="9" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
function minimize() { window.api.minimize() }
function maximize() { window.api.maximize() }
function close() { window.api.close() }
</script>
