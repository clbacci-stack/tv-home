/*
  Helper service for Claudio Home. TizenBrew runs this in the TV's own Node runtime (old Node,
  so plain ES5). It only listens on the TV itself (127.0.0.1), only answers the home screen page,
  and can only open the apps listed below.
  Structure adapted from Cinema Home (MIT) by Karmani-MR.
*/
var http = require("http");
var crypto = require("crypto");
var PORT = 8098;
var token = crypto.randomBytes(24).toString("hex");
var ORIGINS = ["http://127.0.0.1:8081", "http://localhost:8081"];

/* Known app IDs first; if none is installed, match by app name instead. */
var APPS = {
  netflix: { ids: ["org.tizen.netflix-app"], names: ["netflix"] },
  prime:   { ids: ["org.tizen.primevideo"], names: ["prime video"] },
  disney:  { ids: ["MCmYXNxgcu.DisneyPlus"], names: ["disney"] },
  apple:   { ids: ["com.samsung.tv.aria-video"], names: ["apple tv"] },
  spotify: { ids: ["rJeHak5zRg.Spotify"], names: ["spotify"] },
  raiplay: { ids: [], names: ["raiplay"] },
  dazn:    { ids: [], names: ["dazn"] },
  sources: { ids: ["org.tizen.SMSourceAPP"], names: [] }
};

function reply(req, res, code, data) {
  var h = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (ORIGINS.indexOf(req.headers.origin) !== -1) { h["Access-Control-Allow-Origin"] = req.headers.origin; h["Vary"] = "Origin"; }
  res.writeHead(code, h);
  res.end(JSON.stringify(data));
}

function resolveApps(done, fail) {
  try {
    tizen.application.getAppsInfo(function (list) {
      var byId = {}, i, key, rule, found, j, name;
      for (i = 0; i < list.length; i++) byId[list[i].id] = true;
      var result = {};
      for (key in APPS) {
        if (!APPS.hasOwnProperty(key)) continue;
        rule = APPS[key]; found = false;
        for (j = 0; j < rule.ids.length && !found; j++) if (byId[rule.ids[j]]) found = rule.ids[j];
        for (j = 0; j < list.length && !found && rule.names.length; j++) {
          name = String(list[j].name || "").toLowerCase();
          for (var k = 0; k < rule.names.length; k++) if (name.indexOf(rule.names[k]) !== -1) { found = list[j].id; break; }
        }
        result[key] = found;
      }
      done(result);
    }, fail);
  } catch (e) { fail(e); }
}

var server = http.createServer(function (req, res) {
  var origin = req.headers.origin;
  if (origin && ORIGINS.indexOf(origin) === -1) { reply(req, res, 403, { error: "Origin not permitted" }); return; }
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": origin || ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Home-Token",
      "Vary": "Origin"
    });
    res.end(); return;
  }
  if (req.method === "GET" && req.url === "/state") {
    resolveApps(function (found) {
      var available = {};
      for (var key in found) if (found.hasOwnProperty(key)) available[key] = !!found[key];
      reply(req, res, 200, { version: "1.0.0", token: token, apps: available });
    }, function () { reply(req, res, 503, { error: "TV app list unavailable" }); });
    return;
  }
  if (req.method === "POST" && req.url === "/launch") {
    if (req.headers["x-home-token"] !== token) { reply(req, res, 403, { error: "Not authorized" }); return; }
    var body = "", tooLarge = false;
    req.on("data", function (c) { body += c; if (body.length > 1024) { tooLarge = true; req.destroy(); } });
    req.on("end", function () {
      if (tooLarge) return;
      var input;
      try { input = JSON.parse(body); } catch (e) { reply(req, res, 400, { error: "Bad request" }); return; }
      if (!input || !APPS.hasOwnProperty(input.app)) { reply(req, res, 400, { error: "App not permitted" }); return; }
      resolveApps(function (found) {
        var id = found[input.app];
        if (!id) { reply(req, res, 404, { error: "App not installed" }); return; }
        try {
          tizen.application.launch(id,
            function () { reply(req, res, 200, { ok: true }); },
            function () { reply(req, res, 503, { error: "TV could not open the app" }); });
        } catch (e) { reply(req, res, 503, { error: "TV could not open the app" }); }
      }, function () { reply(req, res, 503, { error: "TV app list unavailable" }); });
    });
    return;
  }
  reply(req, res, 404, { error: "Not found" });
});
server.on("error", function (e) { if (e.code !== "EADDRINUSE") console.log("Claudio Home service could not start."); });
server.listen(PORT, "127.0.0.1");
