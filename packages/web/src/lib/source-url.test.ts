import { cleanSourceUrl } from './source-url';

let pass = 0;
let fail = 0;
const check = (name: string, cond: boolean) => {
  if (cond) {
    pass++;
    console.log('  PASS', name);
  } else {
    fail++;
    console.log('  FAIL', name);
  }
};

check('strips si from youtu.be links', cleanSourceUrl('https://youtu.be/abcdefghijk?si=XYZ') === 'https://youtu.be/abcdefghijk');
check(
  'keeps the video id and other params',
  cleanSourceUrl('https://www.youtube.com/watch?v=abcdefghijk&si=XYZ&t=5') === 'https://www.youtube.com/watch?v=abcdefghijk&t=5',
);
check('leaves clean links alone', cleanSourceUrl('https://www.youtube.com/watch?v=abcdefghijk') === 'https://www.youtube.com/watch?v=abcdefghijk');
check('returns non-URLs unchanged', cleanSourceUrl('not a url') === 'not a url');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
