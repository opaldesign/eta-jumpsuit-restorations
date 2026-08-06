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

    var slides = Array.from(carousel.querySelectorAll('.testi-slide'));
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

  // Scattered rhinestones: idle twinkle always on; scrolling triggers bright
  // flares on random stones plus a slow parallax drift of the whole field.
  (function () {
    var field = document.getElementById('stoneField');
    if (!field) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var STONE_COUNT = 55;
    var stones = [];

    for (var i = 0; i < STONE_COUNT; i++) {
      var stone = document.createElement('span');
      stone.className = 'stone';
      stone.style.setProperty('--x', (Math.random() * 100).toFixed(2) + 'vw');
      stone.style.setProperty('--y', (Math.random() * 100).toFixed(2) + 'vh');
      stone.style.setProperty('--s', (Math.random() * 4 + 3).toFixed(1) + 'px');
      stone.style.setProperty('--dur', (Math.random() * 2.5 + 2.5).toFixed(2) + 's');
      stone.style.setProperty('--delay', (Math.random() * 4).toFixed(2) + 's');
      field.appendChild(stone);
      stones.push(stone);
    }

    if (reduceMotion) return;

    var ticking = false;
    function updateParallax() {
      var y = window.scrollY || window.pageYOffset;
      field.style.transform = 'translate3d(0, ' + (y * -0.015).toFixed(2) + 'px, 0)';
      ticking = false;
    }

    var lastFlare = 0;
    function flareBurst() {
      var now = Date.now();
      if (now - lastFlare < 90) return;
      lastFlare = now;
      var batch = 2 + Math.floor(Math.random() * 3);
      for (var i = 0; i < batch; i++) {
        var stone = stones[Math.floor(Math.random() * stones.length)];
        stone.classList.add('flare');
        (function (s) {
          setTimeout(function () { s.classList.remove('flare'); }, 420);
        })(stone);
      }
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
      flareBurst();
    }, { passive: true });
  })();
