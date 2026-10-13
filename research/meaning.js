// 全文から「表す・象徴する」系の文だけを抜き出して表示する。由来の文面を書くときの確認用。
// 使い方: node research/meaning.js jp kr ...
const fs = require('fs');
const meta = require('./flagfiles.json');
const RE = /(represent|symboli[sz]|stands? for|signif|denot|embod|allud|meaning|evok|commemorat|inspired by|derived from|based on)/i;
for (const c of process.argv.slice(2)) {
  const f = `${__dirname}/fulltext/${c}.txt`;
  const sym = require('./symbolism-en.json')[c];
  const txt = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : (sym.lead + '\n' + sym.sec);
  if (!fs.existsSync(f)) meta[c] = { title: sym.title + ' (冒頭+意味の節のみ)', image: '?' };
  // 「歴史」「過去の旗」「他の旗」節は今の旗の由来と混ざるので後回しにする
  const parts = txt.split(/\n(?===+ )/);
  const score = s => /^==+ *[^=]*(histor|former|previous|other flags|see also|proposal|referendum|variant|gallery|ensign|standard)/i.test(s) ? 1 : 0;
  const ordered = parts.slice().sort((a, b) => score(a) - score(b));
  const sents = [];
  for (const p of ordered) for (const s of p.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)) if (RE.test(s) && s.length < 400) sents.push(s);
  console.log('##', c, '|', meta[c].title, '| image:', meta[c].image);
  console.log([...new Set(sents)].join(' ').slice(0, Number(process.env.MAX || 1500)));
  console.log();
}
