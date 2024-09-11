/** @jsx jsx */ void jsx;

import { Hono }          from 'hono';
import type { Context }  from 'hono';
import { jsx }           from 'hono/jsx';
import { jsxRenderer }   from 'hono/jsx-renderer';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { vValidator }    from 'hono/valibot-validator';

import { totpValidate, type TotpOptions } from '@maks11060/otp';

import * as v from 'valibot';

import { main } from './main.ts';
import { DraftForm } from './draft-form.tsx';
import { catch_refine, inputs, text_encode } from './common.ts';





const otp_digit = 6;





export function app ({ token, secret, store }: {

        token?: string,
        secret?: string,
        store: Cache,

}): { fetch (_: Request): Response | Promise<Response> } {

    const guard = otp_check(secret);

    return (new_hono(store)

        .get('/', CSP, ctx => ctx.render(<DraftForm

            digit={ otp_digit }
            need_otp={ secret != null }

        />))

        .post('/new',

            vValidator('form', local(inputs, guard), new_validator_hook),

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
                    <p>
                        go to
                        <a href={ url }>{ url }</a>
                    </p>
                );

            }),

        )

    );

}





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

                const key = ctx.req.raw;

                const value = await store.match(key, {
                    ignoreSearch: true,
                });

                if (value) {
                    return value;
                }

                const res = await fetch(remote, {
                    integrity,
                    headers: { Accept },
                    signal: AbortSignal.timeout(timeout),
                });

                if (res.ok === true) {
                    await store.put(key, res.clone());
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

    return mount(store, new Hono())

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

            </head>

            <body>
                <main class="container">
                    { children }
                </main>
            </body>

        </html>))

    ;

}





const pre_check = (digits: NonNullable<TotpOptions['digits']>) => ({

    otp_check (

            secret?: string,

    ) {

        if (secret != null) {

            return (code: string) => totpValidate({
                code,
                digits,
                secret: text_encode(secret),
            });

        }

    },

    local (

            { entries: { issue, ...rest } }: typeof inputs,
            verify?: (_: string) => Promise<boolean>,

    ) {

        const base = {

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

        };

        if (verify == null) {
            return v.object(base);
        }

        return v.objectAsync({

            ...base,

            otp: v.pipeAsync(
                v.string(),
                v.length(digits),
                v.decimal(),
                v.checkAsync(verify, 'OTP verify failed'),
            ),

        });

    },

});

const { otp_check, local } = pre_check(otp_digit);





const CSP = secureHeaders({

    contentSecurityPolicy: {

        defaultSrc: [ `'self'` ],
        styleSrc: [   `'self'`, `'unsafe-inline'` ],
        imgSrc: [     `'self'`, `data:` ],

    },

});

