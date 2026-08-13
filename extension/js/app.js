/* Bootstrap: estado global, router, conexión y enlace de eventos. */

const State = {
  client: null,
  player: null,
  connected: false,
  currentSongs: [],
  _seeking: false,
  _lastVol: 0.8,
  _rAF: null,
};

const CONFIG_KEY = "ofp.config";
const APP_TITLE = "OctoFiesta Web Player";
const APP_VERSION = "1.2.1";

/* ---------------- Config / conexión ---------------- */

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

function normalizeUrl(url) {
  let u = (url || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "http://" + u;
  return u.replace(/\/+$/, "");
}

async function connect(cfg) {
  const client = new SubsonicClient(cfg);
  await client.ping(); // lanza SubsonicError si falla
  State.client = client;
  State.connected = true;
  saveConfig(cfg);
  State.player = new Player(client);
  State.player.setVolume(Number(localStorage.getItem("ofp.volume")) || 0.8);
  subscribePlayer();
  restorePlayerState();
  refreshPlayerBar();
  renderQueue();
  document.getElementById("main").classList.remove("hidden");
  render();
  toast(t("connected_to", { url: client.baseUrl, ver: APP_VERSION }), "success", 3500);
}

/* Restaura la cola y la posición guardadas de la última sesión. */
function restorePlayerState() {
  try {
    const raw = localStorage.getItem("ofp.queue");
    if (!raw) return;
    const st = JSON.parse(raw);
    if (st && Array.isArray(st.songs) && st.songs.length) {
      const idx = Math.min(st.index || 0, st.songs.length - 1);
      State.player.loadQueue(st.songs, idx, false);
      if (typeof st.position === "number" && st.position > 1) {
        State.player.seek(st.position);
      }
      if (st.playing) State.player.play();
    }
  } catch (e) { /* datos corruptos: ignorar */ }
}

function disconnect() {
  if (State.player) State.player.clearQueue();
  State.player = null;
  State.client = null;
  State.connected = false;
  clearConfig();
  showConnectModal();
}

/* ---------------- Diagnóstico ---------------- */

function countItems(resp) {
  const walk = (obj) => {
    if (Array.isArray(obj)) return obj.length;
    if (obj && typeof obj === "object") {
      for (const k of Object.keys(obj)) {
        const n = walk(obj[k]);
        if (n !== null) return n;
      }
    }
    return null;
  };
  const n = walk(resp);
  return n === null ? "ok" : t("n_items", { n });
}

async function runDiagnostics() {
  const c = State.client;
  const results = [];
  const test = async (name, fn, describe) => {
    try {
      const r = await fn();
      results.push({ name, ok: true, detail: countItems(r) + (describe ? " — " + describe(r) : "") });
    } catch (e) {
      results.push({ name, ok: false, detail: (e.code != null ? "código " + e.code + " — " : "") + (e.message || e) + (e.endpoint ? " [" + e.endpoint + "]" : "") });
    }
  };
  const describeResp = (resp) => {
    const parts = [];
    let firstArr = null;
    const walk = (obj, path) => {
      if (obj == null) return;
      if (Array.isArray(obj)) {
        if (!firstArr && obj.length) firstArr = { path, arr: obj };
        if (parts.length < 8) parts.push(path + " array[" + obj.length + "]");
        obj.forEach((x, i) => walk(x, path + "[" + i + "]"));
        return;
      }
      if (typeof obj === "object") {
        Object.keys(obj).forEach((k) => walk(obj[k], path + "." + k));
      }
    };
    walk(resp, "resp");
    let detail = parts.join(" | ");
    if (firstArr) {
      const it = firstArr.arr[0];
      if (it && typeof it === "object") {
        const keys = Object.keys(it);
        if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
          const sample = keys.slice(0, 5).map((k) => {
            const v = it[k];
            let s;
            try { s = JSON.stringify(v); } catch (e2) { s = String(v); }
            return k + "=" + (s ? s.slice(0, 60) : "null");
          }).join(", ");
          detail += " · ITEM(claves numéricas): " + sample;
        } else {
          detail += " · ITEM: {" + keys.slice(0, 12).join(",")
            + (it.id != null ? ", id=" + it.id : "")
            + (it.name != null ? ", name=" + JSON.stringify(it.name).slice(0, 30) : "")
            + (it.title != null ? ", title=" + JSON.stringify(it.title).slice(0, 30) : "")
            + "}";
        }
      } else {
        detail += " · ITEM tipo: " + typeof it;
      }
    }
    return detail || "(sin arrays)";
  };
  await test("ping", () => c.ping());
  await test("getAlbumList2 (novedades)", () => c.getAlbumList2("newest", { size: 3 }), describeResp);
  await test("getAlbumList (novedades)", () => c.getAlbumList("newest", { size: 3 }), describeResp);
  await test("getArtists", () => c.getArtists());
  await test("getIndexes", () => c.getIndexes());
  await test("getPlaylists", () => c.getPlaylists());
  await test("getStarred2 (favoritas)", () => c.getStarred2());
  await test("getRandomSongs", () => c.getRandomSongs(3));
  await test("search3 'a'", () => c.search3("a", { artistCount: 1, albumCount: 1, songCount: 1 }));
  return results;
}

