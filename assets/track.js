/* Movage visitor counter. Cookie free: it sets no cookies and stores nothing on your device.
   It sends the page address, the site you came from (domain only), any campaign tag, your time zone
   (to estimate the country) and your screen width (only to tell laptops from large monitors; never stored). Signed-in team members, anyone who opts out on the privacy page and
   browsers with Do Not Track or Global Privacy Control switched on are not counted. */
(function () {
  "use strict";
  try {
    if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    if (localStorage.getItem("movage-admin") === "1" || localStorage.getItem("movage-nocount") === "1") return;
  } catch (e) {}
  if (!/(^|\.)movage\.co\.uk$|^localhost$/.test(location.hostname)) return;
  if (/statsinfo/.test(location.pathname)) return;
  var URL_ = "https://atmoejivzryboipwvwdv.supabase.co/functions/v1/track";
  var path = location.pathname.replace(/\/index\.html$/, "/") || "/";
  function send(o) {
    o.p = path;
    var body = JSON.stringify(o);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(URL_, new Blob([body], { type: "text/plain" }))) return;
    } catch (e) {}
    try { fetch(URL_, { method: "POST", body: body, keepalive: true, mode: "cors", credentials: "omit", headers: { "Content-Type": "text/plain" } }); } catch (e) {}
  }
  var ref = "";
  try { if (document.referrer) { var h = new URL(document.referrer).hostname; if (h !== location.hostname) ref = h; } } catch (e) {}
  var q = new URLSearchParams(location.search), src = q.get("utm_source") || q.get("ref") || "";
  var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  var w = 0; try { w = Math.round((screen.width || 0) / 10) * 10; } catch (e) {}
  send({ r: ref, s: src.slice(0, 60), tz: tz, w: w >= 100 ? String(w) : "" });

  /* Time on page: only counts time while the tab is visible, sent once when you leave. */
  var shown = document.visibilityState === "visible" ? Date.now() : 0, total = 0, sent = false;
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") shown = Date.now();
    else { if (shown) total += Date.now() - shown; shown = 0; flush(); }
  });
  window.addEventListener("pagehide", function () { if (shown) { total += Date.now() - shown; shown = 0; } flush(); });
  function flush() {
    if (sent || total < 2000) return;
    sent = true; send({ k: "time", t: Math.round(Math.min(total, 3600000) / 1000) });
  }
})();
