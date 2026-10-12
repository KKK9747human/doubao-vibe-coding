(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var deviceTouch = "ontouchstart" in window;

  /* ---------- open curtain on load ---------- */
  window.setTimeout(function () {
    var hero = document.getElementById("hero");
    if (hero) hero.classList.add("on");
  }, 160);

  /* ---------- 背景切换：城市只给首屏，往下露出字符乱码墙 ----------
     两段动图都常驻在 DOM 里（换 src 会重新解码、会闪），
     这里只切换 html 上的一个 class，由 CSS 控制谁可见。
     用 hero 的实际位置判断，不依赖别的模块何时加 class——
     之前踩过坑：依赖后加的 class，读到的一直是旧值。 */
  (function bgSwap() {
    var hero = document.getElementById("hero");
    if (!hero) return;
    var on = null;
    function sync() {
      var now = hero.getBoundingClientRect().bottom > window.innerHeight * 0.3;
      if (now === on) return;
      on = now;
      document.documentElement.classList.toggle("on-hero", now);
    }
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  })();

  /* ---------- page activation: reveal / fade ---------- */
  function pages() {
    var list = [].slice.call(document.querySelectorAll(".screen"));
    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      list.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var wasA = el.classList.contains("active");
        var active =
          r.top < vh * (wasA ? 0.62 : 0.5) &&
          r.bottom > vh * (wasA ? 0.04 : 0.12);
        var out = r.bottom < vh * 0.38 && r.top < -vh * 0.1 && !active;
        el.classList.toggle("active", active);
        el.classList.toggle("out", out);
      });
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------- reveal on scroll ---------- */
  var staggerTargets = ".members li, .timeline li, .tracks li, .honors li, .keyword-list span";

  function revealObserver() {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.classList.add("in");
          if (el.classList.contains("screen")) el.classList.add("on");
          /* 幕布只在首屏开场放一次。原来 .on 会加到每个 screen 上，
             于是每翻一页幕布都重播 —— 那正是「翻页时一块灰色长方形
             挡一下再离开」。这里只给 hero 挂 curtain，CSS 也只在
             这个 class 上做动画。 */
          if (el.id === "hero") el.classList.add("curtain");
          observer.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      observer.observe(el);
    });

    document.querySelectorAll(".screen").forEach(function (el) {
      if (el.id !== "hero") observer.observe(el);
    });

    document.querySelectorAll(staggerTargets).forEach(function (el) {
      var idx = 0;
      var sib = el.previousElementSibling;
      while (sib) { idx++; sib = sib.previousElementSibling; }
      el.style.transitionDelay = Math.min(idx * 0.09, 1.2).toFixed(2) + "s";
      observer.observe(el);
    });
  }

  /* ---------- parallax ---------- */
  function parallax() {
    var items = [].slice.call(document.querySelectorAll("[data-depth]"));
    var ticking = false;
    var vh = window.innerHeight;

    function update() {
      items.forEach(function (el) {
        var depth = parseFloat(el.getAttribute("data-depth")) || 0;
        var rect = el.getBoundingClientRect();
        var center = rect.top + rect.height / 2 - vh / 2;
        var maxT = el.offsetHeight * 0.08;
        var t = -center * depth;
        if (t > maxT) t = maxT;
        if (t < -maxT) t = -maxT;
        el.style.transform = "translate3d(0," + t.toFixed(1) + "px,0)";
      });
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ---------- progress rail ---------- */
  function progress() {
    var fill = document.getElementById("railFill");
    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      fill.style.height = pct.toFixed(2) + "%";
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ---------- active dot ---------- */
  function dots() {
    var dots = [].slice.call(document.querySelectorAll(".dot"));
    var sections = ["hero", "chapter1", "chapter2", "chapter3", "chapter4", "chapter5", "guitar"].map(function (id) {
      return document.getElementById(id);
    });
    var ticking = false;
    var vh = window.innerHeight;

    function update() {
      var scrollY = window.scrollY;
      var active = 0;
      sections.forEach(function (sec, idx) {
        if (sec && sec.offsetTop <= scrollY + vh * 0.5) active = idx;
      });
      dots.forEach(function (d, i) {
        d.classList.toggle("active", i === active);
      });
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ---------- smooth anchor (custom, with easing) ---------- */
  function smoothScroll() {
    var links = [].slice.call(document.querySelectorAll('a[href^="#"]'));
    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var start = window.scrollY;
        var end = target.getBoundingClientRect().top + start;
        var dur = Math.min(Math.abs(end - start) * 0.06 + 380, 1500);
        var t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          window.scrollTo(0, start + (end - start) * ease);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    });
  }

  /* ---------- marquee runtime half-width ---------- */
  function marquee() {
    var track = document.querySelector(".marquee-track");
    if (!track) return;
    var half = track.innerHTML;
    track.innerHTML += half;
  }

  /* ---------- chapter titles: typewriter ---------- */
  function splitTitles() {
    document.querySelectorAll(".chap-title").forEach(function (h) {
      if (h.querySelector(".ct-char")) return;
      var txt = h.textContent.trim();
      h.textContent = "";
      txt.split("").forEach(function (c, i) {
        var s = document.createElement("span");
        s.className = "ct-char";
        s.textContent = c === " " ? "\u00A0" : c;
        s.style.animationDelay = (0.05 + i * 0.07).toFixed(2) + "s";
        h.appendChild(s);
      });
    });
  }

  /* ---------- red dust canvas ---------- */
  function dust() {
    var canvas = document.getElementById("dust");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, count = 90, parts = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function newP(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + Math.random() * h * 0.3,
        r: 0.6 + Math.random() * 1.9,
        vy: 0.14 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.22,
        o: 0.05 + Math.random() * 0.2,
        ph: Math.random() * Math.PI * 2,
        tp: 0.5 + Math.random() * 1.5
      };
    }
    for (var i = 0; i < count; i++) parts.push(newP(true));

    var raf = null, tPrev = performance.now();
    function tick(now) {
      /* 音游叠层打开时这张画布已经被 CSS 藏掉，别继续白画 90 个圆 */
      if (document.documentElement.classList.contains("nf-open")) {
        tPrev = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      var dt = Math.min(50, now - tPrev); tPrev = now;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy * (dt / 16.7);
        p.x += p.vx * (dt / 16.7) + Math.sin(now * 0.001 + p.ph) * 0.08;
        if (p.y < -8) { parts[i] = newP(false); continue; }
        var tw = 0.55 + 0.45 * Math.sin(now * 0.001 * p.tp + p.ph);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(166,50,47," + (p.o * tw).toFixed(3) + ")";
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && raf) cancelAnimationFrame(raf);
      else { tPrev = performance.now(); raf = requestAnimationFrame(tick); }
    });
  }

  /* ---------- expandable track detail ---------- */
  function accordion() {
    var items = [].slice.call(document.querySelectorAll(".tracks li"));

    /* 默认展开第一项。
       折叠状态的列表看上去只是一排名单，评委扫一眼未必会去点，
       于是最想让人看到的那条反而被埋了。
       第一条默认摊开，既提示「这里可以点」，又保证第一印象就有内容。 */
    if (items.length) items[0].classList.add("open");

    items.forEach(function (li) {
      li.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        li.classList.toggle("open");
      });
    });
  }

  /* ---------- 结尾彩蛋 ----------
     图不折叠，直接铺出来抓注意力；卡片只是标题条，不需要展开逻辑。
     保留成空函数，只为兼容下面的初始化调用点。 */
  function endingEgg() {
    /* 无折叠行为，故意留空。 */
  }

  /* ---------- 共享电吉他合成器 ----------
     走「暖拨弦」路线：三角波基音 + 低八度衬底 + 微失真的高八度颗粒，
     低通快速下滑抹掉锯齿声，配一段短促的拨片噪声瞬态。
     AudioContext 懒创建（首次出声时），避免自动播放策略拦截。
     指板单音、和弦卡、音游命中音都走它。 */
  function makeSynth() {
    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx = null;

    function ensure() {
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function pluck(freq, vol, delayMs, dur) {
      var c = ensure();
      if (!c) return;
      var t = c.currentTime + (delayMs || 0) / 1000;
      var lenDur = dur || 1.3;
      vol = vol || 1;

      var lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(2600, t);
      lp.frequency.exponentialRampToValueAtTime(240, t + lenDur * 0.85);
      lp.Q.value = 0.8;

      var hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 75;

      var env = c.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.2 * vol, t + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, t + lenDur);

      lp.connect(hp); hp.connect(env); env.connect(c.destination);

      function voice(type, f, g, det) {
        var o = c.createOscillator();
        o.type = type;
        o.frequency.value = f;
        if (det) o.detune.value = det;
        var gn = c.createGain();
        gn.gain.value = g;
        o.connect(gn); gn.connect(lp);
        o.start(t); o.stop(t + lenDur + 0.05);
      }
      voice("triangle", freq, 0.9, 0);
      voice("sine", freq / 2, 0.3, 0);
      voice("sawtooth", freq * 2.02, 0.08 * vol, 10);

      var len = Math.floor(c.sampleRate * 0.028 * vol);
      if (len > 0) {
        var buf = c.createBuffer(1, len, c.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = c.createBufferSource();
        src.buffer = buf;
        var bp = c.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 3200;
        bp.Q.value = 0.7;
        var ng = c.createGain();
        ng.gain.setValueAtTime(0.2 * vol, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        src.connect(bp); bp.connect(ng); ng.connect(hp);
        src.start(t);
      }
    }

    function chord(freqs, power) {
      var gap = 0.016;
      for (var i = 0; i < freqs.length; i++) {
        pluck(freqs[i], power ? 0.9 : 0.7, i * gap * 1000, 1.6);
      }
    }

    return { pluck: pluck, chord: chord };
  }

  var synth = makeSynth();

  /* ---------- 指板：单音 ---------- */
  function fretBoard() {
    var board = document.getElementById("fretBoard");
    if (!board) return;
    board.querySelectorAll(".fb-cell").forEach(function (cell) {
      cell.style.cursor = "pointer";
      cell.addEventListener("click", function () {
        synth.pluck(parseFloat(cell.getAttribute("data-freq")) || 110, 1, 0);
        cell.animate(
          [{ transform: "translateY(0)" }, { transform: "translateY(4px)" }, { transform: "translateY(0)" }],
          { duration: 220, easing: "ease-out" }
        );
      });
    });
  }

  /* ---------- 和弦卡：点按出声，强力和弦更冲 ---------- */
  function riffCards() {
    document.querySelectorAll(".riff").forEach(function (r) {
      r.addEventListener("click", function () {
        var s = r.getAttribute("data-chord");
        if (!s) return;
        var freqs = s.split(",").map(parseFloat);
        synth.chord(freqs, r.classList.contains("pf"));
        r.classList.add("riff-flash");
        setTimeout(function () { r.classList.remove("riff-flash"); }, 500);
      });
    });
  }

  /* ---------- 彩蛋：NEVER FADE AWAY 下落音游 ----------
     谱面：整首歌离线扫一遍，低频/高频分开做起音检测，再按小节实际
     密度选八分还是十六分网格。轨道不是轮流分配，而是跟着音色走：
     底鼓落左手（D/F）、镲和军鼓落右手（J/K），十六分连打自动写成同指
     组的 trill，快段落手指是顺的，不会左右乱跨。
     渲染：音符与特效全画在一张 canvas 上，精灵预渲染 + 对象池，每帧
     只遍历屏幕内的十几个音符，HUD 只在数字变化时写 DOM；连续掉帧会
     自动降 DPR 和粒子数。音符高度按流速反推，保证十六分连打不粘连。 */
  function nfGame() {
    var overlay = document.getElementById("nfOverlay");
    var btn = document.getElementById("eggBtn");
    if (!overlay || !btn) return;

    var AUDIO_SRC = "audio/never-fade-away.mp3";
    var CACHE_KEY = "nfa:onsets:v12";
    var ROLES = ["kick", "snare", "bass", "strum", "hat"];
    var KEYS = [68, 70, 74, 75]; /* D F J K */
    var CODES = ["KeyD", "KeyF", "KeyJ", "KeyK"];
    var JUDGE_RATIO = 0.78; /* 与 CSS .nf-judge 的 top:78% 对齐 */
    var LANES = 4;
    var W_PERFECT = 0.048, W_GOOD = 0.098, W_OK = 0.15, MISS_AFTER = 0.19;

    /* 段内按「网格层级权重 × 起音强度」排序取前 N，N = cap × 段长秒数 */
    var DIFF = {
      /* minGap 按十六分格数算，换速度的歌不会突然挤成一团或散成稀的 */
      easy: { cap: 2.3, maxLevel: 2, minGap: 2.8, chord: false, label: "轻松" },
      normal: { cap: 4.4, maxLevel: 4, minGap: 1.0, chord: true, label: "标准" },
      hard: { cap: 6.8, maxLevel: 4, minGap: 0.68, chord: true, label: "狂暴" }
    };
    var SPEEDS = { slow: 1.3, mid: 0.98, fast: 0.74 };

    function $(id) { return document.getElementById(id); }
    function medianOf(arr) {
      var s = arr.slice().sort(function (a, b) { return a - b; });
      return s[(s.length / 2) | 0];
    }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    /* ---------- 官方 LRC：歌词展示用 ---------- */
    var TS = [
      [0.00, "Never Fade Away (Original Mix) — SAMURAI"],
      [2.08, "We lost everything"],
      [5.55, "We had to pay the price"],
      [8.89, "Yeah we lost everything"],
      [12.16, "We had to pay the price"],
      [26.60, "I saw in you what life was missing"],
      [30.08, "You lit a flame that consumed my hate"],
      [33.45, "I'm not one for reminiscing but"],
      [36.86, "I'd trade it all for your sweet embrace"],
      [39.89, "Yeah"],
      [41.80, "Cause we lost everything"],
      [48.55, "We had to pay the price"],
      [53.78, "There's a canvas with two faces"],
      [56.68, "Of fallen angels who loved and lost"],
      [60.07, "It was a passion for the ages"],
      [63.30, "And in the end guess we paid the cost"],
      [67.18, "A thing of beauty I know"],
      [71.82, "Will never fade away"],
      [73.61, "What you did to me I know"],
      [78.49, "Said what you had to say"],
      [80.16, "But a thing of beauty"],
      [85.20, "Will never fade away"],
      [88.43, "Will never fade away"],
      [91.78, "Will never fade away"],
      [96.87, "I see your eyes I know you see me"],
      [99.96, "You're like a ghost how you're everywhere"],
      [103.36, "I am your demon never leaving"],
      [106.73, "A metal soul of rage and fear"],
      [109.87, "That one thing that changed it all"],
      [116.53, "That one sin that caused the fall"],
      [123.77, "A thing of beauty I know"],
      [128.28, "Will never fade away"],
      [130.33, "What you did to me I know"],
      [135.02, "Said what you had to say"],
      [137.23, "But a thing of beauty I know"],
      [141.89, "Will never fade away"],
      [143.83, "And I'll do my duty I know"],
      [148.49, "Somehow I'll find a way"],
      [150.49, "But a thing of beauty"],
      [155.16, "Will never fade away"],
      [156.79, "And I'll do my duty"],
      [160.02, "Yeah"],
      [161.90, "We'll never fade away"],
      [164.98, "We'll never fade away"],
      [168.46, "We'll never fade away"],
      [171.70, "We'll never fade away"]
    ];

    /* 兜底谱：分析失败时按歌词行铺音符，至少有的玩 */
    var LYRIC_CHART = (function () {
      var list = [], lane = 0, lastT = -1;
      function push(t) {
        if (t - lastT < 0.16) return;
        list.push({ t: t, lane: (lane++ % 4), band: "strum", acc: false });
        lastT = t;
      }
      for (var i = 0; i < TS.length - 1; i++) {
        var a = TS[i][0], b = TS[i + 1][0], gap = b - a;
        if (gap > 4) { for (var j = 1; j <= 5; j++) push(a + (gap / 6) * j); }
        else { if (a > 0.5) push(a); push(a + gap / 2); }
      }
      return list;
    })();

    /* ---------- 特征扫描：逐样本整流 + 平滑，取四条频带的幅度包络 ----------
       一阶低通吐出来的是波形不是包络：24ms 窗口连一个 55Hz 周期都盖不满，
       按窗口算 RMS 得到的是相位毛刺，起音检测就冒出一堆假点。先取绝对值
       再按时间常数平滑，包络才真的表示「这条频段什么时候变响」。
       分频：<90Hz 底鼓，90~250Hz 贝斯，250~1400Hz 吉他/军鼓，>1400Hz 镲。 */
    function scanFeatures(mono, sr) {
      var HOP = Math.max(1, Math.round(sr * 0.008));
      var pea = Math.exp(-1 / (0.022 * sr));
      var p90 = Math.exp(-2 * Math.PI * 90 / sr);
      var p250 = Math.exp(-2 * Math.PI * 250 / sr);
      var p1400 = Math.exp(-2 * Math.PI * 1400 / sr);
      var n = mono.length, frames = [], i;
      var l1 = 0, l2 = 0, l3 = 0, e1 = 0, e2 = 0, e3 = 0, e4 = 0, next = 0;
      for (i = 0; i < n; i++) {
        var x = mono[i];
        l1 = l1 * p90 + x * (1 - p90);
        l2 = l2 * p250 + x * (1 - p250);
        l3 = l3 * p1400 + x * (1 - p1400);
        var a1 = l1 < 0 ? -l1 : l1;
        var a2 = l2 - l1, a3 = l3 - l2, a4 = x - l3;
        if (a2 < 0) a2 = -a2;
        if (a3 < 0) a3 = -a3;
        if (a4 < 0) a4 = -a4;
        e1 = e1 * pea + a1 * (1 - pea);
        e2 = e2 * pea + a2 * (1 - pea);
        e3 = e3 * pea + a3 * (1 - pea);
        e4 = e4 * pea + a4 * (1 - pea);
        if (i >= next) {
          frames.push({ t: i / sr, sub: e1, bl: e2, md: e3, hi: e4, e: e1 + e2 + e3 + e4 });
          next = i + HOP;
        }
      }
      /* 分段能量：±2.2s 滑动均值再归一，副歌和主歌该铺不一样密 */
      var F = frames.length, hs = Math.max(1, Math.round(2.2 / (HOP / sr)));
      var acc = new Float64Array(F + 1);
      for (var k = 0; k < F; k++) acc[k + 1] = acc[k] + frames[k].e;
      var gMed = medianOf(frames.map(function (f) { return f.e; }));
      for (var j = 0; j < F; j++) {
        var a = Math.max(0, j - hs), b = Math.min(F, j + hs);
        frames[j].q = (acc[b] - acc[a]) / (b - a) / gMed;
      }
      return frames;
    }

    /* ---------- 起音：四条频带各自归一、各自挑峰，再按时间合并 ----------
       通量合成一个和的话，底鼓一个顶扫弦五个，军鼓和吉他根本进不了候选；
       分带挑峰之后谁响谁说话。 */
    function detectOnsets(frames) {
      var F = frames.length, i, b;
      var KEY = ["sub", "bl", "md", "hi"], GAIN = { sub: 1.7, bl: 1.8, md: 1.9, hi: 2.1 };
      var nv = {};
      for (b = 0; b < 4; b++) {
        var k = KEY[b], raw = new Float32Array(F);
        for (i = 1; i < F; i++) {
          var dv = frames[i][k] - frames[i - 1][k];
          raw[i] = dv > 0 ? dv : 0;
        }
        var mm = medianOf([].slice.call(raw)) + 1e-9;
        var arr = new Float32Array(F);
        for (i = 1; i < F; i++) arr[i] = raw[i] / mm;
        nv[k] = arr;
      }
      var cand = [];
      for (b = 0; b < 4; b++) {
        var kk = KEY[b], a = nv[kk], win = [];
        for (i = 5; i < F - 2; i++) {
          win.push(a[i]);
          if (win.length > 56) win.shift();
          if (win.length < 56) continue;
          if (frames[i].q < 0.34) continue; /* 前奏尾奏的安静段别乱冒音符 */
          if (!(a[i] >= a[i - 1] && a[i] >= a[i - 2] && a[i] > a[i + 1] && a[i] > a[i - 4])) continue;
          /* 光看相对通量不够：包络得真的比起音前高出一截才算一次落点 */
          if (a[i] > Math.max(medianOf(win), 0.85) * GAIN[kk] && frames[i][kk] > frames[i - 6][kk] * 1.25) {
            cand.push({ i: i, b: kk, v: a[i] });
          }
        }
      }
      cand.sort(function (x, y) { return x.i - y.i; });
      /* 一记鼓会在几个频带同时冒头：32ms 内并成一个，最强带做主 */
      var out = [], ci = 0;
      while (ci < cand.length) {
        var i0 = cand[ci].i, t0 = frames[i0].t, cj = ci, grp = { sub: 0, bl: 0, md: 0, hi: 0 };
        while (cj < cand.length && frames[cand[cj].i].t - t0 < 0.032) {
          var bb = cand[cj].b;
          if (cand[cj].v > grp[bb]) grp[bb] = cand[cj].v;
          cj++;
        }
        ci = cj;
        var ns = grp.sub, nb = grp.bl, nm = grp.md, nh = grp.hi * 0.9;
        var tot = ns + nb + nm + nh + 1e-9;
        /* 衰减：峰值之后 90ms 还剩多少（相对起音前的底）。鼓说完就停，
           贝斯和扫弦的弦鸣一直响——这是把鼓与弦分开的主线索。 */
        function decay(key) {
          var pk = frames[i0][key], base = frames[Math.max(0, i0 - 6)][key];
          var den = pk - base;
          if (den <= 1e-7) return 1;
          var after = frames[Math.min(F - 1, i0 + 12)][key];
          return Math.max(0, Math.min(3, (after - base) / den));
        }
        var dS = decay("sub"), dM = decay("md");
        /* 低频占比定「谁在响」，衰减定「鼓还是弦」：军鼓的基频也压在低带，
           只挑最强带会把整排鼓点数成贝斯，两条一起用才分得开。 */
        var low = (ns + nb) / tot;
        var role;
        if (low > 0.72) role = dS < 0.6 ? "kick" : "bass";
        else if (low > 0.45) role = dM < 0.6 ? "snare" : "strum";
        else role = (nh > nm && dM < 0.4) ? "hat" : "strum";
        out.push({ t: t0, s: Math.max(ns, nm, nh, nb), w: +low.toFixed(3), r: role, q: frames[i0].q });
      }
      return out;
    }

    /* ---------- 节拍网格：97~200 BPM 全扫，取贴住最多起音的拍子和相位 ---------- */
    function estimateGrid(onset) {
      if (onset.length < 8) return null;
      /* 中位间隔靠不住：分频段抓峰之后起音密到几十毫秒一对，样本全被筛光。
         所以 97~200 BPM 直接全扫一遍，取能把最多起音压进格点（±12% 格）
         的那一档。偏 3% 的拍子攒几十小节就是整整一格错位，音符会开始跟鼓打架。 */
      var best = { s: -1, c: 1e9, beat: 0.42, off: 0 };
      for (var bc = 0.3; bc <= 0.62; bc += 0.002) {
        var step = bc / 4;
        for (var off = 0; off < step; off += 0.004) {
          var c = 0, tight = 0;
          for (var k = 0; k < onset.length; k++) {
            var pos = (onset[k].t - off) / step;
            var dr = Math.abs(pos - Math.round(pos));
            c += dr;
            if (dr < 0.12) tight++;
          }
          if (tight > best.s + 4 || (Math.abs(tight - best.s) <= 4 && c < best.c)) {
            best = { s: tight, c: c, beat: bc, off: off };
          }
        }
      }
      return { step16: best.beat / 4, off: best.off, beat: best.beat };
    }
    /* ---------- 编排：起音贴网格 → 分段取前 N → 层级+音色分轨 ----------
       层级 1=小节头 2=正拍 3=八分反拍 4=十六分。每 4 小节一段，段内按
       「起音强度 × 层级加成 × 段落能量」排序，只取前 N 个（N = 密度上限
       × 段长秒数）。这样主歌自动稀、副歌自动密，十六分只出现在真正咬得
       紧的地方，而不是像纯起音跟随那样满屏连打。 */
    var lastChartGap = 0.2;
    var LVL_BOOST = { 1: 1.9, 2: 1.5, 3: 1.0, 4: 0.6 };
    /* 鼓点最该被敲到，贝斯和扫弦其次，镲与齿音只当填充 */
    var ROLE_W = { kick: 1.4, snare: 1.35, bass: 1.3, strum: 1.25, hat: 0.5 };
    function wt(c) { return c.s * LVL_BOOST[c.lv] * (ROLE_W[c.r] || 1); }
    /* 左手管底鼓贝斯，右手管军鼓镲，吉他扫弦走中间两道 */
    function famOf(role, back) {
      if (role === "kick") return [0, 1];
      if (role === "bass") return [1, 2];
      if (role === "snare" || role === "hat") return [2, 3];
      return back ? [2, 3] : [1, 2];
    }

    function levelOf(cell) {
      var p = cell % 16;
      if (p === 0) return 1;
      if (p % 4 === 0) return 2;
      if (p % 2 === 0) return 3;
      return 4;
    }

    function buildChart(onset, grid, diffKey) {
      var cfg = DIFF[diffKey];
      var step = grid.step16;
      var i;
      var sMed = medianOf(onset.map(function (x) { return x.s; })) + 1e-9;

      /* 1) 吸附到十六分网格，一格只留最强 */
      var cells = {};
      for (i = 0; i < onset.length; i++) {
        var o = onset[i];
        if (o.t < 1.6) continue; /* 开局留一拍反应时间 */
        var pos = (o.t - grid.off) / step;
        var idx = Math.round(pos);
        if (idx < 0 || Math.abs(pos - idx) > 0.34) continue;
        var rel = o.s / sMed;
        if (!cells[idx] || rel > cells[idx].s) {
          cells[idx] = { cell: idx, t: grid.off + idx * step, s: rel, w: o.w, r: o.r, q: o.q, lv: levelOf(idx) };
        }
      }
      var list = [];
      for (var key in cells) list.push(cells[key]);
      list.sort(function (a, b) { return a.cell - b.cell; });

      /* 2) 每 4 小节一段，段内按权重取前 N */
      var SEG = 64, segDur = SEG * step;
      var picked = [], seg = [], segQ = 0;
      function flush() {
        if (!seg.length) return;
        var qAvg = segQ / seg.length;
        var n = Math.round(segDur * cfg.cap * clamp(qAvg, 0.45, 1.25));
        var pool = seg.filter(function (c) { return c.lv <= cfg.maxLevel; });
        if (pool.length > n) {
          pool = pool.slice().sort(function (a, b) { return wt(b) - wt(a); }).slice(0, n);
        }
        pool.sort(function (a, b) { return a.cell - b.cell; });
        picked = picked.concat(pool);
        seg = [];
        segQ = 0;
      }
      for (i = 0; i < list.length; i++) {
        var c = list[i];
        if (seg.length && Math.floor(c.cell / SEG) !== Math.floor(seg[0].cell / SEG)) flush();
        seg.push(c);
        segQ += c.q;
      }
      flush();

      /* 3) 最小间距：挨太近的次强音去掉 */
      var kept = [];
      for (i = 0; i < picked.length; i++) {
        var k = picked[i];
        if (kept.length && k.t - kept[kept.length - 1].t < cfg.minGap * step) {
          var last = kept[kept.length - 1];
          if (wt(k) > wt(last) * 1.5) kept[kept.length - 1] = k;
          continue;
        }
        kept.push(k);
      }

      /* 4) 轨道：正拍跟音色走（底鼓左手、二四拍军鼓右手、八分反拍交中间两道），
          十六分顺着上一步的方向左右爬——连打写成楼梯，手指顺，也不会跨手跳崖 */
      var laneOf = -1, dir = 1, prevT = -1e9, minGap = 1e9, chordT = -1e9;
      var notes = [];
      for (i = 0; i < kept.length; i++) {
        var q2 = kept[i];
        var gap = q2.t - prevT;
        if (i && gap < minGap) minGap = gap;
        var p = q2.cell % 16;
        var band = q2.r || (q2.w > 0.6 ? "kick" : q2.w < 0.4 ? "hat" : "strum");
        var back = p === 4 || p === 12;
        var lane;
        if (q2.lv === 4) {
          lane = laneOf + dir;
          if (lane < 0 || lane > LANES - 1) { dir = -dir; lane = laneOf + dir; }
        } else {
          var fam = q2.lv <= 2 ? famOf(band, back) : [1, 2];
          lane = fam.indexOf(laneOf) >= 0 ? (fam[0] === laneOf ? fam[1] : fam[0]) : fam[i % 2];
          if (lane === laneOf) lane = fam[0] === laneOf ? fam[1] : fam[0];
          dir = lane > laneOf ? 1 : lane < laneOf ? -1 : dir;
        }
        lane = clamp(lane, 0, LANES - 1);
        if (lane === laneOf && gap < step * 1.2) lane = clamp(laneOf === 0 ? 1 : laneOf - 1, 0, LANES - 1);
        if (lane === 0) dir = 1;
        if (lane === LANES - 1) dir = -1;
        notes.push({ t: q2.t, lane: lane, band: band, acc: q2.lv === 1, drum: band === "kick" || band === "snare" });
        /* 高潮小节头给一记双手和弦：砸下去有落点。只在前后都留得起空隙时加，
           连打段不掺和弦，否则一只手要连点两下，手感立刻发涩。 */
        if (cfg.chord && q2.lv === 1 && q2.q > 0.9 && q2.t - chordT > grid.beat * 4 && gap > step * 2) {
          var nx = kept[i + 1];
          if (nx && nx.t - q2.t > step * 2) {
            chordT = q2.t;
            notes.push({
              t: q2.t,
              lane: clamp(lane < LANES / 2 ? lane + LANES / 2 : lane - LANES / 2, 0, LANES - 1),
              band: band === "kick" ? "bass" : band === "bass" ? "strum" : band,
              acc: false
            });
          }
        }
        laneOf = lane;
        prevT = q2.t;
      }
      lastChartGap = notes.length > 1 ? Math.max(0.05, minGap) : grid.step16 * 2;
      return notes;
    }

    window.__nfa = { scan: scanFeatures, detect: detectOnsets, grid: estimateGrid, build: buildChart, ROLES: ROLES, DIFF: DIFF };

    /* ---------- 分析（起音表缓存到 localStorage，重开秒进） ---------- */
    var analysis = { chart: null, onset: null, grid: null, promise: null, ctx: null };

    function chartFor(diffKey) {
      if (!analysis.onset || !analysis.grid) return null;
      analysis.chart = buildChart(analysis.onset, analysis.grid, diffKey);
      return analysis.chart;
    }

    function ensureChart(diffKey) {
      if (analysis.onset && analysis.grid) return Promise.resolve(chartFor(diffKey));
      if (analysis.promise) {
        return analysis.promise.then(function () { return chartFor(diffKey); });
      }
      analysis.promise = new Promise(function (resolve) {
        function done(onset, grid) {
          analysis.onset = onset;
          analysis.grid = grid;
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              o: onset.map(function (x) {
                return [Math.round(x.t * 1000) / 1000, Math.round(x.s * 1000) / 1000,
                        Math.round(x.w * 100) / 100, Math.round(x.q * 100) / 100,
                        ROLES.indexOf(x.r)];
              }),
              g: grid
            }));
          } catch (e) {}
          resolve(chartFor(diffKey));
        }
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { cached = null; }
        if (cached && cached.g && cached.o && cached.o.length > 30) {
          done(cached.o.map(function (x) { return { t: x[0], s: x[1], w: x[2], q: x[3], r: ROLES[x[4]] }; }), cached.g);
          return;
        }
        console.log("NFA_STAGE start", CACHE_KEY, !!cached);
        fetch(AUDIO_SRC)
          .then(function (r) { return r.arrayBuffer(); })
          .then(function (buf) {
            if (!analysis.ctx) analysis.ctx = new (window.AudioContext || window.webkitAudioContext)();
            return analysis.ctx.decodeAudioData(buf);
          })
          .then(function (ab) {
            var sr = ab.sampleRate, n = ab.length; console.log("NFA_STAGE decoded", sr, n);
            var mono = new Float32Array(n);
            for (var ch = 0; ch < ab.numberOfChannels; ch++) {
              var d = ab.getChannelData(ch);
              for (var i = 0; i < n; i++) mono[i] += d[i] / ab.numberOfChannels;
            }
            var onset = detectOnsets(scanFeatures(mono, sr)); console.log("NFA_STAGE onset", onset.length);
            var grid = estimateGrid(onset); console.log("NFA_STAGE grid", grid && grid.beat);
            if (grid && onset.length >= 30) done(onset, grid);
            else resolve(null);
          })
          .catch(function (err) { console.error("NFA_ANALYZE_FAIL", err && (err.stack || err)); resolve(null); });
      });
      return analysis.promise;
    }

    /* ---------- DOM ---------- */
    var cvs = $("nfCanvas");
    var c2 = cvs.getContext("2d");
    var elCache = {
      menu: $("nfMenu"),
      result: $("nfResult"),
      arena: $("nfArena"),
      feed: $("nfFeed"),
      lyric: $("nfLyric"),
      pause: $("nfPause"),
      info: $("nfChartInfo")
    };
    var hudEls = {
      score: $("nfScore"), combo: $("nfCombo"), acc: $("nfAcc"),
      perf: $("nfPerf"), good: $("nfGood"), ok: $("nfOk"), miss: $("nfMiss"),
      total: $("nfTotal"), prog: $("nfProg"), fps: $("nfFps")
    };

    var prefs = (function () {
      var p = { diff: "normal", speed: "mid", offset: 0 };
      try {
        var s = JSON.parse(localStorage.getItem("nfa:prefs") || "null");
        if (s) {
          if (DIFF[s.diff]) p.diff = s.diff;
          if (SPEEDS[s.speed]) p.speed = s.speed;
          p.offset = clamp(+s.offset || 0, -120, 120);
        }
      } catch (e) {}
      return p;
    })();
    function savePrefs() {
      try { localStorage.setItem("nfa:prefs", JSON.stringify(prefs)); } catch (e) {}
    }

    /* ---------- 几何与精灵 ---------- */
    var geo = { w: 0, h: 0, dpr: 1, laneW: 0, judgeY: 0, noteH: 22 };
    var sprites = null, quality = 2; /* 2 高 1 中 0 低 */
    var PALETTE = {
      kick: ["#ff2a5f", "255,42,95"],
      snare: ["#ff8a3d", "255,138,61"],
      bass: ["#9d5cff", "157,92,255"],
      strum: ["#f2ede3", "242,237,227"],
      hat: ["#00e5ff", "0,229,255"]
    };

    function measure() {
      var r = elCache.arena.getBoundingClientRect();
      geo.w = Math.max(120, Math.round(r.width));
      geo.h = Math.max(200, Math.round(r.height));
      geo.dpr = clamp(window.devicePixelRatio || 1, 1, quality >= 2 ? 2 : 1);
      cvs.width = Math.round(geo.w * geo.dpr);
      cvs.height = Math.round(geo.h * geo.dpr);
      cvs.style.width = geo.w + "px";
      cvs.style.height = geo.h + "px";
      c2.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
      geo.laneW = geo.w / LANES;
      geo.judgeY = geo.h * JUDGE_RATIO;
      /* 音符高度按「同轨最小间距」反推：十六分连打必须看得清 */
      var px = geo.judgeY * (lastChartGap / leadTime());
      geo.noteH = clamp(px * 0.62, 11, 24);
      buildSprites();
    }

    function leadTime() { return SPEEDS[prefs.speed]; }

    function roundedRect(g, x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.lineTo(x + w - r, y);
      g.quadraticCurveTo(x + w, y, x + w, y + r);
      g.lineTo(x + w, y + h - r);
      g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      g.lineTo(x + r, y + h);
      g.quadraticCurveTo(x, y + h, x, y + h - r);
      g.lineTo(x, y + r);
      g.quadraticCurveTo(x, y, x + r, y);
      g.closePath();
    }

    /* 每种音色 × 是否重音各预渲染一张带辉光的精灵，热循环里只剩 drawImage */
    function buildSprites() {
      sprites = {};
      var nw = Math.max(22, Math.round(geo.laneW * 0.72));
      var pad = Math.round(nw * 0.3);
      var accH = Math.min(nw * 0.5, geo.noteH + 7);
      ["kick", "snare", "bass", "strum", "hat"].forEach(function (band) {
        var drum = band === "kick" || band === "snare";
        [false, true].forEach(function (acc) {
          var h = (acc ? accH : geo.noteH) * (drum ? 1.3 : 1);
          var cv = document.createElement("canvas");
          cv.width = Math.ceil((nw + pad * 2) * geo.dpr);
          cv.height = Math.ceil((h + pad * 2) * geo.dpr);
          var g = cv.getContext("2d");
          g.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
          var rgb = PALETTE[band][1];
          g.shadowColor = "rgba(" + rgb + ",.85)";
          g.shadowBlur = (drum ? 1.5 : 1) * (acc ? 16 : 10);
          var grd = g.createLinearGradient(0, 0, 0, h);
          grd.addColorStop(0, "rgba(" + rgb + "," + (drum ? ".96" : ".8") + ")");
          grd.addColorStop(1, "rgba(" + rgb + "," + (drum ? ".34" : ".14") + ")");
          g.fillStyle = grd;
          roundedRect(g, pad, pad, nw, h, 3);
          g.fill();
          g.shadowBlur = 0;
          g.strokeStyle = PALETTE[band][0];
          g.lineWidth = acc || drum ? 1.6 : 1;
          roundedRect(g, pad, pad, nw, h, 3);
          g.stroke();
          if (acc) {
            g.fillStyle = "rgba(252,238,10,.92)";
            g.fillRect(pad + 2, pad + h - 2.5, nw - 4, 2);
          }
          sprites[band + (acc ? "1" : "0")] = {
            cv: cv, sw: nw + pad * 2, sh: h + pad * 2, nw: nw, nh: h, pad: pad
          };
        });
      });
      var pc = document.createElement("canvas");
      pc.width = pc.height = 32;
      var pg = pc.getContext("2d");
      var rg = pg.createRadialGradient(16, 16, 0, 16, 16, 16);
      rg.addColorStop(0, "rgba(255,255,255,.95)");
      rg.addColorStop(0.4, "rgba(255,255,255,.3)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      pg.fillStyle = rg;
      pg.fillRect(0, 0, 32, 32);
      sprites.spark = pc;
    }

    /* ---------- 运行状态 ---------- */
    var audio = null, raf = 0, running = false, paused = false, ending = false, locked = false;
    var st = null;
    var sparks = [], rings = [], sparkPool = [];
    var MAX_SPARK = [40, 120, 260];
    var laneHold = [0, 0, 0, 0];
    var audioCtx = null, sfxGain = null;

    function ensureSfx() {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.32;
        sfxGain.connect(audioCtx.destination);
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }

    /* 命中音：两个节点搞定，密集段落也不压音频线程 */
    function sfx(freq, dur, vol, type) {
      var c = ensureSfx();
      if (!c) return;
      var t = c.currentTime;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || "triangle";
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + dur + 0.02);
    }

    function pauseBg() {
      document.querySelectorAll("video.bgwall,video.bgloop").forEach(function (v) {
        if (v && !v.paused) v.pause();
      });
    }
    function resumeBg() {
      document.querySelectorAll("video.bgwall,video.bgloop").forEach(function (v) {
        if (v) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      });
    }

    function announce() {
      if (!elCache.info) return;
      if (!analysis.onset) { elCache.info.textContent = "正在扫描鼓点…"; return; }
      var g = analysis.grid;
      elCache.info.textContent =
        Math.round(60 / g.beat) + " BPM · " + DIFF[prefs.diff].label + " " +
        (analysis.chart ? analysis.chart.length : 0) + " 音符 · 缓存已就绪";
    }

    function openOverlay() {
      overlay.classList.add("open");
      document.documentElement.classList.add("nf-open");
      elCache.menu.style.display = "flex";
      elCache.result.classList.remove("open");
      pauseBg();
      requestAnimationFrame(measure);
      announce();
      ensureChart(prefs.diff).then(function (chart) {
        announce();
        if (chart && !analysis.onset) elCache.info.textContent = "谱面就绪";
      });
    }
    function closeOverlay() {
      closeRun();
      overlay.classList.remove("open");
      document.documentElement.classList.remove("nf-open");
      resumeBg();
    }

    btn.addEventListener("click", openOverlay);
    $("nfClose").addEventListener("click", closeOverlay);
    $("nfClose2").addEventListener("click", closeOverlay);
    $("nfStart").addEventListener("click", function () { startRun(); });
    $("nfReplay").addEventListener("click", function () { startRun(); });

    function bindSeg(id, onPick) {
      var box = $(id);
      if (!box) return;
      box.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("button") : null;
        if (!b) return;
        [].forEach.call(box.querySelectorAll("button"), function (x) { x.classList.toggle("on", x === b); });
        onPick(b.getAttribute("data-v"));
      });
    }
    bindSeg("nfDiff", function (v) {
      prefs.diff = v; savePrefs();
      ensureChart(v).then(announce);
    });
    bindSeg("nfSpeed", function (v) {
      prefs.speed = v; savePrefs();
      if (overlay.classList.contains("open")) measure();
    });
    var offInput = $("nfOff"), offVal = $("nfOffVal");
    if (offInput) {
      offInput.value = prefs.offset;
      if (offVal) offVal.textContent = prefs.offset + "ms";
      offInput.addEventListener("input", function () {
        prefs.offset = clamp(+offInput.value || 0, -120, 120);
        if (offVal) offVal.textContent = (prefs.offset > 0 ? "+" : "") + prefs.offset + "ms";
        savePrefs();
      });
    }
    ["nfDiff", "nfSpeed"].forEach(function (id) {
      var box = $(id);
      if (!box) return;
      var want = id === "nfDiff" ? prefs.diff : prefs.speed;
      [].forEach.call(box.querySelectorAll("button"), function (b) {
        b.classList.toggle("on", b.getAttribute("data-v") === want);
      });
    });
    if (offVal) offVal.textContent = (prefs.offset > 0 ? "+" : "") + prefs.offset + "ms";

    function setupAudio() {
      audio = document.createElement("audio");
      audio.src = AUDIO_SRC;
      audio.preload = "auto";
      audio.addEventListener("ended", function () { ending = true; });
    }

    function closeRun() {
      cancelAnimationFrame(raf);
      running = false;
      paused = false;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      audio = null;
      st = null;
      sparks.length = 0;
      rings.length = 0;
      if (c2) c2.clearRect(0, 0, geo.w, geo.h);
    }

    function startRun() {
      if (locked || !overlay.classList.contains("open")) return;
      locked = true;
      closeRun();
      ensureChart(prefs.diff).then(function (chart) {
        if (!overlay.classList.contains("open")) { locked = false; return; }
        launchRun(chart || LYRIC_CHART);
      });
    }

    function launchRun(chart) {
      setupAudio();
      st = {
        notes: chart,
        from: 0, started: false, lyricIdx: -1,
        lead: leadTime(),
        offset: prefs.offset / 1000,
        sampleT: 0, sampleAt: 0, t0: performance.now(),
        score: 0, combo: 0, maxCombo: 0,
        perfect: 0, good: 0, ok: 0, miss: 0, judged: 0,
        hud: {}, dtAvg: 16.7, degradeAt: 0
      };
      elCache.menu.style.display = "none";
      elCache.result.classList.remove("open");
      if (elCache.pause) elCache.pause.classList.remove("open");
      measure();
      running = true; ending = false; paused = false;
      lastFrame = performance.now();
      audio.play().then(function () {
        locked = false;
      }).catch(function () {
        locked = false;
        running = false;
        elCache.menu.style.display = "flex";
      });
      raf = requestAnimationFrame(loop);
    }

    /* 媒体时钟 + performance.now 插值：按下瞬间的时间比 currentTime 新鲜 */
    function clockT() {
      if (!audio || !st) return 0;
      var d = (performance.now() - st.sampleAt) / 1000;
      if (d < 0 || d > 0.2) d = 0;
      return st.sampleT + d + st.offset;
    }

    var lastFrame = 0, fpsCount = 0, fpsAt = 0, fpsShown = -1;

    function loop(now) {
      if (!running) return;
      var dt = now - lastFrame;
      lastFrame = now;
      if (dt > 0 && dt < 200 && !document.hidden) {
        st.dtAvg = st.dtAvg * 0.9 + dt * 0.1;
        /* 自适应画质：连续掉帧就降 DPR 与粒子，卡顿不留给手感。
           后台标签页的 rAF 节流不算掉帧，否则切回来画质就永久低了。 */
        if (1000 / st.dtAvg < 44) st.slow++; else st.slow = 0;
        if (st.slow > 45 && quality > 0 && now - st.degradeAt > 3000) {
          st.degradeAt = now;
          st.slow = 0;
          quality--;
          measure();
        }
      }
      if (ending) { finish(); return; }
      if (audio) {
        st.sampleT = audio.currentTime;
        st.sampleAt = performance.now();
      }
      if (!st.started) {
        if (st.sampleT > 0.04 || now - st.t0 > 1200) st.started = true;
        else { raf = requestAnimationFrame(loop); return; }
      }
      if (paused) { raf = requestAnimationFrame(loop); return; }
      draw(st.sampleT, dt);
      raf = requestAnimationFrame(loop);
    }

    /* ---------- 绘制 ---------- */
    function draw(t, dt) {
      var notes = st.notes, lead = st.lead, i, n;
      c2.clearRect(0, 0, geo.w, geo.h);

      /* 按下的轨道光柱 */
      for (var l = 0; l < LANES; l++) {
        if (laneHold[l] <= 0) continue;
        laneHold[l] = Math.max(0, laneHold[l] - dt / 240);
        c2.globalAlpha = laneHold[l] * 0.2;
        c2.fillStyle = "#00e5ff";
        c2.fillRect(l * geo.laneW, 0, geo.laneW, geo.h);
      }
      c2.globalAlpha = 1;

      /* 音符：只遍历屏幕窗口内的一段 */
      for (i = st.from; i < notes.length; i++) {
        n = notes[i];
        var left = n.t - t;
        if (left > lead) break;
        if (n.hit) continue;
        if (left < -MISS_AFTER && !n.dead) missNote(n);
        if (left < -0.5) { st.from = i + 1; continue; }
        var sp = sprites[n.band + (n.acc ? "1" : "0")] || sprites.strum0;
        var yc = geo.judgeY * (1 - left / lead);
        var y = yc - sp.nh / 2 - sp.pad;
        if (y + sp.sh < 0) continue;
        var x = n.lane * geo.laneW + (geo.laneW - sp.sw) / 2;
        if (n.dead) c2.globalAlpha = clamp(1 - (-left - MISS_AFTER) / 0.3, 0, 1);
        c2.drawImage(sp.cv, x, y, sp.sw, sp.sh);
        if (n.dead) c2.globalAlpha = 1;
      }

      /* 命中环 */
      c2.lineWidth = 2;
      for (var r = rings.length - 1; r >= 0; r--) {
        var ring = rings[r];
        ring.p += dt / ring.life;
        if (ring.p >= 1) { rings.splice(r, 1); continue; }
        c2.globalAlpha = (1 - ring.p) * (ring.big ? 0.8 : 0.55);
        c2.strokeStyle = ring.col;
        c2.lineWidth = ring.big ? 3 : 2;
        c2.beginPath();
        c2.arc(ring.x, geo.judgeY, 10 + ring.p * (ring.big ? 96 : 44), 0, Math.PI * 2);
        c2.stroke();
      }

      /* 粒子：加色混合 */
      if (quality > 0 && sparks.length) {
        c2.globalCompositeOperation = "lighter";
        for (var s = sparks.length - 1; s >= 0; s--) {
          var p = sparks[s];
          p.life -= dt / p.dur;
          if (p.life <= 0) {
            if (sparkPool.length < 240) sparkPool.push(p);
            sparks.splice(s, 1);
            continue;
          }
          p.x += p.vx * dt / 16.7;
          p.y += p.vy * dt / 16.7;
          p.vy += 0.13 * dt / 16.7;
          c2.globalAlpha = p.life * 0.8;
          var sz = p.size * (0.55 + p.life * 0.7);
          c2.drawImage(sprites.spark, p.x - sz / 2, p.y - sz / 2, sz, sz);
        }
        c2.globalCompositeOperation = "source-over";
      }
      c2.globalAlpha = 1;

      refreshHud(t);
      refreshLyric(t);
    }

    function spawnSparks(x, amount) {
      if (quality === 0) return;
      var cap = MAX_SPARK[quality];
      for (var i = 0; i < amount && sparks.length < cap; i++) {
        var p = sparkPool.pop() || {};
        p.x = x;
        p.y = geo.judgeY;
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
        var sp = 1.6 + Math.random() * 4.2;
        p.vx = Math.cos(ang) * sp;
        p.vy = Math.sin(ang) * sp;
        p.size = 5 + Math.random() * 9;
        p.dur = 250 + Math.random() * 250;
        p.life = 1;
        sparks.push(p);
      }
    }

    function laneX(lane) { return lane * geo.laneW + geo.laneW / 2; }

    /* ---------- 判定 ---------- */
    function hit(lane) {
      if (!running || paused || !st || !st.started) return;
      var t = clockT();
      var best = null, bd = 1e9;
      for (var i = st.from; i < st.notes.length; i++) {
        var n = st.notes[i];
        if (n.t - t > W_OK) break;
        if (n.hit || n.dead || n.lane !== lane) continue;
        var d = Math.abs(n.t - t);
        if (d < bd) { bd = d; best = n; }
      }
      if (!best || bd > W_OK) return;
      var grade = bd <= W_PERFECT ? "perfect" : bd <= W_GOOD ? "good" : "ok";
      best.hit = true;
      st.judged++;
      st.combo++;
      if (st.combo > st.maxCombo) st.maxCombo = st.combo;
      var mult = 1 + Math.min(st.combo, 60) / 120;
      if (grade === "perfect") { st.score += Math.round(100 * mult); st.perfect++; sfx(880, 0.09, 0.22); }
      else if (grade === "good") { st.score += Math.round(62 * mult); st.good++; sfx(660, 0.08, 0.18); }
      else { st.score += Math.round(30 * mult); st.ok++; sfx(520, 0.06, 0.12, "sine"); }
      laneHold[lane] = 1;
      var col = grade === "perfect" ? "#00e5ff" : grade === "good" ? "#f2ede3" : "#7e8c9a";
      rings.push({ x: laneX(lane), p: 0, life: grade === "perfect" ? 230 : 180, col: col, big: false });
      spawnSparks(laneX(lane), grade === "perfect" ? (quality === 2 ? 14 : 7) : 5);
      if (st.combo % 50 === 0) rings.push({ x: laneX(lane), p: 0, life: 400, col: "#fcee0a", big: true });
      showFeed(grade);
    }

    function missNote(n) {
      n.dead = true;
      st.miss++;
      st.judged++;
      st.combo = 0;
      showFeed("miss");
    }

    function showFeed(label) {
      var el = elCache.feed;
      el.textContent = label === "perfect" ? "PERFECT" : label === "good" ? "GOOD" : label === "ok" ? "OK" : "MISS";
      el.className = "nf-feed g-" + label;
      void el.offsetWidth;
      el.classList.add("show");
    }

    /* combo 节点里挂着 <small> COMBO</small>，只能改首个文本节点 */
    function putHud(key, node, value) {
      if (st.hud[key] === value || !node) return;
      st.hud[key] = value;
      if (key === "combo" && node.firstChild && node.firstChild.nodeType === 3) {
        node.firstChild.nodeValue = value;
      } else if (key !== "combo") {
        node.textContent = value;
      }
    }

    function refreshHud(t) {
      putHud("score", hudEls.score, st.score);
      putHud("combo", hudEls.combo, st.combo);
      putHud("acc", hudEls.acc, accPct());
      putHud("perf", hudEls.perf, st.perfect);
      putHud("good", hudEls.good, st.good);
      putHud("ok", hudEls.ok, st.ok);
      putHud("miss", hudEls.miss, st.miss);
      putHud("total", hudEls.total, st.judged + "/" + st.notes.length);
      if (audio && audio.duration > 1) {
        putHud("prog", hudEls.prog, Math.round(clamp(t / audio.duration, 0, 1) * 100) + "%");
      }
      var now = performance.now();
      fpsCount++;
      if (!fpsAt) fpsAt = now;
      if (now - fpsAt >= 500) {
        var f = Math.round(fpsCount * 1000 / (now - fpsAt));
        fpsCount = 0;
        fpsAt = now;
        if (f !== fpsShown) {
          fpsShown = f;
          if (hudEls.fps) hudEls.fps.textContent = f + " FPS";
        }
      }
    }

    function accPct() {
      if (!st.judged) return "—";
      var v = (st.perfect + st.good * 0.7 + st.ok * 0.4) / st.judged;
      return (v * 100).toFixed(1) + "%";
    }

    function refreshLyric(t) {
      var idx = -1;
      for (var i = 0; i < TS.length; i++) if (t >= TS[i][0]) idx = i;
      if (idx === st.lyricIdx) return;
      st.lyricIdx = idx;
      var el = elCache.lyric;
      el.textContent = idx < 0 ? "" : TS[idx][1];
      el.classList.remove("beat");
      void el.offsetWidth;
      el.classList.add("beat");
    }

    function finish() {
      running = false;
      var v = st.judged ? (st.perfect + st.good * 0.7 + st.ok * 0.4) / st.judged : 0;
      var fc = st.miss === 0 && st.judged === st.notes.length;
      var grade = v >= 0.9 && fc ? "SS" : v >= 0.9 ? "S" : v >= 0.75 ? "A" : v >= 0.6 ? "B" : v >= 0.45 ? "C" : "D";
      $("nfGrade").textContent = grade;
      $("nfResultSub").textContent = "ACC " + accPct() + " · " + DIFF[prefs.diff].label +
        " · " + st.judged + "/" + st.notes.length + " NOTES" + (fc ? " · FC" : "");
      $("nfFS").textContent = st.score;
      $("nfFC").textContent = st.maxCombo;
      $("nfFM").textContent = st.miss;
      elCache.result.classList.add("open");
      closeRun();
    }

    function togglePause() {
      if (!running || !audio || locked) return;
      paused = !paused;
      if (paused) {
        audio.pause();
        if (elCache.pause) elCache.pause.classList.add("open");
      } else {
        audio.play();
        st.sampleT = audio.currentTime;
        st.sampleAt = performance.now();
        lastFrame = performance.now();
        if (elCache.pause) elCache.pause.classList.remove("open");
      }
    }

    /* ---------- 输入 ---------- */
    document.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") { togglePause(); return; }
      var li = e.code && CODES.indexOf(e.code) >= 0 ? CODES.indexOf(e.code) : KEYS.indexOf(e.keyCode);
      if (li < 0) return;
      e.preventDefault();
      if (e.repeat) return;
      laneHold[li] = Math.max(laneHold[li], 0.5);
      hit(li);
    });
    document.addEventListener("keyup", function (e) {
      var li = e.code && CODES.indexOf(e.code) >= 0 ? CODES.indexOf(e.code) : KEYS.indexOf(e.keyCode);
      if (li >= 0) laneHold[li] = 0;
    });

    /* 触屏/鼠标：直接点轨道打 */
    cvs.addEventListener("pointerdown", function (e) {
      if (!running) return;
      var r = cvs.getBoundingClientRect();
      var lane = clamp(Math.floor((e.clientX - r.left) / geo.laneW), 0, LANES - 1);
      hit(lane);
      laneHold[lane] = 1;
      e.preventDefault();
    });

    window.addEventListener("resize", function () {
      if (overlay.classList.contains("open")) measure();
    });
  }

  /* ---------- init ---------- */
  splitTitles();
  revealObserver();
  if (!deviceTouch) parallax();
  progress();
  dots();
  pages();
  smoothScroll();
  marquee();
  accordion();
  endingEgg();
  fretBoard();
  riffCards();
  nfGame();
  dust();
})();