/* ---------------- Modal de conexión ---------------- */

function showConnectModal(prefill, errorMsg) {
  const p = prefill || {};
  const connected = State.connected;
  const body = `
    <form id="connect-form">
      <div class="field">
        <label for="cf-url">${t("server_url")}</label>
        <input type="text" id="cf-url" value="${esc(p.baseUrl || "http://localhost:5274")}" placeholder="http://localhost:5274" autocomplete="url">
      </div>
      <div class="field">
        <label for="cf-user">${t("username")}</label>
        <input type="text" id="cf-user" value="${esc(p.username || "")}" placeholder="${esc(t("username"))}" autocomplete="username">
      </div>
      <div class="field">
        <label for="cf-pass">${t("password")}</label>
        <input type="password" id="cf-pass" value="${esc(p.password || "")}" placeholder="${esc(t("password"))}" autocomplete="current-password">
      </div>
      <div class="field">
        <label for="cf-auth">${t("auth")}</label>
        <select id="cf-auth" style="width:100%;padding:10px 12px;border-radius:8px;background:var(--bg-elev-2);border:1px solid var(--border);color:var(--text);font-size:14px">
          <option value="token" ${p.authMode === "password" ? "" : "selected"}>${t("auth_token")}</option>
          <option value="password" ${p.authMode === "password" ? "selected" : ""}>${t("auth_password")}</option>
        </select>
      </div>
      <label class="check-row"><input type="checkbox" id="cf-remember" checked> ${t("remember")}</label>
      ${errorMsg ? `<p class="modal-error">${esc(errorMsg)}</p>` : ""}
      <div class="modal-actions">
        ${connected ? `<button type="button" class="btn btn-ghost" id="cf-disconnect">${icon("close")} ${t("disconnect")}</button>` : ""}
        ${connected ? `<button type="button" class="btn btn-ghost" id="cf-diagnose">${icon("search")} ${t("diagnose")}</button>` : ""}
        <div class="grow"></div>
        <button type="submit" class="btn btn-primary" id="cf-submit">${icon("check")} ${t("connect")}</button>
      </div>
    </form>
    <div id="diag-box"></div>`;
  const m = modal({
    title: t("connect_title"),
    subtitle: t("connect_subtitle"),
    body,
  });
  const form = m.el.querySelector("#connect-form");
  const submitBtn = m.el.querySelector("#cf-submit");
  const discBtn = m.el.querySelector("#cf-disconnect");
  const diagBtn = m.el.querySelector("#cf-diagnose");
  const diagBox = m.el.querySelector("#diag-box");
  const authSelect = m.el.querySelector("#cf-auth");

  if (diagBtn) {
    diagBtn.addEventListener("click", async () => {
      diagBtn.disabled = true;
      diagBtn.textContent = t("testing");
      diagBox.innerHTML = `<p class="modal-error" style="color:var(--text-dim)">${t("diag_running")}</p>`;
      try {
        const results = await runDiagnostics();
        diagBox.innerHTML = `<div style="margin-top:14px;border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <div style="padding:8px 12px;background:var(--bg-elev-2);font-weight:600;font-size:12.5px">${t("diag_title")}</div>
          ${results.map((r) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 12px;border-top:1px solid var(--border);font-size:12.5px">
            <span>${esc(r.name)}</span>
            <span style="${r.ok ? "color:#86efac" : "color:#fca5a5"}">${r.ok ? "OK · " + esc(r.detail) : "FALLA · " + esc(r.detail)}</span>
          </div>`).join("")}
        </div>`;
      } catch (e) {
        diagBox.innerHTML = `<p class="modal-error">${t("diag_failed", { error: e && e.message ? e.message : e })}</p>`;
      }
      diagBtn.disabled = false;
      diagBtn.innerHTML = `${icon("search")} ${t("diagnose")}`;
    });
  }

  function getCfg() {
    return {
      baseUrl: normalizeUrl(m.el.querySelector("#cf-url").value),
      username: m.el.querySelector("#cf-user").value.trim(),
      password: m.el.querySelector("#cf-pass").value,
      authMode: authSelect.value,
    };
  }

  authSelect.addEventListener("change", () => {
    if (authSelect.value === "password") toast(t("token_hint"), "", 5000);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cfg = getCfg();
    if (!cfg.baseUrl || !cfg.username || !cfg.password) {
      m.el.querySelector(".modal-error") && m.el.querySelector(".modal-error").remove();
      const p = document.createElement("p");
      p.className = "modal-error";
      p.textContent = t("fill_fields");
      form.appendChild(p);
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = t("connecting");
    try {
      await connect(cfg);
      if (!m.el.querySelector("#cf-remember").checked) clearConfig();
      m.close();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${icon("check")} ${t("connect")}`;
      let msg = err.message || t("conn_failed");
      if (err.code === 40) msg += " " + t("try_password");
      showConnectModal(cfg, msg);
      m.close();
    }
  });

  if (discBtn) {
    discBtn.addEventListener("click", () => { m.close(); disconnect(); });
  }
  m.el.querySelector("#cf-pass").focus();
}

