// Screen navigation: the site is one page made of full-viewport "screens"
// (home/about/services/pricing/gallery). Every [data-target] button — the
// brand mark, the side nav, and the in-page CTA buttons — calls goTo(), which
// slides the outgoing screen and incoming screen past each other. Screens
// later in `order` slide in from the right; earlier ones (going "back")
// slide in from the left. No scrolling, no #hash navigation (that previously
// triggered a real browser navigation and a "Forbidden" response).
(function () {
  var order = ['home', 'about', 'services', 'pricing', 'gallery'];
  var screens = {};
  order.forEach(function (id) {
    screens[id] = document.getElementById('screen-' + id);
  });

  var current = 'home';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var navButtons = Array.from(document.querySelectorAll('[data-target]'));

  function setActiveNav(id) {
    navButtons.forEach(function (btn) {
      if (!btn.classList.contains('side-nav-item')) return;
      var isActive = btn.getAttribute('data-target') === id;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  function goTo(targetId) {
    if (targetId === current || !screens[targetId]) return;
    var dir = order.indexOf(targetId) > order.indexOf(current) ? 1 : -1;
    var fromEl = screens[current];
    var toEl = screens[targetId];

    if (reduceMotion) {
      fromEl.classList.remove('is-current');
      fromEl.setAttribute('aria-hidden', 'true');
      toEl.classList.add('is-current');
      toEl.setAttribute('aria-hidden', 'false');
      toEl.scrollTop = 0;
      current = targetId;
      setActiveNav(targetId);
      document.dispatchEvent(new CustomEvent('screen:change', { detail: { dir: dir } }));
      return;
    }

    // Place the incoming screen off-screen on the correct side before
    // revealing it, so its first visible frame is already in position.
    toEl.style.transition = 'none';
    toEl.style.transform = 'translateX(' + (dir * 100) + '%)';
    toEl.classList.add('is-current');
    toEl.setAttribute('aria-hidden', 'false');
    toEl.scrollTop = 0;
    void toEl.offsetWidth; // force reflow before re-enabling the transition
    toEl.style.transition = '';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fromEl.style.transform = 'translateX(' + (-dir * 100) + '%)';
        toEl.style.transform = 'translateX(0)';
      });
    });

    var onDone = function (e) {
      if (e.target !== fromEl || e.propertyName !== 'transform') return;
      fromEl.classList.remove('is-current');
      fromEl.setAttribute('aria-hidden', 'true');
      fromEl.style.transform = '';
      fromEl.removeEventListener('transitionend', onDone);
    };
    fromEl.addEventListener('transitionend', onDone);

    current = targetId;
    setActiveNav(targetId);
    document.dispatchEvent(new CustomEvent('screen:change', { detail: { dir: dir } }));
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      goTo(btn.getAttribute('data-target'));
    });
  });

  setActiveNav(current);
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

// Scattered rhinestones: idle twinkle always on. Since the page itself no
// longer scrolls, the sparkle "reaction" is now tied to screen navigation
// instead — each screen change fires a burst of bright flares plus a quick
// directional nudge of the whole field, so the stones visibly catch light
// as you move between pages.
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

  function flareBurst() {
    var batch = 5 + Math.floor(Math.random() * 5);
    for (var i = 0; i < batch; i++) {
      var stone = stones[Math.floor(Math.random() * stones.length)];
      stone.classList.add('flare');
      (function (s) {
        setTimeout(function () { s.classList.remove('flare'); }, 420);
      })(stone);
    }
  }

  function nudgeField(dir) {
    field.style.transition = 'none';
    field.style.transform = 'translate3d(' + (dir * 3) + '%, 0, 0)';
    void field.offsetWidth;
    field.style.transition = 'transform 0.7s cubic-bezier(.22,.61,.36,1)';
    field.style.transform = 'translate3d(0, 0, 0)';
  }

  document.addEventListener('screen:change', function (e) {
    flareBurst();
    nudgeField(e.detail && e.detail.dir ? e.detail.dir : 1);
  });
})();
