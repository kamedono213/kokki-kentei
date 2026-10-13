// SVG の DOCTYPE/ENTITY 宣言を取り除く。宣言で定義された &name; は値に展開してから消す。
const fs=require('fs');const dir=process.argv[2];let n=0;
for(const f of fs.readdirSync(dir)){const p=dir+'/'+f;let s=fs.readFileSync(p,'utf8');
 const m=s.match(/<!DOCTYPE[\s\S]*?(\[[\s\S]*?\]\s*)?>/i);if(!m)continue;
 const ents={};(m[0].match(/<!ENTITY\s+[^>]+>/gi)||[]).forEach(e=>{const mm=e.match(/<!ENTITY\s+(\S+)\s+(?:"([^"]*)"|'([^']*)')/i);if(mm)ents[mm[1]]=mm[2]??mm[3]});
 s=s.replace(m[0],'');for(const [k,v] of Object.entries(ents))s=s.split('&'+k+';').join(v);
 if(/<!DOCTYPE|<!ENTITY/i.test(s))console.log('STILL',f);
 const left=s.match(/&(?!amp;|lt;|gt;|quot;|apos;|#)[a-z_][\w.-]*;/gi);if(left)console.log('UNRESOLVED',f,left.slice(0,3));
 fs.writeFileSync(p,s);n++;console.log('stripped',f,Object.keys(ents).join(','))}
console.log('total',n);
