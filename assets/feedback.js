/* Movage bugs and ideas board. Sign-in is the same email code as Community in the app.
   All reads and writes go through database functions (fb_*) that only return nicknames. */
(function () {
  "use strict";
  var URL_ = "https://atmoejivzryboipwvwdv.supabase.co";
  var KEY = "sb_publishable_WgkGQ5AbZDwK0zICuAAnBQ_oVkDCbCJ";
  var AREA = { today: "Today page", routines: "Routines", test: "Mobility test", history: "History", community: "Community", general: "Something else" };
  var STATUS = { open: "Open", planned: "Planned", in_progress: "In progress", done: "Done", wont_fix: "Won't do" };
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var sb, items = [], admin = false, view = { kind: "all", area: "all", status: "active", sort: "top" }, openId = null, email = "";

  if (!window.supabase || !window.supabase.createClient) { $("#fb-auth").hidden = false; msg("#fb-auth-msg", "Sorry, sign-in couldn't load. Please refresh the page.", true); return; }
  sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "movage-site-auth" } });

  function msg(sel, text, bad) { var el = $(sel); el.textContent = text || ""; el.classList.toggle("bad", !!bad); }
  function errText(e) {
    var m = (e && (e.message || e.error_description)) || "";
    if (/rate|too many|security purposes/i.test(m)) return "Please wait a minute before asking for another code.";
    if (/expired|invalid|token/i.test(m)) return "That code didn't work. Check it, or ask for a new one.";
    if (/sign in first|JWT|not authenticated/i.test(m)) return "Your sign-in has expired. Please sign in again.";
    return m || "Something went wrong. Please try again.";
  }
  function rpc(name, args) { return sb.rpc(name, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function when(t) { return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

  /* ---------- sign in ---------- */
  function showAuth() { $("#fb-app").hidden = true; $("#fb-auth").hidden = false; $("#fb-email-form").hidden = false; $("#fb-code-form").hidden = true; }
  $("#fb-email-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("#fb-email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg("#fb-auth-msg", "Please enter a valid email address.", true); return; }
    var b = e.submitter || $("#fb-email-form button"); b.disabled = true; msg("#fb-auth-msg", "Sending your code...");
    sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true } }).then(function (r) {
      b.disabled = false;
      if (r.error) { msg("#fb-auth-msg", errText(r.error), true); return; }
      email = v; $("#fb-sent-to").textContent = v; $("#fb-email-form").hidden = true; $("#fb-code-form").hidden = false; msg("#fb-auth-msg", ""); $("#fb-code").focus();
    });
  });
  $("#fb-code-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var code = $("#fb-code").value.replace(/\D/g, "");
    if (code.length < 6) { msg("#fb-auth-msg", "Enter the code from the email.", true); return; }
    var b = $("#fb-code-form button[type=submit]"); b.disabled = true; msg("#fb-auth-msg", "Signing in...");
    sb.auth.verifyOtp({ email: email, token: code, type: "email" }).then(function (r) {
      b.disabled = false;
      if (r.error) { msg("#fb-auth-msg", errText(r.error), true); return; }
      msg("#fb-auth-msg", ""); start(r.data.user);
    });
  });
  $("#fb-restart").addEventListener("click", function () { $("#fb-code").value = ""; msg("#fb-auth-msg", ""); showAuth(); $("#fb-email").focus(); });
  $("#fb-signout").addEventListener("click", function () { sb.auth.signOut().then(function () { items = []; $("#fb-list").innerHTML = ""; showAuth(); }); });

  function start(user) {
    $("#fb-me").textContent = user.email || "your account";
    $("#fb-auth").hidden = true; $("#fb-app").hidden = false;
    rpc("fb_is_admin").then(function (a) { admin = !!a; document.querySelectorAll(".fb-admin").forEach(function (el) { el.hidden = !admin; }); render(); }, function () {});
    load();
  }

  /* ---------- board ---------- */
  function load() {
    msg("#fb-list-msg", "Loading...");
    return rpc("fb_list").then(function (d) { items = d || []; msg("#fb-list-msg", ""); render(); }, function (e) {
      msg("#fb-list-msg", errText(e), true);
      if (/sign in/i.test(errText(e))) showAuth();
    });
  }
  function shown() {
    return items.filter(function (i) {
      if (view.kind !== "all" && i.kind !== view.kind) return false;
      if (view.area !== "all" && (i.area || "general") !== view.area) return false;
      if (view.status === "active") return i.status === "open" || i.status === "planned" || i.status === "in_progress";
      if (view.status === "done") return i.status === "done" || i.status === "wont_fix";
      return true;
    }).sort(function (a, b) { return view.sort === "top" ? (b.votes - a.votes) || (new Date(b.created_at) - new Date(a.created_at)) : new Date(b.created_at) - new Date(a.created_at); });
  }
  function render() {
    var list = shown();
    if (!items.length) { $("#fb-list").innerHTML = '<li class="fb-empty">Nothing here yet. Be the first to report a bug or suggest a feature.</li>'; return; }
    if (!list.length) { $("#fb-list").innerHTML = '<li class="fb-empty">Nothing matches these filters.</li>'; return; }
    $("#fb-list").innerHTML = list.map(card).join("");
    if (openId) { var it = byId(openId); if (it) loadComments(it); }
  }
  function card(i) {
    var open = openId === i.id;
    var statusSel = admin ? '<label class="sr" for="fb-st-' + i.id + '">Status</label><select class="fb-sel fb-st" id="fb-st-' + i.id + '" data-act="status" data-id="' + i.id + '">' +
      Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (k === i.status ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + "</select>" +
      '<label class="sr" for="fb-ar-' + i.id + '">Section</label><select class="fb-sel fb-st" id="fb-ar-' + i.id + '" data-act="area" data-id="' + i.id + '">' +
      Object.keys(AREA).map(function (k) { return '<option value="' + k + '"' + (k === (i.area || "general") ? " selected" : "") + ">" + AREA[k] + "</option>"; }).join("") + "</select>" : "";
    return '<li class="fb-item k-' + i.kind + (open ? " open" : "") + '" id="fb-i-' + i.id + '">' +
      (i.kind === "test" ? '<span class="fb-vote fb-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 11-11-1.4-1.4z"/></svg></span>' : '<button type="button" class="fb-vote' + (i.my_vote ? " on" : "") + '" data-act="vote" data-id="' + i.id + '" aria-pressed="' + !!i.my_vote + '" aria-label="' + (i.my_vote ? "Remove your vote" : "Vote for this") + ", " + i.votes + ' votes">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8h-4.5v6h-5v-6H5z"/></svg><span>' + i.votes + "</span></button>") +
      '<div class="fb-main">' +
        '<div class="fb-tags"><span class="fb-kind ' + i.kind + '">' + (i.kind === "bug" ? "Bug" : i.kind === "test" ? "Test (team only)" : "Feature") + '</span><span class="fb-area">' + AREA[i.area || "general"] + '</span><span class="fb-status s-' + i.status + '">' + STATUS[i.status] + "</span></div>" +
        '<h3 class="fb-title"><button type="button" class="fb-open" data-act="open" data-id="' + i.id + '" aria-expanded="' + open + '">' + esc(i.title) + "</button></h3>" +
        '<p class="fb-meta">' + esc(i.author) + " &middot; " + when(i.created_at) + " &middot; " + i.comments + (i.comments === 1 ? " comment" : " comments") + "</p>" +
        (open ? '<div class="fb-detail"><p class="fb-body">' + esc(i.body) + "</p>" +
          (i.device ? '<p class="fb-dev"><strong>Device:</strong> ' + esc(i.device) + "</p>" : "") +
          ((i.mine || admin) ? '<div class="fb-own">' + statusSel + '<button type="button" class="fb-link fb-del" data-act="delete" data-id="' + i.id + '">Delete</button></div>' : "") +
          '<ol class="fb-comments" id="fb-c-' + i.id + '"><li class="fb-cm muted">Loading comments...</li></ol>' +
          '<form class="fb-reply" data-id="' + i.id + '"><label class="sr" for="fb-r-' + i.id + '">Add a comment</label><textarea class="fb-in" id="fb-r-' + i.id + '" rows="2" maxlength="2000" placeholder="' + (admin ? "Reply as the Movage team" : "Add a comment") + '"></textarea><button class="btn btn-primary" type="submit">Comment</button></form>' +
        "</div>" : "") +
      "</div></li>";
  }
  function byId(id) { for (var k = 0; k < items.length; k++) if (items[k].id === id) return items[k]; return null; }
  function loadComments(i) {
    rpc("fb_comments", { p_id: i.id }).then(function (cs) {
      var el = document.getElementById("fb-c-" + i.id); if (!el) return;
      el.innerHTML = cs.length ? cs.map(function (c) { return '<li class="fb-cm' + (c.team ? " team" : "") + '"><p class="fb-meta"><strong>' + esc(c.author) + "</strong> &middot; " + when(c.created_at) + '</p><p class="fb-ct">' + esc(c.body) + "</p></li>"; }).join("") : '<li class="fb-cm muted">No comments yet.</li>';
    }, function () {});
  }

  $("#fb-list").addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]"); if (!t || t.tagName === "SELECT") return;
    var id = Number(t.dataset.id), i = byId(id); if (!i) return;
    if (t.dataset.act === "open") { openId = openId === id ? null : id; render(); return; }
    if (t.dataset.act === "vote") {
      var on = !i.my_vote; i.my_vote = on; i.votes += on ? 1 : -1; render();
      rpc("fb_vote", { p_id: id, p_on: on }).then(function (n) { i.votes = n; render(); }, function (er) { i.my_vote = !on; i.votes += on ? -1 : 1; render(); msg("#fb-list-msg", errText(er), true); });
      return;
    }
    if (t.dataset.act === "delete") {
      if (!window.confirm("Delete this post and its comments? This can't be undone.")) return;
      rpc("fb_delete", { p_id: id }).then(function () { items = items.filter(function (x) { return x.id !== id; }); openId = null; render(); }, function (er) { msg("#fb-list-msg", errText(er), true); });
    }
  });
  $("#fb-list").addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset.act === "area") {
      var ia = byId(Number(t.dataset.id)), wasA = ia.area; ia.area = t.value;
      rpc("fb_set_area", { p_id: ia.id, p_area: t.value }).then(render, function (er) { ia.area = wasA; render(); msg("#fb-list-msg", errText(er), true); });
      return;
    }
    if (t.dataset.act !== "status") return;
    var i = byId(Number(t.dataset.id)), was = i.status; i.status = t.value;
    rpc("fb_set_status", { p_id: i.id, p_status: t.value }).then(render, function (er) { i.status = was; render(); msg("#fb-list-msg", errText(er), true); });
  });
  $("#fb-list").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, id = Number(f.dataset.id), ta = f.querySelector("textarea"), text = ta.value.trim(), i = byId(id);
    if (!text) return;
    f.querySelector("button").disabled = true;
    rpc("fb_comment", { p_id: id, p_body: text }).then(function () { ta.value = ""; i.comments++; render(); }, function (er) { f.querySelector("button").disabled = false; msg("#fb-list-msg", errText(er), true); });
  });

  /* filters */
  document.querySelectorAll(".fb-chip").forEach(function (b) {
    b.addEventListener("click", function () {
      view.kind = b.dataset.kind;
      document.querySelectorAll(".fb-chip").forEach(function (x) { var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", on); });
      render();
    });
  });
  $("#fb-sec").addEventListener("change", function () { view.area = this.value; render(); });
  $("#fb-status").addEventListener("change", function () { view.status = this.value; render(); });
  $("#fb-sort").addEventListener("change", function () { view.sort = this.value; render(); });

  /* new post */
  function setKind(k) {
    document.querySelectorAll('#fb-new input[name=kind]').forEach(function (r) { r.checked = r.value === k; });
    var bug = k === "bug", test = k === "test";
    $("#fb-new-h").textContent = bug ? "Report a bug" : test ? "Log something to test" : "Suggest a feature";
    $("#fb-body-l").textContent = bug ? "What happened? What did you expect, and how can we make it happen again?" : test ? "What needs testing, and how will you know it works? Only the Movage team can see this." : "What would you like, and how would it help you?";
    $("#fb-device-wrap").hidden = !bug;
  }
  document.querySelectorAll("[data-new]").forEach(function (b) {
    b.addEventListener("click", function () { setKind(b.dataset.new); $("#fb-new").hidden = false; msg("#fb-new-msg", ""); $("#fb-title").focus(); });
  });
  document.querySelectorAll('#fb-new input[name=kind]').forEach(function (r) { r.addEventListener("change", function () { setKind(r.value); }); });
  $("#fb-cancel").addEventListener("click", function () { $("#fb-new").hidden = true; });
  $("#fb-new").addEventListener("submit", function (e) {
    e.preventDefault();
    var kind = document.querySelector('#fb-new input[name=kind]:checked').value, title = $("#fb-title").value.trim(), body = $("#fb-body").value.trim();
    var area = $("#fb-area").value;
    if (!area) { msg("#fb-new-msg", "Please choose which part of the app this is about.", true); $("#fb-area").focus(); return; }
    if (title.length < 4) { msg("#fb-new-msg", "Please add a title of at least 4 characters.", true); return; }
    if (body.length < 10) { msg("#fb-new-msg", "Please add a little more detail (at least 10 characters).", true); return; }
    var b = $("#fb-new button[type=submit]"); b.disabled = true; msg("#fb-new-msg", "Posting...");
    rpc("fb_create", { p_kind: kind, p_title: title, p_body: body, p_device: kind === "bug" ? $("#fb-device").value.trim() : null, p_area: area }).then(function (id) {
      b.disabled = false; $("#fb-new").reset(); $("#fb-new").hidden = true; msg("#fb-new-msg", "");
      openId = id; view.status = "active"; $("#fb-status").value = "active";
      return load().then(function () { msg("#fb-list-msg", "Thanks, your post is up. We'll reply here."); var el = document.getElementById("fb-i-" + id); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); });
    }, function (er) { b.disabled = false; msg("#fb-new-msg", errText(er), true); });
  });

  /* start */
  sb.auth.getSession().then(function (r) { var s = r.data && r.data.session; if (s) start(s.user); else showAuth(); });
})();
