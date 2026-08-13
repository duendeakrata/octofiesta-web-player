/* Vistas del reproductor. Cada función devuelve HTML (asíncrono).
   Usan el objeto global State = { client, player }. */

const Views = {};

/* ---------------- componentes ---------------- */

function albumCard(album) {
  const id = album.id || album.albumId || album.album_id || album.albumID || "";
  const name = album.name || album.title || album.album || album.titulo || album.nombre || t("untitled_album");
  const cover = album.coverArt ? State.client.coverUrl(album.coverArt, 320) : null;
  return `<div class="album-card" data-nav-album="${esc(id)}" title="${esc(name)}">
    <div class="album-cover">
      ${coverHtml(cover, 320, "disc", name)}
      <button class="album-play" data-action="play-album" data-id="${esc(id)}" title="Reproducir álbum">${icon("play")}</button>
    </div>
    <div class="ac-name">${esc(name)}${isExternal(id) ? externalBadge(providerLabel(id)) : ""}</div>
    <div class="ac-artist">${esc(album.artist || "")}</div>
    ${album.year ? `<div class="ac-year">${esc(album.year)}</div>` : ""}
  </div>`;
}

function albumGrid(albums) {
  if (!albums.length) return emptyView(t("no_albums"));
  return `<div class="album-grid">${albums.map(albumCard).join("")}</div>`;
}

function artistCard(artist) {
  const cover = artist.coverArt ? State.client.coverUrl(artist.coverArt, 320) : null;
  return `<div class="artist-card" data-nav-artist="${esc(artist.id)}" title="${esc(artist.name)}">
    <div class="artist-avatar">
      ${coverHtml(cover, 320, "mic", artist.name)}
    </div>
    <div class="ac-name">${esc(artist.name)}</div>
    <div class="ac-count">${artist.albumCount != null ? artist.albumCount + " álbumes" : ""}</div>
  </div>`;
}

function artistGrid(artists) {
  if (!artists.length) return emptyView(t("no_artists"));
  return `<div class="album-grid">${artists.map(artistCard).join("")}</div>`;
}

function songTable(songs, opts = {}) {
  if (!songs.length) return emptyView(t("no_songs"), "music");
  const rows = songs.map((s, i) => {
    const sub = opts.showArtist !== false && s.artist
      ? `<div class="s">${esc(s.artist)}${opts.showAlbum && s.album ? " — " + esc(s.album) : ""}</div>`
      : opts.showAlbum && s.album
        ? `<div class="s">${esc(s.album)}</div>`
        : "";
    const ext = isExternal(s.id) ? externalBadge(providerLabel(s.id)) : "";
    const dur = s.duration ? `<span class="sr-dur">${formatTime(s.duration)}</span>` : `<span class="sr-dur">—</span>`;
    return `<div class="song-row" data-index="${i}" data-id="${esc(s.id)}" title="${esc(s.title)}">
      <span class="sr-num">${i + 1}</span>
      <button class="sr-play" data-action="play-row" data-index="${i}">${icon("play")}</button>
      <div class="sr-title"><div class="t">${esc(s.title)}${ext}</div>${sub}</div>
      ${dur}
      <button class="sr-add" data-action="add-to-playlist" data-index="${i}" title="${esc(t("add_to_playlist"))}">${icon("plus")}</button>
      <button class="sr-star${s.starred ? " starred" : ""}" data-action="star-song" data-id="${esc(s.id)}" title="${esc(t("btn_favorite"))}">${icon("star")}</button>
    </div>`;
  }).join("");
  return `<div class="song-list">${rows}</div>`;
}

function sectionHeader(title, linkText, linkHref) {
  return `<div class="section-head"><h2>${esc(title)}</h2>${
    linkText && linkHref ? `<a class="section-link" href="${esc(linkHref)}">${esc(linkText)}</a>` : ""
  }</div>`;
}

/* Estado vacío con pista: octo-fiesta solo muestra en estas listas los álbumes
   locales de Navidrome; el streaming (Deezer, etc.) aparece con la búsqueda. */
function emptyHint(error) {
  if (error) {
    return `<div class="empty-state" style="padding:24px 0">${icon("close")}<p>${t("section_error", { error })}</p></div>`;
  }
  return `<div class="empty-state" style="padding:24px 0">${icon("search")}<p>${t("empty_library_hint")}</p>
    <a class="btn btn-primary" style="margin-top:12px" href="#/search">${icon("search")} ${t("search_streaming")}</a></div>`;
}

