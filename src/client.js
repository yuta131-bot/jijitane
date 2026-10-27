(function () {
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var root = document.documentElement;

  /* ---------- ふりがな切り替え ---------- */
  function applyRuby(on) {
    root.dataset.ruby = on ? 'on' : 'off';
    document.querySelectorAll('.ruby-toggle').forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = 'ふりがな：' + (on ? 'あり' : 'なし');
    });
  }
  applyRuby(ls.get('jt-ruby') !== 'off');

  document.addEventListener('click', function (e) {
    var rb = e.target.closest('.ruby-toggle');
    if (rb) { var on = root.dataset.ruby !== 'on'; applyRuby(on); ls.set('jt-ruby', on ? 'on' : 'off'); return; }
    var sp = e.target.closest('.speak');
    if (sp) { toggleSpeak(sp); return; }
    var ch = e.target.closest('.choice');
    if (ch) { answer(ch); return; }
    var fz = e.target.closest('.fig-zoom');
    if (fz) { openZoom(fz); return; }
    if (e.target.closest('.zclose')) closeZoom();
  });

  /* ---------- 図を大きく見る ---------- */
  var zoomBox = null, zoomFrom = null;
  function openZoom(btn) {
    var svg = btn.querySelector('svg'); if (!svg) return;
    var vb = (svg.getAttribute('viewBox') || '0 0 640 400').trim().split(/[\s,]+/).map(Number);
    var vw = window.innerWidth;
    // たて長の図は画面いっぱい（最大 2 倍）、横長の図はスマホでは横にスクロールして読める大きさに
    var w = vb[2] <= 400 ? Math.min(Math.max(vw - 24, vb[2]), vb[2] * 2.4) : Math.max(vw - 24, Math.min(vb[2] * 1.9, 1200));
    var clone = svg.cloneNode(true);
    clone.style.width = Math.round(w) + 'px';
    var cap = btn.parentNode.querySelector('.cap');
    zoomBox = document.createElement('div');
    zoomBox.className = 'zoombox'; zoomBox.setAttribute('role', 'dialog'); zoomBox.setAttribute('aria-modal', 'true'); zoomBox.setAttribute('aria-label', '図の拡大');
    zoomBox.innerHTML = '<button type="button" class="zclose">とじる ✕</button><div class="zin"></div>';
    zoomBox.querySelector('.zin').appendChild(clone);
    if (cap) { var c = document.createElement('p'); c.className = 'zcap'; c.innerHTML = cap.innerHTML; zoomBox.querySelector('.zin').appendChild(c); }
    document.body.appendChild(zoomBox);
    root.classList.add('zooming');
    zoomFrom = btn;
    zoomBox.querySelector('.zclose').focus();
    // 横長の図は、まんなかが見えるように
    zoomBox.scrollLeft = Math.max(0, (zoomBox.scrollWidth - vw) / 2);
  }
  function closeZoom() {
    if (!zoomBox) return;
    zoomBox.remove(); zoomBox = null; root.classList.remove('zooming');
    if (zoomFrom) zoomFrom.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeZoom(); });

  /* ---------- よみあげ ---------- */
  var synth = window.speechSynthesis;
  var voice = null;
  // なめらかな声を優先して選ぶ（端末に入っているものの中から）
  // 落ち着いた女性の声を優先して選ぶ（端末に入っている声の中から）
  var PREFS = [
    /Nanami/i,                                   // Windows / Edge の自然な女性の声
    /(Shiori|Mayu|Aoi).*(Natural|Online)/i,
    /(Kyoko|O-?ren).*(Enhanced|Premium|拡張|高品質)/i, // Mac・iPhone の高品質版
    /Kyoko|O-?ren/i,
    /Google.*(日本語|Japanese)/i,                 // Chrome・Android
    /Haruka|Ayumi|Sayaka|Shiori|Mayu|Aoi/i        // 古い Windows の女性の声
  ];
  var MALE = /Keita|Daichi|Naoki|Otoya|Hattori|Ichiro|男性|Male/i;
  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices().filter(function (v) { return /^ja/i.test(v.lang); });
    if (!vs.length) return;
    for (var i = 0; i < PREFS.length; i++) {
      var hit = vs.filter(function (v) { return PREFS[i].test(v.name) && !MALE.test(v.name); })[0];
      if (hit) { voice = hit; return; }
    }
    voice = vs.filter(function (v) { return !MALE.test(v.name); })[0] || vs[0];
  }
  if (synth) { pickVoice(); if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice); }

  // 読み上げ用に文を整える
  function speechText(el, allYomi) {
    var c = el.cloneNode(true);
    // 漢字はふりがなの読みで読ませる（読みまちがいを防ぐ）
    c.querySelectorAll('ruby').forEach(function (r) {
      var rt = r.querySelector('rt');
      var useYomi = (allYomi || r.hasAttribute('data-say')) && rt;
      if (rt) rt.remove();
      r.replaceWith(document.createTextNode(useYomi ? rt.textContent : r.textContent));
    });
    c.querySelectorAll('svg,.cl').forEach(function (x) { x.remove(); });
    var s = c.textContent;
    s = s.replace(/([\u4e00-\u9fff々]+)（[\u3041-\u3096ー]+）/g, '$1')
      .replace(/\s*[＋+]\s*/g, 'と')
      .replace(/(\d+(?:\.\d+)?)\s*m\/s/g, '秒速$1メートル')
      .replace(/(\d+(?:\.\d+)?)\s*hPa/g, '$1ヘクトパスカル')
      .replace(/(\d+(?:\.\d+)?)\s*km/g, '$1キロメートル')
      .replace(/(\d+(?:\.\d+)?)\s*[%％]/g, '$1パーセント')
      .replace(/(\d)\s*×\s*(\d)/g, '$1かける$2')
      .replace(/\s*[＝=]\s*/g, '、つまり、')
      .replace(/\s*[→⇒]\s*/g, '、')
      .replace(/UAE/g, 'ユーエーイー').replace(/\bAI\b/g, 'エーアイ')
      .replace(/[「」『』【】★☆]/g, '')
      .replace(/（/g, '、').replace(/）/g, '')
      .replace(/([\u30a1-\u30fa])・(?=[\u30a1-\u30fa])/g, '$1 ').replace(/[・／]/g, '、')
      .replace(/、\s*、/g, '、').replace(/、\s*([。！？])/g, '$1')
      .replace(/\s+/g, ' ').trim();
    return s;
  }
  // 長い文は区切って読む（途中で止まるのを防ぎ、自然な間をつくる）
  function splitSentences(s) {
    var parts = s.split(/(?<=[。！？!?])/).map(function (x) { return x.trim(); }).filter(Boolean);
    var out = [];
    parts.forEach(function (p) {
      // とても長い文だけ、「〜が、」「〜ので、」など文のつなぎ目で分ける
      while (p.length > 110) {
        var best = -1, mid = p.length / 2, re = /(が|て|で|ので|けど|けれど|し|から|ため|ると|れば|たり)、/g, m;
        while ((m = re.exec(p))) { var at = m.index + m[0].length; if (at > 25 && at < p.length - 15 && (best < 0 || Math.abs(at - mid) < Math.abs(best - mid))) best = at; }
        if (best < 0) break;
        out.push(p.slice(0, best)); p = p.slice(best);
      }
      if (p) out.push(p);
    });
    return out;
  }
  // 記事の中の読む順番：見出し → 3行まとめ → 本文 → クイズの問題と選択肢
  // 要素の中の文（。！？で区切る）ごとに Range を作る。ふりがな（rt）は数えない
  function sentenceRanges(el) {
    if (!document.createRange) return [];
    var nodes = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return n.parentNode.closest('rt') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    while (w.nextNode()) nodes.push(w.currentNode);
    var out = [], start = null;
    nodes.forEach(function (n, ni) {
      var t = n.nodeValue;
      for (var i = 0; i < t.length; i++) {
        if (!start && /\S/.test(t[i])) start = { n: n, i: i };
        var endHere = /[。！？!?]/.test(t[i]) || (ni === nodes.length - 1 && i === t.length - 1);
        if (start && endHere) {
          // 閉じかっこも文に含める
          var j = i + 1; while (j < t.length && /[」』）)]/.test(t[j])) j++;
          var r = document.createRange(); r.setStart(start.n, start.i); r.setEnd(n, j);
          out.push(r); start = null; i = j - 1;
        }
      }
    });
    return out;
  }
  // いま読んでいる文を <span class="rd"> で囲む（ふりがなの上には印をつけない）
  function unwrapReading() {
    document.querySelectorAll('span.rd').forEach(function (sp) {
      var p = sp.parentNode; while (sp.firstChild) p.insertBefore(sp.firstChild, sp); p.removeChild(sp); p.normalize();
    });
    document.querySelectorAll('.reading').forEach(function (x) { x.classList.remove('reading'); if (!x.getAttribute('class')) x.removeAttribute('class'); });
  }
  // 文の中の文字（ふりがな rt 以外）を1つずつ <span class="rd"> で囲む。
  // ふりがなのついた漢字は、漢字の部分だけを囲むので、ふりがなには印がかからない
  function wrapSentence(el, idx) {
    var r = sentenceRanges(el)[idx]; if (!r) return null;
    var nodes = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return n.parentNode.closest('rt') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    while (w.nextNode()) { if (r.intersectsNode(w.currentNode)) nodes.push(w.currentNode); }
    var first = null;
    nodes.forEach(function (n) {
      var st = n === r.startContainer ? r.startOffset : 0;
      var en = n === r.endContainer ? r.endOffset : n.nodeValue.length;
      if (en <= st) return;
      if (en < n.nodeValue.length) n.splitText(en);
      if (st > 0) n = n.splitText(st);
      if (!/\S/.test(n.nodeValue)) return;
      var sp = document.createElement('span'); sp.className = 'rd';
      n.parentNode.insertBefore(sp, n); sp.appendChild(n);
      if (!first) first = sp;
    });
    return first;
  }
  function mark(item) {
    unwrapReading();
    if (!item) return;
    var target = (item.sIdx != null && item.el) ? wrapSentence(item.el, item.sIdx) : null;
    if (!target && item.el) { item.el.classList.add('reading'); target = item.el; }
    // 読んでいるところが画面の外なら、見える位置まで動かす
    var box = target && target.getBoundingClientRect();
    if (box && box.height && (box.top < 90 || box.bottom > window.innerHeight - 40)) {
      window.scrollBy({ top: box.top - window.innerHeight * 0.35, behavior: 'smooth' });
    }
  }
  function buildQueue(art, allYomi) {
    var q = [];
    var add = function (el, text, pauseAfter, sIdx) { if (text) splitSentences(text).forEach(function (s, i, arr) { q.push({ el: el, sIdx: sIdx == null ? null : sIdx, text: s, pause: i === arr.length - 1 ? pauseAfter : 60 }); }); };
    // 段落などは1文ずつに分けて、いま読んでいる文だけに印をつける
    var addEach = function (el, pauseAfter, prefix) {
      var rs = sentenceRanges(el);
      if (!rs.length) { add(el, (prefix || '') + speechText(el, allYomi), pauseAfter); return; }
      rs.forEach(function (r, i) {
        var box = document.createElement('span'); box.appendChild(r.cloneContents());
        add(el, (i === 0 && prefix ? prefix : '') + speechText(box, allYomi), i === rs.length - 1 ? pauseAfter : 160, i);
      });
    };
    var h = art.querySelector('h2 > span:last-child');
    if (h) addEach(h, 420);
    var three = art.querySelectorAll('.three li');
    if (three.length) { q.push({ el: art.querySelector('.three'), text: '3行でいうと。', pause: 120 }); three.forEach(function (li) { addEach(li, 160); }); }
    art.querySelectorAll(':scope > p:not(.talk)').forEach(function (p) { addEach(p, 260); });
    var quiz = art.querySelector('.quiz');
    if (quiz) {
      var qt = quiz.querySelector('.qhead > span:last-child, summary > span:nth-child(2)');
      if (qt) addEach(qt, 300, 'クイズです。');
      quiz.querySelectorAll('.choice').forEach(function (b, i) { addEach(b, 120, 'ABCD'[i] + '、'); });
    }
    return q;
  }
  // 録音ずみの読み上げ（VOICEVOX）を作るときに、読む文の並びを取り出すための入り口
  window.__jtVoiceQueue = function (art) { return buildQueue(art, true).map(function (x) { return { text: x.text, pause: x.pause || 60 }; }); };
  var run = null;
  function stopSpeak() {
    if (!run) return;
    run.stopped = true; clearTimeout(run.timer);
    if (run.audio) { run.audio.pause(); run.audio.src = ''; cancelAnimationFrame(run.raf); }
    if (synth) synth.cancel();
    mark(null);
    run.btn.classList.remove('on'); run.btn.innerHTML = '<span aria-hidden="true">🔊</span> よみあげ';
    run = null;
  }
  // 録音ずみの声（data-audio の JSON）があればそれを使い、なければ端末の声で読む
  var audioInfo = {};
  function loadAudio(url) {
    if (!url || !window.fetch) return Promise.resolve(null);
    if (!audioInfo[url]) audioInfo[url] = fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return audioInfo[url];
  }
  function toggleSpeak(btn) {
    if (run && run.btn === btn) { stopSpeak(); return; }
    stopSpeak();
    var art = btn.closest('article');
    var r0 = { btn: btn, i: 0, stopped: false, timer: null };
    run = r0;
    btn.classList.add('on'); btn.innerHTML = '<span aria-hidden="true">■</span> とめる';
    loadAudio(art.getAttribute('data-audio')).then(function (info) {
      if (run !== r0 || r0.stopped) return;
      var q = buildQueue(art, true);
      if (info && info.items && info.items.length === q.length && info.src) { playRecorded(r0, q, info, art); return; }
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { stopSpeak(); btn.textContent = 'この端末では読み上げできません'; return; }
      if (!voice) pickVoice();
      r0.queue = buildQueue(art);
      next();
    });
  }
  function playRecorded(r, q, info, art) {
    var base = art.getAttribute('data-audio').replace(/[^/]*$/, '');
    var a = new Audio(base + info.src);
    r.audio = a; r.queue = q;
    var cur = -1;
    var tick = function () {
      if (r.stopped) return;
      var t = a.currentTime, idx = -1;
      for (var k = 0; k < info.items.length; k++) { if (t >= info.items[k][0] - 0.05) idx = k; else break; }
      if (idx !== cur && idx >= 0 && idx < q.length) { cur = idx; mark(q[idx]); }
      r.raf = requestAnimationFrame(tick);
    };
    a.addEventListener('ended', function () { if (run === r) stopSpeak(); });
    a.addEventListener('error', function () { if (run !== r) return; r.audio = null; if (synth) { if (!voice) pickVoice(); r.queue = buildQueue(art); r.i = 0; next(); } else stopSpeak(); });
    var p = a.play();
    if (p && p.catch) p.catch(function () { if (run === r) stopSpeak(); });
    r.raf = requestAnimationFrame(tick);
  }
  function next() {
    var r = run; if (!r || r.stopped) return;
    if (r.i >= r.queue.length) { stopSpeak(); return; }
    var item = r.queue[r.i++];
    var u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'ja-JP'; if (voice) u.voice = voice;
    u.rate = 1.05; u.pitch = 0.92; u.volume = 1;
    // 声が実際に出はじめたときに印を動かす（ずれを防ぐ）
    var shown = false;
    u.onstart = function () { if (!r.stopped) { shown = true; mark(item); } };
    setTimeout(function () { if (!shown && !r.stopped && run === r) mark(item); }, 400);
    var done = false;
    var go = function () { if (done || r.stopped) return; done = true; r.timer = setTimeout(next, item.pause || 60); };
    u.onend = go; u.onerror = go;
    synth.speak(u);
  }
  window.addEventListener('pagehide', stopSpeak);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopSpeak(); });

  /* ---------- 3択クイズと連続記録 ---------- */
  function jstDay(offset) { return new Date(Date.now() + 9 * 3600e3 + (offset || 0) * 86400e3).toISOString().slice(0, 10); }
  function answer(btn, silent) {
    var q = btn.closest('.quiz'); if (q.dataset.done) return; q.dataset.done = '1';
    var ans = Number(q.dataset.answer), ok = Number(btn.dataset.i) === ans;
    q.querySelectorAll('.choice').forEach(function (b) { b.disabled = true; if (Number(b.dataset.i) === ans) b.classList.add('right'); });
    if (!ok) btn.classList.add('wrong');
    var a = q.querySelector('.ans'); a.hidden = false;
    a.querySelector('.verdict').textContent = ok ? 'せいかい！' : 'おしい！ 答えは…';
    q.classList.add(ok ? 'is-ok' : 'is-ng');
    if (silent) return;
    ls.set('jt-q-' + q.dataset.qid, ok ? '1' : '0');
    var t = jstDay(0), last = ls.get('jt-last'), n = Number(ls.get('jt-streak') || 0);
    if (last !== t) { n = last === jstDay(-1) ? n + 1 : 1; ls.set('jt-last', t); ls.set('jt-streak', String(n)); }
    showStreak();
  }
  function showStreak() {
    var n = Number(ls.get('jt-streak') || 0), last = ls.get('jt-last');
    if (!n || (last !== jstDay(0) && last !== jstDay(-1))) return;
    document.querySelectorAll('.streak').forEach(function (s) { s.hidden = false; s.textContent = 'クイズ ' + n + '日れんぞく'; });
  }
  document.querySelectorAll('.quiz.mc').forEach(function (q) {
    var r = ls.get('jt-q-' + q.dataset.qid); if (r === null) return;
    var pick = r === '1' ? q.dataset.answer : String((Number(q.dataset.answer) + 1) % q.querySelectorAll('.choice').length);
    var b = q.querySelector('.choice[data-i="' + pick + '"]'); if (b) answer(b, true);
  });
  showStreak();
})();