/* ---------------- Router ---------------- */

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = h.split("?");
  const params = new URLSearchParams(queryPart || "");
  const parts = pathPart.split("/").filter(Boolean);
  return { route: parts[0] || "home", parts, params };
}

function setActiveNav(route) {
  document.querySelectorAll("#nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === route);
  });
}

async function render() {
  if (!State.connected) return;
  const { route, parts, params } = parseHash();
  const main = document.getElementById("main");
  setActiveNav(route);
  main.innerHTML = loadingView(t("loading"));
  try {
    let html;
    switch (route) {
      case "home": html = await Views.home(); break;
      case "albums": html = await Views.albums(params.get("type")); break;
      case "artists": html = await Views.artists(); break;
      case "artist": html = await Views.artist(decodeURIComponent(parts[1])); break;
      case "album": html = await Views.album(decodeURIComponent(parts[1])); break;
      case "playlists": html = await Views.playlists(); break;
      case "playlist": html = await Views.playlist(decodeURIComponent(parts[1])); break;
      case "starred": html = await Views.starred(); break;
      case "search": html = await Views.search(params.get("q") || ""); break;
      case "random": html = await Views.random(); break;
      default: html = await Views.home();
    }
    main.innerHTML = html;
    main.scrollTop = 0;
    bindSearchInput();
    bindIndexBar();
    markPlayingRows();
  } catch (e) {
    main.innerHTML = errorView(e.message || "Error inesperado.", e.endpoint, e.url);
  }
}

function bindSearchInput() {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      location.hash = "#/search?q=" + encodeURIComponent(input.value.trim());
    }
  });
}