/* ---------------- vistas ---------------- */

Views.home = async function () {
  const client = State.client;
  const section = async (title, type) => {
    try {
      const albums = await client.listAlbums(type, { size: 10 });
      return { title, type, albums, error: null };
    } catch (e) {
      return { title, type, albums: [], error: e.message + (e.endpoint ? " (" + e.endpoint + ")" : "") };
    }
  };
  const results = await Promise.all([
    section(t("new_releases"), "newest"),
    section(t("recently_played"), "recent"),
    section(t("for_you"), "random"),
  ]);
  const renderSection = (s) => {
    const inner = s.albums.length
      ? `<div class="album-grid">${s.albums.map(albumCard).join("")}</div>`
      : emptyHint(s.error);
    return `<div class="section">
      ${sectionHeader(s.title, s.albums.length ? t("view_all") : "", s.albums.length ? "#/albums?type=" + s.type : "")}
      ${inner}
    </div>`;
  };
  return `
    <div class="view-head">
      <div class="vh-text">
        <h1>${t("home")}</h1>
        <p>${t("connected_home", { url: `<strong>${esc(client.baseUrl)}</strong>`, user: `<strong>${esc(client.username)}</strong>` })}</p>
      </div>
    </div>
    <div class="view-actions" style="margin:0 0 26px">
      <button class="btn btn-primary" data-action="random-play">${icon("dice")} ${t("shuffle_play")}</button>
      <a class="btn" href="#/search">${icon("search")} ${t("search_streaming")}</a>
    </div>
    ${results.map(renderSection).join("")}`;
};

Views.albums = async function (type) {
  const client = State.client;
  const listType = type || "alphabeticalByName";
  const labels = {
    alphabeticalByName: t("albums_az"),
    newest: t("new_albums"),
    recent: t("recent_albums"),
    frequent: t("frequent_albums"),
    random: t("random_albums"),
    starred: t("favorite_albums"),
  };
  const PAGE = 30;
  State._albumPager = { type: listType, offset: 0, list: [] };
  try {
    const albums = await client.listAlbums(listType, { size: PAGE, offset: 0 });
    State._albumPager.list = albums;
    let html = `<div class="view-head"><div class="vh-text"><h1>${esc(labels[listType] || t("albums"))}</h1><p data-count>${t("albums_loaded", { n: albums.length })}</p></div></div>`;
    if (albums.length) {
      html += `<div id="albums-grid">${albumGrid(albums)}</div>`;
      html += `<div class="pager"><button class="btn" data-action="albums-more">${t("load_more")}</button></div>`;
    } else {
      html += `<div class="empty-state">${icon("search")}<p>${t("empty_library_hint")}</p>
        <a class="btn btn-primary" style="margin-top:12px" href="#/search">${icon("search")} ${t("search_streaming")}</a></div>`;
    }
    return html;
  } catch (e) {
    return errorView(e.message, e.endpoint, e.url);
  }
};

Views.artists = async function () {
  const client = State.client;
  try {
    const data = await client.listArtists();
    const indexArr = data.indexes;
    if (!indexArr.length) return emptyView(t("no_artists"));
    const bar = `<div class="index-bar">${indexArr.map((g) => `<a href="#a-${esc(g.name)}" data-index-letter="${esc(g.name)}">${esc(g.name)}</a>`).join("")}</div>`;
    const groups = indexArr.map((g) => {
      const artists = SubsonicClient.toArray(g.artist);
      if (!artists.length) return "";
      return `<div class="artist-group" id="a-${esc(g.name)}">
        <h3>${esc(g.name)}</h3>
        ${artistGrid(artists)}
      </div>`;
    }).join("");
    return `<div class="view-head"><div class="vh-text"><h1>${t("artists")}</h1></div></div>${bar}${groups}`;
  } catch (e) {
    return errorView(e.message, e.endpoint, e.url);
  }
};

