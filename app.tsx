/** @jsx jsx */ void jsx;

import { Hono }          from 'hono';
import type { Context }  from 'hono';
import { Style, css }    from 'hono/css';
import { jsx }           from 'hono/jsx';
import { jsxRenderer }   from 'hono/jsx-renderer';
import { HTTPException } from 'hono/http-exception';
import { prettyJSON }    from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { vValidator }    from 'hono/valibot-validator';

import { verify, otpsecret } from '@libs/crypto/totp';

import * as v from 'valibot';

import { main } from './main.ts';
import { use_articles } from './articles.ts';
import { DraftForm, OtpSetup, Outline } from './components/index.ts';
import { hero_image, pico_css, bundle, type Mount } from './assets.ts';
import { catch_refine, inputs, trimmed } from './common.ts';





const otp_digit = 6;





export function app ({ token, secret, kv, store }: {

        token?: string,
        secret?: string,
        kv?: Deno.Kv,
        store: Cache,

}): { fetch (_: Request): Response | Promise<Response> } {

    const guard = otp_check(secret);

    const articles = use_articles({ kv, token });

    return (new_hono(store)

        .get('/', CSP, ctx => try_catch(async function () {

            const latest = await articles.load_either();

            return ctx.render(<div class={ styles.home }>

                <DraftForm action="/new?pretty"

                    digit={ otp_digit }
                    need_otp={ secret != null }

                />

                <aside>

                    <p>
                        <img    src={ hero_image.href }
                                alt={ hero_image.alt }
                                decoding="async"
                                loading="lazy"
                        />
                    </p>

                    {
                        latest.type === 'right'
                            ? <Outline { ...latest.value } />
                            : <mark>{ latest.error.message }</mark>
                    }

                </aside>

            </div>);

        }))

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

                    articles.obsolete(),

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
                issuer: trimmed,
                account: trimmed,
                otp: trimmed,
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
    trimmed,
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





function make_cache (it: Iterable<Mount>) {

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

    const mount = make_cache(bundle);

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

        defaultSrc: [ `'none'` ],
        styleSrc: [   `'self'`, `'unsafe-inline'` ],
        imgSrc: [     `'self'`, `data:` ],

    },

});





const styles = {

    home: css`

        display: flex;
        gap: 1rem;

        @media (max-width: 1023px) {
            flex-direction: column-reverse;
        }

        & [x-draft-form] {
            flex: 2;
        }

        & aside {

            flex: 1;

            & img {
                border-radius: 1em;
            }

        }

    `,

};

