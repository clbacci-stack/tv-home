/* Claudio Home. Plain ES5 for the 2019 Tizen browser. YouTube opening via TizenTube adapted from Cinema Home (MIT). */
(function () {
  "use strict";
  var C = window.CONFIG || {};
  var IT = C.language === "it";
  var onTV = location.host === "127.0.0.1:8081" || location.host === "localhost:8081";
  var SERVICE = "http://127.0.0.1:8098";

  var T = IT ? {
    days: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"],
    months: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
    morning: "Buongiorno", afternoon: "Buon pomeriggio", evening: "Buonasera", night: "Buonanotte",
    opening: "Apertura di ", notReady: "Un momento, la TV si sta collegando…", failed: "Impossibile aprire ",
    hint: "Tasto Home: menu Samsung", noTube: "TizenTube non è pronto. Riprova tra un attimo.",
    preview: "Anteprima: sulla TV questo apre "
  } : {
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Good night",
    opening: "Opening ", notReady: "One moment, connecting to the TV…", failed: "Couldn't open ",
    hint: "Home button: Samsung menu", noTube: "TizenTube isn't ready yet. Try again in a moment.",
    preview: "Preview: on the TV this opens "
  };

  /* Generic line icons (no brand logos) */
  var ICON = {
    play: '<svg viewBox="0 0 64 64"><rect x="6" y="12" width="52" height="40" rx="10"/><path d="M27 23 L41 32 L27 41 Z"/></svg>',
    film: '<svg viewBox="0 0 64 64"><rect x="8" y="10" width="48" height="44" rx="6"/><path d="M8 22h48M8 42h48M20 10v12M32 10v12M44 10v12M20 42v12M32 42v12M44 42v12"/></svg>',
    star: '<svg viewBox="0 0 64 64"><path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z"/></svg>',
    spark: '<svg viewBox="0 0 64 64"><path d="M32 6v14M32 44v14M6 32h14M44 32h14M14 14l10 10M40 40l10 10M50 14L40 24M24 40L14 50"/></svg>',
    screen: '<svg viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="34" rx="5"/><path d="M22 54h20M32 44v10"/></svg>',
    music: '<svg viewBox="0 0 64 64"><path d="M24 46V14l28-6v32"/><circle cx="17" cy="46" r="7"/><circle cx="45" cy="40" r="7"/></svg>',
    tv: '<svg viewBox="0 0 64 64"><rect x="6" y="16" width="52" height="36" rx="6"/><path d="M22 6l10 10 10-10"/></svg>',
    ball: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24"/><path d="M32 20l11 8-4 13H25l-4-13z"/></svg>',
    plug: '<svg viewBox="0 0 64 64"><rect x="10" y="22" width="44" height="20" rx="4"/><path d="M18 30h4M27 30h4M36 30h4M45 30h1M22 42v8M42 42v8"/></svg>'
  };
  var APPS = {
    youtube: { label: "YouTube", icon: "play" },
    netflix: { label: "Netflix", icon: "film" },
    prime:   { label: "Prime Video", icon: "star" },
    disney:  { label: "Disney+", icon: "spark" },
    apple:   { label: "Apple TV", icon: "screen" },
    spotify: { label: "Spotify", icon: "music" },
    raiplay: { label: "RaiPlay", icon: "tv" },
    dazn:    { label: "DAZN", icon: "ball" },
    sources: { label: IT ? "Sorgenti HDMI" : "HDMI inputs", icon: "plug" }
  };

  function $(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  var statusTimer = null;
  function status(msg, keep) {
    $("status").textContent = msg || "";
    clearTimeout(statusTimer);
    if (msg && !keep) statusTimer = setTimeout(function () { $("status").textContent = ""; }, 6000);
  }

  /* ---- Clock and greeting ---- */
  function tick() {
    var d = new Date(), h = d.getHours();
    $("clock").textContent = pad(h) + ":" + pad(d.getMinutes());
    var day = T.days[d.getDay()];
    $("date").textContent = IT
      ? day.charAt(0).toUpperCase() + day.slice(1) + " " + d.getDate() + " " + T.months[d.getMonth()]
      : day + ", " + d.getDate() + " " + T.months[d.getMonth()];
    var g = h < 5 ? T.night : h < 12 ? T.morning : h < 18 ? T.afternoon : h < 23 ? T.evening : T.night;
    $("greet").textContent = g + (C.name ? ", " + C.name : "");
  }

  /* ---- Weather (Open-Meteo, no account needed) ---- */
  var WX = [
    [[0], "Clear", "Sereno"], [[1], "Mostly clear", "Poco nuvoloso"], [[2], "Partly cloudy", "Parz. nuvoloso"],
    [[3], "Overcast", "Coperto"], [[45, 48], "Fog", "Nebbia"], [[51, 53, 55, 56, 57], "Drizzle", "Pioviggine"],
    [[61, 63, 65, 66, 67, 80, 81, 82], "Rain", "Pioggia"], [[71, 73, 75, 77, 85, 86], "Snow", "Neve"],
    [[95, 96, 99], "Thunderstorm", "Temporale"]
  ];
  function wxText(code) {
    for (var i = 0; i < WX.length; i++) if (WX[i][0].indexOf(code) !== -1) return IT ? WX[i][2] : WX[i][1];
    return "";
  }
  function weather() {
    if (C.latitude == null) return;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + C.latitude + "&longitude=" + C.longitude +
      "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1";
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.timeout = 15000;
    x.onload = function () {
      try {
        var d = JSON.parse(x.responseText);
        $("wxTemp").textContent = Math.round(d.current.temperature_2m) + "°";
        $("wxText").textContent = wxText(d.current.weather_code);
        $("wxRange").textContent = "↑ " + Math.round(d.daily.temperature_2m_max[0]) + "°   ↓ " + Math.round(d.daily.temperature_2m_min[0]) + "°";
        $("wxPlace").textContent = C.place || "";
      } catch (e) { /* keep the last reading */ }
    };
    x.send();
  }

  /* ---- Background ---- */
  function background() {
    var a = $("bgA"), b = $("bgB"), photos = C.photos || [];
    if (!photos.length) { a.className = "layer field on"; return; }
    var i = 0, front = a, back = b;
    function show() {
      back.style.backgroundImage = "url('" + photos[i] + "')";
      back.className = "layer on"; front.className = "layer";
      var t = front; front = back; back = t;
      i = (i + 1) % photos.length;
    }
    show();
    if (photos.length > 1) setInterval(show, (C.photoSeconds || 60) * 1000);
  }

  /* ---- Tiles and remote navigation ---- */
  var tiles = [], sel = 0, available = null, token = null;
  function build() {
    var order = C.tiles || [];
    $("tiles").innerHTML = '<div id="track"></div>';
    var nav = $("track");
    tiles = [];
    for (var i = 0; i < order.length; i++) {
      var key = order[i], app = APPS[key];
      if (!app) continue;
      if (available && key !== "youtube" && available[key] === false) continue;
      var el = document.createElement("div");
      el.className = "tile";
      el.setAttribute("data-app", key);
      el.innerHTML = ICON[app.icon] + '<div class="label">' + app.label + "</div>";
      nav.appendChild(el);
      tiles.push(el);
    }
    if (sel >= tiles.length) sel = tiles.length - 1;
    if (sel < 0) sel = 0;
    select(sel);
  }
  function select(i) {
    for (var j = 0; j < tiles.length; j++) tiles[j].className = "tile" + (j === i ? " sel" : "");
    sel = i;
    /* Slide the row so the selected tile stays on screen (248px per tile, 6 fit comfortably) */
    var shift = Math.max(0, Math.min(i - 5, tiles.length - 7)) * 248;
    var track = $("track");
    if (track) { track.style.webkitTransform = "translateX(-" + shift + "px)"; track.style.transform = "translateX(-" + shift + "px)"; }
  }
  document.addEventListener("keydown", function (e) {
    var k = e.keyCode;
    if (k === 37 && sel > 0) { select(sel - 1); e.preventDefault(); }
    else if (k === 39 && sel < tiles.length - 1) { select(sel + 1); e.preventDefault(); }
    else if (k === 13 && tiles[sel]) { open(tiles[sel].getAttribute("data-app")); e.preventDefault(); }
  });

  /* ---- Talking to the TV ---- */
  var socket = null, tube = null, pendingTube = null, reconnects = 0;
  function wsSend(d) { if (socket && socket.readyState === 1) socket.send(JSON.stringify(d)); }
  function connectTizenBrew() {
    try { socket = new WebSocket("ws://127.0.0.1:8081"); } catch (e) { return; }
    socket.onopen = function () { reconnects = 0; wsSend({ type: 4 }); };
    socket.onmessage = function (ev) {
      var d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.type === 4) {
        if (d.payload === null) { setTimeout(function () { wsSend({ type: 4 }); }, 700); return; }
        var list = d.payload || [];
        for (var i = 0; i < list.length; i++) if (list[i].fullName && list[i].fullName.indexOf("npm/@foxreis/tizentube") === 0) tube = list[i];
        wsSend({ type: -1 });
      } else if (d.type === 5 && pendingTube) {
        var p = pendingTube.appPath; pendingTube = null; location.href = p;
      }
    };
    socket.onclose = function () { socket = null; if (++reconnects < 4) setTimeout(connectTizenBrew, 1500); };
  }
  function loadState(attempt) {
    var x = new XMLHttpRequest();
    x.open("GET", SERVICE + "/state", true);
    x.onload = function () {
      if (x.status !== 200) return retry();
      try { var d = JSON.parse(x.responseText); token = d.token; available = d.apps || {}; build(); status(""); } catch (e) { retry(); }
    };
    x.onerror = retry;
    x.send();
    function retry() { if (attempt < 15) setTimeout(function () { loadState(attempt + 1); }, 800); }
  }
  function busy(on) { if (tiles[sel]) tiles[sel].className = "tile sel" + (on ? " busy" : ""); }
  function open(key) {
    var name = APPS[key].label;
    if (!onTV) { status(T.preview + name + "."); return; }
    if (key === "youtube") {
      if (!tube || !socket || socket.readyState !== 1) { status(T.noTube); return; }
      status(T.opening + name + "…", true); busy(true);
      wsSend({ type: 5, payload: tube });
      if (tube.evaluateScriptOnDocumentStart) pendingTube = tube; else location.href = tube.appPath;
      return;
    }
    if (!token) { status(T.notReady); return; }
    status(T.opening + name + "…", true); busy(true);
    var x = new XMLHttpRequest();
    x.open("POST", SERVICE + "/launch", true);
    x.setRequestHeader("Content-Type", "application/json");
    x.setRequestHeader("X-Home-Token", token);
    x.onload = function () { busy(false); if (x.status === 200) status(""); else status(T.failed + name + "."); };
    x.onerror = function () { busy(false); status(T.failed + name + "."); };
    x.send(JSON.stringify({ app: key }));
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { busy(false); status(""); tick(); } });

  /* ---- Start ---- */
  if (C.accent) document.documentElement.style.setProperty("--accent", C.accent);
  document.documentElement.lang = IT ? "it" : "en";
  $("hint").textContent = T.hint;
  background();
  build();
  tick(); setInterval(tick, 10000);
  weather(); setInterval(weather, 30 * 60 * 1000);
  if (onTV) { connectTizenBrew(); loadState(0); }
})();
