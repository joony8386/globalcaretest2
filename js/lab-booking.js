/**
 * Innovation Lab — visit calendar + booking modal (frontend demo)
 *
 * SAMPLE BOOKED DATES: edit BOOKED_DATES below (ISO YYYY-MM-DD).
 * A developer can later replace getBookedSet() with an API fetch.
 */
(function () {
  "use strict";

  if (!document.body || !document.body.classList.contains("is-lab")) return;

  /* ------------------------------------------------------------------
   * Config — swap BOOKED_DATES for a real availability API later
   * ------------------------------------------------------------------ */
  var BOOKED_DATES = [
    "2026-10-28",
    "2026-10-30",
    "2026-11-03",
    "2026-11-05",
    "2026-11-12",
    "2026-11-18",
    "2026-11-20",
    "2026-11-27",
    "2026-12-02",
    "2026-12-08",
    "2026-12-15"
  ];

  var BOOKING_EMAIL = "info@globalcare.example";
  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var bookedSet = null;
  var selectedDate = null;
  var viewYear = null;
  var viewMonth = null; /* 0-indexed */
  var lastFocus = null;
  var feedbackTimer = null;

  function getBookedSet() {
    if (!bookedSet) {
      bookedSet = Object.create(null);
      BOOKED_DATES.forEach(function (d) {
        bookedSet[d] = true;
      });
    }
    return bookedSet;
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toISO(y, m, d) {
    return y + "-" + pad(m + 1) + "-" + pad(d);
  }

  function todayISO() {
    var now = new Date();
    return toISO(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function parseISO(iso) {
    var p = iso.split("-");
    return { y: +p[0], m: +p[1] - 1, d: +p[2] };
  }

  function formatDisplay(iso) {
    if (!iso) return "";
    var p = parseISO(iso);
    return MONTH_NAMES[p.m] + " " + p.d + ", " + p.y;
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  function startDow(y, m) {
    return new Date(y, m, 1).getDay();
  }

  function isPast(iso) {
    return iso < todayISO();
  }

  function isWeekend(iso) {
    var p = parseISO(iso);
    var dow = new Date(p.y, p.m, p.d).getDay();
    return dow === 0 || dow === 6;
  }

  function isBooked(iso) {
    return !!getBookedSet()[iso];
  }

  function isAvailable(iso) {
    return !isPast(iso) && !isWeekend(iso) && !isBooked(iso);
  }

  /* ------------------------------------------------------------------
   * Inject floating button + booking modal (all Lab pages)
   * ------------------------------------------------------------------ */
  function ensureChrome() {
    if (document.getElementById("lab-booking-fab")) return;

    var fab = document.createElement("button");
    fab.type = "button";
    fab.id = "lab-booking-fab";
    fab.className = "lab-booking-fab";
    fab.setAttribute("data-open-booking", "");
    fab.setAttribute("aria-haspopup", "dialog");
    fab.setAttribute("aria-controls", "lab-booking-modal");
    fab.innerHTML =
      '<span class="lab-booking-fab__icon" aria-hidden="true">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M8 2v3M16 2v3M3.5 9h17M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M12 13v4M10 15h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
      "</svg></span>" +
      '<span class="lab-booking-fab__label">Book a visit</span>';
    document.body.appendChild(fab);

    var wrap = document.createElement("div");
    wrap.id = "lab-booking-root";
    wrap.innerHTML =
      '<div class="lab-booking-backdrop" id="lab-booking-backdrop" hidden></div>' +
      '<div class="lab-booking-modal" id="lab-booking-modal" role="dialog" aria-modal="true" aria-labelledby="lab-booking-title" aria-hidden="true" hidden>' +
      '  <div class="lab-booking-modal__dialog">' +
      '    <div class="lab-booking-modal__header">' +
      '      <div>' +
      '        <p class="lab-booking-modal__eyebrow">Innovation Lab</p>' +
      '        <h2 class="lab-booking-modal__title" id="lab-booking-title">Book a showroom visit</h2>' +
      "      </div>" +
      '      <button type="button" class="lab-booking-modal__close" data-close-booking aria-label="Close booking form">&times;</button>' +
      "    </div>" +
      '    <div class="lab-booking-modal__body">' +
      '      <div class="form-success lab-booking-success" id="lab-booking-success" tabindex="-1" hidden>' +
      "        <strong>Request captured (demo).</strong> This static site does not send messages yet. " +
      "In production, this would go to the Lab team. You can also " +
      '<a href="../contact.html?interest=showroom">prefer email via the contact form</a> ' +
      'or use the mailto link below.' +
      "      </div>" +
      '      <form class="lab-booking-form" id="lab-booking-form" novalidate>' +
      '        <div class="form-row">' +
      '          <div class="form-group">' +
      '            <label for="lab-book-name">Full name <span class="hint">(required)</span></label>' +
      '            <input type="text" id="lab-book-name" name="name" autocomplete="name" required>' +
      "          </div>" +
      '          <div class="form-group">' +
      '            <label for="lab-book-email">Email <span class="hint">(required)</span></label>' +
      '            <input type="email" id="lab-book-email" name="email" autocomplete="email" required>' +
      "          </div>" +
      "        </div>" +
      '        <div class="form-group">' +
      '          <label for="lab-book-phone">Phone <span class="hint">(optional)</span></label>' +
      '          <input type="tel" id="lab-book-phone" name="phone" autocomplete="tel">' +
      "        </div>" +
      '        <div class="form-row">' +
      '          <div class="form-group">' +
      '            <label for="lab-book-date">Preferred date <span class="hint">(required)</span></label>' +
      '            <input type="date" id="lab-book-date" name="date" required>' +
      '            <p class="hint lab-booking-date-hint" id="lab-book-date-hint"></p>' +
      "          </div>" +
      '          <div class="form-group">' +
      '            <label for="lab-book-time">Preferred time <span class="hint">(required)</span></label>' +
      '            <select id="lab-book-time" name="time" required>' +
      '              <option value="">Select…</option>' +
      '              <option value="morning">Morning (09:00–12:00)</option>' +
      '              <option value="afternoon">Afternoon (13:00–16:30)</option>' +
      "            </select>" +
      "          </div>" +
      "        </div>" +
      '        <div class="form-group">' +
      '          <label for="lab-book-focus">Visit focus <span class="hint">(required)</span></label>' +
      '          <select id="lab-book-focus" name="focus" required>' +
      '            <option value="">Select…</option>' +
      '            <option value="showroom">Showroom tour</option>' +
      '            <option value="research">Research discussion</option>' +
      '            <option value="sourcing">Sourcing consult</option>' +
      '            <option value="other">Other</option>' +
      "          </select>" +
      "        </div>" +
      '        <div class="form-group">' +
      '          <label for="lab-book-notes">Notes</label>' +
      '          <textarea id="lab-book-notes" name="notes" rows="3" placeholder="Specialty, products of interest, colleagues joining…"></textarea>' +
      "        </div>" +
      '        <div class="form-actions lab-booking-actions">' +
      '          <button type="submit" class="btn btn--primary">Submit request</button>' +
      '          <button type="button" class="btn btn--secondary" data-close-booking>Cancel</button>' +
      "        </div>" +
      '        <p class="form-note">Demo form — no backend. Prefer email? ' +
      '<a href="../contact.html?interest=showroom">Open the contact form</a>.</p>' +
      "      </form>" +
      '      <p class="lab-booking-mailto" id="lab-booking-mailto" hidden></p>' +
      "    </div>" +
      "  </div>" +
      "</div>";
    document.body.appendChild(wrap);

    /* Fix contact link path when already under /lab/ vs deeper — pages are always in lab/ */
  }

  /* ------------------------------------------------------------------
   * Modal open / close
   * ------------------------------------------------------------------ */
  function openBooking(opts) {
    opts = opts || {};
    ensureChrome();
    var modal = document.getElementById("lab-booking-modal");
    var backdrop = document.getElementById("lab-booking-backdrop");
    var form = document.getElementById("lab-booking-form");
    var success = document.getElementById("lab-booking-success");
    var mailto = document.getElementById("lab-booking-mailto");
    if (!modal || !backdrop) return;

    lastFocus = document.activeElement;

    if (opts.date && isAvailable(opts.date)) {
      selectedDate = opts.date;
      setDateField(opts.date);
      syncCalendarSelection();
    } else if (selectedDate) {
      setDateField(selectedDate);
    }

    if (opts.focus) {
      var focusEl = document.getElementById("lab-book-focus");
      if (focusEl) focusEl.value = opts.focus;
    }

    if (success) {
      success.hidden = true;
      success.classList.remove("is-visible");
    }
    if (mailto) {
      mailto.hidden = true;
      mailto.innerHTML = "";
    }
    if (form) form.hidden = false;

    modal.hidden = false;
    backdrop.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lab-booking-open");

    requestAnimationFrame(function () {
      backdrop.classList.add("is-open");
      modal.classList.add("is-open");
      var first = modal.querySelector(
        'input:not([type="hidden"]):not([disabled]), select, textarea, button'
      );
      if (first) first.focus();
    });
  }

  function closeBooking() {
    var modal = document.getElementById("lab-booking-modal");
    var backdrop = document.getElementById("lab-booking-backdrop");
    if (!modal) return;

    modal.classList.remove("is-open");
    if (backdrop) backdrop.classList.remove("is-open");
    document.body.classList.remove("lab-booking-open");
    modal.setAttribute("aria-hidden", "true");

    window.setTimeout(function () {
      modal.hidden = true;
      if (backdrop) backdrop.hidden = true;
      if (lastFocus && lastFocus.focus) {
        try {
          lastFocus.focus();
        } catch (e) {}
      }
    }, 180);
  }

  function setDateField(iso) {
    var input = document.getElementById("lab-book-date");
    var hint = document.getElementById("lab-book-date-hint");
    if (input) {
      input.value = iso || "";
      input.min = todayISO();
    }
    if (hint) {
      hint.textContent = iso ? "Selected: " + formatDisplay(iso) : "";
    }
  }

  /* ------------------------------------------------------------------
   * Calendar render
   * ------------------------------------------------------------------ */
  function renderCalendar(mount, options) {
    options = options || {};
    var compact = !!options.compact;
    var booked = getBookedSet();

    if (viewYear === null) {
      var now = new Date();
      viewYear = now.getFullYear();
      viewMonth = now.getMonth();
    }

    var labelId = compact ? "visit-cal-teaser-label" : "visit-cal-label";
    var liveId = compact ? "visit-cal-teaser-live" : "visit-cal-live";
    var gridId = compact ? "visit-cal-teaser-grid" : "visit-cal-grid";

    mount.innerHTML =
      '<div class="visit-cal' + (compact ? " visit-cal--compact" : "") + '">' +
      '  <div class="visit-cal__toolbar">' +
      '    <button type="button" class="visit-cal__nav" data-cal-prev aria-label="Previous month">' +
      "      ‹</button>" +
      '    <h3 class="visit-cal__label" id="' + labelId + '" aria-live="polite">' +
      MONTH_NAMES[viewMonth] + " " + viewYear +
      "</h3>" +
      '    <button type="button" class="visit-cal__nav" data-cal-next aria-label="Next month">' +
      "      ›</button>" +
      "  </div>" +
      '  <p class="sr-only" id="' + liveId + '" role="status" aria-live="polite"></p>' +
      '  <div class="visit-cal__weekdays" aria-hidden="true">' +
      WEEKDAYS.map(function (d) {
        return '<span class="visit-cal__wd">' + d + "</span>";
      }).join("") +
      "  </div>" +
      '  <div class="visit-cal__grid" id="' + gridId + '" role="grid" aria-labelledby="' + labelId + '"></div>' +
      '  <ul class="visit-cal__legend">' +
      '    <li><span class="visit-cal__swatch visit-cal__swatch--available" aria-hidden="true"></span> Available</li>' +
      '    <li><span class="visit-cal__swatch visit-cal__swatch--booked" aria-hidden="true"></span> Booked</li>' +
      '    <li><span class="visit-cal__swatch visit-cal__swatch--selected" aria-hidden="true"></span> Selected</li>' +
      "  </ul>" +
      (compact
        ? '<p class="visit-cal__note">Weekdays only. <a href="showroom.html#visit-calendar">Open full calendar</a></p>'
        : '<p class="visit-cal__note">Weekends and past dates are unavailable. Sample booked dates are for demo — replace <code>BOOKED_DATES</code> in <code>js/lab-booking.js</code> or wire an API.</p>') +
      '  <p class="visit-cal__feedback" data-cal-feedback role="status" aria-live="polite"></p>' +
      "</div>";

    var grid = mount.querySelector(".visit-cal__grid");
    var live = mount.querySelector("[role='status'].sr-only") || document.getElementById(liveId);
    var feedback = mount.querySelector("[data-cal-feedback]");

    function paint() {
      var y = viewYear;
      var m = viewMonth;
      var label = mount.querySelector(".visit-cal__label");
      if (label) label.textContent = MONTH_NAMES[m] + " " + y;
      if (live) live.textContent = "Showing " + MONTH_NAMES[m] + " " + y;

      var first = startDow(y, m);
      var total = daysInMonth(y, m);
      var html = "";
      var i;
      for (i = 0; i < first; i++) {
        html += '<div class="visit-cal__cell visit-cal__cell--empty" aria-hidden="true"></div>';
      }
      for (var day = 1; day <= total; day++) {
        var iso = toISO(y, m, day);
        var classes = ["visit-cal__cell", "visit-cal__day"];
        var labelText = formatDisplay(iso);
        var disabled = false;
        var pressed = selectedDate === iso;

        if (isPast(iso)) {
          classes.push("is-past");
          disabled = true;
          labelText += ", past date";
        } else if (isWeekend(iso)) {
          classes.push("is-weekend");
          disabled = true;
          labelText += ", unavailable (weekend)";
        } else if (isBooked(iso)) {
          classes.push("is-booked");
          disabled = true;
          labelText += ", booked";
        } else {
          classes.push("is-available");
          labelText += ", available";
        }
        if (pressed) classes.push("is-selected");
        if (iso === todayISO()) classes.push("is-today");

        html +=
          '<button type="button" class="' +
          classes.join(" ") +
          '" data-date="' +
          iso +
          '" role="gridcell" aria-label="' +
          labelText +
          '"' +
          (disabled ? ' aria-disabled="true"' : "") +
          (pressed ? ' aria-pressed="true"' : ' aria-pressed="false"') +
          ">" +
          '<span class="visit-cal__num">' +
          day +
          "</span>" +
          "</button>";
      }
      grid.innerHTML = html;
    }

    function showFeedback(msg) {
      if (!feedback) return;
      feedback.textContent = msg;
      if (feedbackTimer) window.clearTimeout(feedbackTimer);
      feedbackTimer = window.setTimeout(function () {
        feedback.textContent = "";
      }, 3200);
    }

    paint();

    mount.querySelector("[data-cal-prev]").addEventListener("click", function () {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      paint();
    });
    mount.querySelector("[data-cal-next]").addEventListener("click", function () {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      paint();
    });

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-date]");
      if (!btn) return;
      var iso = btn.getAttribute("data-date");
      if (isBooked(iso)) {
        showFeedback("That day is already booked. Please choose another date.");
        return;
      }
      if (isPast(iso) || isWeekend(iso)) {
        showFeedback("That day is unavailable. Please choose a weekday that is free.");
        return;
      }
      selectedDate = iso;
      paint();
      syncCalendarSelection();
      openBooking({ date: iso });
    });

    /* Keep a reference so other calendars can re-paint selection */
    mount._visitCalPaint = paint;
  }

  function syncCalendarSelection() {
    document.querySelectorAll("[data-visit-calendar], [data-visit-calendar-teaser]").forEach(function (el) {
      if (typeof el._visitCalPaint === "function") el._visitCalPaint();
    });
    setDateField(selectedDate);
  }

  /* ------------------------------------------------------------------
   * Form submit (demo)
   * ------------------------------------------------------------------ */
  function bindForm() {
    var form = document.getElementById("lab-booking-form");
    if (!form || form._bound) return;
    form._bound = true;

    var dateInput = document.getElementById("lab-book-date");
    if (dateInput) {
      dateInput.min = todayISO();
      dateInput.addEventListener("change", function () {
        var v = dateInput.value;
        if (!v) return;
        if (isBooked(v)) {
          dateInput.setCustomValidity("That date is already booked.");
          dateInput.reportValidity();
          return;
        }
        if (isWeekend(v) || isPast(v)) {
          dateInput.setCustomValidity("Please choose an available weekday.");
          dateInput.reportValidity();
          return;
        }
        dateInput.setCustomValidity("");
        selectedDate = v;
        syncCalendarSelection();
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (dateInput) dateInput.setCustomValidity("");
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = {
        name: (form.elements.namedItem("name") || {}).value.trim(),
        email: (form.elements.namedItem("email") || {}).value.trim(),
        phone: ((form.elements.namedItem("phone") || {}).value || "").trim(),
        date: (form.elements.namedItem("date") || {}).value,
        time: (form.elements.namedItem("time") || {}).value,
        focus: (form.elements.namedItem("focus") || {}).value,
        notes: ((form.elements.namedItem("notes") || {}).value || "").trim()
      };

      if (isBooked(data.date) || isWeekend(data.date) || isPast(data.date)) {
        if (dateInput) {
          dateInput.setCustomValidity("Please choose an available weekday.");
          dateInput.reportValidity();
        }
        return;
      }

      var timeLabel =
        data.time === "morning"
          ? "Morning (09:00–12:00)"
          : data.time === "afternoon"
            ? "Afternoon (13:00–16:30)"
            : data.time;
      var focusLabel = {
        showroom: "Showroom tour",
        research: "Research discussion",
        sourcing: "Sourcing consult",
        other: "Other"
      }[data.focus] || data.focus;

      var body =
        "Showroom visit request (from website demo)\n\n" +
        "Name: " + data.name + "\n" +
        "Email: " + data.email + "\n" +
        "Phone: " + (data.phone || "—") + "\n" +
        "Preferred date: " + formatDisplay(data.date) + " (" + data.date + ")\n" +
        "Preferred time: " + timeLabel + "\n" +
        "Visit focus: " + focusLabel + "\n" +
        "Notes:\n" + (data.notes || "—") + "\n";

      var mailtoHref =
        "mailto:" +
        BOOKING_EMAIL +
        "?subject=" +
        encodeURIComponent("Showroom visit request — " + data.date) +
        "&body=" +
        encodeURIComponent(body);

      form.hidden = true;
      var success = document.getElementById("lab-booking-success");
      var mailto = document.getElementById("lab-booking-mailto");
      if (success) {
        success.hidden = false;
        success.classList.add("is-visible");
        success.focus();
      }
      if (mailto) {
        mailto.hidden = false;
        mailto.innerHTML =
          'Optional: <a href="' +
          mailtoHref +
          '">Open a pre-filled email to the Lab team</a>.';
      }
    });
  }

  /* ------------------------------------------------------------------
   * Global click / keyboard
   * ------------------------------------------------------------------ */
  function bindGlobal() {
    document.addEventListener("click", function (e) {
      var openBtn = e.target.closest("[data-open-booking]");
      if (openBtn) {
        e.preventDefault();
        var focus = openBtn.getAttribute("data-booking-focus") || "";
        openBooking({ date: selectedDate || undefined, focus: focus || undefined });
        return;
      }
      if (e.target.closest("[data-close-booking]")) {
        e.preventDefault();
        closeBooking();
        return;
      }
      if (e.target.id === "lab-booking-backdrop") {
        closeBooking();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("lab-booking-open")) {
        closeBooking();
      }
    });
  }

  /* ------------------------------------------------------------------
   * Init
   * ------------------------------------------------------------------ */
  function init() {
    ensureChrome();
    bindGlobal();
    bindForm();

    var full = document.querySelector("[data-visit-calendar]");
    if (full) renderCalendar(full, { compact: false });

    var teaser = document.querySelector("[data-visit-calendar-teaser]");
    if (teaser) renderCalendar(teaser, { compact: true });

    /* Deep-link: #visit-calendar with ?book=1 or hash only */
    if (window.location.hash === "#visit-calendar" || window.location.hash === "#book-visit") {
      var el = document.getElementById("visit-calendar");
      if (el) {
        window.setTimeout(function () {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* Expose for optional console / future hooks */
  window.LabBooking = {
    open: openBooking,
    close: closeBooking,
    BOOKED_DATES: BOOKED_DATES
  };
})();
