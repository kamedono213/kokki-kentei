'use strict';
// 国旗検定: 国旗あて / 由来クイズ / 場所あて。データは data/countries.json と data/world.json。

const REGIONS = [
  { id: 'all', name: '全世界' },
  { id: 'asia', name: 'アジア' },
  { id: 'europe', name: 'ヨーロッパ' },
  { id: 'africa', name: 'アフリカ' },
  { id: 'namerica', name: '北アメリカ' },
  { id: 'samerica', name: '南アメリカ' },
  { id: 'oceania', name: 'オセアニア' },
];
const MODES = {
  flag: { no: '①', name: '国旗あて', desc: '国旗を見て国名を、国名を見て国旗を答える' },
  origin: { no: '②', name: '由来クイズ', desc: '国旗の色や模様に込められた意味を選ぶ' },
  map: { no: '③', name: '場所あて', desc: '国旗の国を世界地図の上でタップする' },
};
const LEVELS = {
  easy: { name: 'イージー', desc: '国旗を見て、4つの国名から選ぶ' },
  normal: { name: 'ノーマル', desc: '国名を見て、4つの国旗から選ぶ' },
  hard: { name: 'ハード', desc: '国旗を見て、国名を入力する(「・」や空白は入れなくてOK)' },
};

// 見た目がよく似ている国旗のグループ。選択肢に混ぜて難しくする(由来クイズでは逆に避ける)
const LOOKALIKES = [
  ['td', 'ro', 'ad', 'md'], ['id', 'mc', 'pl', 'sg'], ['nl', 'lu', 'hr', 'py'], ['au', 'nz', 'tv', 'ck', 'fj', 'gb'],
  ['ie', 'ci', 'it', 'mx'], ['sn', 'ml', 'gn', 'cm'], ['ve', 'co', 'ec'], ['no', 'is', 'dk', 'se', 'fi'],
  ['sk', 'si', 'ru', 'rs'], ['ni', 'sv', 'hn', 'gt', 'ar'], ['ae', 'kw', 'sd', 'jo'], ['eg', 'iq', 'sy', 'ye'],
  ['gh', 'bo', 'et', 'lt'], ['be', 'de'], ['at', 'lv', 'lb'], ['us', 'lr', 'my'], ['gr', 'uy'], ['hu', 'bg', 'ir', 'tj'],
  ['ee', 'bw', 'sl'], ['tr', 'tn', 'pk', 'dz'], ['ne', 'in'], ['cn', 'vn', 'ma'], ['jp', 'bd', 'pw', 'kr'], ['th', 'cr'],
  ['cz', 'ph', 'bs', 'cu', 'cl'], ['pe', 'ca'], ['cg', 'tz', 'cd', 'sb', 'na'], ['ua', 'se'], ['ch', 'va'],
  ['al', 'me', 'rs'], ['qa', 'bh'], ['kg', 'mk'], ['so', 'tv', 'fm'], ['bj', 'gw', 'mg'],
];
const LOOK = {};
LOOKALIKES.forEach(g => g.forEach(c => { LOOK[c] = (LOOK[c] || new Set()); g.forEach(o => o !== c && LOOK[c].add(o)); }));

let DATA = [];
let BY = {};
const app = document.getElementById('app');
let S = { screen: 'home' };

// ---------- 共通
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const flagSrc = c => 'flags/' + c + '.svg';
const regionName = id => REGIONS.find(r => r.id === id).name;
const pool = region => DATA.filter(d => region === 'all' || d.region === region);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('kokki:' + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('kokki:' + k, JSON.stringify(v)); } catch (e) { /* 保存できなくても遊べる */ } },
};
const recordKey = () => [S.mode, S.mode === 'flag' ? S.level : '-', S.region, S.count].join('/');

// 入力の表記ゆれ吸収: 全角半角・ひらがな/カタカナ・空白/ハイフン/コンマ/中点・ヴ表記を同一視
function norm(s) {
  s = String(s).normalize('NFKC').toLowerCase();
  s = s.replace(/[\s・･,，、.\-‐‑‒–—―_]/g, '');
  s = s.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
  s = s.replace(/ヴァ/g, 'バ').replace(/ヴィ/g, 'ビ').replace(/ヴェ/g, 'ベ').replace(/ヴォ/g, 'ボ').replace(/ヴ/g, 'ブ');
  s = s.replace(/及び/g, 'オヨビ').replace(/および/g, 'オヨビ');
  return s;
}
function isCorrectName(input, d) {
  const n = norm(input);
  return n.length > 0 && [d.ja, ...d.alias].some(x => norm(x) === n);
}

