/* Motor de reproducción: cola, mezcla, repetición, Media Session y letras. */

class Player {
  constructor(client) {
    this.client = client;
    this.queue = [];       // [{ song }]
    this.index = -1;
    this.shuffle = false;
    this.repeat = "off";   // off | all | one
    this.order = [];       // orden de reproducción (índices de queue)
    this.orderPos = 0;
    this.lyrics = null;    // { synced, lines:[{start,value}], displayArtist, displayTitle }
    this.audio = new Audio();
    this.audio.preload = "auto";
    this._listeners = {};
    this._lyricsTimer = null;
    this._lastPersist = 0;
    this._bindAudio();
    this._bindMediaSession();
    this.volume = Number(localStorage.getItem("ofp.volume")) || 0.8;
    this.audio.volume = Math.min(1, Math.max(0, this.volume));
  }

  on(evt, fn) { (this._listeners[evt] = this._listeners[evt] || []).push(fn); }
  emit(evt, ...args) { (this._listeners[evt] || []).forEach((fn) => fn(...args)); }

  /* Persistencia de cola + posición en localStorage. */
  _persist() {
    try {
      const song = this.current ? this.current.song : null;
      localStorage.setItem("ofp.queue", JSON.stringify({
        songs: this.queue.map((q) => q.song),
        index: this.index,
        position: this.audio.currentTime || 0,
        duration: this.audio.duration || 0,
        playing: !this.audio.paused && !this.audio.ended,
        ts: Date.now(),
      }));
    } catch (e) { /* sin espacio o no disponible */ }
  }
  _persistThrottled() {
    const now = Date.now();
    if (now - this._lastPersist < 4000) return;
    this._lastPersist = now;
    this._persist();
  }

  _bindAudio() {
    this.audio.addEventListener("timeupdate", () => { this.emit("time", this.audio.currentTime); this._persistThrottled(); });
    this.audio.addEventListener("loadedmetadata", () => this.emit("duration", this.audio.duration));
    this.audio.addEventListener("play", () => { this.emit("play"); this._persist(); });
    this.audio.addEventListener("pause", () => { this.emit("pause"); this._persist(); });
    this.audio.addEventListener("waiting", () => this.emit("buffering", true));
    this.audio.addEventListener("canplay", () => this.emit("buffering", false));
    this.audio.addEventListener("ended", () => this._onEnded());
    this.audio.addEventListener("error", () => this._onError());
  }

