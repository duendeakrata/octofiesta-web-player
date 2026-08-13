/* Utilidades de UI: escaping, tiempo, iconos, toasts, modales. */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(sec) {
  if (!isFinite(sec) || sec == null || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function icon(name, cls) {
  return `<svg class="ic${cls ? " " + cls : ""}"><use href="#i-${name}"/></svg>`;
}

function placeholderIcon(name, size) {
  return `<svg class="ic${size ? " " + size : ""}"><use href="#i-${name || "music"}"/></svg>`;
}

/* Portada con fallback: si la imagen falla se oculta y queda el placeholder.
   label → se muestra la letra inicial del álbum/artista sobre un degradado. */
function coverHtml(id, size, name, label) {
  if (!id) return placeholderBlock(name, label);
  return `<img loading="lazy" src="${esc(id)}" alt="" onerror="this.style.display='none'">${placeholderBlock(name, label)}`;
}

function placeholderBlock(name, label) {
  const initial = label ? String(label).trim().charAt(0) : "";
  if (initial) {
    return `<div class="cover-placeholder"><span class="cover-letter">${esc(initial.toUpperCase())}</span></div>`;
  }
  return `<div class="cover-placeholder">${placeholderIcon(name || "music")}</div>`;
}

function toast(msg, type = "", ms = 3200) {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; }, ms - 300);
  setTimeout(() => el.remove(), ms);
}

function modal({ title, subtitle, body, onClose }) {
  const root = document.getElementById("modal-root");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>${esc(title)}</h2>
      ${subtitle ? `<p class="modal-sub">${esc(subtitle)}</p>` : ""}
      <div class="modal-body">${body}</div>
    </div>`;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  const close = () => { overlay.remove(); if (onClose) onClose(); };
  const closeBtn = document.createElement("button");
  closeBtn.className = "icon-btn";
  closeBtn.style.cssText = "position:absolute;top:16px;right:16px";
  closeBtn.innerHTML = icon("close");
  closeBtn.title = t("close");
  closeBtn.addEventListener("click", close);
  overlay.querySelector(".modal").appendChild(closeBtn);
  overlay.querySelector(".modal").style.position = "relative";
  root.appendChild(overlay);
  return { close, el: overlay };
}

function togglePanel(id) {
  const panel = document.getElementById(id);
  if (!panel) return;
  const wasHidden = panel.hidden;
  document.querySelectorAll(".slide-panel").forEach((p) => { p.hidden = true; });
  if (wasHidden) {
    panel.hidden = false;
    const close = panel.querySelector("[data-close]");
    if (close) {
      close.onclick = (e) => { e.stopPropagation(); panel.hidden = true; };
    }
  }
}

function skeletonCards(count = 8) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `<div class="album-card" style="opacity:.4">
      <div class="album-cover" style="background:var(--bg-elev)"><div class="cover-placeholder"><svg class="ic" style="width:28px;height:28px;color:var(--text-faint)"><use href="#i-music"/></svg></div></div>
      <div class="ac-name" style="height:14px;background:var(--bg-elev);border-radius:4px;margin-top:10px"></div>
      <div class="ac-artist" style="height:12px;background:var(--bg-elev);border-radius:4px;margin-top:6px;width:60%"></div>
    </div>`;
  }
  return html;
}

function loadingView(text) {
  return `<div class="view-loading" style="display:flex;flex-direction:column;gap:14px">${icon("spinner", "spinner")}<div>${esc(text || t("loading"))}</div></div>`;
}

function errorView(msg, endpoint, url) {
  let extra = "";
  if (endpoint) extra += `<br><small style="color:var(--text-faint)">Endpoint: ${esc(endpoint)}</small>`;
  if (url) extra += `<br><small style="color:var(--text-faint)">URL: ${esc(redactUrl(url))}</small>`;
  return `<div class="empty-state">
    <div class="empty-state-icon">${icon("close")}</div>
    <h3>${t("error_occurred")}</h3>
    <p>${esc(msg)}${extra}</p>
    <button class="btn btn-primary" onclick="hardReload()">${t("reload")}</button>
  </div>`;
}

/* Recarga la página saltándose la caché del navegador (añade un parámetro nuevo a la URL). */
function hardReload() {
  const q = new URLSearchParams(location.search);
  q.set("_t", Date.now().toString());
  location.search = q.toString();
}

function redactUrl(url) {
  try {
    const u = new URL(url);
    ["t", "s", "p"].forEach((k) => { if (u.searchParams.has(k)) u.searchParams.set(k, "***"); });
    return u.toString();
  } catch (e) {
    return url;
  }
}

function emptyView(text, iconName) {
  return `<div class="empty-state">${icon(iconName || "music")}<p>${esc(text)}</p></div>`;
}

function externalBadge(label) {
  return `<span class="ext-badge">${icon("external")}${esc(label || "stream")}</span>`;
}

/* Devuelve la etiqueta proveedor para un id externo (ext-{proveedor}-...) */
function providerLabel(id) {
  if (!id || !String(id).startsWith("ext-")) return null;
  const parts = String(id).split("-");
  if (parts.length >= 3) return parts[1];
  return null;
}

function isExternal(id) {
  return !!id && String(id).startsWith("ext-");
}
