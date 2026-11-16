/* Site-wide account menu (user icon in the header) and the team-only footer link.
   Works on every page without the sign-in library: it reads the saved sign-in from this browser. Anything that
   needs the account itself happens on the Community page, and the database checks every request. */
(function () {
  "use strict";
  function store(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function signedIn() { try { var a = JSON.parse(store("movage-site-auth") || "null"); return !!(a && (a.access_token || (a.currentSession && a.currentSession.access_token))); } catch (e) { return false; } }
  function isAdmin() { return store("movage-admin") === "1"; }
  var USER = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
  var ICONS = {
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
    boards: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    mine: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    clubs: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c3 0 5 1.9 5 5"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    ideas: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
  };
  function ico(k) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[k] + "</svg>"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function item(href, k, label) { return '<a role="menuitem" href="' + href + '">' + ico(k) + "<span>" + label + "</span></a>"; }

  var wrap, btn, menu;
  function buildMenu() {
    var inn = signedIn(), nick = store("movage-nick");
    btn.classList.toggle("in", inn);
    btn.setAttribute("aria-label", inn ? "Your account" + (nick ? ", " + nick : "") : "Sign in or create an account");
    menu.innerHTML = inn
      ? '<div class="acct-head">' + (nick ? "<b>" + esc(nick) + "</b>" : "<b>Signed in</b>") + "<span>Movage account</span></div>" +
        item("community.html#boards", "boards", "Leaderboards") + item("community.html#mine", "mine", "My activity") + item("community.html#clubs", "clubs", "Clubs") +
        item("community.html#profile", "profile", "Profile and settings") + item("feedback.html", "ideas", "Bugs and ideas") +
        (isAdmin() ? item("statsinfo.html", "stats", "Stats (team)") : "") +
        '<div class="acct-sep"></div>' + item("community.html#signout", "out", "Sign out")
      : '<div class="acct-head"><b>Your Movage account</b><span>See leaderboards, your activity and clubs.</span></div>' +
        item("community.html", "login", "Sign in or create an account") + item("feedback.html", "ideas", "Bugs and ideas");
  }
  function open(on) {
    if (on) buildMenu();
    menu.hidden = !on; btn.setAttribute("aria-expanded", on ? "true" : "false");
    if (on) { var f = menu.querySelector("a"); if (f) f.focus(); }
  }
  function header() {
    wrap = document.querySelector("header.top .wrap"); if (!wrap || wrap.querySelector(".acct")) return;
    var box = document.createElement("div"); box.className = "acct";
    box.innerHTML = '<button type="button" class="acct-btn" aria-haspopup="true" aria-expanded="false" aria-controls="acct-menu">' + USER + '<i class="acct-dot" aria-hidden="true"></i></button><div class="acct-menu" id="acct-menu" role="menu" hidden></div>';
    wrap.appendChild(box); btn = box.querySelector(".acct-btn"); menu = box.querySelector(".acct-menu");
    buildMenu();
    btn.addEventListener("click", function (e) { e.stopPropagation(); open(menu.hidden); });
    document.addEventListener("click", function (e) { if (!menu.hidden && !box.contains(e.target)) open(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { open(false); btn.focus(); } });
    menu.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; e.preventDefault();
      var it = [].slice.call(menu.querySelectorAll("a")), i = it.indexOf(document.activeElement);
      it[(i + (e.key === "ArrowDown" ? 1 : it.length - 1)) % it.length].focus();
    });
  }
  function footer() {
    var nav = document.querySelector('.foot nav[aria-label="Footer"]'); if (!nav) return;
    var link = nav.querySelector(".foot-admin"), want = signedIn() && isAdmin();
    if (want && !link) { link = document.createElement("a"); link.className = "foot-admin"; link.href = "statsinfo.html"; link.textContent = "Stats (team)"; if (/statsinfo\.html$/.test(location.pathname)) link.setAttribute("aria-current", "page"); nav.appendChild(link); }
    else if (!want && link) link.remove();
  }
  function apply() { header(); if (btn) buildMenu(); footer(); }
  window.MOVAGE_FOOT = apply;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
  window.addEventListener("storage", apply);
})();
