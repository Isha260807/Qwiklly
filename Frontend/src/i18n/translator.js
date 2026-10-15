// Runtime page translator (English <-> Hindi) for the Vendor application.
//
// Instead of wrapping every string in t(), we translate the rendered DOM:
//   1. text nodes + placeholder/title/aria-label/alt attributes are collected,
//   2. translated through Google Cloud Translation (v2) using the Maps API key,
//   3. cached in memory + localStorage so each string is only paid for once,
//   4. if the API is unreachable/not enabled for the key, an offline dictionary
//      (fallbackDictionary.js) is used for whatever phrases it knows.
// A MutationObserver keeps newly rendered content translated; switching back to
// English restores the original text.
import { fallbackDictionaries } from './fallbackDictionary';

const API_URL = 'https://translation.googleapis.com/language/translate/v2';
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// Language is intentionally vendor-scoped. User and Admin must remain English.
const LANG_KEY = 'vendorLanguage';
const SETTINGS_KEY = 'vendorSettings'; // vendor Settings page also stores language here
const CACHE_PREFIX = 'qwiklly:tr:';
const CACHE_MAX = 4000;
const SUPPORTED = ['en', 'hi'];
const BATCH_SIZE = 100;
const MAX_PARALLEL = 4;
const DEBOUNCE_MS = 16;
const API_RETRY_AFTER_MS = 5 * 60 * 1000;

const SKIP_SELECTOR =
  'script,style,noscript,textarea,code,pre,svg,[translate="no"],.notranslate,.gm-style,[contenteditable="true"]';
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

let lang = 'en';
let observer = null;
let apiBlockedUntil = 0;
let warned = false;
let scheduled = false;
let flushToken = 0;
const listeners = new Set();
const dirty = new Set();
const textNodes = new Set(); // nodes currently holding translated text
const attrTargets = new Set(); // {el, attr} currently holding translated text
const textState = new WeakMap(); // node -> { orig, translated }
const attrState = new WeakMap(); // el -> { [attr]: { orig, translated } }
const memCache = new Map(); // API results (persisted in localStorage)
let prebuilt = new Map(); // build-time translations of static UI text (instant)
let cacheDirty = false;

const hasLatin = (s) => /[A-Za-z]/.test(s);

// ---------- persistence ----------
export const getLanguage = () => (lang === 'en' ? readSavedLanguage() : lang);

const readSavedLanguage = () => {
  try {
    const direct = localStorage.getItem(LANG_KEY);
    if (SUPPORTED.includes(direct)) return direct;
    const fromSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').language;
    return SUPPORTED.includes(fromSettings) ? fromSettings : 'en';
  } catch {
    return 'en';
  }
};

const persistLanguage = (value) => {
  try {
    localStorage.setItem(LANG_KEY, value);
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (settings.language !== value) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, language: value }));
    }
  } catch {
    // storage blocked: language still applies for this session
  }
};

const loadCache = (target) => {
  memCache.clear();
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_PREFIX + target) || '{}');
    Object.entries(raw).forEach(([k, v]) => memCache.set(k, v));
  } catch {
    // ignore corrupt cache
  }
};

const saveCache = () => {
  if (!cacheDirty) return;
  cacheDirty = false;
  try {
    const entries = [...memCache.entries()].slice(-CACHE_MAX);
    localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // quota exceeded: keep memory cache only
  }
};

// ---------- translation lookup ----------
const fromDictionary = (text) => fallbackDictionaries[lang]?.[text.trim().toLowerCase()];

// Priority: hand-written dictionary (fixes domain terms like "PAN") > cached API
// result > build-time prebuilt file.
const getCached = (key) => fromDictionary(key) ?? memCache.get(key) ?? prebuilt.get(key);

const loadPrebuilt = async (target) => {
  prebuilt = new Map();
  try {
    const mod = await import(`./prebuilt/${target}.json`);
    prebuilt = new Map(Object.entries(mod.default || mod));
  } catch {
    // no prebuilt file for this language: runtime API/dictionary only
  }
};

const apiTranslate = async (strings) => {
  const res = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: strings, source: 'en', target: lang, format: 'text' }),
  });
  if (!res.ok) throw new Error(`Translate API ${res.status}`);
  const data = await res.json();
  const out = data?.data?.translations;
  if (!Array.isArray(out) || out.length !== strings.length) throw new Error('Bad translate response');
  return out.map((t) => t.translatedText);
};

