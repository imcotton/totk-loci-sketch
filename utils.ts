import type { Hono, Context } from 'hono';
import { HTTPException }      from 'hono/http-exception';
import { startTime, endTime } from 'hono/timing';

import * as v from 'valibot';

import { type Mount } from './assets.ts';
import { catch_refine, text_encode, type inputs } from './common.ts';

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

