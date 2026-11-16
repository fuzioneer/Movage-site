/* Movage Community on the website: the same accounts, clubs and leaderboards as Community in the app.
   Everything goes through the same database functions as the app, which only ever return nicknames.
   Time and scores are added by the app; here people can view the boards and manage their clubs and profile. */
(function () {
  "use strict";
  var URL_ = "https://atmoejivzryboipwvwdv.supabase.co";
  var KEY = "sb_publishable_WgkGQ5AbZDwK0zICuAAnBQ_oVkDCbCJ";
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var sb, email = "", prof = null, comms = [], scope = null, board = "time", period = "week", clubMetric = "week", verifiedOnly = false, req = 0, armed = "";
  var pendingJoin = (function () { try { var c = new URLSearchParams(location.search).get("join"); return c && /^[A-Za-z2-9]{6}$/.test(c) ? c.toUpperCase() : null; } catch (e) { return null; } })();
  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 11-11-1.4-1.4z"/></svg>';

  function msg(sel, text, bad) { var el = $(sel); if (!el) return; el.textContent = text || ""; el.classList.toggle("bad", !!bad); }
  function errText(e) {
    var m = String((e && (e.message || e.error_description)) || e || "");
    var map = [["set a nickname first", "Choose a nickname first."], ["no community with that code", "No club has that code. Check it and try again."], ["only the club owner", "Only the club owner can change this."],
      ["community limit reached", "You can create up to 10 clubs."], ["membership limit reached", "You can be in up to 20 clubs."], ["not a member", "You're not in that club any more."], ["profiles_nickname_ci", "That nickname is taken. Try another."]];
    for (var i = 0; i < map.length; i++) if (m.indexOf(map[i][0]) >= 0) return map[i][1];
    if (/rate|too many|security purposes/i.test(m)) return "Please wait a minute before trying again.";
    if (/expired|invalid|token/i.test(m)) return "That code didn't work. Check it, or ask for a new one.";
    if (/JWT|not authenticated|sign in/i.test(m)) return "Your sign-in has expired. Please sign in again.";
    if (/network|fetch|load failed/i.test(m)) return "Can't reach the community right now. Check your connection.";
    return m || "Something went wrong. Please try again.";
  }
  function ok(r) { if (r.error) throw r.error; return r.data; }
  function rpc(name, args) { return sb.rpc(name, args || {}).then(ok); }
  function one(rows) { return Array.isArray(rows) ? rows[0] || null : rows; }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function range(p) {
    var d = new Date(), to = iso(d);
    if (p === "day") return [to, to];
    if (p === "week") { var w = new Date(d); w.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [iso(w), to]; }
    return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), to];
  }
  function hm(s) { var m = Math.round((s || 0) / 60), h = Math.floor(m / 60); return h ? h + " h " + (m % 60) + " min" : m + " min"; }
  function show(id) { ["#cm-auth", "#cm-nick", "#cm-app"].forEach(function (s) { $(s).hidden = s !== id; }); }

  if (!window.supabase || !window.supabase.createClient) { show("#cm-auth"); msg("#cm-auth-msg", "Sorry, sign-in couldn't load. Please refresh the page.", true); return; }
  sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "movage-site-auth" } });

  /* ---------- sign in ---------- */
  function showAuth() { show("#cm-auth"); $("#cm-email-form").hidden = false; $("#cm-code-form").hidden = true; }
  $("#cm-email-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("#cm-email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg("#cm-auth-msg", "Please enter a valid email address.", true); return; }
    var b = $("#cm-email-form button"); b.disabled = true; msg("#cm-auth-msg", "Sending your code...");
    sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true } }).then(function (r) {
      b.disabled = false;
      if (r.error) { msg("#cm-auth-msg", errText(r.error), true); return; }
      email = v; $("#cm-sent-to").textContent = v; $("#cm-email-form").hidden = true; $("#cm-code-form").hidden = false; msg("#cm-auth-msg", ""); $("#cm-code").focus();
    });
  });
  $("#cm-code-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var code = $("#cm-code").value.replace(/\D/g, "");
    if (code.length < 6) { msg("#cm-auth-msg", "Enter the code from the email.", true); return; }
    var b = $("#cm-code-form button[type=submit]"); b.disabled = true; msg("#cm-auth-msg", "Signing in...");
    sb.auth.verifyOtp({ email: email, token: code, type: "email" }).then(function (r) {
      b.disabled = false;
      if (r.error) { msg("#cm-auth-msg", errText(r.error), true); return; }
      msg("#cm-auth-msg", ""); start();
    });
  });
  $("#cm-restart").addEventListener("click", function () { $("#cm-code").value = ""; msg("#cm-auth-msg", ""); showAuth(); $("#cm-email").focus(); });
  $("#cm-signout").addEventListener("click", function () { sb.auth.signOut().then(function () { prof = null; comms = []; scope = null; showAuth(); }); });

  /* ---------- profile ---------- */
  function loadProfile() { return sb.from("profiles").select("nickname, share_time, share_score").maybeSingle().then(ok); }
  function saveProfile(p) {
    return sb.auth.getUser().then(function (r) {
      var u = ok(r).user; if (!u) throw new Error("sign in first");
      return sb.from("profiles").upsert({ id: u.id, nickname: p.nickname, share_time: !!p.share_time, share_score: !!p.share_score }).select("nickname, share_time, share_score").single().then(ok);
    });
  }
  function start() {
    loadProfile().then(function (p) {
      prof = p;
      if (!p) return nickForm(false);
      enterMain();
    }, function (e) { showAuth(); msg("#cm-auth-msg", errText(e), true); });
  }
  function nickForm(editing) {
    show("#cm-nick"); $("#cm-nick-h").textContent = editing ? "Change nickname" : "Choose a nickname";
    $("#cm-nick-in").value = prof ? prof.nickname : ""; $("#cm-st").checked = prof ? prof.share_time !== false : true; $("#cm-ss").checked = prof ? prof.share_score !== false : true;
    $("#cm-nick-cancel").hidden = !editing; msg("#cm-nick-msg", ""); $("#cm-nick-in").focus();
  }
  $("#cm-nick-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var nk = $("#cm-nick-in").value.trim();
    if (nk.length < 2 || nk.length > 20) { msg("#cm-nick-msg", "Nicknames are 2 to 20 characters.", true); return; }
    if (/[<>]/.test(nk)) { msg("#cm-nick-msg", "Nicknames can't contain < or >.", true); return; }
    var first = !prof, b = $("#cm-nick-form button[type=submit]"); b.disabled = true;
    saveProfile({ nickname: nk, share_time: $("#cm-st").checked, share_score: $("#cm-ss").checked }).then(function (p) {
      b.disabled = false; prof = p; enterMain(); if (first) msg("#cm-list-msg", "Welcome to the Movage community.");
    }, function (er) { b.disabled = false; msg("#cm-nick-msg", errText(er), true); });
  });
  $("#cm-nick-cancel").addEventListener("click", enterMain);
  $("#cm-nick-edit").addEventListener("click", function () { nickForm(true); });
  ["#cm-p-st", "#cm-p-ss"].forEach(function (sel) {
    $(sel).addEventListener("change", function () {
      var box = this, np = { nickname: prof.nickname, share_time: $("#cm-p-st").checked, share_score: $("#cm-p-ss").checked };
      saveProfile(np).then(function (p) { prof = p; msg("#cm-prof-msg", "Saved."); refresh(); }, function (er) { box.checked = !box.checked; msg("#cm-prof-msg", errText(er), true); });
    });
  });
  $("#cm-delete").addEventListener("click", function () {
    var b = this;
    if (armed !== "delete") { armed = "delete"; b.textContent = "Tap again to delete for good"; return; }
    armed = ""; b.disabled = true;
    rpc("delete_account").then(function () { return sb.auth.signOut(); }).then(function () {
      b.disabled = false; b.textContent = "Delete my account"; prof = null; comms = []; scope = null; showAuth();
      msg("#cm-auth-msg", "Your account and community data have been deleted.");
    }, function (er) { b.disabled = false; b.textContent = "Delete my account"; msg("#cm-prof-msg", errText(er), true); });
  });

  /* ---------- clubs and boards ---------- */
  function loadComms() { return rpc("my_communities").then(function (c) { comms = c || []; if (scope && !comms.some(function (x) { return x.id === scope; })) scope = null; }, function () {}); }
  function enterMain() {
    show("#cm-app"); $("#cm-me").textContent = prof.nickname; $("#cm-nickname").textContent = prof.nickname;
    $("#cm-p-st").checked = !!prof.share_time; $("#cm-p-ss").checked = !!prof.share_score;
    loadComms().then(function () {
      if (pendingJoin) { var c = pendingJoin; pendingJoin = null; $("#cm-joinbox").hidden = false; $("#cm-join-code").value = c; return join(c); }
      refresh();
    });
  }
  function chip(act, id, label, on, extra) { return '<button type="button" class="fb-chip' + (on ? " on" : "") + '" data-act="' + act + '" data-id="' + esc(id) + '" role="tab" aria-selected="' + !!on + '"' + (extra || "") + ">" + label + "</button>"; }
  function renderControls() {
    $("#cm-scopes").innerHTML = '<div class="fb-chips">' + chip("scope", "", "Everyone", !scope) + comms.map(function (c) { return chip("scope", c.id, esc(c.name), scope === c.id); }).join("") +
      '<button type="button" class="fb-chip cm-add" data-act="joinbox" aria-expanded="' + !$("#cm-joinbox").hidden + '">+ Club</button></div>';
    if (board === "clubs" && scope) board = "time";
    $("#cm-boards").innerHTML = chip("board", "time", "Time", board === "time") + chip("board", "score", "Score", board === "score") + (!scope ? chip("board", "clubs", "Top clubs", board === "clubs") : "");
    var sub = "";
    if (board === "time") sub = [["day", "Today"], ["week", "This week"], ["month", "This month"]].map(function (p) { return chip("period", p[0], p[1], period === p[0]); }).join("");
    else if (board === "clubs") sub = [["week", "Time this week"], ["month", "Time this month"], ["score", "Average score"]].map(function (p) { return chip("metric", p[0], p[1], clubMetric === p[0]); }).join("");
    else sub = '<button type="button" class="fb-chip' + (verifiedOnly ? " on" : "") + '" data-act="verified" aria-pressed="' + verifiedOnly + '"><span class="cm-tick' + (verifiedOnly ? " on" : "") + '">' + TICK + "</span>Camera-verified only</button>";
    $("#cm-sub").innerHTML = sub;
    $("#cm-note").textContent = board === "clubs" ? (clubMetric === "score" ? "Clubs with 2 or more members. The average of members who show their mobility score." : "Clubs with 2 or more members. Adds up guided time from every member who shows their time.") + " Only club names and member counts are shown."
      : board === "time" ? "Only time from the guided player in the app counts. Sessions from the 31 days before someone joined are included." : "Each person's latest score from their most recent tests. A tick means every result in it was measured with the camera.";
    renderClub();
  }
  function renderClub() {
    var cur = scope && comms.filter(function (c) { return c.id === scope; })[0], el = $("#cm-club");
    if (!cur) { el.innerHTML = ""; return; }
    var n = Number(cur.members);
    el.innerHTML = '<div class="box cm-clubcard"><h2 class="fb-h">' + esc(cur.name) + "</h2><p>" + (n === 1 ? "1 member" : n + " members") + ' &middot; Invite code <strong class="cm-code">' + esc(cur.code) + "</strong></p>" +
      '<div class="fb-row"><button type="button" class="btn btn-primary" data-act="invite" data-id="' + cur.id + '">Invite</button><button type="button" class="btn btn-ghost" data-act="leave" data-id="' + cur.id + '">' + (armed === "leave" ? "Tap again to leave" : "Leave") + "</button></div>" +
      (cur.is_owner ? '<label class="cm-check"><input type="checkbox" data-act="listed" data-id="' + cur.id + '"' + (cur.listed !== false ? " checked" : "") + "><span>Show on Top clubs <span class=\"fb-opt\">(everyone on Movage can see the club name and member count)</span></span></label>" : "") +
      '<p class="fb-msg" id="cm-club-msg" role="status" aria-live="polite"></p></div>';
  }
  function refresh() {
    renderControls();
    var my = ++req, list = $("#cm-board"); list.innerHTML = '<li class="cm-empty">Loading...</li>'; msg("#cm-list-msg", "");
    var r = range(period), p;
    if (board === "clubs") { var cr = range(clubMetric === "month" ? "month" : "week"); p = rpc("club_board", { p_metric: clubMetric === "score" ? "score" : "time", p_from: cr[0], p_to: cr[1], p_limit: 50 }); }
    else if (board === "time") p = rpc("time_board", { p_community: scope || null, p_from: r[0], p_to: r[1], p_limit: 50 });
    else p = rpc("score_board", { p_community: scope || null, p_verified_only: !!verifiedOnly, p_limit: 50 });
    p.then(function (rows) {
      if (my !== req) return; rows = rows || [];
      if (!rows.length) { list.innerHTML = '<li class="cm-empty">' + (board === "clubs" ? "No clubs on the board yet. Start a club, invite a friend and finish a routine in the app to get on it." : board === "time" ? "No time logged in this period yet. Finish a guided routine in the app to get on the board." : verifiedOnly ? "No camera-verified scores yet." : "No scores shared yet. Save a mobility test in the app to add yours.") + "</li>"; return; }
      list.innerHTML = rows.map(function (x) {
        if (board === "clubs") {
          var v = clubMetric === "score" ? "<b>" + Math.round(Number(x.value)) + "</b>" : hm(Number(x.value));
          return '<li class="cm-row' + (x.is_mine ? " me" : "") + '"><span class="cm-rank">' + x.rank + '</span><span class="cm-name">' + esc(x.name) + (x.is_mine ? ' <span class="cm-you">(your club)</span>' : "") + '<span class="cm-mem">' + x.members + " members</span></span><span class=\"cm-val\">" + v + "</span></li>";
        }
        var val = board === "time" ? hm(x.secs) : "<b>" + x.overall + "</b>" + (x.verified ? '<span class="cm-tick on" role="img" aria-label="Camera verified" title="Camera verified">' + TICK + "</span>" : '<span class="cm-tick"></span>');
        return '<li class="cm-row' + (x.is_me ? " me" : "") + '"><span class="cm-rank">' + x.rank + '</span><span class="cm-name">' + esc(x.nickname) + (x.is_me ? ' <span class="cm-you">(you)</span>' : "") + '</span><span class="cm-val">' + val + "</span></li>";
      }).join("");
    }, function (e) {
      if (my !== req) return; list.innerHTML = ""; msg("#cm-list-msg", errText(e), true);
      if (/not a member/.test(String(e && e.message))) { scope = null; loadComms().then(renderControls); }
      if (/JWT|sign in/i.test(String(e && e.message))) showAuth();
    });
  }
  function join(code) {
    msg("#cm-join-msg", "Joining...");
    return rpc("join_community", { p_code: code }).then(one).then(function (c) {
      if (!c) { msg("#cm-join-msg", ""); return refresh(); }
      $("#cm-joinbox").hidden = true; $("#cm-join-code").value = ""; msg("#cm-join-msg", ""); scope = c.id;
      return loadComms().then(function () { refresh(); msg("#cm-list-msg", "You've joined " + c.name + "."); });
    }, function (e) { msg("#cm-join-msg", errText(e), true); refresh(); });
  }
  $("#cm-join-form").addEventListener("submit", function (e) {
    e.preventDefault(); var c = $("#cm-join-code").value.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(c)) { msg("#cm-join-msg", "Invite codes are 6 letters and numbers.", true); return; }
    join(c);
  });
  $("#cm-create-form").addEventListener("submit", function (e) {
    e.preventDefault(); var nm = $("#cm-new-name").value.trim();
    if (nm.length < 2 || nm.length > 40 || /[<>]/.test(nm)) { msg("#cm-join-msg", "Club names are 2 to 40 characters.", true); return; }
    rpc("create_community", { p_name: nm, p_listed: $("#cm-new-listed").checked }).then(one).then(function (c) {
      $("#cm-joinbox").hidden = true; $("#cm-new-name").value = ""; msg("#cm-join-msg", ""); scope = c.id;
      return loadComms().then(function () { refresh(); msg("#cm-list-msg", c.name + " is ready. Share the code " + c.code + " to invite people."); });
    }, function (er) { msg("#cm-join-msg", errText(er), true); });
  });

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el || !$("#cm-app").contains(el) || el.type === "checkbox") return;
    var a = el.getAttribute("data-act"), id = el.getAttribute("data-id");
    if (a !== "leave") armed = armed === "delete" ? armed : "";
    switch (a) {
      case "scope": scope = id || null; refresh(); break;
      case "board": board = id; refresh(); break;
      case "period": period = id; refresh(); break;
      case "metric": clubMetric = id; refresh(); break;
      case "verified": verifiedOnly = !verifiedOnly; refresh(); break;
      case "joinbox": $("#cm-joinbox").hidden = !$("#cm-joinbox").hidden; renderControls(); if (!$("#cm-joinbox").hidden) $("#cm-join-code").focus(); break;
      case "invite": {
        var c = comms.filter(function (x) { return x.id === id; })[0]; if (!c) return;
        var link = "https://www.movage.co.uk/community.html?join=" + c.code, text = "Join " + c.name + " on Movage and let's see who moves most. Code: " + c.code;
        if (navigator.share) navigator.share({ title: "Movage", text: text, url: link }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(text + " " + link).then(function () { msg("#cm-club-msg", "Invite copied. Paste it to a friend."); }, function () { msg("#cm-club-msg", link); });
        else msg("#cm-club-msg", link);
        break;
      }
      case "leave":
        if (armed !== "leave") { armed = "leave"; renderClub(); return; }
        armed = ""; rpc("leave_community", { p_id: id }).then(function () { scope = null; return loadComms().then(function () { refresh(); msg("#cm-list-msg", "You've left the club."); }); }, function (er) { msg("#cm-club-msg", errText(er), true); });
        break;
    }
  });
  document.addEventListener("change", function (e) {
    var el = e.target; if (el.getAttribute("data-act") !== "listed") return;
    var id = el.getAttribute("data-id"), on = el.checked, c = comms.filter(function (x) { return x.id === id; })[0];
    rpc("set_community_listed", { p_id: id, p_listed: on }).then(function () { if (c) c.listed = on; msg("#cm-club-msg", on ? "Your club is on the Top clubs board." : "Your club is hidden from Top clubs."); }, function (er) { el.checked = !on; msg("#cm-club-msg", errText(er), true); });
  });

  sb.auth.getSession().then(function (r) { var s = r.data && r.data.session; if (s) start(); else { showAuth(); if (pendingJoin) msg("#cm-auth-msg", "Sign in to join the club with code " + pendingJoin + "."); } });
})();
