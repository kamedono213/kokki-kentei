const o=require('./symbolism-en.json');const codes=process.argv.slice(2);
for(const c of codes){const v=o[c];if(!v){console.log('##',c,'MISSING');continue;}
console.log('##',c,v.ja,'|',v.title,'| rev',v.revid);console.log('LEAD:',v.lead.replace(/\s+/g,' ').slice(0,600));console.log('SEC:',v.sec.replace(/\s+/g,' ').slice(0,1300));console.log();}
