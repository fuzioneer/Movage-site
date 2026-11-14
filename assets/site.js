/* Early access sign-up. Stores the email in the Movage Supabase project (London).
   The publishable key is public by design: the database only lets the public add a row, never read the list. */
(function () {
  var URL_ = "https://atmoejivzryboipwvwdv.supabase.co/rest/v1/early_access";
  var KEY = "sb_publishable_WgkGQ5AbZDwK0zICuAAnBQ_oVkDCbCJ";
  var source = (function () { try { var q = new URLSearchParams(location.search); return (q.get("ref") || q.get("utm_source") || "website").replace(/[^a-z0-9_.-]/gi, "").slice(0, 40) || "website"; } catch (e) { return "website"; } })();
  var EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

  /* Confirmation pop-up */
  var IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
  var dlg = null, lastFocus = null;
  function closePop() { if (!dlg) return; dlg.classList.remove("open"); document.body.classList.remove("pop-lock"); setTimeout(function () { dlg.hidden = true; }, 200); if (lastFocus) lastFocus.focus(); }
  function showPop(title, body, email) {
    if (!dlg) {
      dlg = document.createElement("div");
      dlg.className = "pop"; dlg.hidden = true;
      dlg.innerHTML = '<div class="pop-card" role="dialog" aria-modal="true" aria-labelledby="pop-title" aria-describedby="pop-body">' +
        '<button class="pop-x" type="button" aria-label="Close">&times;</button>' +
        '<div class="pop-tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
        '<h2 id="pop-title"></h2><p id="pop-body"></p><p class="pop-email"></p>' +
        '<a class="btn btn-primary pop-ig" href="https://www.instagram.com/movageapp/" rel="noopener" target="_blank">' + IG + 'Follow @movageapp</a>' +
        '<button class="pop-done" type="button">Done</button></div>';
      document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest(".pop-x, .pop-done")) closePop(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && dlg && !dlg.hidden) closePop(); });
    }
    dlg.querySelector("#pop-title").textContent = title;
    dlg.querySelector("#pop-body").textContent = body;
    var em = dlg.querySelector(".pop-email"); em.textContent = email || ""; em.hidden = !email;
    lastFocus = document.activeElement;
    dlg.hidden = false; document.body.classList.add("pop-lock");
    requestAnimationFrame(function () { dlg.classList.add("open"); dlg.querySelector(".pop-done").focus(); });
  }

  document.querySelectorAll("form.signup").forEach(function (form) {
    var msg = form.querySelector(".msg"), btn = form.querySelector("button[type=submit]");
    var say = function (text, ok) { msg.textContent = text; msg.className = "msg " + (ok ? "ok" : "err"); };
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = form.email.value.trim(), consent = form.consent.checked;
      if (form.company && form.company.value) { say("Thanks, you're on the list.", true); return; }
      if (!EMAIL.test(email)) { say("Please enter a valid email address.", false); form.email.focus(); return; }
      if (!consent) { say("Please tick the box so we can email you about early access.", false); form.consent.focus(); return; }
      btn.disabled = true; var label = btn.textContent; btn.textContent = "Adding you…";
      fetch(URL_, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ email: email, consent: true, source: source }) })
        .then(function (r) {
          if (r.ok) { say("You're on the list.", true); form.reset(); showPop("You're on the list!", "We've added your email to the Movage early access list. We'll email you before launch so you can be one of the first in.", email); return; }
          if (r.status === 409) { say("You're already on the list.", true); form.reset(); showPop("You're already on the list", "This email is already signed up for Movage early access. We'll be in touch before launch.", email); return; }
          throw new Error("HTTP " + r.status);
        })
        .catch(function () { say("Sorry, that didn't go through. Please try again in a moment.", false); })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
  });
})();
