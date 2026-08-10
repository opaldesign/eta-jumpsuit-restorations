  // Photo bands: restoration photos sliced into thin scrolling strips.
  // Adapted from Image Train (OP/AL Lab) — just the core visual (band
  // geometry + scrolling image slices), with all of that tool's UI
  // chrome, audio, export, and PDF handling stripped out. Two uses
  // here: a dim weave behind the hero headline, and a thin filmstrip
  // running around the page border.
  (function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    var PHOTOS = [
      'photos/restoration-08.jpg', 'photos/restoration-03.jpg',
      'photos/restoration-11.jpg', 'photos/restoration-06.jpg',
      'photos/restoration-15.jpg', 'photos/restoration-01.jpg',
      'photos/restoration-13.jpg', 'photos/restoration-09.jpg'
    ];
    var images = PHOTOS.map(function (src) {
      var im = new Image();
      im.src = src;
      return im;
    });

    function mulberry32(seed) {
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    // Draws `im` as a scrolling strip filling the rect (x,y,w,h). `horiz`
    // scrolls the tiled strip along x; otherwise along y. `off` is the
    // running scroll offset in css px.
    function drawSlice(g, im, horiz, x, y, w, h, off) {
      if (!im || !im.naturalWidth) return;
      var iw = im.naturalWidth, ih = im.naturalHeight;
      g.save();
      g.beginPath(); g.rect(x, y, w, h); g.clip();
      if (horiz) {
        var dw = Math.max(2, iw * (h / ih));
        var o = ((off % dw) + dw) % dw;
        for (var px = x - o; px < x + w; px += dw) g.drawImage(im, px, y, dw, h);
      } else {
        var dh = Math.max(2, ih * (w / iw));
        var o2 = ((off % dh) + dh) % dh;
        for (var py = y - o2; py < y + h; py += dh) g.drawImage(im, x, py, w, dh);
      }
      g.restore();
    }

    // Runs a rAF loop, throttled to ~30fps (this is ambient decoration,
    // not something that needs 60fps), and only while `active` is true.
    function loop(active, draw) {
      var last = 0, raf = null;
      function tick(ts) {
        raf = requestAnimationFrame(tick);
        if (ts - last < 33) return;
        last = ts;
        draw(ts / 1000);
      }
      function start() { if (!raf) raf = requestAnimationFrame(tick); }
      function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
      if (active()) start();
      return { start: start, stop: stop };
    }

    // ---- Hero background: a weave of bands across the hero rect ----
    (function () {
      var canvas = document.getElementById('heroBands');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var DPR = Math.min(2, window.devicePixelRatio || 1);
      var rand = mulberry32(11);
      var bands = [];
      for (var i = 0; i < 16; i++) {
        bands.push({
          horiz: rand() < 0.6,
          p: rand(),
          thick: 0.025 + rand() * 0.05,
          dir: rand() < 0.5 ? -1 : 1,
          spd: 0.4 + rand() * 1.3,
          phase: rand() * 500,
          img: Math.floor(rand() * images.length)
        });
      }
      var W = 0, H = 0;
      function resize() {
        var r = canvas.getBoundingClientRect();
        W = r.width; H = r.height;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      function draw(t) {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < bands.length; i++) {
          var b = bands[i];
          var im = images[b.img % images.length];
          var off = t * 24 * b.spd * b.dir + b.phase;
          if (b.horiz) drawSlice(ctx, im, true, 0, b.p * H, W, Math.max(5, b.thick * H), off);
          else drawSlice(ctx, im, false, b.p * W, 0, Math.max(5, b.thick * W), H, off);
        }
      }
      resize();
      window.addEventListener('resize', resize);
      draw(0);

      // Only spend CPU animating this while the hero is actually on screen.
      var visible = true;
      var runner = loop(function () { return visible; }, draw);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          visible ? runner.start() : runner.stop();
        }, { threshold: 0.05 }).observe(canvas);
      }
    })();

    // ---- Border: a filmstrip running around the four page edges ----
    (function () {
      var canvas = document.getElementById('borderBands');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var DPR = Math.min(2, window.devicePixelRatio || 1);
      var THICK = 34;
      var W = 0, H = 0;
      function resize() {
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      function draw(t) {
        ctx.clearRect(0, 0, W, H);
        var base = 20;
        drawSlice(ctx, images[0], true, 0, 0, W, THICK, -t * base);
        drawSlice(ctx, images[1], true, 0, H - THICK, W, THICK, t * base);
        drawSlice(ctx, images[2], false, 0, 0, THICK, H, -t * base * 0.85);
        drawSlice(ctx, images[3], false, W - THICK, 0, THICK, H, t * base * 0.85);
      }
      resize();
      window.addEventListener('resize', resize);
      draw(0);
      loop(function () { return true; }, draw);
    })();
  })();

  // Hero ASCII gem: drift through a few rendered perspectives (top,
  // rotated, tilted 3/4, side profile) with a slow crossfade.
  (function () {
    var field = document.getElementById('heroGemField');
    if (!field) return;

    var frames = Array.from(field.querySelectorAll('.hero-gem'));
    if (frames.length < 2) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    var idx = 0;
    setInterval(function () {
      frames[idx].classList.remove('is-active');
      idx = (idx + 1) % frames.length;
      frames[idx].classList.add('is-active');
    }, 4200);
  })();

  // Mobile nav: toggle the dropdown menu, close it on link click or outside click.
  (function () {
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('navMobile');
    if (!toggle || !menu) return;

    function closeMenu() {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    }

    function openMenu() {
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
    }

    toggle.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) closeMenu();
      else openMenu();
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  })();

  // In-page nav: scroll to sections via JS instead of letting the browser
  // follow the #hash href directly, since that was triggering a real page
  // navigation (and a "Forbidden" response) instead of an in-page jump.
  (function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
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

  // Testimonials carousel: rotates three cards at a time, autoplay + prev/next + dots.
  (function () {
    var carousel = document.getElementById('testiCarousel');
    if (!carousel) return;

    var slides = Array.from(carousel.querySelectorAll('.testi-item'));
    var dotsWrap = document.getElementById('testiDots');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var idx = 0;
    var timer = null;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'testi-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Show testimonials, page ' + (i + 1));
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
    }

    function startAutoplay() {
      if (reduceMotion) return;
      timer = setInterval(function () { show(idx + 1); }, 7000);
    }

    function stopAutoplay() {
      clearInterval(timer);
    }

    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    carousel.querySelector('.testi-prev').addEventListener('click', function () {
      show(idx - 1);
      restartAutoplay();
    });
    carousel.querySelector('.testi-next').addEventListener('click', function () {
      show(idx + 1);
      restartAutoplay();
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    startAutoplay();
  })();

  // Stat counters: numbers count up from 0 to their real value the first
  // time the stats bar scrolls into view.
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

  // Scattered rhinestones: idle twinkle always on. Scrolling drives a
  // multi-depth parallax (each stone drifts at its own rate) plus a
  // reflection band that flares any stone crossing the viewport's
  // vertical middle, like light catching rhinestones as the page moves.
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

    // Each stone gets its own parallax depth (how much it drifts per
    // pixel scrolled) so the field reads as several layers at different
    // distances, Apple-product-page style, instead of one flat sheet.
    var depths = [];

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
      depths.push(0.35 + Math.random() * 1.15);
    }

    if (reduceMotion) return;

    var ticking = false;

    function updateParallax() {
      var y = window.scrollY || window.pageYOffset;
      var vh = window.innerHeight;
      var band = vh * 0.5;

      // Pass 1: move every stone at its own depth (read nothing, just write —
      // transform is compositor-only so this doesn't force layout).
      for (var i = 0; i < stones.length; i++) {
        var offset = (y * -0.09 * depths[i]).toFixed(1);
        stones[i].style.transform = 'translate3d(0, ' + offset + 'px, 0)';
      }

      // Pass 2: a light band sweeps across the vertical middle of the
      // viewport as you scroll — any stone currently crossing it catches
      // a bright reflection flare, like light glancing off rhinestones as
      // the "jumpsuit" (page) moves past.
      for (var j = 0; j < stones.length; j++) {
        var rect = stones[j].getBoundingClientRect();
        var dist = Math.abs(rect.top - band);
        if (dist < 70) {
          stones[j].classList.add('flare');
        } else {
          stones[j].classList.remove('flare');
        }
      }

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    updateParallax();
  })();
