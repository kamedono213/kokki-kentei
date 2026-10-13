// 指定国の資料(全文があれば全文、なければ冒頭+意味の節)から、キーワードを含む文を出す
const fs=require('fs');const sym=require('./symbolism-en.json');
const [c,re,n]=process.argv.slice(2);const f=__dirname+'/fulltext/'+c+'.txt';
const t=(fs.existsSync(f)?fs.readFileSync(f,'utf8'):sym[c].lead+' '+sym[c].sec).replace(/\s+/g,' ');
const out=t.split(/(?<=[.!?])\s+/).filter(s=>new RegExp(re,'i').test(s)).slice(0,+n||3);
console.log('##',c,fs.existsSync(f)?'(全文)':'(抜粋)');out.forEach(s=>console.log(' -',s.slice(0,330)));
