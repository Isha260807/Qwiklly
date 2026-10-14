// After a new deploy, old hashed chunks (assets/index-xxxx.js) disappear from the
// server. A tab/cached index.html from the previous build then fails to import
// them. Reloading once fetches the fresh index.html with the new chunk names.
const KEY = 'qwiklly:chunk-reload-at';
const MIN_GAP_MS = 15000; // guard against reload loops if the failure is real

export const isChunkLoadError = (error) => {
  const msg = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i.test(msg);
};

// A plain location.reload() can be answered from the WebView's HTTP cache with the
// same stale index.html. Navigating to the same URL with a unique query param
// forces a network fetch of the HTML (and therefore the new chunk names).
export const hardReload = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_v', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
};

// Returns true when a reload was triggered.
export const reloadOnceForNewVersion = () => {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < MIN_GAP_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sessionStorage blocked: still reload once per call site is risky, so skip.
    return false;
  }
  hardReload();
  return true;
};