function bindIndexBar() {
  document.querySelectorAll("[data-index-letter]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const el = document.getElementById("a-" + a.dataset.indexLetter);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ---------------- Acciones delegadas ---------------- */

async function playAlbum(id) {
  try {
    const resp = await State.client.getAlbum(id);
    const songs = SubsonicClient.toArray(resp.album && resp.album.song).filter((s) => !s.isDir);
    State.currentSongs = songs;
    State.player.loadQueue(songs, 0, true);
  } catch (e) {
    toast(t("album_play_error", { error: e.message }), "error");
  }
}

async function playArtist(id) {
  try {
    const resp = await State.client.getArtist(id);
    const albums = SubsonicClient.toArray(resp.artist && resp.artist.album);
    const list = await Promise.all(albums.map(async (a) => {
      try {
        const r = await State.client.getAlbum(a.id);
        return SubsonicClient.toArray(r.album && r.album.song).filter((s) => !s.isDir);
      } catch (err) {
        return [];
      }
    }));
    const songs = list.flat().sort((a, b) =>
      (a.discNumber || 0) - (b.discNumber || 0) || (a.track || 0) - (b.track || 0));
    State.currentSongs = songs;
    if (songs.length) State.player.loadQueue(songs, 0, true);
    else toast(t("no_playable"), "error");
  } catch (e) {
    toast(t("artist_play_error", { error: e.message }), "error");
  }
}

async function toggleStar(type, id, btn) {
  const isStarred = btn.classList.contains("is-starred") || btn.classList.contains("starred");
  const params = {};
  if (type === "song") params.id = id;
  if (type === "album") params.albumId = id;
  if (type === "artist") params.artistId = id;
  try {
    if (isStarred) await State.client.unstar(params);
    else await State.client.star(params);
    btn.classList.toggle("is-starred", !isStarred);
    btn.classList.toggle("starred", !isStarred);
    toast(isStarred ? t("unfavorited") : t("favorited"), "success");
  } catch (e) {
    toast(t("star_error", { error: e.message }), "error");
  }
}

/* ---------- Playlists: crear y añadir canciones ---------- */

function refreshPlaylistsIfNeeded() {
  if (parseHash().route === "playlists") render();
}

function showNewPlaylistModal() {
  const body = `
    <div class="field">
      <label for="np-name">${t("playlist_name")}</label>
      <input type="text" id="np-name" placeholder="${esc(t("playlist_name"))}">
    </div>
    <p class="modal-error" id="np-err" style="display:none"></p>
    <div class="modal-actions">
      <div class="grow"></div>
      <button class="btn btn-primary" id="np-create">${icon("check")} ${t("create")}</button>
    </div>`;
  const m = modal({ title: t("new_playlist"), body });
  m.el.querySelector("#np-create").addEventListener("click", async () => {
    const nameInput = m.el.querySelector("#np-name");
    const err = m.el.querySelector("#np-err");
    const name = nameInput.value.trim();
    if (!name) { err.style.display = "block"; err.textContent = t("name_required"); return; }
    try {
      await State.client.createPlaylist(name, []);
      toast(t("created_playlist"), "success");
      m.close();
      refreshPlaylistsIfNeeded();
    } catch (e) {
      err.style.display = "block";
      err.textContent = t("playlist_error", { error: e.message });
    }
  });
}

async function showPlaylistPicker(songIds) {
  let lists = [];
  try {
    const resp = await State.client.getPlaylists();
    lists = SubsonicClient.toArray(resp.playlists && resp.playlists.playlist ? resp.playlists.playlist : resp.playlist)
      .filter((p) => !isExternal(p.id));
  } catch (e) { /* sin playlists */ }
  const options = `<option value="">${t("create_new")}…</option>` +
    lists.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
  const body = `
    <div class="field">
      <label for="pp-select">${t("select_playlist")}</label>
      <select id="pp-select" style="width:100%;padding:10px 12px;border-radius:8px;background:var(--bg-elev-2);border:1px solid var(--border);color:var(--text);font-size:14px">${options}</select>
    </div>
    <div class="field">
      <label for="pp-name">${t("create_new")}</label>
      <input type="text" id="pp-name" placeholder="${esc(t("playlist_name"))}">
    </div>
    <p class="modal-error" id="pp-err" style="display:none"></p>
    <div class="modal-actions">
      <div class="grow"></div>
      <button class="btn btn-primary" id="pp-confirm">${icon("check")} ${t("add")}</button>
    </div>`;
  const m = modal({ title: t("add_to_playlist"), subtitle: t("choose_playlist"), body });
  const sel = m.el.querySelector("#pp-select");
  const nameInput = m.el.querySelector("#pp-name");
  const err = m.el.querySelector("#pp-err");
  m.el.querySelector("#pp-confirm").addEventListener("click", async () => {
    const newName = nameInput.value.trim();
    err.style.display = "none";
    try {
      if (sel.value === "") {
        if (!newName) { err.style.display = "block"; err.textContent = t("name_required"); return; }
        await State.client.createPlaylist(newName, songIds);
        toast(t("created_playlist"), "success");
      } else {
        await State.client.updatePlaylist(sel.value, { add: songIds });
        toast(t("added_playlist"), "success");
      }
      m.close();
      refreshPlaylistsIfNeeded();
    } catch (e) {
      err.style.display = "block";
      err.textContent = t("playlist_error", { error: e.message });
    }
  });
}

document.addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action === "play-row") {
      const i = Number(actionEl.dataset.index);
      if (State.player && State.currentSongs[i]) State.player.loadQueue(State.currentSongs, i, true);
      return;
    }
    if (action === "play-album") { e.stopPropagation(); playAlbum(actionEl.dataset.id); return; }
    if (action === "play-artist") { playArtist(actionEl.dataset.id); return; }
    if (action === "play-current") {
      if (State.currentSongs.length) State.player.loadQueue(State.currentSongs, 0, true);
      return;
    }
    if (action === "enqueue-current") {
      if (State.currentSongs.length) { State.player.enqueue(State.currentSongs); toast(t("added_queue"), "success"); }
      return;
    }
    if (action === "star-song") { toggleStar("song", actionEl.dataset.id, actionEl); return; }
    if (action === "star-album") { toggleStar("album", actionEl.dataset.id, actionEl); return; }
    if (action === "star-artist") { toggleStar("artist", actionEl.dataset.id, actionEl); return; }
    if (action === "albums-more") { loadMoreAlbums(); return; }
    if (action === "random-play") { location.hash = "#/random"; return; }
    if (action === "new-playlist") { showNewPlaylistModal(); return; }
    if (action === "add-to-playlist") {
      const i = Number(actionEl.dataset.index);
      if (State.currentSongs[i] && State.currentSongs[i].id) showPlaylistPicker([State.currentSongs[i].id]);
      return;
    }
    if (action === "add-album-playlist") {
      const ids = State.currentSongs.filter((s) => s && s.id).map((s) => s.id);
      if (ids.length) showPlaylistPicker(ids);
      return;
    }
    if (action === "delete-playlist") {
      if (window.confirm(t("confirm_delete_playlist"))) {
        State.client.deletePlaylist(actionEl.dataset.id)
          .then(() => { toast(t("deleted_playlist"), "success"); refreshPlaylistsIfNeeded(); })
          .catch((e) => toast(t("playlist_error", { error: e.message }), "error"));
      }
      return;
    }
    if (action === "do-search") {
      const input = document.getElementById("search-input");
      if (input && input.value.trim()) location.hash = "#/search?q=" + encodeURIComponent(input.value.trim());
      return;
    }
    if (action === "back") {
      if (window.history.length > 1) window.history.back();
      else location.hash = "#/";
      return;
    }
  }

  // Clic en fila de canción → reproducir
  const row = e.target.closest(".song-row");
  if (row && !e.target.closest("button,a,input")) {
    const i = Number(row.dataset.index);
    if (State.player && State.currentSongs[i]) State.player.loadQueue(State.currentSongs, i, true);
    return;
  }

  // Navegación por tarjetas
  const navAlbum = e.target.closest("[data-nav-album]");
  if (navAlbum) { location.hash = "#/album/" + encodeURIComponent(navAlbum.dataset.navAlbum); return; }
  const navArtist = e.target.closest("[data-nav-artist]");
  if (navArtist) { location.hash = "#/artist/" + encodeURIComponent(navArtist.dataset.navArtist); return; }
  const navPlaylist = e.target.closest("[data-nav-playlist]");
  if (navPlaylist) { location.hash = "#/playlist/" + encodeURIComponent(navPlaylist.dataset.navPlaylist); return; }

  // Tabs de búsqueda
  const tab = e.target.closest("[data-tab]");
  if (tab) { setTab(tab.dataset.tab); return; }

  // Cola: reproducir / quitar
  const qRemove = e.target.closest("[data-qremove]");
  if (qRemove) { e.stopPropagation(); if (State.player) State.player.removeFromQueue(Number(qRemove.dataset.qremove)); return; }
  const qItem = e.target.closest("[data-qindex]");
  if (qItem) { if (State.player) State.player.playAt(Number(qItem.dataset.qindex)); return; }
});

