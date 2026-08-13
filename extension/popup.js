/* Popup de control de la extensión. Envía mensajes a la página del reproductor
   (pestaña de la extensión) para leer su estado y controlarlo. */

setLang(LANG);

const APP_URL = chrome.runtime.getURL("index.html");

const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';

const $ = (id) => document.getElementById(id);
let currentDuration = 0;

function fmt(sec) {
  if (!isFinite(sec) || sec == null || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

async function findTab() {
  const tabs = await chrome.tabs.query({});
  return tabs.find((t) => t.url && t.url.split("?")[0].startsWith(APP_URL)) || null;
}

function send(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (resp) => {
        if (chrome.runtime.lastError) return resolve(null);
        resolve(resp || null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

function render(s) {
  if (!s || !s.hasTrack) {
    $("title").textContent = t("no_track");
    $("artist").textContent = t("popup_open_hint");
    $("cover").hidden = true;
    $("btn-toggle").innerHTML = ICON_PLAY;
    $("cur").textContent = "0:00";
    $("dur").textContent = "0:00";
    $("seek").value = 0;
    $("seek").style.backgroundSize = "0% 100%";
    $("status").textContent = s && !s.connected ? t("popup_not_connected") : "";
    return;
  }
  $("title").textContent = s.title || "";
  $("artist").textContent = (s.artist ? s.artist + (s.album ? " — " + s.album : "") : (s.album || "")).trim();
  if (s.coverUrl) {
    $("cover").src = s.coverUrl;
    $("cover").hidden = false;
  } else {
    $("cover").removeAttribute("src");
    $("cover").hidden = true;
  }
  $("btn-toggle").innerHTML = s.playing ? ICON_PAUSE : ICON_PLAY;
  $("cur").textContent = fmt(s.position);
  $("dur").textContent = fmt(s.duration);
  currentDuration = s.duration || 0;
  const pct = s.duration ? (s.position / s.duration) * 100 : 0;
  $("seek").value = Math.round(pct * 10);
  $("seek").style.backgroundSize = pct + "% 100%";
  if (s.volume != null) {
    $("vol").value = Math.round(s.volume * 100);
    $("vol").style.backgroundSize = Math.round(s.volume * 100) + "% 100%";
  }
  $("status").textContent = "";
}

async function refresh() {
  const resp = await send({ action: "getState" });
  render(resp && resp.state);
}

$("btn-toggle").addEventListener("click", async () => {
  await send({ action: "control", cmd: "toggle" });
  refresh();
});
$("btn-next").addEventListener("click", async () => {
  await send({ action: "control", cmd: "next" });
  refresh();
});
$("btn-prev").addEventListener("click", async () => {
  await send({ action: "control", cmd: "prev" });
  refresh();
});
$("seek").addEventListener("input", (e) => {
  const pct = e.target.value / 10;
  $("cur").textContent = fmt((pct / 100) * currentDuration);
  e.target.style.backgroundSize = pct + "% 100%";
});
$("seek").addEventListener("change", (e) => {
  const t = (e.target.value / 1000) * currentDuration;
  send({ action: "control", cmd: "seek", t });
});
$("vol").addEventListener("input", (e) => {
  e.target.style.backgroundSize = e.target.value + "% 100%";
  send({ action: "control", cmd: "volume", v: e.target.value / 100 });
});
$("btn-big").addEventListener("click", async () => {
  const tab = await findTab();
  if (tab) {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  } else {
    chrome.tabs.create({ url: APP_URL });
  }
  window.close();
});

refresh();
setInterval(refresh, 1000);
