// countries-master.js + origins.js → app/data/countries.json、地図 → app/data/world.json を作る。
// 実行: node data/build.js
const fs = require('fs');
const path = require('path');
const master = require('./countries-master.js');
const origins = fs.existsSync(path.join(__dirname, 'origins.js')) ? require('./origins.js') : {};
const files = fs.existsSync(path.join(__dirname, '../research/flagfiles.json')) ? require('../research/flagfiles.json') : {};

const out = master.map(([c, num, ja, alias, en, region]) => {
  const o = origins[c] || {};
  const title = (files[c] && files[c].title) || 'Flag of ' + en;
  return {
    c, num, ja, region,
    alias: alias ? alias.split('|') : [],
    origin: o.text || '',
    srcTitle: o.srcTitle || title,
    src: o.src || 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')),
  };
});
const missing = out.filter(d => !d.origin).map(d => d.c);
fs.mkdirSync(path.join(__dirname, '../app/data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../app/data/countries.json'), JSON.stringify(out));
fs.copyFileSync(path.join(__dirname, '../research/countries-50m.json'), path.join(__dirname, '../app/data/world.json'));
console.log('countries', out.length, 'origin missing', missing.length, missing.join(' '));
