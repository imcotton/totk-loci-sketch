import { argv } from 'node:process';

import { encodeBase32 } from '@std/encoding/base32';

import * as v from 'valibot';

const { crypto: webcrypto } = globalThis;





export function otpsecret (n = 20): string {

    const entropy = webcrypto.getRandomValues(new Uint8Array(n));

    return encodeBase32(entropy).replaceAll('=', '');

}





if (import.meta.main) {

    const [ size ] = argv.slice(2);

    const n = v.parse(v.optional(v.pipe(
        v.string(),
        v.digits(),
        v.transform(Number.parseInt),
    )), size);

    console.log(otpsecret(n));

}