async function loadMoreAlbums() {
  const pager = State._albumPager;
  if (!pager) return;
  const btn = document.querySelector('[data-action="albums-more"]');
  if (btn) btn.disabled = true;
  try {
    const more = await State.client.listAlbums(pager.type, { size: 30, offset: pager.offset + 30 });
    pager.list = pager.list.concat(more);
    pager.offset += 30;
    const grid = document.getElementById("albums-grid");
    if (grid) {
      const cont = document.createElement("div");
      cont.className = "album-grid";
      cont.innerHTML = more.map(albumCard).join("");
      grid.appendChild(cont);
    }
    const countEl = document.querySelector('.view-head p[data-count]');
    if (countEl) countEl.textContent = t("albums_loaded", { n: pager.list.length });
    markPlayingRows();
    if (btn) btn.disabled = false;
  } catch (e) {
    toast(t("load_more_error", { error: e.message }), "error");
    if (btn) btn.disabled = false;
  }
}

/* ---------------- Player bar UI ---------------- */

function refreshPlayerBar() {
  const p = State.player;
  const playBtn = document.getElementById("pb-play");
  playBtn.innerHTML = p && !p.audio.paused ? icon("pause") : icon("play");
  const seek = document.getElementById("pb-seek");
  const dur = p && p.audio.duration || 0;
  const t = p ? p.audio.currentTime : 0;
  const pct = dur ? (t / dur) * 100 : 0;
  seek.value = dur ? (t / dur) * 1000 : 0;
  seek.style.backgroundSize = pct + "% 100%";
  document.getElementById("pb-current").textContent = formatTime(t);
  document.getElementById("pb-duration").textContent = formatTime(dur);
  document.getElementById("pb-shuffle").classList.toggle("active", !!p && p.shuffle);
  const repeatBtn = document.getElementById("pb-repeat");
  repeatBtn.innerHTML = p && p.repeat === "one" ? icon("repeat-one") : icon("repeat");
  repeatBtn.classList.toggle("active", !!p && p.repeat !== "off");
  const vol = document.getElementById("pb-vol");
  vol.value = Math.round((p ? p.volume : 0.8) * 100);
  vol.style.backgroundSize = vol.value + "% 100%";
  document.getElementById("pb-mute").innerHTML = p && p.volume === 0 ? icon("volume-x") : icon("volume");
}

