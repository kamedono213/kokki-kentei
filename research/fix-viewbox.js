// viewBox の無い国旗SVGに、ルート要素の width/height から viewBox を付ける(縮小表示で切れないように)
const fs=require('fs');const dir=__dirname+'/../app/flags';let fixed=0,bad=[];
for(const f of fs.readdirSync(dir)){const p=dir+'/'+f;let s=fs.readFileSync(p,'utf8');
 const m=s.match(/<svg\b[^>]*>/);if(!m){bad.push(f);continue}const tag=m[0];
 if(/viewBox\s*=/.test(tag))continue;
 const w=(tag.match(/\swidth\s*=\s*"([\d.]+)(px)?"/)||[])[1],h=(tag.match(/\sheight\s*=\s*"([\d.]+)(px)?"/)||[])[1];
 if(!w||!h){bad.push(f+' '+tag.slice(0,120));continue}
 s=s.replace(tag,tag.replace(/<svg\b/,`<svg viewBox="0 0 ${w} ${h}"`));fs.writeFileSync(p,s);fixed++}
console.log('fixed',fixed,'problems',bad);
