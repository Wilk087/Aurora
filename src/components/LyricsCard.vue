<template>
  <Teleport to="body">
    <Transition name="lc-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div class="relative flex flex-col items-center gap-5 p-6 rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl max-w-[680px] w-full mx-4">
          <!-- Header -->
          <div class="flex items-center justify-between w-full">
            <h3 class="text-sm font-semibold text-white/70 uppercase tracking-wider">Lyrics Card</h3>
            <button @click="$emit('close')" class="text-white/30 hover:text-white/60 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Canvas preview -->
          <div class="w-full flex justify-center overflow-hidden">
            <canvas
              ref="cardCanvas"
              class="rounded-xl shadow-lg"
              style="max-width: 100%; max-height: 500px; object-fit: contain"
            />
          </div>

          <!-- Action buttons -->
          <div class="flex gap-3 w-full">
            <button
              @click="downloadCard"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Save Image
            </button>
            <button
              @click="copyCard"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const props = defineProps<{
  visible: boolean
  lyrics: string[]
  title: string
  artist: string
  album: string
  coverUrl: string | null
}>()

defineEmits<{ close: [] }>()

const cardCanvas = ref<HTMLCanvasElement | null>(null)

// The logo SVG rendered as a data URI for the canvas
const LOGO_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1025"/><stop offset="100%" stop-color="#0d0b12"/></linearGradient><linearGradient id="aurora" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#c4b5fd"/></linearGradient><linearGradient id="glow" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.6"/><stop offset="100%" stop-color="#6d28d9" stop-opacity="0"/></linearGradient></defs><rect width="512" height="512" rx="108" ry="108" fill="url(#bg)"/><ellipse cx="256" cy="180" rx="200" ry="120" fill="url(#glow)" opacity="0.4"/><g transform="translate(256,256)"><circle cx="0" cy="0" r="140" fill="none" stroke="url(#aurora)" stroke-width="8" opacity="0.3"/><circle cx="0" cy="0" r="90" fill="none" stroke="url(#aurora)" stroke-width="4" opacity="0.15"/><polygon points="-40,-65 -40,65 60,0" fill="url(#aurora)"/></g></svg>`)}`

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
const PAD = 60 // outer padding

watch(
  () => props.visible,
  async (show) => {
    if (show) {
      await nextTick()
      renderCard()
    }
  },
)

function measureLyricsHeight(ctx: CanvasRenderingContext2D, maxW: number, fontSize: number, lineH: number): number {
  ctx.font = `500 ${fontSize}px ${FONT}`
  let h = 0
  for (const lyric of props.lyrics) {
    const wrapped = wrapText(ctx, lyric, maxW)
    h += wrapped.length * lineH + 10
  }
  return h
}