function updateTrackBar(song) {
  const img = document.getElementById("pb-cover-img");
  document.getElementById("pb-title").textContent = song ? song.title || "" : t("no_track");
  document.getElementById("pb-artist").textContent = song ? (song.artist || "") + (song.album ? " — " + song.album : "") : t("connect_hint");
  if (song && song.coverArt) {
    img.src = State.client.coverUrl(song.coverArt, 200);
    img.hidden = false;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
  }
  const star = document.getElementById("pb-star");
  const addBtn = document.getElementById("pb-add-playlist");
  const lyricsBtn = document.getElementById("pb-lyrics");
  if (song) {
    star.removeAttribute("data-hidden");
    star.classList.toggle("starred", !!song.starred);
    addBtn.removeAttribute("data-hidden");
    lyricsBtn.removeAttribute("data-hidden");
  } else {
    star.setAttribute("data-hidden", "");
    addBtn.setAttribute("data-hidden", "");
    lyricsBtn.setAttribute("data-hidden", "");
  }
}

function subscribePlayer() {
  const p = State.player;
  p.on("track", (song) => {
    updateTrackBar(song);
    refreshPlayerBar();
    markPlayingRows();
  });
  p.on("play", () => { document.getElementById("pb-play").innerHTML = icon("pause"); refreshPlayerBar(); });
  p.on("pause", () => { document.getElementById("pb-play").innerHTML = icon("play"); refreshPlayerBar(); });
  p.on("time", () => {
    refreshPlayerBar();
    updateLyricsHighlight();
  });
  p.on("duration", () => refreshPlayerBar());
  p.on("stop", () => { refreshPlayerBar(); updateTrackBar(null); });
  p.on("queue", () => renderQueue());
  p.on("lyrics", () => renderLyrics());
  p.on("error", (err) => toast(err.message || t("player_error"), "error"));
  p.on("volume", () => refreshPlayerBar());
}

