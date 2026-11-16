/* "Don't count my visits" switch on the privacy page. Saves the choice in this browser (local storage),
   which track.js checks before counting a visit. */
(function () {
  "use strict";
  var cb = document.getElementById("optout-cb"), msg = document.getElementById("optout-msg");
  if (!cb) return;
  var KEY = "movage-nocount", gpc = false;
  try { gpc = navigator.doNotTrack === "1" || window.doNotTrack === "1" || !!navigator.globalPrivacyControl; } catch (e) {}
  var on = false;
  try { on = localStorage.getItem(KEY) === "1"; } catch (e) {}
  cb.checked = on || gpc;
  if (gpc) { cb.disabled = true; msg.textContent = "Your browser's Do Not Track or Global Privacy Control setting is on, so your visits are already not counted."; return; }
  cb.addEventListener("change", function () {
    try {
      if (cb.checked) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY);
      msg.textContent = cb.checked ? "Done. Your visits on this browser won't be counted." : "Your visits on this browser will be counted again, without cookies.";
    } catch (e) { cb.checked = false; msg.textContent = "Your browser blocked saving this choice. Turning on Do Not Track or Global Privacy Control in your browser settings will stop counting instead."; }
  });
})();
