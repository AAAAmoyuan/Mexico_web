/* JUESHITUO landing page — hero carousel, header state, reveal animations. */
(function () {
  "use strict";

  var AUTOPLAY_MS = 6500;
  var hero = document.getElementById("hero");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".hero-slide"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".dot"));
  var counter = document.querySelector(".count-now");
  var prevBtn = document.querySelector(".hero-arrow.prev");
  var nextBtn = document.querySelector(".hero-arrow.next");

  var index = 0;
  var timer = null;
  var paused = false;

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function render() {
    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
      dot.setAttribute("aria-selected", i === index ? "true" : "false");
    });
    if (counter) counter.textContent = pad(index + 1);
  }

  function go(target) {
    if (!slides.length) return;
    index = (target + slides.length) % slides.length;
    render();
    restart();
  }

  function start() {
    if (timer || paused || slides.length < 2) return;
    timer = window.setInterval(function () {
      index = (index + 1) % slides.length;
      render();
    }, AUTOPLAY_MS);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function restart() {
    stop();
    start();
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { go(index - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { go(index + 1); });

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      var target = parseInt(dot.getAttribute("data-slide"), 10);
      if (!isNaN(target)) go(target);
    });
  });

  if (hero) {
    hero.addEventListener("mouseenter", function () { paused = true; stop(); });
    hero.addEventListener("mouseleave", function () { paused = false; start(); });

    hero.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { go(index - 1); }
      if (event.key === "ArrowRight") { go(index + 1); }
    });

    var touchX = null;
    hero.addEventListener(
      "touchstart",
      function (event) {
        touchX = event.touches[0] ? event.touches[0].clientX : null;
      },
      { passive: true }
    );
    hero.addEventListener(
      "touchend",
      function (event) {
        if (touchX === null) return;
        var endX = event.changedTouches[0] ? event.changedTouches[0].clientX : touchX;
        var delta = endX - touchX;
        if (Math.abs(delta) > 42) {
          go(delta < 0 ? index + 1 : index - 1);
        }
        touchX = null;
      },
      { passive: true }
    );
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { stop(); } else if (!paused) { start(); }
  });

  render();
  start();

  /* header background on scroll */
  var header = document.getElementById("header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 16);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* reveal on scroll */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && reveals.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* current year */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