async function renderCard() {
  const canvas = cardCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Load assets in parallel
  const [coverImg, logoImg] = await Promise.all([
    props.coverUrl ? loadImage(props.coverUrl).catch(() => null) : Promise.resolve(null),
    loadImage(LOGO_SVG).catch(() => null),
  ])

  // ── Decide layout ──────────────────────────────────────────────
  const coverSize = 280
  const lyricsFontSize = 28
  const lyricsLineH = 40

  // Measure lyrics needed height for horizontal layout
  // In horizontal: lyrics area width = total - pad - coverSize - gap - pad
  const horizLyricsW = 680
  const testCanvas = document.createElement('canvas')
  const testCtx = testCanvas.getContext('2d')!
  const lyricsH = measureLyricsHeight(testCtx, horizLyricsW, lyricsFontSize, lyricsLineH)

  // Track info height under cover: title + artist + album ≈ 100px
  const infoH = 110
  const leftColH = coverSize + 16 + infoH // cover + gap + info
  const contentH = Math.max(leftColH, lyricsH + 20)

  // Use horizontal if lyrics fit, else switch to vertical
  const useVertical = lyricsH > 500

  let CARD_W: number
  let CARD_H: number

  if (useVertical) {
    CARD_W = 800
    // cover row + info + lyrics + watermark
    CARD_H = PAD + coverSize + 16 + infoH + 40 + lyricsH + 60 + PAD
    CARD_H = Math.min(CARD_H, 1400)
  } else {
    CARD_W = PAD + coverSize + 50 + horizLyricsW + PAD
    CARD_H = PAD + contentH + 50 + PAD
    CARD_H = Math.max(CARD_H, 380)
  }

  canvas.width = CARD_W
  canvas.height = CARD_H
  // Scale for display
  const scale = Math.min(640 / CARD_W, 500 / CARD_H, 1)
  canvas.style.width = `${Math.round(CARD_W * scale)}px`
  canvas.style.height = `${Math.round(CARD_H * scale)}px`

  // ── Background ─────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bgGrad.addColorStop(0, '#0f0f14')
  bgGrad.addColorStop(0.5, '#12101c')
  bgGrad.addColorStop(1, '#0d0b12')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Blurred cover tint
  if (coverImg) {
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.filter = 'blur(100px) saturate(1.6)'
    ctx.drawImage(coverImg, -100, -100, CARD_W + 200, CARD_H + 200)
    ctx.restore()
  }

  // Subtle vignette
  const vig = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2, CARD_W * 0.25, CARD_W / 2, CARD_H / 2, CARD_W * 0.75)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  if (useVertical) {
    drawVerticalLayout(ctx, CARD_W, CARD_H, coverImg, logoImg, coverSize, lyricsFontSize, lyricsLineH)
  } else {
    drawHorizontalLayout(ctx, CARD_W, CARD_H, coverImg, logoImg, coverSize, horizLyricsW, lyricsFontSize, lyricsLineH, contentH)
  }
}

function drawHorizontalLayout(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  coverImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null,
  coverSize: number,
  lyricsW: number,
  fontSize: number,
  lineH: number,
  contentH: number,
) {
  const leftX = PAD
  const coverY = PAD

  // ── Cover ────────────────────────────────────────────────────
  drawCover(ctx, coverImg, leftX, coverY, coverSize)

  // ── Track info (under cover) ─────────────────────────────────
  const infoY = coverY + coverSize + 24
  ctx.textAlign = 'left'

  // Title
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = `bold 26px ${FONT}`
  const titleLines = wrapText(ctx, props.title || 'Unknown Title', coverSize)
  let ty = infoY
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, leftX, ty)
    ty += 32
  }

  // Artist
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `500 20px ${FONT}`
  ctx.fillText(truncate(props.artist || 'Unknown Artist', ctx, coverSize), leftX, ty + 4)
  ty += 28

  // Album
  if (props.album) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = `400 17px ${FONT}`
    ctx.fillText(truncate(props.album, ctx, coverSize), leftX, ty + 2)
  }

  // ── Lyrics (right side) ──────────────────────────────────────
  const lyricsX = leftX + coverSize + 50
  const lyricsY = PAD + 6
  const lyricsMaxH = contentH

  ctx.textAlign = 'left'
  ctx.font = `500 ${fontSize}px ${FONT}`

  // Decorative accent line
  ctx.fillStyle = 'rgba(139, 92, 246, 0.4)'
  roundRect(ctx, lyricsX - 16, lyricsY - 4, 3, Math.min(lyricsMaxH, H - PAD * 2), 2)
  ctx.fill()

  let curY = lyricsY + fontSize
  for (const lyric of props.lyrics) {
    if (curY > lyricsY + lyricsMaxH) break
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.font = `500 ${fontSize}px ${FONT}`
    const wrapped = wrapText(ctx, lyric, lyricsW - 20)
    for (const wl of wrapped) {
      if (curY > lyricsY + lyricsMaxH) break
      ctx.fillText(wl, lyricsX, curY)
      curY += lineH
    }
    curY += 10
  }

  // ── Watermark (bottom-right) ─────────────────────────────────
  drawWatermark(ctx, W, H, logoImg)
}

