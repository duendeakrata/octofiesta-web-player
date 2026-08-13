/* Cliente de la API de Subsonic compatible con octo-fiesta (proxy transparente).
   Soporta autenticación por token (t = md5(password + salt)) y por contraseña (p). */

class SubsonicError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SubsonicError";
    this.code = code;
  }
}

class SubsonicClient {
  constructor({ baseUrl, username, password, authMode = "token" }) {
    this.baseUrl = String(baseUrl || "").replace(/\/+$/, "");
    this.username = username || "";
    this.password = password || "";
    this.authMode = authMode; // "token" | "password"
    this.clientName = "octofiesta-web";
    this.version = "1.16.1";
    this.salt = Math.random().toString(36).slice(2, 14);
    this.token = md5(this.password + this.salt);
  }

  _authParams() {
    const base = {
      u: this.username,
      v: this.version,
      c: this.clientName,
      f: "json",
    };
    if (this.authMode === "password") {
      base.p = this.password;
    } else {
      base.t = this.token;
      base.s = this.salt;
    }
    return base;
  }

  buildUrl(endpoint, params = {}) {
    const all = Object.assign({}, this._authParams(), params);
    const qs = Object.entries(all)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    return `${this.baseUrl}/rest/${endpoint}?${qs}`;
  }

  async request(endpoint, params = {}) {
    const url = this.buildUrl(endpoint, params);
    let res;
    try {
      res = await fetch(url, { credentials: "omit" });
      console.log("[octo-fiesta] OK", endpoint, res.status);
    } catch (e) {
      console.warn("[octo-fiesta] FAIL (red)", endpoint, e && e.message ? e.message : e);
      const err = new SubsonicError(0, t("api_network"));
      err.endpoint = endpoint;
      err.url = url;
      throw err;
    }
    if (!res.ok) {
      let msg = t("api_http", { n: res.status });
      try {
        const j = await res.json();
        const e = (j["subsonic-response"] || {}).error;
        if (e && e.message) msg = e.message;
      } catch (e2) { /* cuerpo no JSON */ }
      console.warn("[octo-fiesta] FAIL (http)", endpoint, res.status, msg);
      const err = new SubsonicError(res.status, msg);
      err.endpoint = endpoint;
      err.url = url;
      throw err;
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("json")) {
      const text = await res.text();
      const err = new SubsonicError(0, t("api_not_json"));
      err.endpoint = endpoint;
      err.url = url;
      throw err;
    }
    let json;
    try {
      json = await res.json();
    } catch (e) {
      const err = new SubsonicError(0, t("api_invalid"));
      err.endpoint = endpoint;
      err.url = url;
      throw err;
    }
    const resp = json["subsonic-response"] || json;
    if (!resp || resp.status !== "ok") {
      const err = resp && resp.error ? resp.error : {};
      let msg = err.message || t("api_unknown");
      if (err.code === 40) msg = t("api_40");
      if (err.code === 70) msg = t("api_70");
      if (err.code === 10) msg = t("api_10");
      console.warn("[octo-fiesta] FAIL (subsonic)", endpoint, err.code, msg);
      const e = new SubsonicError(err.code || 0, msg);
      e.endpoint = endpoint;
      e.url = url;
      throw e;
    }
    console.log("[octo-fiesta] RESPUESTA", endpoint, "status ok");
    return resp;
  }

  /* ---------- Endpoints con retroceso ----------
     Algunos servidores no soportan getAlbumList2/getArtists o devuelven
     error 70 cuando la biblioteca local está vacía. Probamos el equivalente
     clásico y, ante "data not found" (70) en listados, tratamos como vacío. */
  isNotFound(e) {
    return e instanceof SubsonicError && e.code === 70;
  }

