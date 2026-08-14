/* Centralized client-side state/cache + event bus (CMMS.cache / CMMS.events).
 * Loaded before api.js so the API layer can use it for dataset-scoped caching
 * and mutation invalidation. ES5-compatible. */
window.CMMS = window.CMMS || {};

CMMS.events = (function() {
  var registry = {};
  function norm(evt) { return 'on' + String(evt || '').toLowerCase(); }
  return {
    on: function(evt, fn) {
      var key = norm(evt);
      (registry[key] = registry[key] || []).push(fn);
    },
    off: function(evt, fn) {
      var key = norm(evt);
      var list = registry[key] || [];
      var i = list.indexOf(fn);
      if (i > -1) list.splice(i, 1);
    },
    emit: function(evt, payload) {
      var key = norm(evt);
      var list = (registry[key] || []).slice();
      for (var i = 0; i < list.length; i++) {
        try { list[i](payload); }
        catch (e) { console.error('[CMMS.events] handler for ' + evt + ' threw:', e); }
      }
    }
  };
})();

CMMS.cache = (function() {
  var store = {};        // key -> { dataset, data, loaded, loadedAt, dirty, loading, version, ttl }
  var datasetIndex = {}; // dataset -> { key: true }
  var generation = 0;

  function clone(v) {
    if (v === undefined || v === null) return v;
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  function entry(key) {
    if (!store[key]) {
      store[key] = { dataset: 'default', data: undefined, loaded: false, loadedAt: 0, dirty: true, loading: false, version: 0, ttl: 0 };
    }
    return store[key];
  }

  function indexKey(dataset, key) {
    (datasetIndex[dataset] = datasetIndex[dataset] || {})[key] = true;
  }

  function isFresh(meta, ttl) {
    if (!meta.loaded || meta.dirty) return false;
    var maxAge = (ttl !== undefined && ttl !== null) ? ttl : meta.ttl;
    if (maxAge && maxAge > 0 && (Date.now() - meta.loadedAt) >= maxAge) return false;
    return true;
  }

  return {
    /* Fetch-with-cache. opts: { dataset, ttl, force } */
    get: function(key, fetcher, opts) {
      opts = opts || {};
      var meta = entry(key);
      meta.dataset = opts.dataset || meta.dataset || 'default';
      meta.ttl = (opts.ttl !== undefined) ? opts.ttl : meta.ttl;
      indexKey(meta.dataset, key);

      if (!opts.force && isFresh(meta, opts.ttl)) {
        return Promise.resolve(clone(meta.data));
      }
      if (meta.loading && meta.promise) {
        return meta.promise;
      }
      meta.loading = true;
      meta.promise = Promise.resolve(typeof fetcher === 'function' ? fetcher() : fetcher)
        .then(function(data) {
          meta.data = clone(data);
          meta.loaded = true;
          meta.loadedAt = Date.now();
          meta.dirty = false;
          meta.loading = false;
          meta.version++;
          return clone(meta.data);
        })
        .catch(function(err) {
          meta.loading = false;
          meta.dirty = true;
          meta.promise = null;
          throw err;
        });
      return meta.promise;
    },

    set: function(key, data, opts) {
      var meta = entry(key);
      meta.dataset = (opts && opts.dataset) || meta.dataset || 'default';
      meta.ttl = (opts && opts.ttl !== undefined) ? opts.ttl : meta.ttl;
      meta.data = clone(data);
      meta.loaded = true;
      meta.loadedAt = Date.now();
      meta.dirty = false;
      meta.loading = false;
      meta.version++;
      indexKey(meta.dataset, key);
    },

    invalidateKey: function(key) {
      var meta = store[key];
      if (meta) { meta.dirty = true; meta.loaded = false; meta.promise = null; }
    },

    /* Invalidate every cached entry belonging to a dataset (smallest scope). */
    invalidate: function(dataset) {
      var keys = datasetIndex[dataset];
      if (keys) {
        Object.keys(keys).forEach(function(key) {
          var meta = store[key];
          if (meta) { meta.dirty = true; meta.loaded = false; meta.promise = null; }
        });
      }
    },

    invalidateMany: function(datasets) {
      (datasets || []).forEach(function(ds) { CMMS.cache.invalidate(ds); });
    },

    invalidateAll: function() {
      Object.keys(store).forEach(function(key) {
        var meta = store[key];
        meta.dirty = true; meta.loaded = false; meta.promise = null;
      });
    },

    clear: function() {
      store = {};
      datasetIndex = {};
      generation++;
    },

    isFresh: function(key, ttl) {
      var meta = store[key];
      return !!meta && isFresh(meta, ttl);
    },

    /* Synchronous peek of cached data (for instant render before async settles). */
    peek: function(key, ttl) {
      var meta = store[key];
      if (!meta || !isFresh(meta, ttl)) return undefined;
      return clone(meta.data);
    },

    getMeta: function(key) {
      var meta = store[key];
      return meta ? {
        loaded: meta.loaded, loadedAt: meta.loadedAt, dirty: meta.dirty,
        loading: meta.loading, version: meta.version, ttl: meta.ttl
      } : null;
    },

    generation: function() { return generation; },
    keys: function() { return Object.keys(store); },
    datasetKeys: function(dataset) {
      var keys = datasetIndex[dataset];
      return keys ? Object.keys(keys) : [];
    }
  };
})();
