/* Robin 0.2 — topbar state, section reveal, smooth scroll, placeholder guard */
(function () {
  "use strict";

  var scroller = document.getElementById("scroller");
  var topbar = document.getElementById("topbar");

  function onScroll() {
    if (!topbar || !scroller) return;
    topbar.classList.toggle("is-solid", scroller.scrollTop > 12);
  }
  if (scroller) {
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
  }

  /* smooth scroll for in-page triggers (Learn More) */
  document.querySelectorAll("[data-scroll]").forEach(function (trigger) {
    trigger.addEventListener("click", function (event) {
      var targetId = trigger.getAttribute("href");
      if (!targetId || targetId.charAt(0) !== "#") return;
      var target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* reveal blocks when their screen enters the viewport */
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-anim]"));
  if ("IntersectionObserver" in window && scroller && items.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("in-view", entry.isIntersecting);
        });
      },
      { root: scroller, threshold: 0.35 }
    );
    items.forEach(function (el) { observer.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* keep placeholder links from jumping to the top */
  document.querySelectorAll("[data-placeholder]").forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === "#" || href === "https://wa.me/") {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        console.info("[Robin] Enlace pendiente: " + link.getAttribute("data-placeholder"));
      });
    }
  });

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
