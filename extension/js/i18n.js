/* Internacionalización ES / EN. */
const I18N = {
  es: {
    // navegación
    nav_home: "Inicio", nav_search: "Buscar", nav_albums: "Álbumes", nav_artists: "Artistas",
    nav_playlists: "Listas", nav_favorites: "Favoritas", nav_random: "Aleatorio",
    nav_server: "Servidor", nav_about: "Acerca de", created_by: "Creado por",
    // barra de reproducción
    no_track: "Sin reproducción", connect_hint: "Conecta tu servidor OctoFiesta",
    btn_random: "Aleatorio", btn_previous: "Anterior", btn_play_pause: "Reproducir / Pausar",
    btn_next: "Siguiente", btn_repeat: "Repetir", btn_lyrics: "Letras", btn_queue: "Cola de reproducción",
    btn_mute: "Silenciar", btn_favorite: "Marcar como favorita",
    panel_queue: "Cola de reproducción", panel_lyrics: "Letras",
    // componentes
    untitled_album: "Álbum sin título", no_albums: "No hay álbumes.", no_artists: "No hay artistas.", no_songs: "No hay canciones.",
    // inicio
    home: "Inicio",
    connected_home: "Conectado a {url} como {user} — música local y streaming a través de octo-fiesta.",
    shuffle_play: "Reproducción aleatoria", search_streaming: "Buscar en streaming",
    new_releases: "Nuevos lanzamientos", recently_played: "Escuchado recientemente", for_you: "Para ti",
    view_all: "Ver todos",
    // álbumes
    albums: "Álbumes", albums_az: "Álbumes (A–Z)", new_albums: "Nuevos álbumes",
    recent_albums: "Álbumes escuchados recientemente", frequent_albums: "Álbumes más escuchados",
    random_albums: "Álbumes al azar", favorite_albums: "Álbumes favoritos",
    albums_loaded: "{n} álbumes cargados", load_more: "Cargar más",
    empty_library_hint: "No hay álbumes en tu biblioteca local. El contenido de streaming (Deezer, Qobuz, SquidWTF, Yandex) aparece al buscar.",
    section_error: "No se pudo cargar esta sección: {error}",
    // artistas / álbum / artista
    artists: "Artistas", artist: "Artista", album: "Álbum",
    n_albums: "{n} álbumes", back: "Volver", play: "Reproducir", add_queue: "Añadir a cola",
    n_songs: "{n} canciones", n_min: "{n} min",
    artist_unavailable: "Artista no disponible", album_unavailable: "Álbum no disponible",
    artist_err_70: "El servidor no devolvió los datos de este artista (código 70).",
    album_err_70: "El servidor no pudo abrir este álbum (código 70).",
    // listas
    playlists: "Listas de reproducción", playlists_hint: "Las playlists externas de streaming también aparecen en la búsqueda.",
    no_playlists: "No tienes listas de reproducción. Encuentra playlists externas con la búsqueda.",
    playlist: "Lista", playlist_unavailable: "Lista no disponible",
    playlist_err_70: "El servidor no pudo abrir esta lista (código 70).",
    new_playlist: "Nueva lista", playlist_name: "Nombre de la lista", create: "Crear",
    add_to_playlist: "Añadir a lista", choose_playlist: "Elige una lista existente o crea una nueva.",
    create_new: "Crear nueva lista", add: "Añadir", add_all: "Añadir todo",
    added_playlist: "Añadida a la lista", created_playlist: "Lista creada", deleted_playlist: "Lista eliminada",
    delete_playlist: "Eliminar lista", confirm_delete_playlist: "¿Eliminar esta lista de reproducción?",
    playlist_error: "No se pudo actualizar la lista: {error}", name_required: "Escribe un nombre para la lista.",
    select_playlist: "Lista existente",
    // favoritas
    favorites: "Favoritas", no_favorites: "Aún no tienes favoritos. Toca la estrella en cualquier canción, álbum o artista.",
    // búsqueda
    search: "Búsqueda", search_type: "Escribe para buscar en local y streaming.",
    search_hint: "Busca en tu biblioteca y en los servicios de streaming (Deezer, Qobuz, SquidWTF, Yandex) a través de octo-fiesta.",
    results_of: "Resultados de “{q}”", results_word: "resultados",
    tab_all: "Todo", tab_songs: "Canciones", tab_albums: "Álbumes", tab_artists: "Artistas",
    no_results: "Sin resultados.",
    // aleatorio
    random: "Aleatorio", random_loaded: "{n} canciones al azar cargadas en la cola.",
    random_error: "No se pudo obtener música aleatoria: {error}",
    random_empty: "No se pudieron obtener canciones aleatorias.",
    // conexión
    connect_title: "Conectar a OctoFiesta",
    connect_subtitle: "Introduce la dirección de tu proxy octo-fiesta y tus credenciales de Navidrome.",
    server_url: "URL del servidor (octo-fiesta)", username: "Usuario", password: "Contraseña",
    auth: "Autenticación", auth_token: "Token (recomendado, no envía la contraseña)",
    auth_password: "Contraseña en claro", remember: "Recordar configuración en este navegador",
    disconnect: "Desconectar", connect: "Conectar", connecting: "Conectando…",
    fill_fields: "Completa URL, usuario y contraseña.",
    token_hint: "Nota: con contraseña en claro se envía la contraseña en cada petición.",
    conn_failed: "No se pudo conectar.", try_password: "Si usabas Token, prueba con “Contraseña en claro”.",
    connected_to: "Conectado a {url} ({ver})",
    // acciones
    added_queue: "Añadido a la cola", favorited: "Añadida a favoritas", unfavorited: "Quitada de favoritas",
    star_error: "No se pudo actualizar la favorita: {error}",
    album_play_error: "No se pudo reproducir el álbum: {error}",
    artist_play_error: "No se pudo reproducir: {error}", no_playable: "Este artista no tiene canciones reproducibles.",
    load_more_error: "No se pudieron cargar más: {error}",
    // diagnóstico
    diagnose: "Diagnóstico", testing: "Probando…", diag_title: "Diagnóstico de endpoints",
    diag_running: "Ejecutando pruebas…", diag_failed: "Diagnóstico falló: {error}",
    // acerca de
    about_subtitle: "Reproductor web (cliente Subsonic) para octo-fiesta",
    about_body: "Conecta con tu proxy <strong>octo-fiesta</strong> y reproduce tu música local de Navidrome y la de tus servicios de streaming (Deezer, Qobuz, SquidWTF, Yandex).",
    version_word: "Versión", ok: "Entendido",
    // cola / letras
    empty_queue: "La cola está vacía. Reproduce un álbum, una lista o usa la búsqueda para añadir canciones.",
    no_lyrics: "Sin letras disponibles para esta canción. octo-fiesta busca letras sincronizadas (LRCLIB) para pistas externas.",
    lyrics_unsynced: "Letras sin sincronizar:",
    popup_open_tab: "Abrir en pestaña", popup_open_hint: "Abre el reproductor en una pestaña",
    popup_not_connected: "El reproductor no está conectado",
    // errores
    error_occurred: "Ocurrió un error", reload: "Recargar (sin caché)", close: "Cerrar",
    loading: "Cargando…", no_items: "No hay ítems.", n_items: "{n} ítems",
    random_toast: "Aleatorio: {error}",
    player_error: "Error de reproducción en la pista actual.",
    audio_error: "No se pudo reproducir el audio: {error}",
    api_network: "No se pudo conectar con el servidor. Revisa la URL y la red.",
    api_not_json: "El servidor no respondió en JSON. Verifica que apuntes a octo-fiesta/Navidrome.",
    api_invalid: "Respuesta inválida del servidor.",
    api_http: "Error HTTP {n} del servidor.",
    api_unknown: "Error desconocido del servidor Subsonic.",
    api_40: "Usuario o contraseña incorrectos (código 40).",
    api_70: "Contenido no encontrado (código 70).",
    api_10: "Falta un parámetro requerido (código 10).",
    api_50: "Usuario no autorizado (código 50).",
  },

  en: {
    nav_home: "Home", nav_search: "Search", nav_albums: "Albums", nav_artists: "Artists",
    nav_playlists: "Playlists", nav_favorites: "Favorites", nav_random: "Shuffle",
    nav_server: "Server", nav_about: "About", created_by: "Created by",
    no_track: "Nothing playing", connect_hint: "Connect your OctoFiesta server",
    btn_random: "Shuffle", btn_previous: "Previous", btn_play_pause: "Play / Pause",
    btn_next: "Next", btn_repeat: "Repeat", btn_lyrics: "Lyrics", btn_queue: "Play queue",
    btn_mute: "Mute", btn_favorite: "Mark as favorite",
    panel_queue: "Play queue", panel_lyrics: "Lyrics",
    untitled_album: "Untitled album", no_albums: "No albums.", no_artists: "No artists.", no_songs: "No songs.",
    home: "Home",
    connected_home: "Connected to {url} as {user} — local music and streaming through octo-fiesta.",
    shuffle_play: "Random play", search_streaming: "Search streaming",
    new_releases: "New releases", recently_played: "Recently played", for_you: "For you",
    view_all: "View all",
    albums: "Albums", albums_az: "Albums (A–Z)", new_albums: "New albums",
    recent_albums: "Recently played albums", frequent_albums: "Most played albums",
    random_albums: "Random albums", favorite_albums: "Favorite albums",
    albums_loaded: "{n} albums loaded", load_more: "Load more",
    empty_library_hint: "No albums in your local library. Streaming content (Deezer, Qobuz, SquidWTF, Yandex) appears when searching.",
    section_error: "Could not load this section: {error}",
    artists: "Artists", artist: "Artist", album: "Album",
    n_albums: "{n} albums", back: "Back", play: "Play", add_queue: "Add to queue",
    n_songs: "{n} songs", n_min: "{n} min",
    artist_unavailable: "Artist unavailable", album_unavailable: "Album unavailable",
    artist_err_70: "The server did not return data for this artist (code 70).",
    album_err_70: "The server could not open this album (code 70).",
    playlists: "Playlists", playlists_hint: "External streaming playlists also appear in search.",
    no_playlists: "No playlists yet. Find external playlists with search.",
    playlist: "Playlist", playlist_unavailable: "Playlist unavailable",
    playlist_err_70: "The server could not open this playlist (code 70).",
    new_playlist: "New playlist", playlist_name: "Playlist name", create: "Create",
    add_to_playlist: "Add to playlist", choose_playlist: "Choose an existing playlist or create a new one.",
    create_new: "Create new playlist", add: "Add", add_all: "Add all",
    added_playlist: "Added to playlist", created_playlist: "Playlist created", deleted_playlist: "Playlist deleted",
    delete_playlist: "Delete playlist", confirm_delete_playlist: "Delete this playlist?",
    playlist_error: "Could not update the playlist: {error}", name_required: "Type a name for the playlist.",
    select_playlist: "Existing playlist",
    favorites: "Favorites", no_favorites: "No favorites yet. Tap the star on any song, album or artist.",
    search: "Search", search_type: "Type to search local and streaming.",
    search_hint: "Search your library and streaming services (Deezer, Qobuz, SquidWTF, Yandex) through octo-fiesta.",
    results_of: "Results for “{q}”", results_word: "results",
    tab_all: "All", tab_songs: "Songs", tab_albums: "Albums", tab_artists: "Artists",
    no_results: "No results.",
    random: "Random", random_loaded: "{n} random songs loaded into the queue.",
    random_error: "Could not get random music: {error}",
    random_empty: "Could not get random songs.",
    connect_title: "Connect to OctoFiesta",
    connect_subtitle: "Enter your octo-fiesta proxy address and your Navidrome credentials.",
    server_url: "Server URL (octo-fiesta)", username: "Username", password: "Password",
    auth: "Authentication", auth_token: "Token (recommended, does not send the password)",
    auth_password: "Plain password", remember: "Remember settings in this browser",
    disconnect: "Disconnect", connect: "Connect", connecting: "Connecting…",
    fill_fields: "Fill in URL, username and password.",
    token_hint: "Note: with a plain password the password is sent in every request.",
    conn_failed: "Could not connect.", try_password: "If you were using Token, try “Plain password”.",
    connected_to: "Connected to {url} ({ver})",
    added_queue: "Added to queue", favorited: "Added to favorites", unfavorited: "Removed from favorites",
    star_error: "Could not update favorite: {error}",
    album_play_error: "Could not play the album: {error}",
    artist_play_error: "Could not play: {error}", no_playable: "This artist has no playable songs.",
    load_more_error: "Could not load more: {error}",
    diagnose: "Diagnostics", testing: "Testing…", diag_title: "Endpoint diagnostics",
    diag_running: "Running tests…", diag_failed: "Diagnostics failed: {error}",
    about_subtitle: "Web player (Subsonic client) for octo-fiesta",
    about_body: "Connect to your <strong>octo-fiesta</strong> proxy and play your local Navidrome music and your streaming services (Deezer, Qobuz, SquidWTF, Yandex).",
    version_word: "Version", ok: "Got it",
    empty_queue: "The queue is empty. Play an album, a playlist or use search to add songs.",
    no_lyrics: "No lyrics available for this song. octo-fiesta fetches synced lyrics (LRCLIB) for external tracks.",
    lyrics_unsynced: "Unsynced lyrics:",
    popup_open_tab: "Open in tab", popup_open_hint: "Open the player in a tab",
    popup_not_connected: "The player is not connected",
    error_occurred: "An error occurred", reload: "Reload (no cache)", close: "Close",
    loading: "Loading…", no_items: "No items.", n_items: "{n} items",
    random_toast: "Random: {error}",
    player_error: "Playback error on the current track.",
    audio_error: "Could not play the audio: {error}",
    api_network: "Could not connect to the server. Check the URL and your network.",
    api_not_json: "The server did not respond in JSON. Make sure you are pointing to octo-fiesta/Navidrome.",
    api_invalid: "Invalid response from the server.",
    api_http: "HTTP error {n} from the server.",
    api_unknown: "Unknown Subsonic server error.",
    api_40: "Wrong username or password (code 40).",
    api_70: "Content not found (code 70).",
    api_10: "A required parameter is missing (code 10).",
    api_50: "User not authorized (code 50).",
  },
};

let LANG = "es";
try { LANG = localStorage.getItem("ofp.lang") || "es"; } catch (e) {}

function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) || I18N.es[key] || key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.split("{" + k + "}").join(vars[k]);
    }
  }
  return s;
}

function setLang(lang) {
  LANG = lang === "en" ? "en" : "es";
  try { localStorage.setItem("ofp.lang", LANG); } catch (e) {}
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
  });
  const sel = document.getElementById("lang-select");
  if (sel) sel.value = LANG;
}

function currentLang() { return LANG; }
