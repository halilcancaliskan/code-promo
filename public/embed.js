(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.BasketballPromo) {
    console.warn("[Basketball Promo] Script absent ou déjà chargé.");
    return;
  }
  var serviceOrigin = new URL(script.src).origin;
  var shopId = script.dataset.shop || "demo";
  var protocol = "basketball-promo/v1";
  var config;
  var active;
  var automaticTimer;
  var memory = new Map();
  var initialized;
  var key;
  var options;
  var expiryTimer;

  function readOptions() {
    var result = {};
    ["name", "accent", "background", "code", "terms", "expiresAt"].forEach(function (name) {
      var value = script.dataset[name];
      if (value === undefined) return;
      if (name === "name" && (!value.trim() || value.length > 80)) {
        throw new Error("Nom de popup invalide : entre 1 et 80 caractères.");
      }
      if ((name === "accent" || name === "background") && !/^#[0-9a-f]{6}$/i.test(value)) {
        throw new Error("Couleur invalide : utiliser #RRGGBB.");
      }
      if ((name === "code" || name === "terms") && (!value.trim() || value.length > (name === "code" ? 64 : 500))) {
        throw new Error("Code promo ou conditions invalides.");
      }
      if (name === "expiresAt") {
        var timestamp = Date.parse(value);
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
            !Number.isFinite(timestamp) ||
            new Date(timestamp).toISOString() !== value.replace(/Z$/, value.includes(".") ? "Z" : ".000Z")) {
          throw new Error("Date limite invalide : utiliser une date UTC ISO, par exemple 2026-12-31T22:59:59Z.");
        }
      }
      result[name] = value;
    });
    return result;
  }
  function expired() {
    return options.expiresAt !== undefined && Date.now() >= Date.parse(options.expiresAt);
  }
  function expireOffer() {
    clearTimeout(automaticTimer);
    close();
    window.dispatchEvent(new CustomEvent("basketball-promo:expired"));
  }
  function watchExpiry() {
    if (!options.expiresAt) return;
    if (expired()) { expireOffer(); return; }
    expiryTimer = setTimeout(watchExpiry, Math.min(Date.parse(options.expiresAt) - Date.now(), 2147483647));
  }

  function report(message, error) {
    console.error("[Basketball Promo] " + message, error || "");
    window.dispatchEvent(new CustomEvent("basketball-promo:error", { detail: { message: message } }));
  }
  function read(storage, name) {
    try {
      return window[storage].getItem(name) || memory.get(name) || null;
    } catch (error) {
      console.warn("[Basketball Promo] Stockage indisponible ; mémoire de cette page uniquement.", error);
      return memory.get(name) || null;
    }
  }
  function write(storage, name, value) {
    memory.set(name, value);
    try {
      window[storage].setItem(name, value);
    } catch (error) {
      console.warn("[Basketball Promo] Préférence non persistée ; stockage indisponible.", error);
    }
  }
  function completed() {
    var raw = read("localStorage", key + ":won");
    var timestamp = Number(raw);
    return raw !== null && Number.isFinite(timestamp) && timestamp <= Date.now() &&
      Date.now() - timestamp < config.completedDays * 86400000;
  }
  function shouldOpen() {
    if (expired() || completed()) return false;
    if (config.frequency === "always") return true;
    if (config.frequency === "session") return !read("sessionStorage", key + ":seen");
    var raw = read("localStorage", key + ":seen");
    var timestamp = Number(raw);
    return raw === null || !Number.isFinite(timestamp) || timestamp > Date.now() || Date.now() - timestamp >= 86400000;
  }
  function rememberSeen() {
    write(config.frequency === "session" ? "sessionStorage" : "localStorage", key + ":seen", String(Date.now()));
  }
  function validConfig(value) {
    return value && typeof value === "object" && value.id === shopId &&
      typeof value.campaignId === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value.campaignId) &&
      typeof value.title === "string" && value.title.length > 0 && value.title.length <= 250 &&
      Number.isFinite(value.openDelayMs) && value.openDelayMs >= 0 && value.openDelayMs <= 60000 &&
      ["session", "daily", "always"].includes(value.frequency) &&
      Number.isFinite(value.completedDays) && value.completedDays > 0;
  }
  function channelId() {
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }
  function close() {
    if (active) active.close();
  }
  function show() {
    if (expired()) { expireOffer(); return false; }
    if (active) return;
    var channel = channelId();
    var previousFocus = document.activeElement;
    var scrollX = window.scrollX;
    var scrollY = window.scrollY;
    var htmlOverflow = document.documentElement.style.overflow;
    var saved = {};
    var backgroundElements = [];
    ["position", "top", "left", "width", "overflow"].forEach(function (property) {
      saved[property] = document.body.style[property];
    });
    var host = document.createElement("div");
    host.id = "basketball-promo-root";
    var shadow = host.attachShadow({ mode: "open" });
    var style = document.createElement("style");
    style.textContent = ":host{all:initial!important;position:fixed!important;inset:0!important;z-index:2147483646!important;display:block!important;color:#252c27;font-family:Arial,sans-serif}*{box-sizing:border-box}.overlay{position:absolute;inset:0;background:rgba(29,36,27,.57);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)}.dialog{position:relative;width:380px;max-width:100%;height:min(620px,calc(100dvh - 32px));background:var(--promo-paper,#fff9f0);border-radius:14px;overflow:hidden;box-shadow:0 24px 90px #0003}.close{position:absolute;right:5px;top:0;z-index:2;width:44px;height:44px;border:0;border-radius:50%;font:24px Arial;background:var(--promo-paper,#fff9f0);color:#252c27;cursor:pointer}.close:focus-visible{outline:3px solid #246ad5;outline-offset:-4px}iframe{width:100%;height:100%;border:0;display:block;padding-top:44px}.status{position:absolute;inset:70px 24px auto;font:14px/1.7 Arial;margin:0;color:#4c5448}.status[hidden]{display:none}@media(max-width:480px){.overlay{padding:16px}.dialog{height:min(600px,calc(100dvh - 32px));border-radius:12px}}";
    var overlay = document.createElement("div");
    overlay.className = "overlay";
    var dialog = document.createElement("div");
    dialog.className = "dialog";
    if (options.background) dialog.style.setProperty("--promo-paper", options.background);
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", config.title);
    var closeButton = document.createElement("button");
    closeButton.className = "close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Fermer le jeu");
    closeButton.textContent = "×";
    var status = document.createElement("p");
    status.className = "status";
    status.setAttribute("role", "status");
    status.textContent = "Le terrain se prépare…";
    var iframe = document.createElement("iframe");
    iframe.title = "Mini-jeu de basketball : gagnez votre code promo";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
    iframe.setAttribute("allow", "clipboard-write");
    iframe.referrerPolicy = "no-referrer";
    iframe.style.visibility = "hidden";
    var frameUrl = new URL("/play", serviceOrigin);
    frameUrl.searchParams.set("shop", shopId);
    frameUrl.searchParams.set("parent", window.location.origin);
    frameUrl.searchParams.set("channel", channel);
    iframe.src = frameUrl.href;
    var ready = false;
    var closed = false;
    var timeout;

    function send(type, extra) {
      iframe.contentWindow.postMessage(Object.assign({ protocol: protocol, channel: channel, type: type }, extra), serviceOrigin);
    }
    function focusFrame(edge) {
      if (!ready) { closeButton.focus(); return; }
      iframe.focus();
      send("focus", { edge: edge });
    }
    function onMessage(event) {
      var data = event.data;
      if (event.origin !== serviceOrigin || event.source !== iframe.contentWindow ||
          !data || typeof data !== "object" || data.protocol !== protocol || data.channel !== channel ||
          !["ready", "completed", "close", "focus-close"].includes(data.type)) return;
      if (expired()) { expireOffer(); return; }
      if (data.type === "ready") {
        send("init", { completed: completed(), options: options });
        if (ready) return;
        ready = true;
        clearTimeout(timeout);
        status.hidden = true;
        iframe.style.visibility = "visible";
        window.dispatchEvent(new CustomEvent("basketball-promo:opened"));
      }
      if (!ready) return;
      if (data.type === "completed") {
        write("localStorage", key + ":won", String(Date.now()));
        window.dispatchEvent(new CustomEvent("basketball-promo:completed", { detail: { shop: shopId, campaignId: config.campaignId } }));
      }
      if (data.type === "close") cleanup();
      if (data.type === "focus-close") closeButton.focus();
    }
    function onKey(event) {
      if (event.key === "Escape") { event.preventDefault(); cleanup(); }
      if (event.key === "Tab" && shadow.activeElement === closeButton) {
        event.preventDefault(); focusFrame(event.shiftKey ? "last" : "first");
      }
    }
    function onFocus(event) {
      if (!event.composedPath().includes(host)) closeButton.focus();
    }
    function cleanup() {
      if (closed) return;
      closed = true;
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocus, true);
      host.remove();
      backgroundElements.forEach(function (entry) { entry.element.inert = entry.inert; });
      document.documentElement.style.overflow = htmlOverflow;
      Object.keys(saved).forEach(function (property) { document.body.style[property] = saved[property]; });
      window.scrollTo(scrollX, scrollY);
      active = null;
      if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === "function") previousFocus.focus({ preventScroll: true });
      window.dispatchEvent(new CustomEvent("basketball-promo:closed"));
    }
    closeButton.addEventListener("click", cleanup);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) cleanup(); });
    window.addEventListener("message", onMessage);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocus, true);
    dialog.append(closeButton, status, iframe);
    overlay.append(dialog);
    shadow.append(style, overlay);
    active = { close: cleanup };
    document.body.append(host);
    Array.from(document.body.children).forEach(function (element) {
      if (element !== host && element instanceof HTMLElement) {
        backgroundElements.push({ element: element, inert: element.inert });
        element.inert = true;
      }
    });
    rememberSeen();
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = -scrollY + "px";
    document.body.style.left = -scrollX + "px";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    closeButton.focus();
    timeout = setTimeout(function () {
      status.textContent = "Le jeu n'a pas pu se charger. Fermez cette fenêtre et réessayez plus tard.";
      report("Chargement de l'iframe impossible. Vérifiez l'origine autorisée, le réseau et la CSP de la boutique.");
    }, 15000);
  }
  async function init() {
    options = readOptions();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(shopId)) throw new Error("Identifiant de boutique invalide.");
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 10000);
    try {
      var response = await fetch(new URL("/api/shops/" + encodeURIComponent(shopId), serviceOrigin), {
        mode: "cors", credentials: "omit", signal: controller.signal,
      });
      if (!response.ok) throw new Error("Configuration refusée (HTTP " + response.status + ").");
      var data = await response.json();
      if (!validConfig(data)) throw new Error("Format de configuration invalide.");
      config = data;
      key = "basketball-promo:" + shopId + ":" + config.campaignId;
      if (options.code || options.expiresAt) {
        key += ":" + encodeURIComponent(JSON.stringify([options.code || "", options.expiresAt || ""]));
      }
    } finally {
      clearTimeout(timeout);
    }
    if (document.readyState === "loading") {
      await new Promise(function (resolve) { document.addEventListener("DOMContentLoaded", resolve, { once: true }); });
    }
    watchExpiry();
    if (shouldOpen()) automaticTimer = setTimeout(show, config.openDelayMs);
  }
  initialized = init();
  initialized.catch(function (error) { report("Impossible d'initialiser le jeu.", error); });
  window.BasketballPromo = {
    open: async function () {
      await initialized;
      clearTimeout(automaticTimer);
      return show();
    },
    close: function () {
      clearTimeout(automaticTimer);
      close();
    },
    destroy: function () {
      clearTimeout(automaticTimer);
      clearTimeout(expiryTimer);
      close();
    },
  };
})();
