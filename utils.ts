import type { Hono, Context } from 'hono';
import { HTTPException }      from 'hono/http-exception';
import { startTime, endTime } from 'hono/timing';

import { delay } from '@std/async/delay';

import * as b64 from '@std/encoding/base64';
import * as hex from '@std/encoding/hex';

import { generate }      from '@std/uuid/v5';
import { NAMESPACE_URL } from '@std/uuid/constants';

import * as v from 'valibot';

import { type Mount } from './assets.ts';
import { catch_refine, text_encode, inputs, mins } from './common.ts';

export { otpsecret } from './otpsec.ts';

const { crypto: webcrypto } = globalThis;





export function UUIDv4 (): string {

    return webcrypto.randomUUID();

}





export const hash_seed = sample(function (ab) {

    return new Uint8Array(ab).subarray(0, 24);

});

function sample <T> (refine: (_: ArrayBuffer) => T) {

    return async function (secret: string) {

        const data = text_encode(secret);
        const ab = await webcrypto.subtle.digest('SHA-256', data);

        return refine(ab);

    };

}





export async function open_Kv (path?: string) {

    if (   typeof globalThis.Deno === 'object'
        && typeof globalThis.Deno.openKv === 'function'
    ) {

        return await Deno.openKv(path);

    }

}





export async function open_caches (name: string) {

    if (typeof globalThis.caches === 'object') {

        return await globalThis.caches.open(name);

    }

}





export function local ({ issue, ...rest }: typeof inputs) {

    return v.object({

        ...rest,

        issue: v.pipe(
            v.string(),
            v.trim(),
            v.transform(Number.parseInt),
            issue,
        ),

        publish: v.optional(v.pipe(
            v.literal('on'),
            v.transform(check => check === 'on'),
        )),

    });

}





export const try_catch = catch_refine(function (err: unknown) {

    if (err instanceof HTTPException) {
        throw err;
    }

    if (err instanceof Error) {
        throw new HTTPException(500, { message: err.message });
    }

    throw new HTTPException(500, { message: 'unknown' });

});





export function make_cache (it: Iterable<Mount>, store?: Cache) {

    return function (hono: Hono, timeout = 5_000) {

        return Array.from(it).reduce(function (router, info) {

            const { href, remote, integrity, Accept = '*/*' } = info;

            return router.get(href, ctx => try_catch(async function () {

                const key = ctx.req.raw.url;

                const value = await store?.match(key);

                if (value != null) {
                    return value;
                }

                const res = await fetch(remote, {
                    integrity,
                    headers: { Accept },
                    signal: AbortSignal.timeout(timeout),
                });

                if ((store != null) && (res.ok === true)) {

                    const headers = new Headers(res.headers);

                    headers.set(
                        'Cache-Control',
                        'public, max-age=31536000, immutable',
                    );

                    const copy = new Response(res.clone().body, {
                        ...res,
                        headers,
                    });

                    await store.put(key, copy);

                }

                return res;

            }));

        }, hono);

    };

}





export function mk_otp_schema (

        digits: number,
        verify?: (_: string) => Promise<boolean>,

) {

    if (verify == null) {
        return v.optional(v.string());
    }

    return v.nonOptionalAsync(v.pipeAsync(
        v.string(),
        v.length(digits),
        v.digits(),
        v.checkAsync(verify, 'OTP verify failed'),
    ));

}





export const okay = v.parser(v.object({ ok: v.literal(true) }));





export async function timing_bomb ({ till, note }: {

        till: number,
        note: string,

}) {

    await delay(till);

    throw new Error(note);

}





export function stash_by <const T extends string[]> (...args: T) {

    return [ 'stash', ...args ] as const;

}





export function uuid_v5_url (origin: string) {

    return generate(NAMESPACE_URL, text_encode(origin));

}





export function compose_signing_url ({

        site = 'https://sign-poc.js.org',
        path = '/auth',
        ...rest

}: {

        state: string,
        challenge: string,
        client_id: string,
        redirect_uri: string,
        response_mode: 'body' | 'query' | 'fragment',
        site?: string,
        path?: string,

}) {

    const params = new URLSearchParams(rest).toString();

    return site.concat(path, '#', params);

}





export const signing_back = v.pipeAsync(

    v.object({

        pub: v.pipe(
            v.string(),
            v.hexadecimal(),
            v.transform(hex.decodeHex),
        ),

        signature: v.pipe(
            v.string(),
            v.hexadecimal(),
            v.transform(hex.decodeHex),
        ),

        state: v.pipe(v.string(), v.uuid()),

        timestamp: v.pipe(
            v.string(),
            v.isoTimestamp(),
            v.check(within(mins(5)), 'outdated signing timestamp'),
        ),

    }),

    v.transformAsync(async function ({ pub, ...rest }) {

        const fingerprint = await make_fingerprint(pub);

        return { ...rest, pub, fingerprint };

    }),

);





function within (ms: number) {

    return function <T extends number | string | Date> (value: NoInfer<T>) {

        const delta = Date.now() - new Date(value).valueOf();

        return delta < ms;

    };

}





async function make_fingerprint (source: BufferSource) {

    const hash = await webcrypto.subtle.digest('SHA-256', source);
    const base64 = b64.encodeBase64(hash).replace(/=$/, '');

    return 'SHA256:'.concat(base64);

}





const kv_entry_stash = v.object({

    key: v.array(v.string()),

    value: v.object({
        data: v.object(inputs),
        draft: v.boolean(),
        challenge: v.string(),
    }),

    versionstamp: v.string(),

}, 'stash entry is missing');





export function evaluate <

    T extends v.InferOutput<typeof signing_back>

> ({
            pub  ,  signature  ,  timestamp
}: Pick<T, 'pub' | 'signature' | 'timestamp'>) {

    return v.parserAsync(v.pipeAsync(

        kv_entry_stash,

        v.checkAsync(function ({ value: { challenge } }) {

            return verify({ pub, signature, timestamp, challenge });

        }),

        v.transform(({ value }) => value),

    ), { abortEarly: true, abortPipeEarly: true });

}





async function verify ({ timestamp, challenge, signature, pub }: {

        timestamp: string,
        challenge: string,
        signature: BufferSource,
        pub: BufferSource,

}) {

    const sample = await HMAC_SHA256({
            key: text_encode(timestamp),
        message: text_encode(challenge),
    });

    return EdDSA({ pub, sample, signature });

}





async function EdDSA ({

           signature  ,  sample  ,  pub
}: Record<'signature' | 'sample' | 'pub', BufferSource>) {

    const algo = {
              name: 'Ed25519',
        namedCurve: 'Ed25519',
    } as const;

    const key = await webcrypto.subtle.importKey(
        'raw', pub, algo, false, [ 'verify' ]
    );

    return webcrypto.subtle.verify(algo, key, signature, sample);

}





async function HMAC_SHA256 ({ key, message }: {

        key: BufferSource,
        message: BufferSource,

}) {

    const name = 'HMAC';

    const crypto_key = await webcrypto.subtle.importKey(
        'raw',
        key,
        { name, hash: 'SHA-256' },
        false,
        [ 'sign', 'verify' ],
    );

    return webcrypto.subtle.sign(name, crypto_key, message);

}





export type Clock = Readonly<ReturnType<typeof use_clock>>;

export function use_clock (ctx: Context) {

    return {

        start (name: string, description?: string) {

            startTime(ctx, name, description);

            return name;

        },

        end (name: string, precision?: number) {

            endTime(ctx, name, precision);

        },

    };

}

