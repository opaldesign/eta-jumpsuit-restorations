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
