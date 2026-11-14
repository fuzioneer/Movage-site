/* Early access sign-up. Stores the email in the Movage Supabase project (London).
   The publishable key is public by design: the database only lets the public add a row, never read the list. */
(function () {
  var URL_ = "https://atmoejivzryboipwvwdv.supabase.co/rest/v1/early_access";
  var KEY = "sb_publishable_WgkGQ5AbZDwK0zICuAAnBQ_oVkDCbCJ";
  var source = (function () { try { var q = new URLSearchParams(location.search); return (q.get("ref") || q.get("utm_source") || "website").replace(/[^a-z0-9_.-]/gi, "").slice(0, 40) || "website"; } catch (e) { return "website"; } })();
  var EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

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
          if (r.ok) { say("You're on the list. We'll be in touch before launch. Follow @movageapp for sneak peeks.", true); form.reset(); return; }
          if (r.status === 409) { say("You're already on the list. See you at launch.", true); form.reset(); return; }
          throw new Error("HTTP " + r.status);
        })
        .catch(function () { say("Sorry, that didn't go through. Please try again in a moment.", false); })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
  });
})();
