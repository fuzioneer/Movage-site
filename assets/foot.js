/* Footer "Stats" link for the Movage team. Shown only when this browser is signed in and the last check said the
   account is an admin. This is only a shortcut: the stats themselves come from the database, which checks again. */
(function () {
  "use strict";
  function signedIn() { try { var a = JSON.parse(localStorage.getItem("movage-site-auth") || "null"); return !!(a && (a.access_token || (a.currentSession && a.currentSession.access_token))); } catch (e) { return false; } }
  function isAdmin() { try { return localStorage.getItem("movage-admin") === "1"; } catch (e) { return false; } }
  function apply() {
    var nav = document.querySelector('.foot nav[aria-label="Footer"]'); if (!nav) return;
    var link = nav.querySelector(".foot-admin"), want = signedIn() && isAdmin();
    if (want && !link) { link = document.createElement("a"); link.className = "foot-admin"; link.href = "statsinfo.html"; link.textContent = "Stats (team)"; if (/statsinfo\.html$/.test(location.pathname)) link.setAttribute("aria-current", "page"); nav.appendChild(link); }
    else if (!want && link) link.remove();
  }
  window.MOVAGE_FOOT = apply;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
  window.addEventListener("storage", apply);
})();
