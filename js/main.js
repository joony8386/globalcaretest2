/**
 * Global Care — light UI enhancements
 * Mobile nav + contact form UX (frontend only)
 */
(function () {
  "use strict";

  /* ----- Mobile navigation ----- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close" : "Menu";
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.textContent = "Menu";
        }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
        toggle.focus();
      }
    });
  }

  /* ----- Contact / inquiry forms (static demo) ----- */
  document.querySelectorAll("form[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var success = form.querySelector(".form-success");
      if (success) {
        success.classList.add("is-visible");
        success.setAttribute("role", "status");
      }

      form.reset();

      if (success) {
        success.focus && success.focus();
        success.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });

  /* ----- Current year in footer ----- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();

  /* ----- Motion: scroll reveals + header depth ----- */
  (function initMotion() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var header = document.querySelector(".site-header");

    if (header) {
      var ticking = false;
      var onScroll = function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          header.classList.toggle("is-scrolled", window.scrollY > 8);
          ticking = false;
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    if (!("IntersectionObserver" in window)) return;

    // Groups whose children cascade in one after another
    var groups = ".grid-2, .grid-3, .trust-strip, .steps, .values-grid, .footer__grid, .or3d-index";
    // Standalone blocks that rise in on their own
    var singles = ".section-header, .split > *, .cta-band, .visit-cal-layout, .carousel, .form-card, form[data-demo-form], .or-teaser > *";

    var targets = [];
    document.querySelectorAll(singles).forEach(function (el) {
      if (el.closest(".hero, .page-hero")) return;
      el.setAttribute("data-reveal", "");
      targets.push(el);
    });
    document.querySelectorAll(groups).forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.setAttribute("data-reveal", "");
        child.style.setProperty("--reveal-delay", Math.min(i, 6) * 60 + "ms");
        targets.push(child);
      });
    });
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      if (targets.indexOf(el) === -1) targets.push(el);
    });

    if (reduce) {
      targets.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }

    document.documentElement.classList.add("motion-ready");

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ----- Product category carousels ----- */
  (function initCarousels() {
    var roots = Array.prototype.slice.call(document.querySelectorAll("[data-carousel]"));
    if (!roots.length) return;

    function pageStep(track) {
      var slide = track.querySelector(".carousel__slide");
      if (!slide) return track.clientWidth;
      var styles = window.getComputedStyle(track.querySelector(".carousel__track") || track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 16;
      return slide.getBoundingClientRect().width + gap;
    }

    function maxScroll(track) {
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    function currentIndex(track) {
      var step = pageStep(track);
      if (step <= 0) return 0;
      return Math.round(track.scrollLeft / step);
    }

    function pageCount(track) {
      var step = pageStep(track);
      if (step <= 0) return 1;
      return Math.max(1, Math.ceil((maxScroll(track) + step * 0.5) / step));
    }

    function initOne(root) {
      var track = root.querySelector("[data-carousel-track]");
      var prev = root.querySelector("[data-carousel-prev]");
      var next = root.querySelector("[data-carousel-next]");
      var dotsHost = root.querySelector("[data-carousel-dots]");
      var status = root.querySelector("[data-carousel-status]");
      var slides = Array.prototype.slice.call(root.querySelectorAll(".carousel__slide"));
      if (!track || !slides.length) return;

      var dots = [];
      var syncing = false;

      function scrollToIndex(index, behavior) {
        var step = pageStep(track);
        var left = Math.min(index * step, maxScroll(track));
        track.scrollTo({ left: left, behavior: behavior || "smooth" });
      }

      function updateUI() {
        var pages = pageCount(track);
        var idx = Math.min(currentIndex(track), pages - 1);
        var atStart = track.scrollLeft <= 2;
        var atEnd = track.scrollLeft >= maxScroll(track) - 2;

        if (prev) prev.disabled = atStart;
        if (next) next.disabled = atEnd;

        if (status) {
          status.textContent = "Showing " + (idx + 1) + " of " + pages;
        }

        if (dotsHost) {
          if (dots.length !== pages) {
            dotsHost.innerHTML = "";
            dots = [];
            for (var i = 0; i < pages; i++) {
              (function (page) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "carousel__dot";
                btn.setAttribute("role", "tab");
                btn.setAttribute("aria-label", "Go to page " + (page + 1));
                btn.addEventListener("click", function () {
                  scrollToIndex(page);
                });
                dotsHost.appendChild(btn);
                dots.push(btn);
              })(i);
            }
          }
          dots.forEach(function (btn, i) {
            btn.setAttribute("aria-selected", i === idx ? "true" : "false");
          });
        }
      }

      if (prev) {
        prev.addEventListener("click", function () {
          scrollToIndex(Math.max(0, currentIndex(track) - 1));
        });
      }
      if (next) {
        next.addEventListener("click", function () {
          scrollToIndex(currentIndex(track) + 1);
        });
      }

      track.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          scrollToIndex(Math.max(0, currentIndex(track) - 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          scrollToIndex(currentIndex(track) + 1);
        } else if (e.key === "Home") {
          e.preventDefault();
          scrollToIndex(0);
        } else if (e.key === "End") {
          e.preventDefault();
          scrollToIndex(pageCount(track) - 1);
        }
      });

      var scrollTimer = null;
      track.addEventListener("scroll", function () {
        if (scrollTimer) window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(updateUI, 60);
      }, { passive: true });

      window.addEventListener("resize", function () {
        if (syncing) return;
        syncing = true;
        window.requestAnimationFrame(function () {
          updateUI();
          syncing = false;
        });
      });

      updateUI();
    }

    roots.forEach(initOne);
  })();
