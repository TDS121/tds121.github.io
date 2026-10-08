/*
  Easter eggs: gravity mode, letter-eating fish, random colors.

  Everything is off until triggered (typed word or footer button) and can be
  fully undone without a reload (trigger again, Escape, or the reset button).
  To remove the feature, delete this file, easter-eggs.css, and the two tags
  that load them in each page.

  Matter.js (physics for gravity mode) is loaded from a CDN the first time
  gravity is triggered, so normal page loads pull in nothing extra.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var eggs = [];

  /* ======================================================================
     Shared plumbing: footer buttons, typed words, Escape, tab visibility
     ====================================================================== */

  function isTypingTarget(el) {
    if (!el || !el.closest) return false;
    if (el.isContentEditable) return true;
    return !!el.closest('input, textarea, select, [contenteditable]');
  }

  function setPressed(egg) {
    (egg.buttons || []).forEach(function (b) {
      b.setAttribute('aria-pressed', String(!!egg.active));
    });
    var anyActive = eggs.some(function (e) { return e.active; });
    resetButtons.forEach(function (b) { b.hidden = !anyActive; });
    if (fabMain) {
      fabMain.textContent = anyActive ? '🐣' : '🥚';   // 🐣 : 🥚
      fabMain.classList.toggle('egg-fab-active', anyActive);
    }
  }

  // Every egg toggles except where it defines its own trigger (colors).
  function trigger(egg) {
    if (egg.trigger) egg.trigger();
    else if (egg.active) egg.off();
    else egg.on();
  }

  function deactivateAll() {
    eggs.forEach(function (egg) { if (egg.active) egg.off(); });
  }

  // Put an attribute back exactly as it was (including "absent").
  function restoreAttribute(el, name, value) {
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  }

  // Inline styles on <html> are only ever ours; drop the attribute once empty.
  function tidyRootStyle() {
    if (root.getAttribute('style') === '') root.removeAttribute('style');
  }

  var typed = '';
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { deactivateAll(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    if (isTypingTarget(e.target)) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    eggs.forEach(function (egg) {
      if (typed.slice(-egg.word.length) === egg.word) {
        typed = '';
        // Reduced motion: keyboard triggers are silently ignored.
        if (!reducedMotion.matches) trigger(egg);
      }
    });
  });

  document.addEventListener('visibilitychange', function () {
    eggs.forEach(function (egg) {
      if (!egg.active) return;
      if (document.hidden) { if (egg.pause) egg.pause(); }
      else if (egg.resume) egg.resume();
    });
  });

  var resetButtons = [];
  var fabMain = null;

  function makeToggleButton(egg, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = egg.title + ' (or type "' + egg.word + '")';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      // Reduced motion: buttons still work, but ask before starting anything.
      if (reducedMotion.matches && !egg.active &&
          !window.confirm('This starts an animated effect on the page. Continue?')) return;
      trigger(egg);
    });
    egg.buttons = egg.buttons || [];
    egg.buttons.push(b);
    return b;
  }

  function makeResetButton(label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = 'Turn off all easter eggs (or press Escape)';
    b.hidden = true;
    b.addEventListener('click', deactivateAll);
    resetButtons.push(b);
    return b;
  }

  function buildControls() {
    // Subtle text buttons in the footer.
    var bar = document.createElement('div');
    bar.className = 'egg-controls';
    bar.setAttribute('aria-label', 'Easter eggs');
    eggs.forEach(function (egg) { bar.appendChild(makeToggleButton(egg, egg.word)); });
    bar.appendChild(makeResetButton('reset'));
    (document.querySelector('footer') || document.body).appendChild(bar);

    // Floating egg button that opens a menu of the same toggles. Stays on
    // screen while gravity has the page locked, and is easy to tap on a phone.
    var fab = document.createElement('div');
    fab.className = 'egg-fab';
    var menu = document.createElement('div');
    menu.className = 'egg-fab-menu';
    menu.id = 'egg-fab-menu';
    eggs.forEach(function (egg) { menu.appendChild(makeToggleButton(egg, egg.emoji + ' ' + egg.word)); });
    menu.appendChild(makeResetButton('↩ reset'));

    fabMain = document.createElement('button');
    fabMain.type = 'button';
    fabMain.className = 'egg-fab-main';
    fabMain.textContent = '🥚';   // 🥚
    fabMain.title = 'Easter eggs';
    fabMain.setAttribute('aria-label', 'Easter eggs');
    fabMain.setAttribute('aria-expanded', 'false');
    fabMain.setAttribute('aria-controls', menu.id);
    function setOpen(open) {
      fab.classList.toggle('egg-fab-open', open);
      fabMain.setAttribute('aria-expanded', String(open));
    }
    fabMain.addEventListener('click', function () {
      setOpen(!fab.classList.contains('egg-fab-open'));
    });
    document.addEventListener('click', function (e) {
      if (!fab.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    fab.appendChild(menu);
    fab.appendChild(fabMain);
    document.body.appendChild(fab);
  }

  /* ======================================================================
     1. Gravity mode
     ====================================================================== */

  var MATTER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js';
  var MATTER_SRI = 'sha384-ZRKYEXtLBVeqs9z1WxyeKutCqnkqolS/r1EUWuoUpG4ZKbnRAIXnHhHdnNuiB6CL';
  var matterPromise = null;

  function loadMatter() {
    if (window.Matter) return Promise.resolve(window.Matter);
    if (!matterPromise) {
      matterPromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = MATTER_URL;
        s.integrity = MATTER_SRI;
        s.crossOrigin = 'anonymous';
        s.onload = function () { resolve(window.Matter); };
        s.onerror = function () {
          matterPromise = null;
          reject(new Error('Could not load Matter.js'));
        };
        document.head.appendChild(s);
      });
    }
    return matterPromise;
  }

  // Outermost content blocks only: a <li> falls as one piece, its <a> rides along.
  var FALL_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, img, button, nav a, blockquote, pre, figure, table';

  function collectFallingElements() {
    return Array.prototype.filter.call(document.body.querySelectorAll(FALL_SELECTOR), function (el) {
      if (el.closest('.egg-controls, .egg-fab, .egg-gravity-overlay')) return false;
      if (el.classList.contains('egg-placeholder')) return false;
      if (el.parentElement && el.parentElement.closest(FALL_SELECTOR)) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  var gravity = {
    word: 'gravity',
    emoji: '\uD83E\uDE90',   // 🪐
    title: 'Gravity mode',
    active: false,
    state: null,           // null | 'loading' | 'running' | 'restoring'
    items: [],
    engine: null,
    overlay: null,
    raf: 0,
    last: 0,
    accumulator: 0,
    savedScroll: null,
    savedOverflow: '',

    on: function () {
      if (this.state) return;
      var self = this;
      this.state = 'loading';
      this.active = true;
      setPressed(this);
      loadMatter().then(function (Matter) {
        if (self.state !== 'loading') return;   // cancelled while loading
        self.start(Matter);
      }, function (err) {
        console.warn('[easter-eggs]', err.message);
        self.state = null;
        self.active = false;
        setPressed(self);
      });
    },

    start: function (Matter) {
      var self = this;
      var W = window.innerWidth, H = window.innerHeight;
      var els = collectFallingElements();

      // Measure everything before touching the DOM so nothing shifts mid-way.
      this.items = els.map(function (el) {
        return {
          el: el, rect: el.getBoundingClientRect(), placeholder: null, body: null,
          style: el.getAttribute('style'), className: el.getAttribute('class')
        };
      });

      this.savedScroll = { x: window.scrollX, y: window.scrollY };
      this.savedOverflow = root.style.overflow;
      root.style.overflow = 'hidden';
      root.classList.add('egg-gravity');

      this.items.forEach(function (item) {
        var el = item.el, r = item.rect;
        // A hidden shallow clone keeps the layout exactly where it was.
        var ph = el.cloneNode(false);
        ph.removeAttribute('id');
        ph.classList.add('egg-placeholder');
        ph.setAttribute('aria-hidden', 'true');
        ph.style.width = r.width + 'px';
        ph.style.height = r.height + 'px';
        ph.style.boxSizing = 'border-box';
        el.parentNode.insertBefore(ph, el);
        item.placeholder = ph;

        el.classList.add('egg-falling');
        el.style.width = r.width + 'px';
        el.style.height = r.height + 'px';
        el.style.transform = 'translate(' + r.left + 'px, ' + r.top + 'px)';
      });

      var overlay = document.createElement('div');
      overlay.className = 'egg-gravity-overlay';
      document.body.appendChild(overlay);
      this.overlay = overlay;

      // Extra solver iterations keep the stacked pile from sinking into the floor.
      var engine = Matter.Engine.create({ positionIterations: 10, velocityIterations: 6 });
      this.engine = engine;
      var world = engine.world;

      this.items.forEach(function (item) {
        var r = item.rect;
        var y = r.top + r.height / 2;
        // Anything below the fold can't "start where it was" visibly, so let
        // it rain in from above instead of spawning inside the floor.
        if (r.top >= H) y = -(r.top - H) - r.height / 2 - 40;
        item.body = Matter.Bodies.rectangle(r.left + r.width / 2, y, r.width, r.height, {
          restitution: 0.45,
          friction: 0.4,
          frictionAir: 0.012,
          density: 0.002,
          // Small chamfer: enough to let pieces slide, not so much that the
          // square DOM box visibly sinks into the floor when tilted.
          chamfer: { radius: Math.min(3, r.width / 4, r.height / 4) }
        });
        Matter.Composite.add(world, item.body);
      });

      var wallOpts = { isStatic: true, friction: 0.6 };
      this.walls = {
        floor: Matter.Bodies.rectangle(W / 2, H + 50, W * 6, 100, wallOpts),
        left: Matter.Bodies.rectangle(-50, 0, 100, H * 40, wallOpts),
        right: Matter.Bodies.rectangle(W + 50, 0, 100, H * 40, wallOpts),
        ceiling: Matter.Bodies.rectangle(W / 2, -H * 10, W * 6, 100, wallOpts)
      };
      Matter.Composite.add(world, [this.walls.floor, this.walls.left, this.walls.right, this.walls.ceiling]);

      var mouse = Matter.Mouse.create(overlay);
      var mc = Matter.MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: { stiffness: 0.2, damping: 0.05, render: { visible: false } }
      });
      Matter.Composite.add(world, mc);
      this.mouseConstraint = mc;
      // Matter normally picks the body on the next physics tick, by which time
      // a quick flick has already left the element. Grab at the press point.
      // (Matter's own listeners were registered first, so they have run.)
      var grabNow = function () {
        Matter.MouseConstraint.update(mc, Matter.Composite.allBodies(world));
      };
      overlay.addEventListener('mousedown', grabNow);
      overlay.addEventListener('touchstart', grabNow, { passive: false });

      this.onResize = function () { self.resize(); };
      window.addEventListener('resize', this.onResize);

      this.state = 'running';
      this.last = 0;
      this.accumulator = 0;
      this.raf = requestAnimationFrame(function (t) { self.frame(t); });
    },

    resize: function () {
      if (this.state !== 'running') return;
      var Matter = window.Matter, W = window.innerWidth, H = window.innerHeight;
      Matter.Body.setPosition(this.walls.floor, { x: W / 2, y: H + 50 });
      Matter.Body.setPosition(this.walls.right, { x: W + 50, y: 0 });
    },

    frame: function (t) {
      var self = this;
      if (this.state !== 'running') return;
      var STEP = 1000 / 60;
      if (this.last) this.accumulator = Math.min(this.accumulator + (t - this.last), STEP * 3);
      this.last = t;
      while (this.accumulator >= STEP) {
        window.Matter.Engine.update(this.engine, STEP);
        this.accumulator -= STEP;
      }
      this.items.forEach(function (item) {
        var b = item.body, r = item.rect;
        item.el.style.transform = 'translate(' + (b.position.x - r.width / 2) + 'px, ' +
          (b.position.y - r.height / 2) + 'px) rotate(' + b.angle + 'rad)';
      });
      this.raf = requestAnimationFrame(function (t2) { self.frame(t2); });
    },

    pause: function () {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    },

    resume: function () {
      var self = this;
      if (this.state === 'running' && !this.raf) {
        this.last = 0;
        this.raf = requestAnimationFrame(function (t) { self.frame(t); });
      }
    },

    off: function () {
      var self = this;
      if (this.state === 'loading') {
        this.state = null;
        this.active = false;
        setPressed(this);
        return;
      }
      if (this.state !== 'running') return;
      this.state = 'restoring';
      this.pause();
      window.removeEventListener('resize', this.onResize);
      this.overlay.remove();                 // also drops Matter's mouse listeners

      // Put the page back in its normal scroll state first, then measure where
      // each placeholder sits now, and glide every element home.
      root.style.overflow = this.savedOverflow;
      window.scrollTo(this.savedScroll.x, this.savedScroll.y);
      var targets = this.items.map(function (item) { return item.placeholder.getBoundingClientRect(); });
      var animate = !reducedMotion.matches;
      this.items.forEach(function (item, i) {
        item.el.style.transition = animate ? 'transform 0.7s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none';
        item.el.style.transform = 'translate(' + targets[i].left + 'px, ' + targets[i].top + 'px) rotate(0rad)';
      });
      if (!animate) { this.finish(); return; }

      // Wait for every element's transition to actually end before cleaning
      // up: Chromium re-adds an empty style="" if the attribute is removed
      // while a transition on an inline property is still running.
      var pending = this.items.length;
      var fallback = setTimeout(function () { self.finish(); }, 1500);
      this.items.forEach(function (item) {
        item.el.addEventListener('transitionend', function done(e) {
          if (e.target !== item.el) return;
          item.el.removeEventListener('transitionend', done);
          if (--pending === 0) { clearTimeout(fallback); self.finish(); }
        });
      });
    },

    finish: function () {
      if (this.state !== 'restoring') return;
      var Matter = window.Matter;
      this.items.forEach(function (item) {
        restoreAttribute(item.el, 'class', item.className);
        restoreAttribute(item.el, 'style', item.style);
        item.placeholder.remove();
      });
      root.classList.remove('egg-gravity');
      tidyRootStyle();
      Matter.Composite.clear(this.engine.world, false, true);
      Matter.Engine.clear(this.engine);
      this.items = [];
      this.engine = null;
      this.overlay = null;
      this.state = null;
      this.active = false;
      setPressed(this);
    }
  };
  eggs.push(gravity);

  /* ======================================================================
     2. Letter-eating fish
     ====================================================================== */

  var pointer = { x: -9999, y: -9999, active: false };
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'mouse') pointer.active = false;
  }, { passive: true });
  document.addEventListener('mouseleave', function () { pointer.active = false; });

  var DEFAULT_FISH_COLORS = ['#ff8c42', '#ffb347', '#4f9be8', '#7fc8f8', '#f45b69', '#57c785'];

  function wrapTextNodes() {
    var records = [];
    var labelled = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!/\S/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement;
        if (!p || p.closest('script, style, noscript, textarea, .egg-controls, .egg-fab, .egg-placeholder')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      var parent = node.parentElement;
      if (!labelled.some(function (L) { return L.el === parent; })) {
        // Remember the previous aria-label (or its absence) so it can be put back.
        labelled.push({ el: parent, prev: parent.getAttribute('aria-label') });
        parent.setAttribute('aria-label', parent.textContent.replace(/\s+/g, ' ').trim());
      }
      var wrap = document.createElement('span');
      wrap.className = 'egg-text';
      var run = '';
      Array.from(node.nodeValue).forEach(function (ch) {
        if (/\s/.test(ch)) { run += ch; return; }
        if (run) { wrap.appendChild(document.createTextNode(run)); run = ''; }
        var span = document.createElement('span');
        span.className = 'egg-letter';
        span.textContent = ch;
        wrap.appendChild(span);
      });
      if (run) wrap.appendChild(document.createTextNode(run));
      parent.replaceChild(wrap, node);
      records.push({ node: node, wrap: wrap });
    });
    return { records: records, labelled: labelled };
  }

  function unwrapTextNodes(wrapped) {
    wrapped.records.forEach(function (rec) {
      if (rec.wrap.parentNode) rec.wrap.parentNode.replaceChild(rec.node, rec.wrap);
    });
    wrapped.labelled.forEach(function (L) {
      restoreAttribute(L.el, 'aria-label', L.prev);
    });
  }

  function limit(v, max) {
    var m = Math.hypot(v.x, v.y);
    if (m > max) { v.x = v.x / m * max; v.y = v.y / m * max; }
    return v;
  }

  var fish = {
    word: 'fish',
    emoji: '\uD83D\uDC1F',   // 🐟
    title: 'Letter-eating fish',
    active: false,
    canvas: null,
    ctx: null,
    school: [],
    letters: [],
    wrapped: null,
    raf: 0,
    last: 0,
    time: 0,
    letterRefreshAt: 0,

    on: function () {
      if (this.active) return;
      var self = this;
      this.active = true;
      this.wrapped = wrapTextNodes();
      this.letters = Array.prototype.map.call(document.querySelectorAll('.egg-letter'), function (el) {
        return { el: el, eaten: false, claimedBy: null, x: 0, y: 0, visible: false };
      });

      var canvas = document.createElement('canvas');
      canvas.className = 'egg-fish-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.onResize = function () { self.resize(); };
      window.addEventListener('resize', this.onResize);
      this.onScroll = function () { self.letterRefreshAt = 0; };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.resize();

      var W = window.innerWidth, H = window.innerHeight;
      var count = 10 + Math.floor(Math.random() * 6);   // 10..15
      this.school = [];
      for (var i = 0; i < count; i++) {
        var a = Math.random() * Math.PI * 2;
        this.school.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
          size: 1, colorIndex: i, phase: Math.random() * Math.PI * 2,
          target: null, retargetAt: 0, chewUntil: 0
        });
      }
      this.refreshLetters(true);
      this.last = 0;
      this.raf = requestAnimationFrame(function (t) { self.frame(t); });
      setPressed(this);
    },

    resize: function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(window.innerWidth * dpr);
      this.canvas.height = Math.round(window.innerHeight * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    // Letter positions are cached and refreshed a few times a second (every
    // frame while gravity is running, since everything is moving).
    refreshLetters: function (force) {
      var now = performance.now();
      if (!force && gravity.state !== 'running' && now < this.letterRefreshAt) return;
      this.letterRefreshAt = now + 250;
      var H = window.innerHeight, W = window.innerWidth;
      this.letters.forEach(function (L) {
        if (L.eaten) return;
        var r = L.el.getBoundingClientRect();
        L.x = r.left + r.width / 2;
        L.y = r.top + r.height / 2;
        L.visible = r.width > 0 && r.height > 0 && L.y > 0 && L.y < H && L.x > 0 && L.x < W;
      });
    },

    pickTarget: function (f) {
      var best = null, bestD = Infinity;
      this.letters.forEach(function (L) {
        if (L.eaten || !L.visible || (L.claimedBy && L.claimedBy !== f)) return;
        var d = (L.x - f.x) * (L.x - f.x) + (L.y - f.y) * (L.y - f.y);
        if (d < bestD) { bestD = d; best = L; }
      });
      if (f.target && f.target !== best) f.target.claimedBy = null;
      f.target = best;
      if (best) best.claimedBy = f;
    },

    frame: function (t) {
      var self = this;
      if (!this.active) return;
      var dt = this.last ? Math.min(t - this.last, 50) : 16.7;
      this.last = t;
      var k = dt / 16.7;                       // frame-rate independent scaling
      this.time += dt / 1000;
      this.refreshLetters(false);

      var W = window.innerWidth, H = window.innerHeight;
      var school = this.school;
      var MAX_SPEED = 3.2, MAX_FORCE = 0.12;

      school.forEach(function (f) {
        var sep = { x: 0, y: 0 }, ali = { x: 0, y: 0 }, coh = { x: 0, y: 0 };
        var nSep = 0, nAli = 0, nCoh = 0;
        school.forEach(function (o) {
          if (o === f) return;
          var dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy);
          if (d < 1) return;
          if (d < 28 * f.size) { sep.x -= dx / d / d; sep.y -= dy / d / d; nSep++; }
          if (d < 70) { ali.x += o.vx; ali.y += o.vy; nAli++; }
          if (d < 100) { coh.x += o.x; coh.y += o.y; nCoh++; }
        });
        var steer = { x: 0, y: 0 };
        function apply(desired, weight) {
          var s = limit({ x: desired.x - f.vx, y: desired.y - f.vy }, MAX_FORCE);
          steer.x += s.x * weight; steer.y += s.y * weight;
        }
        function toward(dx, dy, weight) {
          var d = Math.hypot(dx, dy) || 1;
          apply({ x: dx / d * MAX_SPEED, y: dy / d * MAX_SPEED }, weight);
        }
        if (nSep) toward(sep.x, sep.y, 1.6);
        if (nAli) toward(ali.x / nAli, ali.y / nAli, 0.8);
        if (nCoh) toward(coh.x / nCoh - f.x, coh.y / nCoh - f.y, 0.6);

        // Flee the cursor / finger.
        if (pointer.active) {
          var px = f.x - pointer.x, py = f.y - pointer.y, pd = Math.hypot(px, py);
          if (pd < 130) toward(px, py, 3.5 * (1 - pd / 130) + 0.5);
        }

        // Hunt letters (after a short pause to "chew" the last one).
        if (t > f.chewUntil && (t > f.retargetAt || !f.target || f.target.eaten)) {
          self.pickTarget(f);
          f.retargetAt = t + 800 + Math.random() * 600;
        }
        if (f.target) {
          var T = f.target;
          if (gravity.state === 'running') {         // letters are moving: track precisely
            var r = T.el.getBoundingClientRect();
            T.x = r.left + r.width / 2; T.y = r.top + r.height / 2;
          }
          var tx = T.x - f.x, ty = T.y - f.y, td = Math.hypot(tx, ty);
          if (td < 8 + 6 * f.size) {
            T.eaten = true;
            T.claimedBy = null;
            T.el.classList.add('egg-eaten');
            f.size = Math.min(f.size + 0.05, 2.2);
            f.target = null;
            f.chewUntil = t + 1000 + Math.random() * 1500;
          } else {
            // "Arrive": slow down near the letter so the fish can actually
            // reach it instead of orbiting at full speed.
            var arrive = Math.max(0.35, Math.min(1, td / 60));
            apply({ x: tx / td * MAX_SPEED * arrive, y: ty / td * MAX_SPEED * arrive }, 1.6);
          }
        } else {
          // Nothing left to eat nearby: wander a little.
          toward(Math.cos(f.phase + self.time), Math.sin(f.phase * 1.3 + self.time * 0.7), 0.3);
        }

        // Stay inside the viewport.
        var m = 40;
        if (f.x < m) toward(1, 0, 2); else if (f.x > W - m) toward(-1, 0, 2);
        if (f.y < m) toward(0, 1, 2); else if (f.y > H - m) toward(0, -1, 2);

        f.vx += steer.x * k; f.vy += steer.y * k;
        var vel = limit({ x: f.vx, y: f.vy }, MAX_SPEED);
        f.vx = vel.x; f.vy = vel.y;
        var sp = Math.hypot(f.vx, f.vy);
        if (sp < 0.6) { f.vx += (Math.random() - 0.5) * 0.4; f.vy += (Math.random() - 0.5) * 0.4; }
        f.x += f.vx * k; f.y += f.vy * k;
        f.x = Math.max(-20, Math.min(W + 20, f.x));
        f.y = Math.max(-20, Math.min(H + 20, f.y));
      });

      this.draw();
      this.raf = requestAnimationFrame(function (t2) { self.frame(t2); });
    },

    fishColor: function (f) {
      var p = colors.palette;
      if (p) return f.colorIndex % 2 ? p.accent : p.link;
      return DEFAULT_FISH_COLORS[f.colorIndex % DEFAULT_FISH_COLORS.length];
    },

    draw: function () {
      var ctx = this.ctx, self = this;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      this.school.forEach(function (f) {
        var angle = Math.atan2(f.vy, f.vx);
        var speed = Math.hypot(f.vx, f.vy);
        var wag = Math.sin(self.time * (8 + speed * 3) + f.phase) * 0.6;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(angle);
        ctx.scale(f.size, f.size);
        ctx.fillStyle = self.fishColor(f);
        // tail
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-15, -6 + wag * 4);
        ctx.lineTo(-15, 6 + wag * 4);
        ctx.closePath();
        ctx.fill();
        // body
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // fin
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-1, 0); ctx.lineTo(3, -4 + wag); ctx.lineTo(4, 0); ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // eye
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(5.5, -1.5, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(6.1, -1.5, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    },

    pause: function () {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    },

    resume: function () {
      var self = this;
      if (this.active && !this.raf) {
        this.last = 0;
        this.raf = requestAnimationFrame(function (t) { self.frame(t); });
      }
    },

    off: function () {
      if (!this.active) return;
      this.active = false;
      this.pause();
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('scroll', this.onScroll);
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
      unwrapTextNodes(this.wrapped);
      this.wrapped = null;
      this.letters = [];
      this.school = [];
      setPressed(this);
    }
  };
  eggs.push(fish);

  /* ======================================================================
     3. Random colors
     ====================================================================== */

  function rnd(min, max) { return min + Math.random() * (max - min); }

  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    // Rounded to what the page will actually render, so the contrast check
    // judges the real color.
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  function luminance(rgb) {
    var v = rgb.map(function (c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  // WCAG contrast ratio, 1..21
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function hex(rgb) {
    return '#' + rgb.map(function (c) {
      return ('0' + Math.round(c).toString(16)).slice(-2);
    }).join('');
  }

  var MIN_CONTRAST = 4.5;

  // Keeps drawing palettes until one passes every text/background pair.
  function generatePalette() {
    for (var attempt = 0; attempt < 500; attempt++) {
      var dark = Math.random() < 0.5;
      var hue = rnd(0, 360);
      var bgS = rnd(15, 60);
      var bgL = dark ? rnd(6, 20) : rnd(84, 97);
      var bg = hslToRgb(hue, bgS, bgL);
      var surface = hslToRgb(hue, bgS, dark ? bgL + rnd(5, 11) : bgL - rnd(4, 9));
      var text = hslToRgb((hue + rnd(-40, 40) + 360) % 360, rnd(5, 40), dark ? rnd(85, 97) : rnd(4, 22));
      var accentHue = (hue + rnd(80, 280)) % 360;
      var accent = hslToRgb(accentHue, rnd(55, 95), rnd(32, 62));
      var link = hslToRgb(accentHue, rnd(55, 95), dark ? rnd(62, 82) : rnd(22, 42));
      var white = [255, 255, 255], black = [20, 20, 20];
      var onAccent = contrast(accent, white) >= MIN_CONTRAST ? white :
                     contrast(accent, black) >= MIN_CONTRAST ? black : null;

      if (!onAccent) continue;
      if (contrast(text, bg) < MIN_CONTRAST || contrast(text, surface) < MIN_CONTRAST) continue;
      if (contrast(link, bg) < MIN_CONTRAST || contrast(link, surface) < MIN_CONTRAST) continue;

      return { bg: hex(bg), surface: hex(surface), text: hex(text), accent: hex(accent), onAccent: hex(onAccent), link: hex(link) };
    }
    return null;
  }

  var colors = {
    word: 'colors',
    emoji: '\uD83C\uDFA8',   // 🎨
    title: 'Random colors',
    active: false,
    palette: null,
    transitionTimer: 0,

    // Every trigger is a fresh palette; Escape/reset restores the original.
    trigger: function () { this.on(); },

    on: function () {
      var palette = generatePalette();
      if (!palette) return;
      this.palette = palette;
      this.active = true;
      clearTimeout(this.transitionTimer);
      root.classList.add('egg-colors-transition');
      void root.offsetWidth;                  // make sure the transition rule is in effect first
      root.style.setProperty('--egg-bg', palette.bg);
      root.style.setProperty('--egg-surface', palette.surface);
      root.style.setProperty('--egg-text', palette.text);
      root.style.setProperty('--egg-accent', palette.accent);
      root.style.setProperty('--egg-on-accent', palette.onAccent);
      root.style.setProperty('--egg-link', palette.link);
      root.classList.add('egg-colors');
      setPressed(this);
    },

    off: function () {
      if (!this.active) return;
      this.active = false;
      this.palette = null;
      root.classList.remove('egg-colors');
      ['bg', 'surface', 'text', 'accent', 'on-accent', 'link'].forEach(function (k) {
        root.style.removeProperty('--egg-' + k);
      });
      tidyRootStyle();
      clearTimeout(this.transitionTimer);
      this.transitionTimer = setTimeout(function () {
        root.classList.remove('egg-colors-transition');
      }, 600);
      setPressed(this);
    }
  };
  eggs.push(colors);

  /* ====================================================================== */

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildControls);
  else buildControls();
})();
