import { encodeBase32 } from '@std/encoding/base32';

const { crypto: webcrypto } = globalThis;





export function otpsecret (n = 20): string {

    const entropy = webcrypto.getRandomValues(new Uint8Array(n));

    return encodeBase32(entropy).replaceAll('=', '');

}





if (import.meta.main) {

    const { argv } = await import('node:process');

    const [ size ] = argv.slice(2);

    const v = await import('valibot');

    const n = v.parse(v.optional(v.pipe(
        v.string(),
        v.nonEmpty(),
        v.digits(),
        v.transform(Number.parseInt),
        v.safeInteger(),
    )), size);

    console.log(otpsecret(n));

}