// Resolves translations for `strings` into memCache via the API (batched, in parallel).
// Anything the API cannot return is simply left untranslated (dictionary/prebuilt
// hits are handled by getCached before we get here).
const resolve = async (strings) => {
  const pending = strings.filter((s) => getCached(s) === undefined);
  if (!pending.length) return;

  const canUseApi = API_KEY && Date.now() >= apiBlockedUntil && navigator.onLine !== false;
  if (!canUseApi) return;

  const batches = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) batches.push(pending.slice(i, i + BATCH_SIZE));

  const runBatch = async (batch) => {
    try {
      const translated = await apiTranslate(batch);
      batch.forEach((s, idx) => memCache.set(s, translated[idx]));
      cacheDirty = true;
    } catch (err) {
      apiBlockedUntil = Date.now() + API_RETRY_AFTER_MS;
      if (!warned) {
        warned = true;
        console.warn('[translator] Google Translate unavailable, using offline dictionary.', err.message);
      }
    }
  };

  for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
    await Promise.all(batches.slice(i, i + MAX_PARALLEL).map(runBatch));
    if (Date.now() < apiBlockedUntil) break;
  }
  saveCache();
};

// ---------- DOM collection / apply ----------
const withWhitespace = (original, translated) => {
  const lead = original.match(/^\s*/)[0];
  const trail = original.match(/\s*$/)[0];
  return lead + translated + trail;
};

const shouldSkipNode = (node) => {
  const parent = node.parentElement;
  return !parent || !!parent.closest(SKIP_SELECTOR);
};

const collect = (root) => {
  const items = [];

  const addText = (node) => {
    if (shouldSkipNode(node)) return;
    const data = node.data;
    const state = textState.get(node);
    if (state && state.translated === data) return; // our own output
    const key = data.trim();
    if (!key || !hasLatin(key) || key.length > 1000) return;
    items.push({ type: 'text', node, orig: data, key });
  };

  const addAttrs = (el) => {
    if (el.closest?.(SKIP_SELECTOR)) return;
    ATTRS.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (!value) return;
      const state = attrState.get(el)?.[attr];
      if (state && state.translated === value) return;
      const key = value.trim();
      if (!key || !hasLatin(key) || key.length > 500) return;
      items.push({ type: 'attr', el, attr, orig: value, key });
    });
  };

  if (root.nodeType === Node.TEXT_NODE) {
    addText(root);
    return items;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return items;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) addText(walker.currentNode);

  addAttrs(root);
  root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(addAttrs);
  return items;
};

const applyItem = (item, translated) => {
  if (item.type === 'text') {
    if (!item.node.isConnected || item.node.data !== item.orig) return; // changed meanwhile
    const next = withWhitespace(item.orig, translated);
    textState.set(item.node, { orig: item.orig, translated: next });
    textNodes.add(item.node);
    item.node.data = next;
  } else {
    if (!item.el.isConnected || item.el.getAttribute(item.attr) !== item.orig) return;
    const next = withWhitespace(item.orig, translated);
    const states = attrState.get(item.el) || {};
    states[item.attr] = { orig: item.orig, translated: next };
    attrState.set(item.el, states);
    attrTargets.add({ el: item.el, attr: item.attr });
    item.el.setAttribute(item.attr, next);
  }
};

const process = async (roots) => {
  if (lang === 'en') return;
  const token = flushToken;
  const items = roots.flatMap(collect);
  if (!items.length) return;

  // Apply cached translations immediately (no English flash on navigation).
  const uncached = [];
  items.forEach((item) => {
    const hit = getCached(item.key);
    if (hit !== undefined) applyItem(item, hit);
    else uncached.push(item);
  });
  observer?.takeRecords();

  if (!uncached.length) return;
  await resolve([...new Set(uncached.map((i) => i.key))]);
  if (token !== flushToken || lang === 'en') return; // language switched meanwhile

  uncached.forEach((item) => {
    const hit = getCached(item.key);
    if (hit !== undefined) applyItem(item, hit);
  });
  observer?.takeRecords();
};