  _bindMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => this.play());
    ms.setActionHandler("pause", () => this.pause());
    ms.setActionHandler("previoustrack", () => this.prev());
    ms.setActionHandler("nexttrack", () => this.next());
    ms.setActionHandler("seekto", (d) => { if (d.seekTime != null) this.seek(d.seekTime); });
  }

  get current() {
    return this.index >= 0 && this.index < this.queue.length ? this.queue[this.index] : null;
  }

  get song() { return this.current ? this.current.song : null; }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, v));
    this.audio.volume = this.volume;
    localStorage.setItem("ofp.volume", this.volume);
    this.emit("volume", this.volume);
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    if (this.shuffle) this._rebuildOrder(this.index >= 0 ? this.index : 0);
    this.emit("shuffle", this.shuffle);
  }

  toggleRepeat() {
    this.repeat = this.repeat === "off" ? "all" : this.repeat === "all" ? "one" : "off";
    this.emit("repeat", this.repeat);
  }

  _rebuildOrder(startIndex) {
    const n = this.queue.length;
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (startIndex >= 0) {
      const pos = idx.indexOf(startIndex);
      if (pos > 0) { idx.splice(pos, 1); idx.unshift(startIndex); }
    }
    this.order = idx;
    this.orderPos = 0;
  }

  _queueIndexForOrder() {
    return this.order[this.orderPos];
  }

  loadQueue(songs, startIndex = 0, autoplay = true) {
    this.queue = songs.map((s) => ({ song: s }));
    this.lyrics = null;
    if (!this.queue.length) { this.index = -1; this.emit("queue"); return; }
    if (this.shuffle) this._rebuildOrder(Math.min(startIndex, this.queue.length - 1));
    else this.index = Math.min(startIndex, this.queue.length - 1);
    this.emit("queue");
    if (autoplay) this._playAt(this.shuffle ? this._queueIndexForOrder() : this.index);
    else if (this.shuffle) this.index = this._queueIndexForOrder();
    this._persist();
  }

  enqueue(songs) {
    const offset = this.queue.length;
    songs.forEach((s) => this.queue.push({ song: s }));
    if (this.shuffle) this._rebuildOrder(this.index >= 0 ? this.index : 0);
    this.emit("queue");
    this._persist();
    return offset;
  }

  playAt(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.index = index;
    if (this.shuffle) this._rebuildOrder(index);
    this._playAt(index);
  }

  _playAt(queueIndex) {
    const item = this.queue[queueIndex];
    if (!item) return;
    this.index = queueIndex;
    const url = this.client.streamUrl(item.song.id);
    this.audio.src = url;
    this.audio.play().catch((e) => {
      if (e && (e.name === "NotAllowedError" || e.name === "AbortError")) {
        // Autoplay bloqueado por el navegador: quedamos en pausa, el usuario pulsa play.
        this.emit("pause");
      } else {
        this.emit("error", new Error(t("audio_error", { error: e && e.message ? e.message : e })));
      }
    });
    this.client.scrobble(item.song.id, Math.round(Date.now() / 1000), false).catch(() => {});
    this.emit("track", item.song, queueIndex);
    this._loadLyrics(item.song.id);
    this._updateMediaSession(item.song);
    this._persist();
  }

  play() {
    if (!this.queue.length) return;
    if (!this.audio.src) {
      this._playAt(this.index >= 0 ? this.index : 0);
      return;
    }
    this.audio.play().catch(() => {});
  }

  pause() { this.audio.pause(); }

  toggle() {
    if (this.audio.paused) this.play(); else this.pause();
  }

  seek(seconds) {
    if (!isFinite(seconds)) return;
    this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
    this.emit("time", this.audio.currentTime);
    this._persist();
  }

  next() {
    if (!this.queue.length) return;
    if (this.repeat === "one") { this.seek(0); this.play(); return; }
    if (this.shuffle) {
      this.orderPos++;
      if (this.orderPos >= this.order.length) {
        if (this.repeat === "all") this.orderPos = 0;
        else { this.stop(); return; }
      }
      this._playAt(this._queueIndexForOrder());
    } else {
      let n = this.index + 1;
      if (n >= this.queue.length) {
        if (this.repeat === "all") n = 0;
        else { this.stop(); return; }
      }
      this._playAt(n);
    }
    this._persist();
  }

  prev() {
    if (!this.queue.length) return;
    if (this.audio.currentTime > 3) { this.seek(0); return; }
    if (this.shuffle) {
      if (this.orderPos > 0) { this.orderPos--; this._playAt(this._queueIndexForOrder()); }
      else this._playAt(this.order[0]);
    } else {
      let p = this.index - 1;
      if (p < 0) p = this.repeat === "all" ? this.queue.length - 1 : 0;
      this._playAt(p);
    }
    this._persist();
  }

  stop() {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.emit("stop");
    this._persist();
  }

  removeFromQueue(queueIndex) {
    if (queueIndex < 0 || queueIndex >= this.queue.length) return;
    const wasCurrent = queueIndex === this.index;
    this.queue.splice(queueIndex, 1);
    if (!this.queue.length) { this.stop(); this.index = -1; }
    else if (wasCurrent) {
      const nextIdx = Math.min(queueIndex, this.queue.length - 1);
      if (this.shuffle) { this._rebuildOrder(this.index >= 0 ? this.index : 0); }
      this._playAt(nextIdx);
    } else if (queueIndex < this.index) {
      this.index--;
    }
    this.emit("queue");
    this._persist();
  }

  clearQueue() {
    this.stop();
    this.queue = [];
    this.index = -1;
    this.order = [];
    this.lyrics = null;
    this.emit("queue");
    this._persist();
  }

  _onEnded() {
    this.client.scrobble(this.song && this.song.id, Math.round(Date.now() / 1000), true).catch(() => {});
    this.next();
  }

  _onError() {
    if (!this.queue.length) return;
    this.emit("error", new Error(t("player_error")));
    // No intentamos auto-pasar para no encadenar fallos; el usuario puede pulsar siguiente.
  }

  /* ---------- Letras (OpenSubsonic getLyricsBySongId) ---------- */
  async _loadLyrics(id) {
    this.lyrics = null;
    this.emit("lyrics", null);
    if (this._lyricsTimer) clearInterval(this._lyricsTimer);
    try {
      const resp = await this.client.getLyricsBySongId(id);
      const list = resp.lyricsList || {};
      const groups = SubsonicClient.toArray(list.structuredLyrics);
      if (groups.length) {
        const g = groups[0];
        const lines = (SubsonicClient.toArray(g.line) || []).map((l, i) => ({
          start: l.start != null ? Number(l.start) : null,
          value: l.value != null ? String(l.value) : "",
          index: i,
        }));
        this.lyrics = { synced: !!g.synced, offset: Number(g.offset) || 0, lines };
      }
    } catch (e) {
      this.lyrics = null;
    }
    this.emit("lyrics", this.lyrics);
  }

  /* Devuelve el índice de la línea activa según currentTime */
  activeLyricLine() {
    if (!this.lyrics || !this.lyrics.synced || !this.lyrics.lines.length) return -1;
    const t = (this.audio.currentTime * 1000) + (this.lyrics.offset || 0);
    let active = -1;
    for (let i = 0; i < this.lyrics.lines.length; i++) {
      const l = this.lyrics.lines[i];
      if (l.start == null) continue;
      if (t >= l.start) active = i;
      else break;
    }
    return active;
  }

  _updateMediaSession(song) {
    if (!("mediaSession" in navigator)) return;
    const artwork = [];
    if (song.coverArt) artwork.push({ src: this.client.coverUrl(song.coverArt, 300), sizes: "300x300", type: "image/jpeg" });
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || "",
        artist: song.artist || "",
        album: song.album || "",
        artwork,
      });
    } catch (e) { /* ignore */ }
  }
}