/* ---------------- Paneles: cola y letras ---------------- */

function renderQueue() {
  const list = document.getElementById("queue-list");
  const p = State.player;
  if (!p || !p.queue.length) {
    list.innerHTML = `<div class="no-lyrics" style="padding:30px">${t("empty_queue")}</div>`;
    return;
  }
  list.innerHTML = p.queue.map((item, i) => `
    <div class="queue-item${i === p.index ? " current" : ""}" data-qindex="${i}">
      <span class="q-num">${i === p.index ? icon("volume") : i + 1}</span>
      <div class="q-info">
        <div class="q-title">${esc(item.song.title)}</div>
        <div class="q-sub">${esc(item.song.artist || "")}${item.song.album ? " — " + esc(item.song.album) : ""}</div>
      </div>
      <button class="q-remove" data-qremove="${i}" title="Quitar">${icon("trash")}</button>
    </div>`).join("");
}

function renderLyrics() {
  const body = document.getElementById("lyrics-body");
  const p = State.player;
  if (!p || !p.lyrics || !p.lyrics.lines.length) {
    body.innerHTML = `<div class="no-lyrics">${t("no_lyrics")}</div>`;
    return;
  }
  const L = p.lyrics;
  if (!L.synced) {
    body.innerHTML = `<div class="lyric-line" style="color:var(--text-dim)">${t("lyrics_unsynced")}</div>` + L.lines.map((l) => `<div class="lyric-line">${esc(l.value || "♪")}</div>`).join("");
    return;
  }
  body.innerHTML = L.lines.map((l) => `<div class="lyric-line">${esc(l.value || "♪")}</div>`).join("");
}