const restoreEnglish = () => {
  textNodes.forEach((node) => {
    const state = textState.get(node);
    if (state && node.data === state.translated) node.data = state.orig;
    textState.delete(node);
  });
  textNodes.clear();
  attrTargets.forEach(({ el, attr }) => {
    const state = attrState.get(el)?.[attr];
    if (state && el.getAttribute(attr) === state.translated) el.setAttribute(attr, state.orig);
    if (state) delete attrState.get(el)[attr];
  });
  attrTargets.clear();
};

const pruneDetached = () => {
  textNodes.forEach((n) => {
    if (!n.isConnected) textNodes.delete(n);
  });
  attrTargets.forEach((t) => {
    if (!t.el.isConnected) attrTargets.delete(t);
  });
};

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    const roots = [...dirty].filter((r) => r.isConnected);
    dirty.clear();
    pruneDetached();
    if (roots.length) process(roots);
  }, DEBOUNCE_MS);
};

const startObserver = () => {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((mutations) => {
    if (lang === 'en') return;
    mutations.forEach((m) => {
      if (m.type === 'characterData') dirty.add(m.target);
      else if (m.type === 'attributes') dirty.add(m.target);
      else m.addedNodes.forEach((n) => dirty.add(n));
    });
    if (dirty.size) schedule();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
};

const stopObserver = () => {
  observer?.disconnect();
  observer = null;
};

// The translator is mounted only while the Vendor shell is active. Restore any
// DOM mutations before leaving that shell so User/Admin pages cannot inherit
// translated nodes or an active MutationObserver.
export const stopTranslator = () => {
  flushToken += 1;
  stopObserver();
  dirty.clear();
  restoreEnglish();
  scheduled = false;
  lang = 'en';
  document.documentElement.lang = 'en';
};

// ---------- public API ----------
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const setLanguage = (next) => {
  if (!SUPPORTED.includes(next) || next === lang) return;
  flushToken += 1;
  saveCache();
  restoreEnglish();
  lang = next;
  persistLanguage(next);
  document.documentElement.lang = next;
  listeners.forEach((fn) => fn());

  if (next === 'en') {
    stopObserver();
    return;
  }
  loadCache(next);
  startObserver();
  loadPrebuilt(next).then(() => {
    if (lang === next) process([document.body]);
  });
};

const directTranslationCaches = new Map();

const loadDirectTranslationCache = (target) => {
  if (directTranslationCaches.has(target)) return directTranslationCaches.get(target);

  const cache = new Map();
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_PREFIX + target) || '{}');
    Object.entries(raw).forEach(([key, value]) => cache.set(key, value));
  } catch {
    // Ignore unavailable or invalid browser storage.
  }

  directTranslationCaches.set(target, cache);
  return cache;
};

const saveDirectTranslationCache = (target, cache) => {
  try {
    const entries = [...cache.entries()].slice(-CACHE_MAX);
    localStorage.setItem(CACHE_PREFIX + target, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Keep the in-memory translation when storage is unavailable.
  }
};

// Translate a specific content value without changing the Vendor app language.
export const translateText = async (text, target = 'hi') => {
  const original = String(text ?? '');
  const key = original.trim();

  if (!key || target === 'en' || !hasLatin(key)) return original;

  const dictionaryValue = fallbackDictionaries[target]?.[key.toLowerCase()];
  if (dictionaryValue !== undefined) return withWhitespace(original, dictionaryValue);

  const cache = loadDirectTranslationCache(target);
  if (cache.has(key)) return withWhitespace(original, cache.get(key));

  if (!API_KEY || navigator.onLine === false) return original;

  try {
    const res = await fetch(API_URL + '?key=' + encodeURIComponent(API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: [key], source: 'en', target, format: 'text' }),
    });

    if (!res.ok) throw new Error('Translate API ' + res.status);
    const data = await res.json();
    const translated = data?.data?.translations?.[0]?.translatedText;

    if (!translated) return original;

    cache.set(key, translated);
    saveDirectTranslationCache(target, cache);
    return withWhitespace(original, translated);
  } catch (error) {
    console.warn('[translator] Legal content translation unavailable:', error.message);
    return original;
  }
};
export const initTranslator = () => {
  stopTranslator();
  lang = readSavedLanguage();
  listeners.forEach((fn) => fn());
  document.documentElement.lang = lang;
  if (lang === 'en') return;
  loadCache(lang);
  const start = () => {
    startObserver();
    loadPrebuilt(lang).then(() => process([document.body]));
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
};