function pickDistractors(target, n, { avoidLook = false, key = null } = {}) {
  const used = new Set([target.c]);
  const out = [];
  const take = list => { for (const d of shuffle(list)) { if (out.length >= n) return; if (used.has(d.c)) continue; if (key && out.concat(target).some(o => key(o) === key(d))) continue; if (avoidLook && LOOK[target.c] && LOOK[target.c].has(d.c)) continue; used.add(d.c); out.push(d); } };
  if (!avoidLook && LOOK[target.c]) {
    take([...LOOK[target.c]].map(c => BY[c]).filter(Boolean));
    out.splice(2).forEach(d => used.delete(d.c)); // 似ている旗は最大2つまで
  }
  take(DATA.filter(d => d.region === target.region));
  take(DATA);
  return out;
}

// ---------- 画面
function render() {
  window.scrollTo(0, 0);
  if (S.screen === 'home') return renderHome();
  if (S.screen === 'setup') return renderSetup();
  if (S.screen === 'quiz') return renderQuiz();
  if (S.screen === 'result') return renderResult();
}

function renderHome() {
  const sample = shuffle(DATA).slice(0, 9).map(d => `<img src="${flagSrc(d.c)}" alt="">`).join('');
  app.innerHTML = `
    <header class="masthead">
      <span class="eyebrow">WORLD FLAGS · 197か国</span>
      <h1>国旗検定</h1>
      <p>国旗の見た目、意味、そして場所。3つの方向から覚える。</p>
      <div class="pole" aria-hidden="true">${sample}</div>
    </header>
    <nav class="modes">
      ${Object.entries(MODES).map(([id, m]) => `
        <button class="mode" data-mode="${id}"><span class="no">${m.no}</span><span><b>${m.name}</b><span>${m.desc}</span></span></button>`).join('')}
    </nav>
    <p class="note">収録国: 日本が承認している195か国 + 日本 + 北朝鮮 = 197か国(外務省「国・地域」の国名表記)。地域分けは中学地理の教科書に合わせ、中東・中央アジア・コーカサスはアジア、中米・カリブ海は北アメリカに入れています。由来の解説は英語版Wikipediaの各国国旗記事(2026年10月時点)をもとに要約しています。</p>`;
  app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
    S = { screen: 'setup', mode: b.dataset.mode, region: S.region || 'all', level: S.level || 'easy', count: S.count || '10' };
    render();
  });
}

function renderSetup() {
  const m = MODES[S.mode];
  const n = pool(S.region).length;
  const best = store.get('best:' + recordKey());
  app.innerHTML = `
    <div class="bar"><button class="link" id="back">← もどる</button><span class="muted small">${m.no} ${m.name}</span></div>
    <h2>${m.name}</h2>
    <fieldset><legend>地域</legend><div class="chips">
      ${REGIONS.map(r => `<button class="chip" data-region="${r.id}" aria-pressed="${S.region === r.id}">${r.name}<small>${pool(r.id).length}</small></button>`).join('')}
    </div></fieldset>
    ${S.mode === 'flag' ? `<fieldset><legend>難易度</legend><div class="chips">
      ${Object.entries(LEVELS).map(([id, l]) => `<button class="chip" data-level="${id}" aria-pressed="${S.level === id}">${l.name}</button>`).join('')}
    </div><p class="level-desc">${LEVELS[S.level].desc}</p></fieldset>` : ''}
    <fieldset><legend>問題数</legend><div class="chips">
      <button class="chip" data-count="10" aria-pressed="${S.count === '10'}">ランダム10問</button>
      <button class="chip" data-count="all" aria-pressed="${S.count === 'all'}">全問<small>${n}</small></button>
    </div></fieldset>
    <p class="best">${best ? `この条件のベスト: <span class="num">${best.score} / ${best.total}</span>` : 'この条件ではまだ記録がありません'}</p>
    <button class="primary" id="start">はじめる</button>`;
  app.querySelector('#back').onclick = () => { S.screen = 'home'; render(); };
  app.querySelectorAll('[data-region]').forEach(b => b.onclick = () => { S.region = b.dataset.region; renderSetup(); });
  app.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { S.level = b.dataset.level; renderSetup(); });
  app.querySelectorAll('[data-count]').forEach(b => b.onclick = () => { S.count = b.dataset.count; renderSetup(); });
  app.querySelector('#start').onclick = () => startQuiz();
}