Views.artist = async function (id) {
  const client = State.client;
  try {
    const resp = await client.getArtist(id);
    const artist = resp.artist || {};
    const albums = SubsonicClient.toArray(artist.album);
    const cover = artist.coverArt ? client.coverUrl(artist.coverArt, 400) : null;
    const html = `
      <button class="btn btn-ghost btn-back" data-action="back">${icon("back")} ${t("back")}</button>
      <div class="view-head">
        <div class="vh-cover">${coverHtml(cover, 400, "mic")}</div>
        <div class="vh-text">
          <h1>${esc(artist.name || t("artist"))}${isExternal(id) ? externalBadge(providerLabel(id)) : ""}</h1>
          <p>${t("n_albums", { n: artist.albumCount != null ? artist.albumCount : albums.length })}</p>
          <div class="view-actions">
            <button class="btn btn-primary" data-action="play-artist" data-id="${esc(id)}">${icon("play")} ${t("play")}</button>
            <button class="btn${artist.starred ? " is-starred" : ""}" data-action="star-artist" data-id="${esc(id)}">${icon("star")}</button>
          </div>
        </div>
      </div>
      <div class="album-grid">${albums.map(albumCard).join("") || emptyView(t("no_albums"))}</div>`;
    return html;
  } catch (e) {
    if (e instanceof SubsonicError && e.code === 70) {
      return `<div class="empty-state">${icon("close")}<h3>${t("artist_unavailable")}</h3><p>${t("artist_err_70")}</p><button class="btn btn-primary" data-action="back">${t("back")}</button></div>`;
    }
    return errorView(e.message, e.endpoint, e.url);
  }
};

Views.album = async function (id) {
  const client = State.client;
  try {
    const resp = await client.getAlbum(id);
    const album = resp.album || {};
    const songs = SubsonicClient.toArray(album.song).filter((s) => !s.isDir);
    State.currentSongs = songs;
    const cover = album.coverArt ? client.coverUrl(album.coverArt, 400) : null;
    const mins = album.duration ? Math.round(album.duration / 60) : null;
    const meta = [];
    if (album.year) meta.push(String(album.year));
    if (album.genre) meta.push(album.genre);
    if (mins) meta.push(t("n_min", { n: mins }));
    meta.push(t("n_songs", { n: songs.length }));
    const artistId = album.artistId;
    const isCurator = artistId && String(artistId).toLowerCase().startsWith("curator-");
    const artistHtml = album.artist
      ? (artistId && !isCurator
          ? `<a href="#/artist/${encodeURIComponent(artistId)}">${esc(album.artist)}</a>`
          : esc(album.artist))
      : "";
    const html = `
      <button class="btn btn-ghost btn-back" data-action="back">${icon("back")} ${t("back")}</button>
      <div class="view-head">
        <div class="vh-cover">${coverHtml(cover, 400, "disc")}</div>
        <div class="vh-text">
          <h1>${esc(album.name || album.title || t("album"))}${isExternal(id) ? externalBadge(providerLabel(id)) : ""}</h1>
          ${artistHtml ? `<p>${artistHtml}${meta.length ? " · " + esc(meta.join(" · ")) : ""}</p>` : `<p>${esc(meta.join(" · "))}</p>`}
          <div class="view-actions">
            <button class="btn btn-primary" data-action="play-current">${icon("play")} ${t("play")}</button>
            <button class="btn" data-action="enqueue-current">${icon("plus")} ${t("add_queue")}</button>
            <button class="btn" data-action="add-album-playlist">${icon("list")} ${t("add_to_playlist")}</button>
            <button class="btn${album.starred ? " is-starred" : ""}" data-action="star-album" data-id="${esc(id)}">${icon("star")}</button>
          </div>
        </div>
      </div>
      ${songTable(songs, { showArtist: false })}`;
    return html;
  } catch (e) {
    if (e instanceof SubsonicError && e.code === 70) {
      return `<div class="empty-state">${icon("close")}<h3>${t("album_unavailable")}</h3><p>${t("album_err_70")}</p><button class="btn btn-primary" data-action="back">${t("back")}</button></div>`;
    }
    return errorView(e.message, e.endpoint, e.url);
  }
};