function updateLyricsHighlight() {
  const panel = document.getElementById("panel-lyrics");
  if (panel.hidden) return;
  const p = State.player;
  if (!p || !p.lyrics || !p.lyrics.synced) return;
  const active = p.activeLyricLine();
  const els = panel.querySelectorAll(".lyric-line");
  els.forEach((el, i) => el.classList.toggle("active", i === active));
  if (active >= 0) {
    const target = els[active];
    if (target && panel.scrollTop + panel.clientHeight < target.offsetTop + target.offsetHeight - 60) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (target && target.offsetTop < panel.scrollTop + 40) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

/* ---------------- Controles de la barra ---------------- */

function bindPlayerBar() {
  const $ = (id) => document.getElementById(id);

  $("pb-play").addEventListener("click", () => State.player && State.player.toggle());
  $("pb-prev").addEventListener("click", () => State.player && State.player.prev());
  $("pb-next").addEventListener("click", () => State.player && State.player.next());
  $("pb-shuffle").addEventListener("click", () => State.player && State.player.toggleShuffle());

  $("pb-repeat").addEventListener("click", () => State.player && State.player.toggleRepeat());

  const seek = $("pb-seek");
  seek.addEventListener("input", () => {
    const dur = State.player && State.player.audio.duration || 0;
    const t = (seek.value / 1000) * dur;
    seek.style.backgroundSize = (seek.value / 10) + "% 100%";
    $("pb-current").textContent = formatTime(t);
  });
  seek.addEventListener("change", () => {
    const dur = State.player && State.player.audio.duration || 0;
    if (State.player) State.player.seek((seek.value / 1000) * dur);
  });

  const vol = $("pb-vol");
  vol.addEventListener("input", () => {
    const v = vol.value / 100;
    vol.style.backgroundSize = vol.value + "% 100%";
    if (State.player) State.player.setVolume(v);
  });
  $("pb-mute").addEventListener("click", () => {
    const p = State.player;
    if (!p) return;
    if (p.volume > 0) { State._lastVol = p.volume; p.setVolume(0); }
    else p.setVolume(State._lastVol || 0.8);
  });

  $("pb-queue").addEventListener("click", () => { togglePanel("panel-queue"); renderQueue(); });
  $("pb-lyrics").addEventListener("click", () => { togglePanel("panel-lyrics"); renderLyrics(); });

  $("pb-add-playlist").addEventListener("click", () => {
    const song = State.player && State.player.song;
    if (song && song.id) showPlaylistPicker([song.id]);
  });

  $("pb-star").addEventListener("click", () => {
    const song = State.player && State.player.song;
    if (!song) return;
    const btn = $("pb-star");
    const isStarred = btn.classList.contains("starred");
    const params = { id: song.id };
    (isStarred ? State.client.unstar(params) : State.client.star(params))
      .then(() => { btn.classList.toggle("starred", !isStarred); toast(isStarred ? t("unfavorited") : t("favorited"), "success"); })
      .catch((e) => toast(t("star_error", { error: e.message }), "error"));
  });

  $("btn-settings").addEventListener("click", () => {
    const cfg = loadConfig() || {};
    showConnectModal(cfg);
  });

  $("btn-about").addEventListener("click", showAbout);

  const langSel = document.getElementById("lang-select");
  if (langSel) {
    langSel.value = LANG;
    langSel.addEventListener("change", () => {
      setLang(langSel.value);
      render();
    });
  }
}

function showAbout() {
  const m = modal({
    title: "OctoFiesta Web Player",
    subtitle: t("about_subtitle"),
    body: `
      <p style="color:var(--text-dim);font-size:13px;line-height:1.65;margin:0">
        ${t("about_body")}<br><br>
        <strong>${t("version_word")}:</strong> ${APP_VERSION}<br>
        <strong>${t("created_by")}:</strong> duendeakrata
      </p>
      <div class="modal-actions" style="margin-top:20px">
        <div class="grow"></div>
        <button class="btn btn-primary" data-close-about>${t("ok")}</button>
      </div>`,
  });
  const btn = m.el.querySelector("[data-close-about]");
  if (btn) btn.addEventListener("click", () => m.close());
}

/* ---------------- Atajos de teclado ---------------- */

function bindKeyboard() {
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (!State.player) return;
    if (e.code === "Space") { e.preventDefault(); State.player.toggle(); }
    else if (e.key === "ArrowRight") State.player.seek(State.player.audio.currentTime + 5);
    else if (e.key === "ArrowLeft") State.player.seek(State.player.audio.currentTime - 5);
    else if (e.key === "n" || e.key === "N") State.player.next();
    else if (e.key === "p" || e.key === "P") State.player.prev();
    else if (e.key === "m" || e.key === "M") document.getElementById("pb-mute").click();
  });
}

/* ---------------- Init ---------------- */

/* Control desde el popup de la extensión (solo aplica cuando la app corre
   como página de extensión; en web/file:// chrome.runtime no existe). */
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const p = State.player;
    if (!msg || !p) { sendResponse({ state: null }); return; }
    if (msg.action === "control") {
      const cmd = msg.cmd;
      if (cmd === "toggle") p.toggle();
      else if (cmd === "next") p.next();
      else if (cmd === "prev") p.prev();
      else if (cmd === "seek" && typeof msg.t === "number") p.seek(msg.t);
      else if (cmd === "volume" && typeof msg.v === "number") p.setVolume(msg.v);
    }
    const song = p.song;
    sendResponse({
      state: {
        connected: State.connected,
        hasTrack: !!song,
        title: song ? song.title || "" : "",
        artist: song ? song.artist || "" : "",
        album: song ? song.album || "" : "",
        coverUrl: song && song.coverArt ? State.client.coverUrl(song.coverArt, 220) : "",
        playing: !p.audio.paused,
        position: p.audio.currentTime || 0,
        duration: p.audio.duration || 0,
        volume: p.volume,
      },
    });
  });
}

window.addEventListener("hashchange", render);

async function init() {
  setLang(LANG);
  bindPlayerBar();
  bindKeyboard();
  const saved = loadConfig();
  if (saved) {
    try {
      await connect(saved);
    } catch (e) {
      showConnectModal(saved, t("conn_failed") + " " + e.message);
    }
  } else {
    showConnectModal();
  }
}

document.addEventListener("DOMContentLoaded", init);
