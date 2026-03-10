/**
 * Aurora Plugin — Playbar Quality Badge
 *
 * Displays audio format / quality information as a badge in the player bar
 * and in fullscreen (immersive) mode.  Hi-Res lossless files get a special
 * accent-coloured badge, regular lossless files get a softer accent, and
 * lossy files get a muted label.
 *
 * This example demonstrates several intermediate plugin techniques:
 *   - Fetching data from the main process via aurora.ipc.invoke()
 *   - Injecting DOM elements into player-bar and immersive slots
 *   - Using a MutationObserver to re-mount UI when views change
 *   - Reading and reacting to plugin settings at runtime
 *   - Caching expensive IPC results per-track
 *   - Using Aurora's CSS custom properties for theme-aware styling
 *
 * Drop this folder into ~/.config/aurora-player/plugins/ and enable it
 * in Settings → Plugins.
 */

let playerBarBadge = null;
let immersiveBadge = null;
let immersiveModernBadge = null;
let immersiveObserver = null;
let showInPlayerBar = true;
let showInImmersive = true;
let cachedCredits = null;
let cachedTrackPath = null;

// ── Settings schema (also declared in manifest.json) ──────────────────
aurora.settings.register({
    showInPlayerBar: {
        type: 'boolean',
        label: 'Show in player bar',
        description: 'Display the quality badge next to the transport controls',
        default: true
    },
    showInImmersive: {
        type: 'boolean',
        label: 'Show in immersive mode',
        description: 'Display the quality badge in the fullscreen/immersive view',
        default: true
    }
});

// ── Fetch real audio metadata via IPC ─────────────────────────────────
async function fetchCredits(track) {
    if (!track || !track.path) return null;
    // Cache to avoid re-fetching for the same track
    if (cachedTrackPath === track.path && cachedCredits) return cachedCredits;
    try {
        cachedCredits = await aurora.ipc.invoke('track:get-credits', track.path);
        cachedTrackPath = track.path;
        return cachedCredits;
    } catch (e) {
        console.warn('[QualityBadge] Failed to fetch track credits:', e);
        return null;
    }
}

