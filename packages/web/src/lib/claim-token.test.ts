import { claimTokenMatches, hashClaimToken, newClaimToken } from './claim-token';

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

const token = newClaimToken();
const hash = hashClaimToken(token);

check('token is 43 url-safe characters (32 bytes)', /^[\w-]{43}$/.test(token));
check('tokens are unique', newClaimToken() !== token);
check('hash is 64 hex characters', /^[0-9a-f]{64}$/.test(hash));
check('hash is not the token', hash !== token);
check('matching token is accepted', claimTokenMatches(token, hash));
check('another token is rejected', !claimTokenMatches(newClaimToken(), hash));
check('missing token is rejected', !claimTokenMatches(undefined, hash));
check('empty token is rejected', !claimTokenMatches('', hash));
check('non-string token is rejected', !claimTokenMatches(123, hash));
check('a claimed jack (no hash) rejects everything', !claimTokenMatches(token, null));
check('a malformed stored hash is rejected, not thrown', !claimTokenMatches(token, 'abc'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