function startQuiz(codes) {
  const list = codes ? codes.map(c => BY[c]) : shuffle(pool(S.region)).slice(0, S.count === '10' ? 10 : undefined);
  S.screen = 'quiz';
  S.retry = !!codes;
  S.questions = list.map(d => makeQuestion(d));
  S.i = 0; S.score = 0; S.misses = []; S.answered = null;
  render();
}

function makeQuestion(d) {
  if (S.mode === 'flag' && S.level !== 'hard') return { c: d.c, opts: shuffle([d, ...pickDistractors(d, 3)].map(o => o.c)) };
  if (S.mode === 'origin') return { c: d.c, opts: shuffle([d, ...pickDistractors(d, 3, { avoidLook: true, key: o => o.origin.slice(0, 12) })].map(o => o.c)) };
  return { c: d.c };
}

function header() {
  const total = S.questions.length;
  return `<div class="bar"><button class="link" id="quit">✕ やめる</button><span class="num small muted">正解 ${S.score}</span></div>
    <div class="progress"><span class="num small">${S.i + 1} / ${total}</span><div class="track"><div class="fill" style="width:${(S.i / total) * 100}%"></div></div></div>`;
}

function renderQuiz() {
  const q = S.questions[S.i];
  const d = BY[q.c];
  let body = '';
  if (S.mode === 'flag' && S.level === 'easy') {
    body = `<img class="flag big" src="${flagSrc(d.c)}" alt="この国旗はどこの国?">
      <p class="prompt">この国旗の国は?</p>
      <div class="choices">${q.opts.map(c => `<button class="choice" data-pick="${c}">${esc(BY[c].ja)}</button>`).join('')}</div>`;
  } else if (S.mode === 'flag' && S.level === 'normal') {
    body = `<p class="prompt">この国の国旗は?</p><div class="target-name">${esc(d.ja)}</div>
      <div class="choices flags">${q.opts.map((c, k) => `<button class="choice" data-pick="${c}" aria-label="選択肢${k + 1}"><img src="${flagSrc(c)}" alt=""></button>`).join('')}</div>`;
  } else if (S.mode === 'flag' && S.level === 'hard') {
    body = `<img class="flag big" src="${flagSrc(d.c)}" alt="この国旗はどこの国?">
      <form class="answer-form" id="ans" autocomplete="off">
        <label class="prompt" for="name-input">この国旗の国名を入力(「・」や空白、ハイフン、コンマは入れなくてOK)</label>
        <input id="name-input" name="name" type="text" inputmode="text" enterkeyhint="done" autocapitalize="off" spellcheck="false">
        <button class="primary" type="submit">答える</button>
      </form>`;
  } else if (S.mode === 'origin') {
    body = `<img class="flag big" src="${flagSrc(d.c)}" alt="${esc(d.ja)}の国旗">
      <p class="prompt">${esc(d.ja)}の国旗。この旗の由来は?</p>
      <div class="choices">${q.opts.map(c => `<button class="choice long" data-pick="${c}">${esc(BY[c].origin)}</button>`).join('')}</div>`;
  } else if (S.mode === 'map') {
    return renderMapQuiz(q, d);
  }
  app.innerHTML = header() + `<section class="stage">${body}<div id="after" class="stack"></div></section>`;
  bindQuit();
  app.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => answer(b.dataset.pick === d.c, b.dataset.pick));
  const form = app.querySelector('#ans');
  if (form) {
    const input = form.querySelector('input');
    setTimeout(() => input.focus(), 50);
    form.onsubmit = e => { e.preventDefault(); if (!input.value.trim()) return; input.disabled = true; form.querySelector('button').disabled = true; answer(isCorrectName(input.value, d), input.value); };
  }
}

function bindQuit() {
  app.querySelector('#quit').onclick = () => { S.screen = 'setup'; render(); };
}