// ── Badge rendering ───────────────────────────────────────────────────
function renderBadge(container, credits, size) {
    if (!container) return;
    if (!credits) {
        container.style.display = 'none';
        return;
    }

    var bitsPerSample = credits.bitsPerSample || 16;
    var sampleRate = credits.sampleRate || 44100;
    var sampleRateKHz = (sampleRate / 1000).toFixed(1).replace(/\.0$/, '');
    var codec = (credits.codec || '').toUpperCase();
    var lossless = credits.lossless || false;
    var bitrate = credits.bitrate;
    var isHiRes = lossless && (bitsPerSample > 16 || sampleRate > 48000);

    // Badge label
    var badgeText;
    if (lossless) {
        badgeText = isHiRes ? 'HI-RES LOSSLESS' : 'LOSSLESS';
    } else {
        badgeText = bitrate ? bitrate + ' kbps' : 'LOSSY';
    }

    // Theme-aware colours using Aurora's CSS custom properties
    var accentBg = isHiRes ? 'rgb(var(--accent))' : lossless ? 'rgb(var(--accent) / 0.35)' : 'rgb(var(--app-text) / 0.1)';
    var textColor = isHiRes ? 'rgb(var(--control-fg))' : lossless ? 'rgb(var(--accent))' : 'rgb(var(--app-text) / 0.5)';

    var infoSize = size === 'sm' ? '9px' : '10px';
    var badgeSize = size === 'sm' ? '8px' : '9px';
    var spacer = size === 'sm' ? '2px' : '3px';

    // Show bit depth & sample rate for lossless, bitrate & codec for lossy
    var infoLine;
    if (lossless) {
        infoLine = bitsPerSample + '-BIT \u00B7 ' + sampleRateKHz + 'kHz \u00B7 ' + codec;
    } else {
        infoLine = (bitrate ? bitrate + ' kbps' : '') + (bitrate && codec ? ' \u00B7 ' : '') + codec;
    }

    container.style.display = 'flex';
    container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: system-ui, sans-serif; cursor: default; user-select: none; white-space: nowrap;">
      <div style="color: rgb(var(--app-text) / 0.35); font-size: ${infoSize}; margin-bottom: ${spacer}; font-weight: 500; letter-spacing: 0.2px;">
        ${infoLine}
      </div>
      <div style="background: ${accentBg}; color: ${textColor}; font-size: ${badgeSize}; font-weight: 800; padding: 1.5px 6px; border-radius: 3px; letter-spacing: 0.5px; line-height: 1.4;">
        ${badgeText}
      </div>
    </div>`;
}

async function updateAll(track) {
    var credits = await fetchCredits(track);
    if (playerBarBadge) {
        playerBarBadge.style.display = showInPlayerBar ? '' : 'none';
        if (showInPlayerBar) renderBadge(playerBarBadge, credits, 'md');
    }
    mountImmersiveBadges(credits);
}

// ── Player bar badge (re-mount when PlayerBar appears in DOM) ─────────
function createBadgeEl() {
    var el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    return el;
}

function mountPlayerBarBadge() {
    if (!playerBarBadge) return;
    var slot = aurora.ui.getPlayerBarSlot('right');
    if (slot && !slot.contains(playerBarBadge)) {
        slot.appendChild(playerBarBadge);
        if (showInPlayerBar && cachedCredits) renderBadge(playerBarBadge, cachedCredits, 'md');
    }
}

// ── Immersive badge (re-mount when the fullscreen view appears) ───────

function mountImmersiveBadges(credits) {
    if (!showInImmersive) {
        if (immersiveBadge && immersiveBadge.parentNode) immersiveBadge.parentNode.removeChild(immersiveBadge);
        if (immersiveModernBadge && immersiveModernBadge.parentNode) immersiveModernBadge.parentNode.removeChild(immersiveModernBadge);
        immersiveBadge = null;
        immersiveModernBadge = null;
        return;
    }

    // Default layout slot
    var defaultSlot = aurora.ui.getImmersiveSlot('right');
    if (defaultSlot) {
        if (!immersiveBadge || !defaultSlot.contains(immersiveBadge)) {
            immersiveBadge = createBadgeEl();
            defaultSlot.appendChild(immersiveBadge);
        }
        renderBadge(immersiveBadge, credits, 'md');
    }

    // Modern layout slot
    var modernSlot = aurora.ui.getImmersiveSlot('modern-right');
    if (modernSlot) {
        if (!immersiveModernBadge || !modernSlot.contains(immersiveModernBadge)) {
            immersiveModernBadge = createBadgeEl();
            modernSlot.appendChild(immersiveModernBadge);
        }
        renderBadge(immersiveModernBadge, credits, 'sm');
    }
}

// ── Lifecycle ─────────────────────────────────────────────────────────
exports.onActivate = async function () {
    console.log('[QualityBadge] Plugin activated');

    // Load saved settings
    var settings = await aurora.settings.getAll();
    showInPlayerBar = settings.showInPlayerBar !== false;
    showInImmersive = settings.showInImmersive !== false;

    // Player bar badge (created once, mounted when slot appears)
    playerBarBadge = createBadgeEl();
    playerBarBadge.id = 'aurora-quality-badge-plugin';
    mountPlayerBarBadge();

    updateAll(aurora.player.currentTrack);

    // Watch for DOM changes (PlayerBar mount/unmount, fullscreen view mount/unmount)
    // so badges are (re)mounted when their slot elements appear.
    // Disconnect before updating so renderBadge's innerHTML changes don't
    // re-trigger the observer (which would cause an infinite loop).
    immersiveObserver = new MutationObserver(function () {
        immersiveObserver.disconnect();
        mountPlayerBarBadge();
        if (cachedCredits) mountImmersiveBadges(cachedCredits);
        immersiveObserver.observe(document.body, { childList: true, subtree: true });
    });
    immersiveObserver.observe(document.body, { childList: true, subtree: true });

    // React to settings changes
    aurora.settings.onChange(function (key, value) {
        if (key === 'showInPlayerBar') {
            showInPlayerBar = value;
            updateAll(aurora.player.currentTrack);
        }
        if (key === 'showInImmersive') {
            showInImmersive = value;
            updateAll(aurora.player.currentTrack);
        }
    });
};

exports.onDeactivate = function () {
    if (playerBarBadge && playerBarBadge.parentNode) playerBarBadge.parentNode.removeChild(playerBarBadge);
    if (immersiveBadge && immersiveBadge.parentNode) immersiveBadge.parentNode.removeChild(immersiveBadge);
    if (immersiveModernBadge && immersiveModernBadge.parentNode) immersiveModernBadge.parentNode.removeChild(immersiveModernBadge);
    if (immersiveObserver) immersiveObserver.disconnect();
    playerBarBadge = null;
    immersiveBadge = null;
    immersiveModernBadge = null;
    immersiveObserver = null;
    cachedCredits = null;
    cachedTrackPath = null;
    console.log('[QualityBadge] Plugin deactivated');
};

exports.onTrackChange = function (track) {
    // Clear cache so we fetch fresh credits for the new track
    cachedCredits = null;
    cachedTrackPath = null;
    updateAll(track);
};
