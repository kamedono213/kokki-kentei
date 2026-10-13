// countries-master.js + origins.js → app/data/countries.json、地図 → app/data/world.json を作る。
// 実行: node data/build.js
const fs = require('fs');
const path = require('path');
const master = require('./countries-master.js');
const origins = fs.existsSync(path.join(__dirname, 'origins.js')) ? require('./origins.js') : {};
const files = fs.existsSync(path.join(__dirname, '../research/flagfiles.json')) ? require('../research/flagfiles.json') : {};

const fakes = require('./origin-fakes.js');
const fakeErrors = [];
const out = master.map(([c, num, ja, alias, en, region]) => {
  const o = origins[c] || {};
  const title = (files[c] && files[c].title) || 'Flag of ' + en;
  // 間違い文: 正しい文の一部を1か所だけ差し替える。差し替え元が文中にちょうど1回あることを確認する
  const f = fakes[c];
  let fake = null;
  if (!f) fakeErrors.push(c + ': 間違い文なし');
  else if (o.text.split(f[0]).length !== 2) fakeErrors.push(c + ': 差し替え元が' + (o.text.split(f[0]).length - 1) + '回 「' + f[0] + '」');
  else if (f[0] === f[1]) fakeErrors.push(c + ': 差し替え前後が同じ');
  else fake = { text: o.text.replace(f[0], f[1]), from: f[1], to: f[0] };
  return {
    c, num, ja, region,
    alias: alias ? alias.split('|') : [],
    origin: o.text || '',
    fake,
    srcTitle: o.srcTitle || title,
    src: o.src || 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')),
  };
});
const missing = out.filter(d => !d.origin).map(d => d.c);
fs.mkdirSync(path.join(__dirname, '../app/data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../app/data/countries.json'), JSON.stringify(out));
fs.copyFileSync(path.join(__dirname, '../research/countries-50m.json'), path.join(__dirname, '../app/data/world.json'));
console.log('countries', out.length, 'origin missing', missing.length, missing.join(' '));
console.log('fake errors', fakeErrors.length, fakeErrors.join('\n'));
if (fakeErrors.length) process.exitCode = 1;