function drawVerticalLayout(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  coverImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null,
  coverSize: number,
  fontSize: number,
  lineH: number,
) {
  // Cover centred at top
  const coverX = PAD
  const coverY = PAD

  drawCover(ctx, coverImg, coverX, coverY, coverSize)

  // Track info next to cover
  const infoX = coverX + coverSize + 30
  let infoY = coverY + 20

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = `bold 30px ${FONT}`
  const titleLines = wrapText(ctx, props.title || 'Unknown Title', W - infoX - PAD)
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, infoX, infoY)
    infoY += 38
  }

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `500 22px ${FONT}`
  ctx.fillText(truncate(props.artist || 'Unknown Artist', ctx, W - infoX - PAD), infoX, infoY + 6)
  infoY += 32

  if (props.album) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = `400 19px ${FONT}`
    ctx.fillText(truncate(props.album, ctx, W - infoX - PAD), infoX, infoY + 4)
  }

  // Lyrics below
  const lyricsY = coverY + coverSize + 40
  const lyricsMaxH = H - lyricsY - 70

  // Accent line
  ctx.fillStyle = 'rgba(139, 92, 246, 0.4)'
  roundRect(ctx, PAD - 2, lyricsY, 3, Math.min(lyricsMaxH, lyricsMaxH), 2)
  ctx.fill()

  ctx.textAlign = 'left'
  ctx.font = `500 ${fontSize}px ${FONT}`

  let curY = lyricsY + fontSize + 4
  for (const lyric of props.lyrics) {
    if (curY > lyricsY + lyricsMaxH) break
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.font = `500 ${fontSize}px ${FONT}`
    const wrapped = wrapText(ctx, lyric, W - PAD * 2 - 20)
    for (const wl of wrapped) {
      if (curY > lyricsY + lyricsMaxH) break
      ctx.fillText(wl, PAD + 14, curY)
      curY += lineH
    }
    curY += 10
  }

  drawWatermark(ctx, W, H, logoImg)
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, size: number) {
  if (img) {
    // Shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 10
    roundRect(ctx, x, y, size, size, 20)
    ctx.clip()
    ctx.drawImage(img, x, y, size, size)
    ctx.restore()

    // Clean draw
    ctx.save()
    roundRect(ctx, x, y, size, size, 20)
    ctx.clip()
    ctx.drawImage(img, x, y, size, size)
    ctx.restore()
  } else {
    ctx.save()
    roundRect(ctx, x, y, size, size, 20)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.font = '64px serif'
    ctx.textAlign = 'center'
    ctx.fillText('♪', x + size / 2, y + size / 2 + 22)
  }
}

function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number, logoImg: HTMLImageElement | null) {
  const wmY = H - 24
  const logoSize = 20
  const text = 'Aurora Player'

  ctx.font = `600 16px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.textAlign = 'right'
  const textW = ctx.measureText(text).width

  const totalW = logoSize + 8 + textW
  const startX = W - PAD

  // Logo
  if (logoImg) {
    const logoX = startX - totalW
    ctx.save()
    ctx.globalAlpha = 0.45
    roundRect(ctx, logoX, wmY - logoSize + 4, logoSize, logoSize, 4)
    ctx.clip()
    ctx.drawImage(logoImg, logoX, wmY - logoSize + 4, logoSize, logoSize)
    ctx.restore()
  }

  // Text
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = `600 16px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(text, startX, wmY)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

function truncate(text: string, ctx: CanvasRenderingContext2D, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '…').width > maxW) {
    t = t.slice(0, -1)
  }
  return t + '…'
}

function downloadCard() {
  const canvas = cardCanvas.value
  if (!canvas) return

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = (props.title || 'lyrics').replace(/[^a-zA-Z0-9-_ ]/g, '').trim()
    a.download = `${safeTitle} - Lyrics Card.png`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Lyrics card saved')
  }, 'image/png')
}

async function copyCard() {
  const canvas = cardCanvas.value
  if (!canvas) return

  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Failed to create blob')
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
    toast.success('Copied to clipboard')
  } catch (err) {
    console.error('Copy failed:', err)
    toast.error('Failed to copy — try saving instead')
  }
}
</script>

<style scoped>
.lc-fade-enter-active,
.lc-fade-leave-active {
  transition: opacity 0.2s ease;
}
.lc-fade-enter-from,
.lc-fade-leave-to {
  opacity: 0;
}
</style>
