// 英語版Wikipediaの「Flag of 〇〇」記事から、冒頭と「意味・デザイン」系の節を取得して保存する。
// 由来クイズの文面を書くときの一次資料。アクセス制限に配慮して1件ずつ間隔を空け、途中から再開できる。
const C = require('../data/countries-master.js');
const fs = require('fs');
const OUT = __dirname + '/symbolism-en.json';
const UA = { 'User-Agent': 'KokkiKenteiResearch/1.0 (personal quiz app; github kamedono213)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  for (const c of C) {
    if (out[c[0]] && out[c[0]].lead) continue;
    const title = 'Flag of ' + c[4];
    const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts|revisions&rvprop=ids&explaintext=1&redirects=1&format=json&titles=' + encodeURIComponent(title);
    for (let tries = 1; tries <= 6; tries++) {
      const body = await (await fetch(u, { headers: UA })).text();
      if (!body.startsWith('{')) { await sleep(5000 * tries); continue; }
      const p = Object.values(JSON.parse(body).query.pages)[0];
      const txt = p.extract || '';
      const parts = txt.split(/\n(?===+ )/);
      const sec = parts
        .filter(s => /^==+ *[^=]*(symbol|meaning|design|colou?r|description|emblem|elements)[^=]*==/i.test(s))
        .map(s => s.slice(0, 1400)).join('\n').slice(0, 2600);
      out[c[0]] = { ja: c[2], title: p.title, revid: p.revisions && p.revisions[0].revid, lead: parts[0].slice(0, 900), sec };
      if (!txt) console.log('EMPTY', c[0], title);
      break;
    }
    if (!out[c[0]]) console.log('GIVEUP', c[0]);
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
    await sleep(1200);
  }
  console.log('done', Object.keys(out).length);
  console.log('no symbolism section:', Object.entries(out).filter(([, v]) => !v.sec).map(([k]) => k).join(' '));
})();