  /* Busca en la respuesta (en cualquier profundidad) el array de objetos que
     parecen álbumes (con id/name/title/album). Algunos servidores los devuelven
     bajo claves no estándar. */
  findAlbumArray(resp) {
    let best = null;
    const walk = (obj) => {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        if (obj.length && obj.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
          const looks = obj.some((x) => x.id != null || x.name != null || x.title != null || x.album != null);
          if (looks && (!best || obj.length > best.length)) best = obj;
        }
        obj.forEach(walk);
        return;
      }
      Object.values(obj).forEach(walk);
    };
    walk(resp);
    return best;
  }

  /* Busca en la respuesta el array de objetos que parecen canciones (id + título/artista). */
  findSongArray(resp) {
    let best = null;
    const walk = (obj) => {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        if (obj.length && obj.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
          const looks = obj.some((x) => x.id != null && (x.title != null || x.artist != null || x.album != null || x.streamUrl != null));
          if (looks && (!best || obj.length > best.length)) best = obj;
        }
        obj.forEach(walk);
        return;
      }
      Object.values(obj).forEach(walk);
    };
    walk(resp);
    return best;
  }

  async listAlbums(type, { size = 30, offset = 0 } = {}) {
    let lastErr = null;
    for (const endpoint of ["getAlbumList2", "getAlbumList"]) {
      try {
        const resp = await this.request(endpoint, { type, size, offset });
        const found = this.findAlbumArray(resp) || SubsonicClient.toArray(resp.albumList2 || resp.albumList);
        if (found && found.length) return found;
        lastErr = null; // éxito pero sin álbumes en este endpoint
      } catch (e) {
        lastErr = e;
      }
    }
    // Si ambos endpoints "no encontraron datos" (código 70) → biblioteca vacía, no es un error.
    if (lastErr && !this.isNotFound(lastErr)) throw lastErr;
    return [];
  }

  async listArtists() {
    try {
      const resp = await this.request("getArtists");
      const ad = resp.artists || {};
      return { indexes: SubsonicClient.toArray(ad.index || ad.indexes), source: "getArtists" };
    } catch (e1) {
      if (!this.isNotFound(e1)) {
        // Error real en getArtists: probamos getIndexes igualmente
        try {
          const resp = await this.request("getIndexes");
          const ix = resp.indexes || {};
          return { indexes: SubsonicClient.toArray(ix.index || ix.indexes), source: "getIndexes" };
        } catch (e2) {
          throw e2;
        }
      }
      try {
        const resp = await this.request("getIndexes");
        const ix = resp.indexes || {};
        return { indexes: SubsonicClient.toArray(ix.index || ix.indexes), source: "getIndexes" };
      } catch (e2) {
        if (this.isNotFound(e2)) return { indexes: [], source: "getIndexes" };
        throw e2;
      }
    }
  }

  /* ---------- Helpers de normalización ---------- */
  static toArray(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "object") return Object.values(v);
    return [v];
  }

  /* ---------- Endpoints ---------- */
  ping() { return this.request("ping"); }
  getLicense() { return this.request("getLicense"); }

  getAlbumList2(type, { size = 50, offset = 0, musicFolderId, genre, fromYear, toYear } = {}) {
    const p = { type, size, offset };
    if (musicFolderId) p.musicFolderId = musicFolderId;
    if (genre) p.genre = genre;
    if (fromYear) p.fromYear = fromYear;
    if (toYear) p.toYear = toYear;
    return this.request("getAlbumList2", p);
  }

  getAlbumList(type, { size = 50, offset = 0 } = {}) {
    return this.request("getAlbumList", { type, size, offset });
  }

  getArtists({ musicFolderId } = {}) {
    return this.request("getArtists", musicFolderId ? { musicFolderId } : {});
  }

  getIndexes({ musicFolderId } = {}) {
    return this.request("getIndexes", musicFolderId ? { musicFolderId } : {});
  }

  getArtist(id) { return this.request("getArtist", { id }); }
  getAlbum(id) { return this.request("getAlbum", { id }); }
  getSong(id) { return this.request("getSong", { id }); }

  getPlaylists() { return this.request("getPlaylists", {}); }
  getPlaylist(id) { return this.request("getPlaylist", { id }); }

  /* Crea una playlist (opcionalmente con canciones iniciales). */
  async createPlaylist(name, songIds = []) {
    const p = { name };
    songIds.forEach((id, i) => { p["songId" + (i > 0 ? i : "")] = id; });
    return this.request("createPlaylist", p);
  }

  /* Actualiza una playlist: añade/quita canciones y/o renombra. */
  async updatePlaylist(playlistId, { add = [], remove = [], name } = {}) {
    const p = { playlistId };
    add.forEach((id, i) => { p["songIdToAdd" + (i > 0 ? i : "")] = id; });
    remove.forEach((idx, i) => { p["songIndexToRemove" + (i > 0 ? i : "")] = idx; });
    if (name) p.name = name;
    return this.request("updatePlaylist", p);
  }

  deletePlaylist(id) { return this.request("deletePlaylist", { id }); }

  async getRandomSongs(size = 50, genre, fromYear, toYear) {
    const p = { size };
    if (genre) p.genre = genre;
    if (fromYear) p.fromYear = fromYear;
    if (toYear) p.toYear = toYear;
    const resp = await this.request("getRandomSongs", p);
    const arr = this.findSongArray(resp) || SubsonicClient.toArray(resp.randomSongs);
    return arr.filter((s) => s && s.id);
  }

  getStarred() { return this.request("getStarred", {}); }
  getStarred2() { return this.request("getStarred2", {}); }

  search3(query, { artistCount = 10, albumCount = 20, songCount = 30, playlistCount = 5 } = {}) {
    return this.request("search3", { query, artistCount, albumCount, songCount, playlistCount });
  }

  star({ id, albumId, artistId }) {
    const p = {};
    if (id) p.id = id;
    if (albumId) p.albumId = albumId;
    if (artistId) p.artistId = artistId;
    return this.request("star", p);
  }

  unstar({ id, albumId, artistId }) {
    const p = {};
    if (id) p.id = id;
    if (albumId) p.albumId = albumId;
    if (artistId) p.artistId = artistId;
    return this.request("unstar", p);
  }

  scrobble(id, time, submission = true) {
    const p = { id, time: Math.floor(time || Date.now() / 1000), submission: submission ? "true" : "false" };
    return this.request("scrobble", p);
  }

  getLyricsBySongId(id) {
    return this.request("getLyricsBySongId", { id });
  }

  getNowPlaying() { return this.request("getNowPlaying", {}); }

  /* ---------- URLs para medios ---------- */
  streamUrl(id, extra = {}) {
    return this.buildUrl("stream", Object.assign({ id }, extra));
  }

  coverUrl(id, size = 300) {
    return this.buildUrl("getCoverArt", { id, size });
  }

  downloadUrl(id) {
    return this.buildUrl("download", { id });
  }
}
