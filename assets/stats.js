/* Movage admin statistics. The page itself is public, but the numbers come from admin_stats(), which the database
   only answers for Movage team accounts (fb_is_admin). Only totals and counts, never anyone's email. */
(function () {
  "use strict";
  /* Don't run inside someone else's frame (clickjacking). */
  if (window.top !== window.self) { try { window.top.location = window.location.href; } catch (e) {} document.documentElement.style.display = "none"; return; }
  var URL_ = "https://atmoejivzryboipwvwdv.supabase.co";
  var KEY = "sb_publishable_WgkGQ5AbZDwK0zICuAAnBQ_oVkDCbCJ";
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var num = function (v) { var n = Number(v); return isFinite(n) ? n : 0; };
  var fmt = function (v) { return num(v).toLocaleString("en-GB"); };
  var sb, email = "", T0 = Date.now();
  function msg(sel, text, bad) { var el = $(sel); if (!el) return; el.textContent = text || ""; el.classList.toggle("bad", !!bad); }
  function show(id) { ["#ad-auth", "#ad-denied", "#ad-app"].forEach(function (s) { $(s).hidden = s !== id; }); }
  function errText(e) { var m = String((e && (e.message || e.error_description)) || e || ""); if (/rate|too many/i.test(m)) return "Please wait a minute before trying again."; if (/expired|invalid|token/i.test(m)) return "That code didn't work. Check it, or ask for a new one."; return m || "Something went wrong."; }
  function hm(s) { var m = Math.round(num(s) / 60), h = Math.floor(m / 60); return h ? fmt(h) + " h " + (m % 60) + " min" : m + " min"; }
  function short(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }

  if (!window.supabase || !window.supabase.createClient) { show("#ad-auth"); msg("#ad-auth-msg", "Sign-in couldn't load. Please refresh.", true); return; }
  sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "movage-site-auth" } });

  /* ---------- sign in (same email code as the rest of the site) ---------- */
  function showAuth() { show("#ad-auth"); $("#ad-email-form").hidden = false; $("#ad-code-form").hidden = true; }
  $("#ad-email-form").addEventListener("submit", function (e) {
    e.preventDefault(); var v = $("#ad-email").value.trim(), hp = this.querySelector('[name="company"]');
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v)) { msg("#ad-auth-msg", "Please enter a valid email address.", true); return; }
    if ((hp && hp.value) || Date.now() - T0 < 2500) return;
    var b = $("#ad-email-form button"); b.disabled = true; msg("#ad-auth-msg", "Sending your code...");
    sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: false } }).then(function (r) {
      b.disabled = false;
      if (r.error) { msg("#ad-auth-msg", /signups not allowed|not found/i.test(r.error.message || "") ? "There's no account with that email." : errText(r.error), true); return; }
      email = v; $("#ad-sent-to").textContent = v; $("#ad-email-form").hidden = true; $("#ad-code-form").hidden = false; msg("#ad-auth-msg", ""); $("#ad-code").focus();
    });
  });
  $("#ad-code-form").addEventListener("submit", function (e) {
    e.preventDefault(); var code = $("#ad-code").value.replace(/\D/g, "");
    if (code.length < 6) { msg("#ad-auth-msg", "Enter the code from the email.", true); return; }
    sb.auth.verifyOtp({ email: email, token: code, type: "email" }).then(function (r) { if (r.error) { msg("#ad-auth-msg", errText(r.error), true); return; } msg("#ad-auth-msg", ""); start(); });
  });
  $("#ad-restart").addEventListener("click", showAuth);
  function signOut() { try { localStorage.removeItem("movage-admin"); } catch (e) {} sb.auth.signOut().then(showAuth); }
  $("#ad-signout").addEventListener("click", signOut);
  $("#ad-switch").addEventListener("click", signOut);

  function start() {
    sb.auth.getUser().then(function (r) {
      var u = r.data && r.data.user; if (!u) return showAuth();
      return sb.rpc("fb_is_admin").then(function (a) {
        try { if (a.data) localStorage.setItem("movage-admin", "1"); else localStorage.removeItem("movage-admin"); } catch (e) {}
        if (!a.data) { $("#ad-who").textContent = u.email || ""; show("#ad-denied"); return; }
        $("#ad-me").textContent = u.email || ""; show("#ad-app"); load();
      });
    });
  }

  /* ---------- stats ---------- */
  function load() {
    msg("#ad-msg", "Loading..."); $("#ad-body").setAttribute("aria-busy", "true");
    var days = Number($("#ad-days").value);
    Promise.all([sb.rpc("admin_stats", { p_days: days }), sb.rpc("admin_top_users", { p_days: days }), sb.rpc("admin_site_stats", { p_days: days }), sb.rpc("admin_demographics", { p_days: days }), sb.rpc("admin_site_devices", { p_days: days })]).then(function (res) {
      $("#ad-body").removeAttribute("aria-busy");
      var r = res[0], t = res[1], w = res[2], g = res[3], dv = res[4];
      if (!w.error && w.data && !dv.error) w.data.devtypes = dv.data || [];
      if (r.error) { msg("#ad-msg", errText(r.error), true); return; }
      msg("#ad-msg", "Updated " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + ".");
      draw(r.data || {}, t.error ? null : (t.data || []), w.error ? null : (w.data || {}), g.error ? null : (g.data || {}));
      jump();
    });
  }
  /* Section links at the top of the page. */
  function jump() { var nav = $("#ad-jump"); if (!nav) return; nav.innerHTML = Array.prototype.map.call(document.querySelectorAll(".ad-sec[id]"), function (s) { return '<a class="fb-chip" href="#' + s.id + '">' + esc(s.querySelector("h2").textContent) + "</a>"; }).join(""); }

  function mmss(s) { s = Math.round(num(s)); return s < 60 ? s + "s" : Math.floor(s / 60) + "m " + (s % 60) + "s"; }
  var DEV = { mobile: "Smartphone", tablet: "Tablet", laptop: "Laptop", monitor: "Desktop or large monitor", desktop: "Computer (before 16 Nov)", unknown: "Unknown" };
  function share(rows, key, label) {
    var tot = rows.reduce(function (a, x) { return a + num(x.n); }, 0) || 1;
    return '<div class="ad-share">' + rows.map(function (x) { var p = Math.round(num(x.n) / tot * 100); return '<div class="ad-shr"><span>' + label(x[key]) + '</span><i><em style="width:' + p + '%"></em></i><b>' + p + "%</b></div>"; }).join("") + "</div>";
  }
  function devTypes(rows) {
    var tot = rows.reduce(function (a, x) { return a + num(x.visits); }, 0) || 1;
    return '<div class="ad-scroll">' + table(["Device", "Visits", "Share", "Pages per visit", "Left after one page", "Avg time on a page"], rows.map(function (x) {
      var p = Math.round(num(x.visits) / tot * 100);
      return "<tr><td>" + esc(DEV[x.k] || x.k) + '<i class="ad-mini"><em style="width:' + p + '%"></em></i></td><td>' + fmt(x.visits) + "</td><td>" + p + "%</td><td>" + esc(x.per_visit == null ? "–" : x.per_visit) + "</td><td>" + (x.bounce_pct == null ? "–" : num(x.bounce_pct) + "%") + "</td><td>" + (x.avg_secs == null ? "–" : mmss(x.avg_secs)) + "</td></tr>";
    })) + '</div><p class="fb-fine">Laptops and large monitors are told apart by screen width (wider than 1,728 points counts as a large monitor). The screen width itself is never stored.</p>';
  }
  function pageName(p) { var m = { "/": "Home", "/community.html": "Community", "/feedback.html": "Bugs and ideas", "/support.html": "Support", "/privacy.html": "Privacy", "/delete-account.html": "Delete account", "/mobility-test.html": "Mobility test guide", "/hip-mobility-exercises.html": "Hip mobility exercises", "/stretching-routines-for-runners.html": "Stretches for runners" }; return m[p] ? esc(m[p]) + ' <small class="ad-sub">' + esc(p) + "</small>" : esc(p); }
  function country(c) { if (c === "??") return '<span class="ad-flag none"></span>Unknown'; var n = c; try { n = new Intl.DisplayNames(["en-GB"], { type: "region" }).of(c) || c; } catch (e) {} return flag(c) + esc(n); }
  function visitors(w, d) {
    var pd = w.per_day || [];
    return section("Website visitors", '<p class="fb-fine">Counted without cookies. A visit is one person on one day, so the same person on three days counts as three visits. Team members signed in on this browser and people with Do Not Track on aren\'t counted.</p>' +
      '<div class="cm-stats">' + card(fmt(w.live), "On the site now", "Last 5 minutes") + card(fmt(w.today_visits), "Visits today", fmt(w.today_views) + " pages viewed") +
      card(fmt(w.visits), "Visits, last " + d + " days") + card(fmt(w.views), "Pages viewed, last " + d + " days") +
      card(w.visits ? (num(w.views) / num(w.visits)).toFixed(1) : "–", "Pages per visit", (w.bounce_pct == null ? "–" : w.bounce_pct + "%") + " left after one page") + card(w.avg_secs == null ? "–" : mmss(w.avg_secs), "Average time on a page") + "</div>" +
      "<h3>Visits per day</h3>" + bars(pd, function (r) { return r.visits; }, "Visits per day", function (r) { return short(r.d) + ": " + num(r.visits) + " visits, " + num(r.views) + " pages"; }) +
      "<h3>Top pages</h3>" + '<div class="ad-scroll">' + table(["Page", "Views", "Visits", "Avg time"], (w.pages || []).map(function (p) { return "<tr><td>" + pageName(p.path) + "</td><td>" + fmt(p.views) + "</td><td>" + fmt(p.visits) + "</td><td>" + (p.avg_secs == null ? "–" : mmss(p.avg_secs)) + "</td></tr>"; })) + "</div>" +
      "<h3>Where visitors came from</h3>" + table(["Source", "Visits"], (w.refs || []).map(function (x) { return "<tr><td>" + esc(x.ref) + "</td><td>" + fmt(x.n) + "</td></tr>"; })) +
      ((w.srcs || []).length ? "<h3>Campaign tags</h3>" + table(["utm_source", "Visits"], w.srcs.map(function (x) { return "<tr><td>" + esc(x.src) + "</td><td>" + fmt(x.n) + "</td></tr>"; })) : "") +
      "<h3>Landing pages</h3>" + table(["First page seen", "Visits"], (w.entry || []).map(function (x) { return "<tr><td>" + pageName(x.path) + "</td><td>" + fmt(x.n) + "</td></tr>"; })) +
      "<h3>Countries</h3>" + table(["Country", "Visits"], (w.countries || []).map(function (x) { return "<tr><td>" + country(x.country) + "</td><td>" + fmt(x.n) + "</td></tr>"; })) +
      "<h3>Device types</h3>" + devTypes(w.devtypes || []) +
      '<div class="ad-cols">' +
      "<div><h3>Browsers</h3>" + share(w.browsers || [], "k", esc) + "</div>" +
      "<div><h3>Systems</h3>" + share(w.oses || [], "k", esc) + "</div></div>" +
      "<h3>Time of day (UK)</h3>" + '<div class="cm-bars ad-bars" role="img" aria-label="Page views by hour">' + (function () { var hs = w.hours || [], mx = Math.max.apply(null, hs.map(function (x) { return num(x.n); }).concat([1])); return hs.map(function (x) { var v = num(x.n); return '<span class="cm-bar' + (v ? " on" : "") + '" style="height:' + (v ? Math.max(5, Math.round(v / mx * 100)) : 2) + '%" title="' + x.h + ":00, " + v + ' views"></span>'; }).join(""); })() + '</div><div class="ad-axis"><span>00:00</span><span>12:00</span><span>23:00</span></div>', "ad-web");
  }
  $("#ad-days").addEventListener("change", load);
  $("#ad-refresh").addEventListener("click", load);

  /* Country flag (bundled SVGs from flag-icons, MIT), with the country name as its label. */
  function flag(c) {
    if (!/^[A-Z]{2}$/.test(c || "")) return '<span class="ad-flag none" title="Country not set" aria-label="Country not set"></span>';
    var name = c; try { name = new Intl.DisplayNames(["en-GB"], { type: "region" }).of(c) || c; } catch (e) {}
    return '<img class="ad-flag" src="assets/flags/' + c.toLowerCase() + '.svg" width="22" height="16" alt="' + esc(name) + '" title="' + esc(name) + '" loading="lazy">';
  }
  function card(v, label, sub) { return '<div class="cm-stat"><b>' + v + "</b><span>" + label + "</span>" + (sub ? '<small class="ad-sub">' + sub + "</small>" : "") + "</div>"; }
  function bars(rows, val, label, tip) {
    var max = Math.max.apply(null, rows.map(function (r) { return num(val(r)); }).concat([1]));
    return '<div class="cm-bars ad-bars" role="img" aria-label="' + esc(label) + '">' + rows.map(function (r) { var v = num(val(r)); return '<span class="cm-bar' + (v ? " on" : "") + '" style="height:' + (v ? Math.max(5, Math.round(v / max * 100)) : 2) + '%" title="' + esc(tip(r)) + '"></span>'; }).join("") + "</div>" +
      (rows.length ? '<div class="ad-axis"><span>' + esc(short(rows[0].d)) + "</span><span>" + esc(short(rows[rows.length - 1].d)) + "</span></div>" : "");
  }
  function table(head, rows) { return '<table class="ad-table"><thead><tr>' + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" + (rows.length ? rows.join("") : '<tr><td colspan="' + head.length + '">None yet</td></tr>') + "</tbody></table>"; }
  function section(title, inner, id) { id = id || "ad-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""); return '<section class="box ad-sec" id="' + id + '"><h2 class="fb-h">' + title + "</h2>" + inner + "</section>"; }
  var ZONES = [["shoulders", "Shoulders", "var(--z-sh)"], ["overhead", "Overhead", "var(--z-oh)"], ["thorax", "Thorax", "var(--z-th)"], ["postchain", "Posterior chain", "var(--z-pc)"], ["hips", "Hips", "var(--z-hp)"], ["ankles", "Ankles", "var(--z-an)"]];
  var AREA = { today: "Today page", routines: "Routines", test: "Mobility test", history: "History", community: "Community", website: "Website", general: "Something else" };
  var DOW = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];


  var AGES = [["u18", "13 to 17"], ["18_24", "18 to 24"], ["25_34", "25 to 34"], ["35_44", "35 to 44"], ["45_54", "45 to 54"], ["55_64", "55 to 64"], ["65p", "65 and over"], ["none", "Not given"]];
  var GENDERS = [["female", "Female"], ["male", "Male"], ["nonbinary", "Non-binary"], ["other", "Other"], ["na", "Prefer not to say"], ["none", "Not given"]];
  function demoTable(rows, order, d) {
    var by = {}; (rows || []).forEach(function (x) { by[x.k] = x; });
    var list = order.map(function (o) { var x = by[o[0]] || { members: 0, active: 0, sessions: 0, secs: 0 }; return { label: o[1], x: x }; }).filter(function (r) { return num(r.x.members) > 0; });
    var maxT = Math.max.apply(null, list.map(function (r) { return num(r.x.secs); }).concat([1]));
    return '<div class="ad-scroll">' + table(["Group", "Members", "Active", "Sessions", "Time", "Avg days", "Avg score"], list.map(function (r) {
      var x = r.x, m = num(x.members), a = num(x.active);
      return "<tr><td>" + esc(r.label) + '<i class="ad-mini"><em style="width:' + Math.round(num(x.secs) / maxT * 100) + '%"></em></i></td><td>' + fmt(m) + "</td><td>" + fmt(a) + ' <small class="ad-sub">' + Math.round(a / (m || 1) * 100) + "%</small></td><td>" + fmt(x.sessions) + "</td><td>" + hm(x.secs) + "</td><td>" + (x.avg_days == null ? "–" : esc(x.avg_days)) + "</td><td>" + (x.avg_score == null ? "–" : num(x.avg_score)) + "</td></tr>";
    })) + "</div>";
  }
  function people(g, d) {
    return section("Age and gender", '<p class="fb-fine">Community members grouped by the age and gender they chose to give (both optional). "Active" means they did at least one guided routine in the last ' + d + ' days; the bar shows each group\'s share of stretching time. Sessions and scores only count people who share their time or score. Only totals are shown, never who is in a group.</p>' +
      "<h3>By age</h3>" + demoTable(g.age, AGES, d) + "<h3>By gender</h3>" + demoTable(g.gender, GENDERS, d), "ad-people");
  }
  function draw(s, top, web, demo) {
    var a = s.accounts || {}, c = s.community || {}, se = s.sessions || {}, sc = s.scores || {}, ea = s.early_access || {}, fb = s.feedback || {}, d = num(s.days);
    var h = '<div class="cm-stats">' +
      card(fmt(a.total), "Accounts", "+" + fmt(a.new_7) + " this week") +
      card(fmt(a.active_7), "Signed in, last 7 days", fmt(a.active_30) + " in 30 days") +
      card(fmt(se.users_7), "Did a routine, last 7 days", fmt(se.users_period) + " in " + d + " days") +
      card(fmt(ea.total), "Early access list", "+" + fmt(ea.new_7) + " this week") + "</div>";
    if (web) h += visitors(web, d);

    if (top) h += section("Top 10 users", '<p class="fb-fine">By guided time in the last ' + d + " days. Nicknames only.</p>" + '<div class="ad-scroll">' + table(["#", "Nickname", "Sessions", "Days", "Time", "Score", "Last active"],
      top.map(function (u) { return "<tr><td>" + num(u.rank) + "</td><td>" + flag(u.country) + esc(u.nickname) + '<small class="ad-sub">' + num(u.clubs) + (num(u.clubs) === 1 ? " club" : " clubs") + (u.member_since ? " &middot; joined " + esc(short(u.member_since)) : "") + "</small></td><td>" + fmt(u.sessions) + "</td><td>" + fmt(u.active_days) + "</td><td>" + hm(u.secs) + "</td><td>" + (u.score == null ? "–" : num(u.score) + (u.verified ? " ✓" : "")) + "</td><td>" + (u.last_active ? esc(short(u.last_active)) : "–") + "</td></tr>"; })) + "</div>");
    h += section("Guided sessions", '<div class="cm-stats">' + card(fmt(se.period), "Sessions, last " + d + " days") + card(hm(se.secs_period), "Time stretching") + card(hm(se.avg_secs), "Average session") + card(fmt(se.total), "All shared sessions") + "</div>" +
      "<h3>Sessions per day</h3>" + bars(se.per_day || [], function (r) { return r.n; }, "Sessions per day", function (r) { return short(r.d) + ": " + num(r.n) + " sessions, " + num(r.users) + " people, " + hm(r.secs); }) +
      "<h3>People active per day</h3>" + bars(se.per_day || [], function (r) { return r.users; }, "People who did a routine each day", function (r) { return short(r.d) + ": " + num(r.users) + " people"; }) +
      "<h3>Busiest days (last 90 days)</h3>" + table(["Day", "Sessions"], (se.by_weekday || []).map(function (w) { return "<tr><td>" + DOW[num(w.dow)] + "</td><td>" + fmt(w.n) + "</td></tr>"; })));

    if (demo) h += people(demo, d);
    h += section("New accounts", bars(a.per_day || [], function (r) { return r.n; }, "New accounts per day", function (r) { return short(r.d) + ": " + num(r.n) + " new"; }) +
      '<p class="fb-fine">' + fmt(a.new_period) + " new in the last " + d + " days. " + fmt(a.google) + " use Google sign-in.</p>");

    var zones = sc.zones || {}, bands = sc.bands || {};
    h += section("Mobility scores", '<div class="cm-stats">' + card(fmt(sc.total), "Shared scores") + card(sc.avg == null ? "–" : esc(sc.avg), "Average score") + card(fmt(sc.verified), "Camera verified") + card(fmt(sc.tested_period), "Tested in last " + d + " days") + "</div>" +
      "<h3>Average by zone</h3><div class=\"cm-zones\">" + ZONES.map(function (z) { var v = zones[z[0]]; if (v == null) return ""; v = Math.round(num(v)); return '<div class="cm-zone"><span><i class="cm-zdot" style="background:' + z[2] + '"></i>' + z[1] + '</span><i><em style="width:' + Math.max(0, Math.min(100, v)) + "%;background:" + z[2] + '"></em></i><b>' + v + "</b></div>"; }).join("") + "</div>" +
      "<h3>Score spread</h3>" + table(["Score", "People"], [["0_39", "Under 40"], ["40_59", "40 to 59"], ["60_79", "60 to 79"], ["80_100", "80 and over"]].map(function (b) { return "<tr><td>" + b[1] + "</td><td>" + fmt(bands[b[0]]) + "</td></tr>"; })));

    h += section("Community", '<div class="cm-stats">' + card(fmt(c.profiles), "Community members") + card(fmt(c.clubs), "Clubs", fmt(c.clubs_2plus) + " with 2+ members") + card(fmt(c.memberships), "Club memberships") + card(fmt(c.share_time), "Share their time", fmt(c.share_score) + " share their score") + "</div>" +
      "<h3>Biggest clubs</h3>" + table(["Club", "Members"], (c.top_clubs || []).map(function (t) { return "<tr><td>" + esc(t.name) + "</td><td>" + fmt(t.members) + "</td></tr>"; })));

    h += section("Bugs and ideas", '<div class="cm-stats">' + card(fmt(fb.bugs), "Bug reports") + card(fmt(fb.features), "Feature ideas") + card(fmt(fb.open), "Open or planned", fmt(fb.done) + " done") + card(fmt(fb.votes), "Votes", fmt(fb.comments) + " comments") + "</div>" +
      "<h3>By section</h3>" + table(["Section", "Posts"], (fb.by_area || []).map(function (x) { return "<tr><td>" + esc(AREA[x.area] || x.area) + "</td><td>" + fmt(x.n) + "</td></tr>"; })) +
      '<p class="fb-fine"><a href="feedback.html">Open the board</a></p>');

    h += section("Early access sign-ups", table(["Came from", "Sign-ups"], (ea.by_source || []).map(function (x) { return "<tr><td>" + esc(x.source) + "</td><td>" + fmt(x.n) + "</td></tr>"; })));
    $("#ad-body").innerHTML = h;
  }

  sb.auth.getSession().then(function (r) { if (r.data && r.data.session) start(); else showAuth(); });
})();
