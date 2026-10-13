// 英語版Wikipedia「Flag of 〇〇」の全文と、記事の代表画像(=現在の国旗ファイル名)を保存する。
// 全文は research/fulltext/<iso>.txt、画像名と版番号は research/flagfiles.json。
const C = require('../data/countries-master.js');
const fs = require('fs');
const DIR = __dirname + '/fulltext';
const META = __dirname + '/flagfiles.json';
const UA = { 'User-Agent': 'KokkiKenteiResearch/1.0 (personal quiz app; github kamedono213)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const meta = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, 'utf8')) : {};
  for (const c of C) {
    if (meta[c[0]] && fs.existsSync(`${DIR}/${c[0]}.txt`)) continue;
    const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|revisions&rvprop=ids|timestamp&piprop=name&explaintext=1&redirects=1&format=json&titles=' + encodeURIComponent('Flag of ' + c[4]);
    for (let tries = 1; tries <= 6; tries++) {
      const body = await (await fetch(u, { headers: UA })).text();
      if (!body.startsWith('{')) { await sleep(5000 * tries); continue; }
      const p = Object.values(JSON.parse(body).query.pages)[0];
      fs.writeFileSync(`${DIR}/${c[0]}.txt`, p.extract || '');
      meta[c[0]] = { title: p.title, image: p.pageimage || null, revid: p.revisions && p.revisions[0].revid, ts: p.revisions && p.revisions[0].timestamp };
      break;
    }
    if (!meta[c[0]]) console.log('GIVEUP', c[0]);
    fs.writeFileSync(META, JSON.stringify(meta, null, 1));
    await sleep(1500);
  }
  console.log('done', Object.keys(meta).length);
})();
