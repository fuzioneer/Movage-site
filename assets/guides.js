(function () {
  "use strict";
  if (window.top !== window.self) { try { window.top.location = window.self.location; } catch (e) { document.documentElement.style.display = "none"; } }
  var vids = document.querySelectorAll("video.g-vid");
  function set(v, on) {
    var f = v.parentNode;
    if (on && v.ended) v.currentTime = 0;
    if (on) { var p = v.play(); if (p && p.catch) p.catch(function () {}); f.classList.add("playing"); }
    else { v.pause(); f.classList.remove("playing"); }
  }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Array.prototype.forEach.call(vids, function (v) {
    var r = parseFloat(v.getAttribute("data-rate"));
    v.addEventListener("loadedmetadata", function () { if (r > 0) v.playbackRate = r; });
    v.addEventListener("click", function () { v.dataset.user = "1"; set(v, v.paused); });
    /* Clips that play once: show the play button again at the end; tapping replays from the start. */
    v.addEventListener("ended", function () { v.dataset.user = "1"; v.parentNode.classList.remove("playing"); });
  });
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && e.intersectionRatio > 0.6) { if (!v.dataset.user) set(v, true); }
        else if (!v.paused) set(v, false);
      });
    }, { threshold: [0, 0.6] });
    Array.prototype.forEach.call(vids, function (v) { io.observe(v); });
  }
})();
