// 英語版Wikipedia「Flag of 〇〇」記事の代表画像(=現在の国旗SVG)を Wikimedia Commons から取得して app/flags/ に保存する。
// flagcdn の画像は更新が遅れることがある(確認できた例: 北朝鮮の縦横比が2026年3月に1:1.65へ変更されたが、flagcdnは2:1のまま)ため、Wikipediaに合わせる。
const fs = require('fs');
const path = require('path');
const meta = require('./flagfiles.json');
const UA = { 'User-Agent': 'KokkiKenteiResearch/1.0 (personal quiz app; github kamedono213)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 記事の代表画像ではなく、日本・国連が使っている旗を使う国
const OVERRIDE = {
  af: 'Flag of Afghanistan (2013–2021).svg', // 国連・五輪で使われている三色旗(タリバン政権の白旗ではない)
};
const OUT = path.join(__dirname, '../app/flags');
const LOG = path.join(__dirname, 'flag-sources.json');

(async () => {
  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : {};
  for (const [c, m] of Object.entries(meta)) {
    if (log[c] && log[c].ok) continue;
    const name = OVERRIDE[c] || m.image;
    if (!name) { console.log('NOIMAGE', c); continue; }
    // API を使わず、MediaWiki のファイル配置規則(ファイル名のMD5の先頭1文字/2文字)から直接URLを作る
    const fname = name.replace(/ /g, '_');
    const h = require('crypto').createHash('md5').update(fname).digest('hex');
    const info = { url: `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(fname)}`, timestamp: null };
    let svg = null;
    for (let t = 1; t <= 6 && !svg; t++) {
      const r = await fetch(info.url, { headers: UA });
      if (r.ok) { svg = await r.text(); break; }
      if (r.status === 404) {
        const en = info.url.replace('/wikipedia/commons/', '/wikipedia/en/');
        const r2 = await fetch(en, { headers: UA });
        if (r2.ok) { svg = await r2.text(); info.url = en; break; }
        console.log('404', c, fname); break;
      }
      await sleep(4000 * t);
    }
    if (!svg || !svg.includes('<svg')) { console.log('BADSVG', c, info.url); continue; }
    if (/<script/i.test(svg)) { console.log('SCRIPT-IN-SVG', c); continue; }
    fs.writeFileSync(path.join(OUT, c + '.svg'), svg);
    log[c] = { ok: true, file: name, url: info.url, bytes: svg.length, uploaded: info.timestamp };
    fs.writeFileSync(LOG, JSON.stringify(log, null, 1));
    await sleep(250);
  }
  console.log('done', Object.values(log).filter(x => x.ok).length);
})();