Views.playlists = async function () {
  const client = State.client;
  try {
    let lists = [];
    try {
      const resp = await client.getPlaylists();
      lists = SubsonicClient.toArray(resp.playlists && resp.playlists.playlist ? resp.playlists.playlist : resp.playlist);
    } catch (e) {
      if (!(e instanceof SubsonicError && e.code === 70)) return errorView(e.message, e.endpoint, e.url);
    }
    let html = `<div class="view-head"><div class="vh-text"><h1>${t("playlists")}</h1><p>${t("playlists_hint")}</p></div>
      <div class="view-actions" style="margin-bottom:0"><button class="btn btn-primary" data-action="new-playlist">${icon("plus")} ${t("new_playlist")}</button></div></div>`;
    if (!lists.length) return html + emptyView(t("no_playlists"), "list");
    const rows = lists.map((p) => {
      const cover = p.coverArt ? client.coverUrl(p.coverArt, 100) : null;
      return `<div class="playlist-row" data-nav-playlist="${esc(p.id)}">
        <div class="pl-cover">${coverHtml(cover, 100, "list")}</div>
        <div class="pl-info">
          <div class="pl-name">${esc(p.name)}</div>
          <div class="pl-meta">${p.songCount != null ? t("n_songs", { n: p.songCount }) : ""}${p.duration ? " · " + formatTime(p.duration) : ""}</div>
        </div>
        ${isExternal(p.id) ? externalBadge(providerLabel(p.id)) : ""}
        <button class="icon-btn pl-del" data-action="delete-playlist" data-id="${esc(p.id)}" title="${esc(t("delete_playlist"))}">${icon("trash")}</button>
      </div>`;
    }).join("");
    return html + rows;
  } catch (e) {
    return errorView(e.message, e.endpoint, e.url);
  }
};

Views.playlist = async function (id) {
  const client = State.client;
  try {
    const resp = await client.getPlaylist(id);
    const pl = resp.playlist || {};
    const songs = SubsonicClient.toArray(pl.entry).filter((s) => !s.isDir);
    State.currentSongs = songs;
    const cover = pl.coverArt ? client.coverUrl(pl.coverArt, 400) : null;
    const html = `
      <button class="btn btn-ghost btn-back" data-action="back">${icon("back")} ${t("back")}</button>
      <div class="view-head">
        <div class="vh-cover">${coverHtml(cover, 400, "list")}</div>
        <div class="vh-text">
          <h1>${esc(pl.name || t("playlist"))}${isExternal(id) ? externalBadge(providerLabel(id)) : ""}</h1>
          <p>${t("n_songs", { n: pl.songCount != null ? pl.songCount : songs.length })}${pl.duration ? " · " + formatTime(pl.duration) : ""}</p>
          <div class="view-actions">
            <button class="btn btn-primary" data-action="play-current">${icon("play")} ${t("play")}</button>
            <button class="btn" data-action="enqueue-current">${icon("plus")} ${t("add_queue")}</button>
          </div>
        </div>
      </div>
      ${songTable(songs, { showArtist: true, showAlbum: true })}`;
    return html;
  } catch (e) {
    if (e instanceof SubsonicError && e.code === 70) {
      return `<div class="empty-state">${icon("close")}<h3>${t("playlist_unavailable")}</h3><p>${t("playlist_err_70")}</p><button class="btn btn-primary" data-action="back">${t("back")}</button></div>`;
    }
    return errorView(e.message, e.endpoint, e.url);
  }
};

Views.starred = async function () {
  const client = State.client;
  try {
    let albums = [], artists = [], songs = [];
    try {
      const [s2, s1] = await Promise.all([client.getStarred2(), client.getStarred()]);
      const starred2 = s2.starred2 || {};
      albums = SubsonicClient.toArray(starred2.album);
      artists = SubsonicClient.toArray(starred2.artist);
      songs = SubsonicClient.toArray(s1.starred && s1.starred.song ? s1.starred.song : (s2.starred2 && s2.starred2.song) || []);
    } catch (e) {
      if (!(e instanceof SubsonicError && e.code === 70)) return errorView(e.message, e.endpoint, e.url);
    }
    State.currentSongs = songs;
    let html = `<div class="view-head"><div class="vh-text"><h1>${t("favorites")}</h1></div></div>`;
    if (!albums.length && !artists.length && !songs.length) {
      return html + emptyView(t("no_favorites"), "star");
    }
    if (artists.length) html += `<div class="section">${sectionHeader(t("artists"))}${artistGrid(artists)}</div>`;
    if (albums.length) html += `<div class="section">${sectionHeader(t("albums"))}${albumGrid(albums)}</div>`;
    if (songs.length) html += `<div class="section">${sectionHeader(t("tab_songs"))}${songTable(songs, { showArtist: true })}</div>`;
    return html;
  } catch (e) {
    return errorView(e.message, e.endpoint, e.url);
  }
};

