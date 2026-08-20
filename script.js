  // Hero background video: the HTML autoplay attribute handles the
  // common case (native, reliable, no JS dependency). JS only steps in
  // for reduced-motion visitors, pausing it back to a static frame.
  (function () {
    var v = document.querySelector('.hero-video');
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.pause();
    }
  })();

  // Hero headline: must stay on one line (no wrap) at any width. CSS
  // clamp() math to guarantee that turned out unreliable in practice
  // (font metrics/kerning don't match a plain glyph-width estimate) —
  // so instead, measure the ACTUAL rendered width and shrink the font
  // until it truly fits. Re-checks on resize and once fonts finish
  // loading (a fallback-font flash has different metrics than Bevan).
  (function () {
    var h1 = document.querySelector('.hero h1');
    var container = h1 && h1.closest('.hero-inner');
    if (!h1 || !container) return;

    function fit() {
      h1.style.fontSize = '';
      var baseSize = parseFloat(getComputedStyle(h1).fontSize);
      var available = container.clientWidth;
      var needed = h1.scrollWidth;
      if (needed > available) {
        h1.style.fontSize = (baseSize * (available / needed) * 0.94) + 'px';
      }
    }

    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit);
    }
  })();

  // Page navigation: the always-visible "set list" panel on the left is
  // the site's entire nav — no header/footer bar, no click-to-reveal.
  // Pages live in one fixed order (ORDER, below — matches the menu, top
  // to bottom), so direction is never arbitrary: a page LATER in the
  // list always slides in from the right (and the page you're leaving
  // slides out left); a page EARLIER always slides in from the left —
  // ordinary next/previous, so it's predictable before you click.
  // This also replaces the old #hash scrollIntoView handler — following
  // a #hash href directly used to trigger a real browser navigation
  // (and a "Forbidden" response) instead of an in-page jump, so every
  // link here is intercepted and prevented.
  (function () {
    var setlist = document.getElementById('setlist');
    if (!setlist) return;

    var ORDER = ['home', 'about', 'services', 'pricing', 'testimonials', 'gallery', 'contact'];
    var screens = {};
    ORDER.forEach(function (id) { screens[id] = document.getElementById(id); });

    var current = 'home';
    var links = Array.from(setlist.querySelectorAll('a[href^="#"]'));
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setActive(id) {
      links.forEach(function (a) {
        var isActive = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', isActive);
        a.setAttribute('aria-current', isActive ? 'page' : 'false');
      });
    }

    function panTo(id) {
      if (!screens[id] || id === current) return;
      var dir = ORDER.indexOf(id) > ORDER.indexOf(current) ? 1 : -1;
      var fromEl = screens[current];
      var toEl = screens[id];

      if (reduceMotion) {
        fromEl.classList.remove('is-current');
        toEl.classList.add('is-current');
      } else {
        // Place the incoming page off-screen on the correct side, then
        // reveal it and animate both pages past each other next frame.
        toEl.style.transition = 'none';
        toEl.style.transform = 'translateX(' + (dir * 100) + '%) scale(0.97)';
        toEl.classList.add('is-current', 'is-entering');
        void toEl.offsetWidth; // force reflow before re-enabling the transition
        toEl.style.transition = '';

        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            fromEl.style.transform = 'translateX(' + (-dir * 100) + '%) scale(0.97)';
            toEl.style.transform = 'translateX(0) scale(1)';
          });
        });

        var onDone = function (e) {
          if (e.target !== fromEl || e.propertyName !== 'transform') return;
          fromEl.classList.remove('is-current');
          fromEl.style.transform = '';
          fromEl.removeEventListener('transitionend', onDone);
        };
        fromEl.addEventListener('transitionend', onDone);

        setTimeout(function () { toEl.classList.remove('is-entering'); }, 700);
      }

      current = id;
      setActive(id);
      document.dispatchEvent(new CustomEvent('screen:change', { detail: { dir: dir } }));
    }

    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href').slice(1);
        if (!screens[id]) return;
        e.preventDefault();
        panTo(id);
      });
    });

    setActive(current);
  })();

  // Gallery carousel: crossfade between slides, autoplay, prev/next + dots.
  (function () {
    var carousel = document.getElementById('carousel');
    if (!carousel) return;

    var slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    var dotsWrap = document.getElementById('carDots');
    var currentEl = document.getElementById('carCurrent');
    var totalEl = document.getElementById('carTotal');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var idx = 0;
    var timer = null;

    totalEl.textContent = slides.length;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'car-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Go to photo ' + (i + 1));
      dot.addEventListener('click', function () {
        show(i);
        restartAutoplay();
      });
      dotsWrap.appendChild(dot);
    });
    var dots = Array.from(dotsWrap.children);

    function show(i) {
      slides[idx].classList.remove('is-active');
      if (dots[idx]) dots[idx].classList.remove('is-active');
      idx = (i + slides.length) % slides.length;
      slides[idx].classList.add('is-active');
      if (dots[idx]) dots[idx].classList.add('is-active');
      currentEl.textContent = idx + 1;
    }

    function startAutoplay() {
      if (reduceMotion) return;
      timer = setInterval(function () { show(idx + 1); }, 4800);
    }

    function stopAutoplay() {
      clearInterval(timer);
    }

    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    carousel.querySelector('.car-prev').addEventListener('click', function () {
      show(idx - 1);
      restartAutoplay();
    });
    carousel.querySelector('.car-next').addEventListener('click', function () {
      show(idx + 1);
      restartAutoplay();
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    startAutoplay();
  })();

  // Testimonials: auto-rotates one quote at a time, no visible controls.
  // Pauses while the reader's mouse/focus is over it so it doesn't yank
  // a quote away mid-read.
  (function () {
    var carousel = document.getElementById('testiCarousel');
    if (!carousel) return;

    var slides = Array.from(carousel.querySelectorAll('.testi-item'));
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var idx = 0;
    var timer = null;

    function show(i) {
      slides[idx].classList.remove('is-active');
      idx = (i + slides.length) % slides.length;
      slides[idx].classList.add('is-active');
    }

    function startAutoplay() {
      if (reduceMotion) return;
      timer = setInterval(function () { show(idx + 1); }, 7000);
    }

    function stopAutoplay() {
      clearInterval(timer);
    }

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    startAutoplay();
  })();

  // Stat counters: numbers count up from 0 to their real value the first
  // time the stats screen is panned into view. IntersectionObserver still
  // works here even though the page never scrolls — .stage is genuinely
  // translated, so screens really do enter and leave the viewport rect.
  (function () {
    var nums = Array.from(document.querySelectorAll('.stat-num'));
    if (!nums.length) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    var DURATION = 1400;

    var items = nums.map(function (el) {
      var match = el.textContent.trim().match(/^(\d+)(\D*)$/);
      if (!match) return null;
      var target = parseInt(match[1], 10);
      var suffix = match[2];
      el.textContent = '0' + suffix;
      return { el: el, target: target, suffix: suffix };
    });

    function animate(item) {
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / DURATION, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        item.el.textContent = Math.round(eased * item.target) + item.suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var item = items.filter(function (i) { return i && i.el === entry.target; })[0];
        if (!item) return;
        animate(item);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    items.forEach(function (item) {
      if (item) observer.observe(item.el);
    });
  })();

  // Scattered rhinestones: idle twinkle always on. There's no scroll to
  // drive a parallax/reflection band anymore, so instead every page
  // navigation fires a burst of bright flares across random stones plus a
  // quick directional nudge of the whole field — light catching the
  // rhinestones as the page itself moves, same idea as before, just
  // triggered by panning between screens instead of scrolling.
  (function () {
    var field = document.getElementById('stoneField');
    if (!field) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var STONE_COUNT = 55;
    var stones = [];

    // Mostly gold/white rhinestones, with a scattered handful of colored
    // gems (ruby, sapphire, emerald, amber, aqua, amethyst) mixed in.
    var COLORS = [
      '#ffffff', '#ffffff', '#ffffff',
      '#f7dc82', '#f7dc82', '#f7dc82',
      '#e0263f', '#2f7fe0', '#26b673', '#e2962a', '#29c8c8', '#a94fe0'
    ];

    for (var i = 0; i < STONE_COUNT; i++) {
      var stone = document.createElement('span');
      stone.className = 'stone';
      stone.style.setProperty('--x', (Math.random() * 100).toFixed(2) + 'vw');
      stone.style.setProperty('--y', (Math.random() * 100).toFixed(2) + 'vh');
      stone.style.setProperty('--s', (Math.random() * 4 + 3).toFixed(1) + 'px');
      stone.style.setProperty('--dur', (Math.random() * 2.5 + 2.5).toFixed(2) + 's');
      stone.style.setProperty('--delay', (Math.random() * 4).toFixed(2) + 's');
      stone.style.setProperty('--c', COLORS[Math.floor(Math.random() * COLORS.length)]);
      field.appendChild(stone);
      stones.push(stone);
    }

    if (reduceMotion) return;

    function flareBurst() {
      var batch = 6 + Math.floor(Math.random() * 6);
      for (var i = 0; i < batch; i++) {
        var stone = stones[Math.floor(Math.random() * stones.length)];
        stone.classList.add('flare');
        (function (s) {
          setTimeout(function () { s.classList.remove('flare'); }, 450);
        })(stone);
      }
    }

    function nudgeField(dir) {
      field.style.transition = 'none';
      field.style.transform = 'translate3d(' + (dir * 2.5) + 'vw, 0, 0)';
      void field.offsetWidth;
      field.style.transition = 'transform 0.6s cubic-bezier(.22,.61,.36,1)';
      field.style.transform = 'translate3d(0, 0, 0)';
    }

    document.addEventListener('screen:change', function (e) {
      nudgeField(e.detail && e.detail.dir ? e.detail.dir : 1);
      flareBurst();
    });
  })();

  // Contact form: this is a static site with no backend, so "sending"
  // the message means building a mailto: link from the fields and
  // handing it to the visitor's own email app to send — no server, no
  // account to set up. Two lightweight anti-spam checks run first: a
  // honeypot field bots tend to auto-fill (real visitors never see it),
  // and a plain-language question about where the shop is based, which
  // doubles as reinforcing that on the page itself.
  (function () {
    var form = document.getElementById('contactForm');
    if (!form) return;

    var TO_EMAIL = 'etajumpsuitrestorations@gmail.com';
    var LOCATION_ANSWER = 'chicago';

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var honeypot = form.elements.website;
      if (honeypot && honeypot.value.trim() !== '') return; // silently drop likely bot traffic

      var cityInput = form.elements.citycheck;
      var cityHint = document.getElementById('cfCityHint');
      var cityOk = cityInput && cityInput.value.trim().toLowerCase().indexOf(LOCATION_ANSWER) !== -1;
      if (!cityOk) {
        if (cityHint) cityHint.hidden = false;
        if (cityInput) cityInput.focus();
        return;
      }
      if (cityHint) cityHint.hidden = true;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var first = form.elements.firstName.value.trim();
      var last = form.elements.lastName.value.trim();
      var email = form.elements.email.value.trim();
      var service = form.elements.service.value;
      var maker = form.elements.maker.value.trim();
      var notes = form.elements.notes.value.trim();
      var needs = Array.from(form.querySelectorAll('input[name="needs"]:checked')).map(function (c) {
        return c.value;
      });

      var subject = 'Restoration request — ' + first + ' ' + last;
      var body = [
        'Name: ' + first + ' ' + last,
        'Email: ' + email,
        'Service needed: ' + service,
        'Jumpsuit maker: ' + (maker || '—'),
        'Specific needs: ' + (needs.length ? needs.join(', ') : '—'),
        'Anything else: ' + (notes || '—')
      ].join('\n');

      window.location.href = 'mailto:' + TO_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    });
  })();