function answer(ok, picked) {
  const q = S.questions[S.i];
  const d = BY[q.c];
  if (ok) S.score++; else S.misses.push(q.c);
  app.querySelectorAll('[data-pick]').forEach(b => {
    b.disabled = true;
    if (b.dataset.pick === d.c) b.classList.add('ok');
    else if (b.dataset.pick === picked) b.classList.add('ng');
  });
  let detail = '';
  if (S.mode === 'origin') detail = `<p>${esc(d.ja)}。出典: <a href="${esc(d.src)}" target="_blank" rel="noopener">Wikipedia「${esc(d.srcTitle)}」</a></p>`;
  else if (!ok && S.mode === 'flag' && S.level !== 'normal') detail = `<p>正解は「${esc(d.ja)}」${d.alias.length ? `(${esc(d.alias.slice(0, 2).join('・'))} でも正解)` : ''}</p>`;
  else if (!ok && picked) detail = `<p>あなたが選んだのは「${esc(BY[picked] ? BY[picked].ja : picked)}」の国旗</p>`;
  else detail = `<p>${esc(d.ja)}</p>`;
  showAfter(ok, detail);
}

function showAfter(ok, detail) {
  const after = app.querySelector('#after');
  const last = S.i === S.questions.length - 1;
  after.innerHTML = `<div class="verdict ${ok ? 'ok' : 'ng'}"><b>${ok ? '正解' : '不正解'}</b>${detail}</div>
    <button class="primary" id="next">${last ? '結果を見る' : '次へ'}</button>`;
  const next = after.querySelector('#next');
  next.onclick = () => { if (last) { finish(); } else { S.i++; render(); } };
  next.focus({ preventScroll: true });
  after.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function finish() {
  S.screen = 'result';
  if (!S.retry) {
    const key = 'best:' + recordKey();
    const best = store.get(key);
    if (!best || S.score > best.score) store.set(key, { score: S.score, total: S.questions.length });
  }
  render();
}

function renderResult() {
  const total = S.questions.length;
  const pct = Math.round((S.score / total) * 100);
  const title = S.mode === 'flag' ? `${MODES.flag.name}・${LEVELS[S.level].name}` : MODES[S.mode].name;
  app.innerHTML = `
    <div class="bar"><span class="muted small">${title} / ${regionName(S.region)}${S.retry ? ' / 間違い直し' : ''}</span></div>
    <section class="score"><span class="big num">${S.score}<span class="muted" style="font-size:28px"> / ${total}</span></span><span class="muted">正答率 ${pct}%</span></section>
    ${S.misses.length ? `<h2 style="font-size:20px">間違えた国</h2><div class="misses">${S.misses.map(c => { const d = BY[c]; return `<div class="miss"><img src="${flagSrc(c)}" alt=""><div><b>${esc(d.ja)}</b>${S.mode === 'origin' ? `<p>${esc(d.origin)}</p>` : ''}</div></div>`; }).join('')}</div>` : '<p class="muted" style="text-align:center">全問正解です。</p>'}
    <div class="stack">
      ${S.misses.length ? '<button class="primary" id="retry">間違えた国だけもう一度</button>' : ''}
      <button class="secondary" id="again">同じ条件でもう一度</button>
      <button class="secondary" id="home">ホームへ</button>
    </div>`;
  const r = app.querySelector('#retry');
  if (r) r.onclick = () => startQuiz(shuffle(S.misses));
  app.querySelector('#again').onclick = () => startQuiz();
  app.querySelector('#home').onclick = () => { S.screen = 'home'; render(); };
}

// ---------- 場所あて(世界地図)
const MAP_W = 1000, MAP_H = 620;
let MAP = null; // { features, projection, path, mainBounds }

function buildMap(topo) {
  const numToIso = {};
  DATA.forEach(d => { if (d.num) numToIso[d.num] = d.c; });
  // 地図データ上で別地物になっている地域を、日本が承認する国に寄せる
  const nameToIso = { 'Kosovo': 'xk', 'N. Cyprus': 'cy', 'Somaliland': 'so' };
  const fc = topojson.feature(topo, topo.objects.countries);
  const features = fc.features.filter(f => f.id !== '010'); // 南極は描かない
  features.forEach(f => { f.iso = numToIso[f.id] || nameToIso[f.properties.name] || null; });
  const projection = d3.geoNaturalEarth1().rotate([-150, 0]); // 日本の地図帳と同じ太平洋中心
  projection.fitExtent([[8, 8], [MAP_W - 8, MAP_H - 8]], { type: 'FeatureCollection', features });
  const path = d3.geoPath(projection);
  // 国ごとの「本土」(最大の多角形)の範囲。海外領土で範囲が広がりすぎないようにする
  const mainBounds = {};
  const mainArea = {};
  features.forEach(f => {
    if (!f.iso) return;
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map(c => ({ type: 'Polygon', coordinates: c })) : [f.geometry];
    let best = null, bestA = -1;
    polys.forEach(p => { const a = path.area(p); if (a > bestA) { bestA = a; best = p; } });
    if (!mainArea[f.iso] || bestA > mainArea[f.iso]) { mainArea[f.iso] = bestA; mainBounds[f.iso] = path.bounds(best); }
  });
  // 小さすぎてタップしにくい国には丸印を置く。ツバルは地図データに無いので首都フナフティの位置
  const dots = [];
  DATA.forEach(d => {
    const a = mainArea[d.c];
    if (a === undefined) {
      if (d.c === 'tv') { const [x, y] = projection([179.19, -8.52]); dots.push({ iso: 'tv', x, y }); mainBounds.tv = [[x - 1, y - 1], [x + 1, y + 1]]; }
      return;
    }
    if (a < 12) { const b = mainBounds[d.c]; dots.push({ iso: d.c, x: (b[0][0] + b[1][0]) / 2, y: (b[0][1] + b[1][1]) / 2 }); }
  });
  return { features, projection, path, mainBounds, dots };
}

// 地域ごとの初期表示範囲 [西経度, 南緯度, 東経度, 北緯度]。ロシアなど大きな国に引っぱられないよう固定で持つ
const REGION_VIEW = {
  asia: [25, -11, 150, 55], europe: [-12, 35, 40, 66], africa: [-20, -36, 56, 38],
  namerica: [-170, 6, -52, 72], samerica: [-83, -56, -33, 13], oceania: [112, -48, 192, 20],
};
function regionTransform(region) {
  const v = REGION_VIEW[region];
  if (!v) return d3.zoomIdentity;
  const pts = [];
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) pts.push(MAP.projection([v[0] + (v[2] - v[0]) * i / 8, v[1] + (v[3] - v[1]) * j / 8]));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return fitTransform(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 1, 12);
}
// 表示枠の縦横比に合わせた viewBox。地図(1000×620)を中央に置き、上下(または左右)に余白を足す
let VIEW = { x: 0, y: 0, w: MAP_W, h: MAP_H };
function setView(el) {
  const r = el.getBoundingClientRect();
  const aspect = r.height / Math.max(1, r.width);
  if (aspect > MAP_H / MAP_W) { const h = MAP_W * aspect; VIEW = { x: 0, y: (MAP_H - h) / 2, w: MAP_W, h }; }
  else { const w = MAP_H / aspect; VIEW = { x: (MAP_W - w) / 2, y: 0, w, h: MAP_H }; }
  return `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;
}
function fitTransform(x0, y0, x1, y1, pad, kMax) {
  const k = Math.max(1, Math.min(kMax, pad * Math.min(VIEW.w / Math.max(1, x1 - x0), VIEW.h / Math.max(1, y1 - y0))));
  const cx = VIEW.x + VIEW.w / 2, cy = VIEW.y + VIEW.h / 2;
  return d3.zoomIdentity.translate(cx - k * (x0 + x1) / 2, cy - k * (y0 + y1) / 2).scale(k);
}

function renderMapQuiz(q, d) {
  app.innerHTML = header() + `
    <section class="stage">
      <div class="map-q"><img class="flag" src="${flagSrc(d.c)}" alt="この国旗の国はどこ?"><p class="prompt" style="text-align:left">この国旗の国を地図でタップして、OKで決定。<br><span class="small">ピンチ・ホイールで拡大縮小、ドラッグで移動</span></p></div>
      <div class="mapbox" id="mapbox">
        <svg viewBox="0 0 ${MAP_W} ${MAP_H}" role="img" aria-label="世界地図"><g id="world"></g></svg>
        <div class="zoom"><button id="zin" aria-label="拡大">+</button><button id="zout" aria-label="縮小">−</button><button id="zreset" aria-label="地域全体を表示" style="font-size:14px">⤢</button></div>
      </div>
      <div class="map-actions" id="map-actions"><button class="secondary" id="clear" disabled>選び直す</button><button class="primary" id="ok" disabled>OK</button></div>
      <div id="after" class="stack"></div>
    </section>`;
  bindQuit();
  const svg = d3.select(app).select('svg');
  svg.attr('viewBox', setView(app.querySelector('#mapbox')));
  const g = svg.select('#world');
  const countries = g.selectAll('path').data(MAP.features).join('path')
    .attr('d', MAP.path)
    .attr('class', f => 'country' + (f.iso ? '' : ' off'));
  const dots = g.selectAll('circle.dot').data(MAP.dots).join('circle').attr('class', 'dot').attr('cx', p => p.x).attr('cy', p => p.y);
  const ring = g.append('circle').attr('class', 'ring').attr('r', 0);
  let picked = null;
  let done = false;
  let k = 1;
  const sizeDots = () => { dots.attr('r', 4.5 / Math.sqrt(k)); ring.attr('r', ring.attr('data-r') ? (+ring.attr('data-r')) / k : 0); };

  const zoom = d3.zoom().scaleExtent([1, 60]).translateExtent([[Math.min(-200, VIEW.x), Math.min(-200, VIEW.y)], [Math.max(MAP_W + 200, VIEW.x + VIEW.w), Math.max(MAP_H + 200, VIEW.y + VIEW.h)]])
    .on('zoom', ev => { k = ev.transform.k; g.attr('transform', ev.transform); sizeDots(); });
  svg.call(zoom).on('dblclick.zoom', null);
  const home = regionTransform(S.region);
  svg.call(zoom.transform, home);

  const paint = () => {
    countries.classed('pick', f => !done && f.iso && f.iso === picked);
    dots.classed('pick', p => !done && p.iso === picked);
    app.querySelector('#ok').disabled = !picked || done;
    app.querySelector('#clear').disabled = !picked || done;
  };
  const choose = iso => { if (done || !iso) return; picked = iso; paint(); };
  countries.on('click', (ev, f) => choose(f.iso));
  dots.on('click', (ev, p) => choose(p.iso));
  app.querySelector('#clear').onclick = () => { picked = null; paint(); };
  app.querySelector('#zin').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.8);
  app.querySelector('#zout').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.8);
  app.querySelector('#zreset').onclick = () => svg.transition().duration(400).call(zoom.transform, home);
  app.querySelector('#ok').onclick = () => {
    if (!picked || done) return;
    done = true;
    const ok = picked === d.c;
    if (ok) S.score++; else S.misses.push(d.c);
    countries.classed('pick', false).classed('ok', f => f.iso === d.c).classed('ng', f => !ok && f.iso === picked);
    dots.classed('pick', false).classed('ok', p => p.iso === d.c).classed('ng', p => !ok && p.iso === picked);
    // 正解の国に寄せる(間違えた場合は選んだ国も画面に入れる)
    const bs = [MAP.mainBounds[d.c]].concat(ok ? [] : [MAP.mainBounds[picked]]).filter(Boolean);
    const x0 = Math.min(...bs.map(b => b[0][0])), y0 = Math.min(...bs.map(b => b[0][1])), x1 = Math.max(...bs.map(b => b[1][0])), y1 = Math.max(...bs.map(b => b[1][1]));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, span = Math.max(x1 - x0, y1 - y0, 40);
    ring.attr('cx', (MAP.mainBounds[d.c][0][0] + MAP.mainBounds[d.c][1][0]) / 2).attr('cy', (MAP.mainBounds[d.c][0][1] + MAP.mainBounds[d.c][1][1]) / 2).attr('data-r', 16);
    svg.transition().duration(700).call(zoom.transform, fitTransform(cx - span, cy - span, cx + span, cy + span, 0.9, 20));
    app.querySelector('#map-actions').hidden = true;
    const detail = ok ? `<p>${esc(d.ja)}</p>` : `<p>正解は「${esc(d.ja)}」(緑)。選んだのは「${esc(BY[picked].ja)}」(赤)</p>`;
    showAfter(ok, detail);
  };
  sizeDots();
}

// ---------- 起動
async function boot() {
  try {
    const [countries, topo] = await Promise.all([
      fetch('data/countries.json').then(r => r.json()),
      fetch('data/world.json').then(r => r.json()),
    ]);
    DATA = countries;
    BY = Object.fromEntries(DATA.map(d => [d.c, d]));
    MAP = buildMap(topo);
    render();
  } catch (e) {
    app.innerHTML = `<p class="loading">データを読み込めませんでした。ページを再読み込みしてください。(${esc(e.message)})</p>`;
  }
}
boot();
