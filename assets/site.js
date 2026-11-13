(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var IO = 'IntersectionObserver' in window;

  /* 다크 모드 / 라이트 모드: 화면 전체가 부드럽게 겹치며 바뀜 */
  var modeBtns = $$('.theme button'), themeMeta = $('meta[name="theme-color"]');
  function apply(t, save) {
    root.dataset.theme = t;
    modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === t ? 'true' : 'false'); });
    if (themeMeta) themeMeta.setAttribute('content', t === 'light' ? '#f3efe9' : '#121110');
    if (save) { try { localStorage.setItem('msh-theme', t); } catch (e) {} }
  }
  apply(root.dataset.theme === 'light' ? 'light' : 'dark', false);
  modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = btn.dataset.mode;
      if (next === root.dataset.theme) return;
      if (document.startViewTransition && !reduce) document.startViewTransition(function () { apply(next, true); });
      else apply(next, true);
    });
  });

  /* 첫 화면 사진: 첫 사진에서 시작해 천천히 다음 사진으로 (항상 두 장만 겹침) */
  var heroImgs = $$('.hero-photo img');
  if (heroImgs.length > 1 && !reduce) {
    var hi = 0, heroTimer = null;
    var loadRest = function () { heroImgs.forEach(function (im) { if (im.dataset.src) { im.srcset = im.dataset.srcset; im.src = im.dataset.src; im.removeAttribute('data-src'); } }); };
    if (heroImgs[0].complete) loadRest(); else heroImgs[0].addEventListener('load', loadRest);   // 첫 사진이 뜨면 바로 나머지 받기
    var step = function () {
      var next = (hi + 1) % heroImgs.length, cur = heroImgs[hi], im = heroImgs[next];
      if (!im.complete || !im.naturalWidth) return;
      heroImgs.forEach(function (x) { if (x !== cur && x !== im) x.classList.remove('show', 'front'); });
      cur.classList.remove('front');
      im.classList.add('show', 'front');          // 새 사진이 위에서 천천히 나타남
      setTimeout(function () { cur.classList.remove('show'); }, 2200);   // 다 나타난 뒤 아래 사진을 치움
      hi = next;
    };
    var startHero = function () { if (!heroTimer) heroTimer = setInterval(step, 4800); };
    var stopHero = function () { clearInterval(heroTimer); heroTimer = null; };
    setTimeout(function () { step(); startHero(); }, 4000);   // 첫 사진은 4초 뒤 넘어감
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopHero(); else startHero(); });
  }

  /* 위쪽 줄 */
  var topbar = $('#topbar');
  var onScroll = function () { if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* 지금 보고 있는 구역 표시 */
  var spyLinks = $$('.menu a[data-spy]');
  if (IO && spyLinks.length && $('#videos')) {
    var map = { reel: 'videos', videos: 'videos', photos: 'photos', field: 'field', profile: 'profile', career: 'profile', contact: 'contact' };
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var k = map[en.target.id];
        spyLinks.forEach(function (a) { a.classList.toggle('on', a.dataset.spy === k); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
    var hero = $('#top');
    if (hero) new IntersectionObserver(function (es) { if (es[0].isIntersecting) spyLinks.forEach(function (a) { a.classList.remove('on'); }); }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
  }

  /* 천천히 나타나기 */
  var reveals = $$('.reveal');
  if (IO && !reduce) {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
    $$('.vgrid').forEach(function (g) { $$('.vcard', g).forEach(function (c, i) { c.classList.add('reveal'); c.style.setProperty('--d', (i % 3) * 0.08 + 's'); ro.observe(c); }); });
  } else { reveals.forEach(function (el) { el.classList.add('in'); }); }

  /* 미리보기 영상: 화면에 보일 때만 소리 없이 재생 */
  var previews = $$('video[data-src]');
  if (!reduce && IO) {
    var vo = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { if (!v.src) v.src = v.dataset.src; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: .35 });
    previews.forEach(function (v) { v.muted = true; vo.observe(v); });
  }
  var reel = $('.reel-video');
  if (reel) {
    reel.muted = true;
    if (reduce) { reel.removeAttribute('autoplay'); reel.pause(); }
    else if (IO) new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { var p = reel.play(); if (p && p.catch) p.catch(function () {}); } else reel.pause(); }); }, { threshold: .2 }).observe(reel);
  }

  /* 현장 띠: 끊김 없이 계속 흐름 · 마우스를 올리면 천천히 · 끌거나 밀어서 넘기기 */
  var mqBox = $('#marquee');
  if (mqBox && !reduce) {
    var track = $('.marquee-track', mqBox), firstSet = $('.marquee-set', track);
    var BASE = window.innerWidth < 861 ? 26 : 34;            // 1초에 움직이는 거리(px)
    var setW = 0, x = 0, v = BASE, target = BASE, last = 0, rafId = 0, inView = true;
    var down = false, dragging = false, moved = 0, px = 0, pt = 0, fling = 0;
    var measure = function () { setW = firstSet.getBoundingClientRect().width; };
    measure(); window.addEventListener('resize', measure);
    var frame = function (t) {
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0; last = t;
      if (!dragging) { v += (target - v) * Math.min(1, dt * 2.2); x -= v * dt; }
      if (setW > 0) { while (x <= -setW) x += setW; while (x > 0) x -= setW; }
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      rafId = (inView && !document.hidden) ? requestAnimationFrame(frame) : 0;
    };
    var start = function () { if (!rafId && inView && !document.hidden) { last = 0; rafId = requestAnimationFrame(frame); } };
    if (IO) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; start(); }, { rootMargin: '100px 0px' }).observe(mqBox);
    document.addEventListener('visibilitychange', start);
    start();
    mqBox.addEventListener('mouseenter', function () { target = BASE * 0.18; });
    mqBox.addEventListener('mouseleave', function () { target = BASE; });
    mqBox.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      down = true; dragging = false; moved = 0; px = ev.clientX; pt = performance.now(); fling = 0;
    });
    mqBox.addEventListener('pointermove', function (ev) {
      if (!down) return;
      var dx = ev.clientX - px, now = performance.now(), ms = Math.max(1, now - pt);
      moved += Math.abs(dx);
      if (!dragging && moved > 6) { dragging = true; mqBox.classList.add('dragging'); try { mqBox.setPointerCapture(ev.pointerId); } catch (e) {} }
      if (dragging) { x += dx; fling = 0.75 * (dx / ms * 1000) + 0.25 * fling; }
      px = ev.clientX; pt = now;
    });
    var endDrag = function () {
      if (!down) return; down = false;
      if (dragging) { dragging = false; mqBox.classList.remove('dragging'); v = Math.max(-2400, Math.min(2400, -fling)); }
    };
    mqBox.addEventListener('pointerup', endDrag); mqBox.addEventListener('pointercancel', endDrag);
    mqBox.addEventListener('click', function (ev) { if (moved > 6) { ev.stopPropagation(); ev.preventDefault(); } }, true);
    mqBox.addEventListener('wheel', function (ev) {
      if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) { ev.preventDefault(); x -= ev.deltaX; v = target * 0.3; }
    }, { passive: false });
  }

  /* 휴대폰 아래 연락 줄 */
  var dock = $('#dock');
  if (dock && IO) {
    var heroActions = $('#hero-actions'), contact = $('#contact');
    if (heroActions) {
      var heroOut = false, contactIn = false;
      var sync = function () { dock.classList.toggle('show', heroOut && !contactIn); };
      new IntersectionObserver(function (es) { es.forEach(function (en) { heroOut = !en.isIntersecting && en.boundingClientRect.top < 0; }); sync(); }).observe(heroActions);
      if (contact) new IntersectionObserver(function (es) { es.forEach(function (en) { contactIn = en.isIntersecting; }); sync(); }, { threshold: .2 }).observe(contact);
    } else { dock.classList.add('show'); }
  }

  /* 사진 크게 보기 */
  var lb = $('#lb'), groups = window.LB_GROUPS, photos = [];
  if (lb && groups) {
    var img = $('#lb-img'), count = $('#lb-count'), dl = $('#lb-dl'), cap = $('#lb-cap'), cur = 0;
    var show = function (i) {
      cur = (i + photos.length) % photos.length; var p = photos[cur];
      img.src = p.src; img.alt = p.alt; count.textContent = (cur + 1) + ' / ' + photos.length; cap.textContent = p.cap || '';
      dl.href = p.dl; dl.setAttribute('download', p.name);
    };
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('.ph'); if (!b) return;
      photos = groups[b.dataset.g] || []; if (!photos.length) return;
      show(+b.dataset.i); if (lb.showModal) lb.showModal(); else window.open(img.src, '_blank');
    });
    $('#lb-close').onclick = function () { lb.close(); };
    $$('[data-lb="prev"]', lb).forEach(function (b) { b.onclick = function () { show(cur - 1); }; });
    $$('[data-lb="next"]', lb).forEach(function (b) { b.onclick = function () { show(cur + 1); }; });
    lb.addEventListener('keydown', function (ev) { if (ev.key === 'ArrowLeft') show(cur - 1); if (ev.key === 'ArrowRight') show(cur + 1); });
    lb.addEventListener('click', function (ev) { var t = ev.target; if (t === lb || t.classList.contains('lb-main') || t.classList.contains('lb-row') || t.classList.contains('lb-top')) lb.close(); });
    var sx = null;
    lb.addEventListener('touchstart', function (ev) { sx = ev.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (ev) { if (sx === null) return; var dx = ev.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* 링크 복사: '사이트 그대로' 또는 '이 영상만' 골라서 */
  var share = $('#share');
  if (share) {
    var sBtn = $('.share-btn', share), sMenu = $('.share-menu', share), sLabel = $('.share-label > span', share), toast = $('#toast'), tTimer = null;
    var items = $$('[role="menuitem"]', sMenu);
    var setOpen = function (o) { sMenu.hidden = !o; sBtn.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    sBtn.addEventListener('click', function () { setOpen(sMenu.hidden); });
    sBtn.addEventListener('keydown', function (ev) { if (ev.key === 'ArrowDown') { ev.preventDefault(); ev.stopPropagation(); setOpen(true); items[0].focus(); } });
    document.addEventListener('click', function (ev) { if (!sMenu.hidden && !share.contains(ev.target)) setOpen(false); });
    share.addEventListener('keydown', function (ev) {
      if (sMenu.hidden) return;
      var i = items.indexOf(document.activeElement);
      if (ev.key === 'Escape') { setOpen(false); sBtn.focus(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    share.addEventListener('focusout', function (ev) { if (!sMenu.hidden && ev.relatedTarget && !share.contains(ev.relatedTarget)) setOpen(false); });
    var copy = function (text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise(function (res, rej) {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
        var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta); if (ok) res(); else rej();
      });
    };
    var done = function (msg) {
      share.classList.add('done'); sLabel.textContent = '복사했어요';
      if (toast) { toast.textContent = msg; toast.classList.add('show'); }
      clearTimeout(tTimer);
      tTimer = setTimeout(function () { share.classList.remove('done'); sLabel.textContent = '링크 복사'; if (toast) toast.classList.remove('show'); }, 2600);
    };
    items.forEach(function (it) {
      it.addEventListener('click', function () {
        var url = it.dataset.url;
        setOpen(false); sBtn.focus({ preventScroll: true });
        copy(url).then(function () { done(it.dataset.done); }, function () { window.prompt('이 링크를 복사해 보내세요', url); });
      });
    });
  }
})();
