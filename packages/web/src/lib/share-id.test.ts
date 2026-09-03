import { generateShareId, isValidShareId, SHARE_ID_LENGTH } from './share-id';
let pass=0, fail=0;
const check=(n,c)=>{ if(c){pass++;console.log('  PASS',n)} else {fail++;console.log('  FAIL',n)} };

const ids = Array.from({length:50000}, generateShareId);
check('length is 10', ids.every(i=>i.length===SHARE_ID_LENGTH));
check('all self-validate', ids.every(isValidShareId));
check('URL-safe only (no /+= )', ids.every(i=>/^[A-Za-z0-9_-]+$/.test(i)));
check('no collisions in 50k', new Set(ids).size===50000);

// uniform-ish distribution => no modulo bias toward early alphabet
const counts={};
for(const id of ids) for(const c of id) counts[c]=(counts[c]||0)+1;
const vals=Object.values(counts), min=Math.min(...vals), max=Math.max(...vals);
check(`64 symbols all used (${Object.keys(counts).length})`, Object.keys(counts).length===64);
check(`no modulo bias (max/min ${(max/min).toFixed(3)} < 1.1)`, max/min < 1.1);

check('rejects wrong length', !isValidShareId('abc'));
check('rejects path traversal', !isValidShareId('../../etc/p'));
check('rejects sql-ish input', !isValidShareId("' OR 1=1--"));
check('rejects empty', !isValidShareId(''));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
