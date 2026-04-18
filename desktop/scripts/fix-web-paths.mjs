import fs from 'node:fs/promises';
import path from 'node:path';

// Expo web export assumes a server root (leading "/").
// For Electron file:// loading, we need relative paths.

const distDir = path.join(process.cwd(), '..', 'mobile', 'dist');
const indexPath = path.join(distDir, 'index.html');

let html = await fs.readFile(indexPath, 'utf8');

// Convert common absolute asset paths to relative.
html = html
  .replace(/\bhref="\/(favicon\.ico)"/g, 'href="./$1"')
  .replace(/\bsrc="\/_expo\//g, 'src="./_expo/')
  .replace(/\bhref="\/_expo\//g, 'href="./_expo/');

// Expo Router derives the initial route from window.location.pathname.
// In Electron packaged builds we open index.html with file://, which makes
// the pathname look like "/.../Pull Tab Valet.app/.../index.html" and causes
// the router to render the "Unmatched Route" screen on startup. Normalize
// file:// launches back to "/" before the router bundle executes.
const normalizeScript = `
  <script>
    (function () {
      if (window.location.protocol !== 'file:') return;

      var search = window.location.search || '';
      var hash = window.location.hash || '';
      var normalized = 'file:///' + search + hash;

      try {
        window.__PTV_DESKTOP_FILE_BOOT_PATH__ = window.location.pathname || '';
        if ((window.location.pathname || '') !== '/') {
          window.history.replaceState(null, '', normalized);
        }
      } catch (error) {
        console.warn('PTV desktop route normalization failed', error);
      }
    })();
  </script>
`;

const startupGuardScript = `
  <style>
    #ptv-desktop-boot-guard {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.96), rgba(243,244,246,0.92) 36%, rgba(229,231,235,1) 100%);
      color: #111827;
      z-index: 2147483647;
      transition: opacity 180ms ease;
    }

    #ptv-desktop-boot-guard[data-hidden="true"] {
      opacity: 0;
      pointer-events: none;
    }

    #ptv-desktop-boot-card {
      width: min(100%, 560px);
      border: 1px solid #d1d5db;
      border-radius: 24px;
      background: rgba(255,255,255,0.96);
      padding: 28px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial;
    }

    #ptv-desktop-boot-eyebrow {
      margin: 0 0 10px;
      color: #6b7280;
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    #ptv-desktop-boot-title {
      margin: 0 0 10px;
      font-size: 28px;
      line-height: 1.1;
    }

    #ptv-desktop-boot-message {
      margin: 0;
      color: #374151;
      font-size: 14px;
      line-height: 1.7;
    }

    #ptv-desktop-boot-actions {
      display: flex;
      gap: 12px;
      margin-top: 18px;
      flex-wrap: wrap;
    }

    .ptv-desktop-boot-button {
      border: 0;
      border-radius: 999px;
      padding: 12px 16px;
      cursor: pointer;
      font: inherit;
    }

    .ptv-desktop-boot-button-primary {
      background: #111827;
      color: #ffffff;
    }

    .ptv-desktop-boot-button-secondary {
      background: #e5e7eb;
      color: #111827;
    }

    #ptv-desktop-boot-details {
      margin-top: 14px;
      color: #6b7280;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
  </style>
  <script>
    (function () {
      if (window.location.protocol !== 'file:') return;

      var state = {
        ready: false,
        watchdog: null,
        rootObserver: null,
      };

      function ensureGuard() {
        if (document.getElementById('ptv-desktop-boot-guard')) {
          return document.getElementById('ptv-desktop-boot-guard');
        }

        if (!document.body) {
          return null;
        }

        var guard = document.createElement('div');
        guard.id = 'ptv-desktop-boot-guard';
        guard.innerHTML =
          '<main id="ptv-desktop-boot-card">' +
          '<p id="ptv-desktop-boot-eyebrow">Pull Tab Valet Desktop</p>' +
          '<h1 id="ptv-desktop-boot-title">Opening Pull Tab Valet...</h1>' +
          '<p id="ptv-desktop-boot-message">The desktop app is loading its main workspace.</p>' +
          '<div id="ptv-desktop-boot-actions">' +
          '<button type="button" class="ptv-desktop-boot-button ptv-desktop-boot-button-primary" id="ptv-desktop-boot-retry">Retry</button>' +
          '<button type="button" class="ptv-desktop-boot-button ptv-desktop-boot-button-secondary" id="ptv-desktop-boot-reload">Reload App</button>' +
          '</div>' +
          '<div id="ptv-desktop-boot-details" hidden></div>' +
          '</main>';
        document.body.appendChild(guard);

        guard.querySelector('#ptv-desktop-boot-retry').addEventListener('click', function () {
          window.location.reload();
        });
        guard.querySelector('#ptv-desktop-boot-reload').addEventListener('click', function () {
          window.location.reload();
        });

        return guard;
      }

      function updateGuard(title, message, details) {
        var guard = ensureGuard();
        if (!guard) return;

        guard.dataset.hidden = 'false';

        var titleNode = document.getElementById('ptv-desktop-boot-title');
        var messageNode = document.getElementById('ptv-desktop-boot-message');
        var detailsNode = document.getElementById('ptv-desktop-boot-details');

        if (titleNode) titleNode.textContent = title;
        if (messageNode) messageNode.textContent = message;
        if (detailsNode) {
          if (details) {
            detailsNode.hidden = false;
            detailsNode.textContent = details;
          } else {
            detailsNode.hidden = true;
            detailsNode.textContent = '';
          }
        }
      }

      function hideGuard() {
        state.ready = true;
        if (state.watchdog) {
          window.clearTimeout(state.watchdog);
          state.watchdog = null;
        }
        if (state.rootObserver) {
          state.rootObserver.disconnect();
          state.rootObserver = null;
        }

        var guard = document.getElementById('ptv-desktop-boot-guard');
        if (!guard) return;
        guard.dataset.hidden = 'true';
        window.setTimeout(function () {
          if (guard.parentNode) {
            guard.parentNode.removeChild(guard);
          }
        }, 220);
      }

      function markReady() {
        if (state.ready) return;
        hideGuard();
      }

      function showFailure(title, message, details) {
        state.ready = false;
        if (state.watchdog) {
          window.clearTimeout(state.watchdog);
          state.watchdog = null;
        }
        updateGuard(title, message, details || '');
      }

      function watchRoot() {
        var root = document.getElementById('root');
        if (!root) return;

        if (root.childElementCount > 0 || root.textContent.trim()) {
          markReady();
          return;
        }

        state.rootObserver = new MutationObserver(function () {
          if (root.childElementCount > 0 || root.textContent.trim()) {
            markReady();
          }
        });
        state.rootObserver.observe(root, { childList: true, subtree: true, characterData: true });
      }

      function boot() {
        updateGuard('Opening Pull Tab Valet...', 'The desktop app is loading its main workspace.', '');
        watchRoot();
        state.watchdog = window.setTimeout(function () {
          if (state.ready) return;
          showFailure(
            'Pull Tab Valet is taking longer than expected',
            'The app did not finish startup, so this recovery screen stayed visible instead of leaving a blank window.',
            window.__PTV_DESKTOP_FILE_BOOT_PATH__ ? 'Boot path: ' + window.__PTV_DESKTOP_FILE_BOOT_PATH__ : ''
          );
        }, 8000);
      }

      window.addEventListener('DOMContentLoaded', boot, { once: true });
      window.addEventListener('ptv:renderer-mounted', markReady);
      window.addEventListener('error', function (event) {
        var detail = event && event.error && event.error.stack ? event.error.stack : (event && event.message ? String(event.message) : 'Unknown renderer error');
        showFailure(
          'Unable to open app content',
          'A startup error prevented Pull Tab Valet from rendering its main workspace.',
          detail
        );
      });
      window.addEventListener('unhandledrejection', function (event) {
        var reason = event && event.reason;
        var detail = reason && reason.stack ? reason.stack : String(reason || 'Unknown rejection');
        showFailure(
          'Unable to open app content',
          'A startup error prevented Pull Tab Valet from rendering its main workspace.',
          detail
        );
      });
    })();
  </script>
`;

if (!html.includes('__PTV_DESKTOP_FILE_BOOT_PATH__')) {
  html = html.replace('</head>', `${normalizeScript}\n</head>`);
}

if (!html.includes('ptv-desktop-boot-guard')) {
  html = html.replace('</head>', `${startupGuardScript}\n</head>`);
}

await fs.writeFile(indexPath, html);

console.log(`Patched web paths for Electron: ${indexPath}`);
