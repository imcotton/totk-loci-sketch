/** @jsx jsx */ void jsx;

import { Hono }          from 'hono';
import type { Context }  from 'hono';
import { Style }         from 'hono/css';
import { jsx }           from 'hono/jsx';
import { jsxRenderer }   from 'hono/jsx-renderer';
import { HTTPException } from 'hono/http-exception';
import { prettyJSON }    from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { vValidator }    from 'hono/valibot-validator';

import { verify, otpsecret } from '@libs/crypto/totp';

import * as v from 'valibot';

import { main } from './main.ts';
import { DraftForm } from './draft-form.tsx';
import { OtpSetup } from './otp-setup.tsx';
import { catch_refine, inputs } from './common.ts';





const otp_digit = 6;





export function app ({ token, secret, store }: {

        token?: string,
        secret?: string,
        store: Cache,

}): { fetch (_: Request): Response | Promise<Response> } {

    const guard = otp_check(secret);

    return (new_hono(store)

        .get('/', CSP, ctx => ctx.render(

            <DraftForm action="/new?pretty"

                digit={ otp_digit }
                need_otp={ secret != null }

            />

        ))

        .post('/new',

            vValidator('form', v.objectAsync({
                otp: mk_otp_schema(otp_digit, guard),
            })),

            vValidator('form', local(inputs), new_validator_hook),

            ctx => try_catch(async function () {

                const { publish, ...rest } = ctx.req.valid('form');

                const { promise, resolve } = Promise.withResolvers<string>();

                const [ url ] = await Promise.all([

                    promise,

                    main(rest, {
                        token,
                        print: resolve,
                        draft: publish !== true,
                    }),

                ]);

                return ctx.render(
                    <ul>
                        <li>
                            <a href="/">back</a>
                        </li>
                        <li>
                            go to <a href={ url } target="_blank">{ url }</a>
                        </li>
                    </ul>
                );

            }),

        )

        .on([ 'GET', 'POST' ], '/setup', CSP,

            vValidator('form', v.partial(v.object({
                secret: v_base32,
                issuer: v.string(),
                account: v.string(),
                otp: v.string(),
            }))),

            ctx => try_catch(async function () {

                const {
                    secret = otpsecret(),
                    issuer = new URL(ctx.req.url).hostname,
                    account = 'admin',
                    otp: token,
                } = ctx.req.valid('form');

                const correct = await optional_verify(secret, token);

                const opts = { secret, issuer, account, correct };

                return ctx.render(<OtpSetup action="/setup" { ...opts } />);

            }),

        )

    );

}





async function optional_verify (secret: string, token?: string) {

    if (typeof token === 'string' && token.length > 0) {

        return true === await verify({ secret, token });

    }

}





const v_base32 = v.pipe(
    v.string(),
    v.regex(/^[A-Z2-7]+={0,6}$/),
    v.transform(str => str.replaceAll('=', '')),
);





function new_validator_hook (

        { success, issues }: v.SafeParseResult<ReturnType<typeof local>>,
        ctx: Context,

) {

    if (success === false) {

        const { nested = {} } = v.flatten(issues);

        return ctx.render(<ul> {

            Object.entries(nested).map(([ key, err ]) => <li>

                <strong>{ key }</strong>: {

                    err == null ? 'unknown' : <ol>

                        { err.map(msg => <li>{ msg }</li>) }

                    </ol>

                }

            </li>)

        } </ul>);

    }

}





function make_cache (it: Iterable<{

        href: string,
        remote: string,
        integrity?: string,
        Accept?: string,

}>) {

    return function (store: Cache, hono: Hono, timeout = 5_000) {

        return Array.from(it).reduce(function (router, info) {

            const { href, remote, integrity, Accept = '*/*' } = info;

            return router.get(href, ctx => try_catch(async function () {

                const key = ctx.req.raw.url;

                const value = await store.match(key);

                if (value) {
                    return value;
                }

                const res = await fetch(remote, {
                    integrity,
                    headers: { Accept },
                    signal: AbortSignal.timeout(timeout),
                });

                if (res.ok === true) {

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





const try_catch = catch_refine(function (err: unknown) {

    if (err instanceof HTTPException) {
        throw err;
    }

    if (err instanceof Error) {
        throw new HTTPException(500, { message: err.message });
    }

    throw new HTTPException(500, { message: 'unknown' });

});





function new_hono (store: Cache) {

    const pico_css = {

        version: '2.0.6',

        integrity: 'sha256-3V/VWRr9ge4h3MEXrYXAFNw/HxncLXt9EB6grMKSdMI=',

        Accept: 'text/css',

        get href () {
            return `/static/css/pico/${ this.version }/pico.min.css`;
        },

        base: 'https://esm.sh/@picocss/pico',

        get remote () {
            return `${ this.base }@${ this.version }/css/pico.min.css`;
        },

    } as const;

    const mount = make_cache([ pico_css ]);

    const hono = new Hono()

        .use(prettyJSON({ space: 4 }))

        .use(jsxRenderer(({ children }) => <html>

            <head>

                <meta charset="utf-8" />

                <meta   name="viewport"
                        content="width=device-width, initial-scale=1"
                />

                <link   rel="stylesheet"
                        href={ pico_css.href }
                        integrity={ pico_css.integrity }
                />

                <Style />

            </head>

            <body>
                <main class="container">
                    { children }
                </main>
            </body>

        </html>))

    ;

    return mount(store, hono);

}





function otp_check (secret?: string) {

    if (secret != null) {

        return async function (token: string) {

            try {

                return true === await verify({ token, secret });

            } catch (err) {

                console.error(err);

                return false;

            }

        };

    }

}





function local ({ entries: { issue, ...rest } }: typeof inputs) {

    return v.object({

        ...rest,

        issue: v.pipe(
            v.string(),
            v.transform(Number.parseInt),
            issue,
        ),

        publish: v.optional(v.pipe(
            v.literal('on'),
            v.transform(check => check === 'on'),
        )),

    });

}





function mk_otp_schema (

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





const CSP = secureHeaders({

    contentSecurityPolicy: {

        defaultSrc: [ `'self'` ],
        styleSrc: [   `'self'`, `'unsafe-inline'` ],
        imgSrc: [     `'self'`, `data:` ],

    },

});