Views.search = async function (query) {
  const client = State.client;
  if (!query) {
    return `
      <div class="view-head"><div class="vh-text"><h1>${t("search")}</h1><p>${t("search_hint")}</p></div></div>
      <div class="search-wrap">${icon("search")}<input id="search-input" type="text" placeholder="${esc(t("search_type"))}" autofocus><button class="btn btn-primary search-btn" data-action="do-search">${t("search")}</button></div>
      <div class="empty-state">${icon("search")}<p>${t("search_type")}</p></div>`;
  }
  let songs = [], albums = [], artists = [];
  try {
    const resp = await client.search3(query, { artistCount: 8, albumCount: 12, songCount: 20 });
    const r = resp.searchResult3 || {};
    songs = SubsonicClient.toArray(r.song);
    albums = SubsonicClient.toArray(r.album);
    artists = SubsonicClient.toArray(r.artist);
  } catch (e) {
    if (!(e instanceof SubsonicError && e.code === 70)) {
      return errorView(e.message, e.endpoint, e.url);
    }
    // código 70 en la búsqueda → sin resultados
  }
  {
    State.currentSongs = songs;
    const q = esc(query);
    let html = `
      <div class="view-head"><div class="vh-text"><h1>${t("results_of", { q })}</h1><p>${songs.length + albums.length + artists.length} ${t("results_word")}</p></div></div>
      <div class="search-wrap">${icon("search")}<input id="search-input" type="text" value="${q}"><button class="btn btn-primary search-btn" data-action="do-search">${t("search")}</button></div>
      <div class="search-tabs">
        <button class="tab-btn active" data-tab="all">${t("tab_all")}</button>
        <button class="tab-btn" data-tab="songs">${t("tab_songs")} (${songs.length})</button>
        <button class="tab-btn" data-tab="albums">${t("tab_albums")} (${albums.length})</button>
        <button class="tab-btn" data-tab="artists">${t("tab_artists")} (${artists.length})</button>
      </div>
      <div data-tabpanel="all">
        ${songs.length ? `<div class="section">${sectionHeader(t("tab_songs"))}${songTable(songs.slice(0, 8), { showArtist: true })}</div>` : ""}
        ${albums.length ? `<div class="section">${sectionHeader(t("tab_albums"))}${albumGrid(albums.slice(0, 8))}</div>` : ""}
        ${artists.length ? `<div class="section">${sectionHeader(t("tab_artists"))}${artistGrid(artists.slice(0, 6))}</div>` : ""}
        ${!songs.length && !albums.length && !artists.length ? emptyView(t("no_results"), "search") : ""}
      </div>
      <div data-tabpanel="songs" hidden>${songTable(songs, { showArtist: true, showAlbum: true })}</div>
      <div data-tabpanel="albums" hidden>${albumGrid(albums)}</div>
      <div data-tabpanel="artists" hidden>${artistGrid(artists)}</div>`;
    return html;
  }
};

Views.random = async function () {
  const client = State.client;
  try {
    let songs = [];
    try {
      songs = await client.getRandomSongs(50);
    } catch (e) {
      if (!(e instanceof SubsonicError && e.code === 70)) {
        toast(t("random_toast", { error: e.message || "error" }), "error", 5000);
        return errorView(t("random_error", { error: e.message || e }), e.endpoint, e.url);
      }
    }
    State.currentSongs = songs;
    if (!songs.length) {
      return `<div class="view-head"><div class="vh-text"><h1>${t("random")}</h1></div></div>` + emptyView(t("random_empty"), "dice");
    }
    // Se carga la cola en pausa; el usuario pulsa Reproducir o una fila (evita errores de autoplay).
    setTimeout(() => State.player.loadQueue(songs, 0, false), 0);
    return `<div class="view-head"><div class="vh-text"><h1>${t("random")}</h1><p>${t("random_loaded", { n: songs.length })}</p></div></div>
      <div class="view-actions" style="margin-bottom:22px"><button class="btn btn-primary" data-action="play-current">${icon("play")} ${t("play")}</button></div>
      ${songTable(songs, { showArtist: true, showAlbum: true })}`;
  } catch (e) {
    toast(t("random_toast", { error: e.message || "error" }), "error", 5000);
    return errorView(t("random_error", { error: e.message || e }), e.endpoint, e.url);
  }
};

/* ---------- helpers expuestos ---------- */

function markPlayingRows() {
  const cur = State.player && State.player.song;
  if (!cur) return;
  document.querySelectorAll(".song-row").forEach((row) => {
    row.classList.toggle("playing", row.dataset.id === cur.id);
  });
}

function setTab(activeTab) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === activeTab));
  document.querySelectorAll("[data-tabpanel]").forEach((p) => {
    p.hidden = p.dataset.tabpanel !== activeTab;
  });
}
