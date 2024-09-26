/** @jsx jsx */ void jsx;

import { Hono }          from 'hono';
import type { Context }  from 'hono';
import { Style, css }    from 'hono/css';
import { jsx }           from 'hono/jsx';
import { jsxRenderer }   from 'hono/jsx-renderer';
import { prettyJSON }    from 'hono/pretty-json';
import { timing }        from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';
import { vValidator }    from 'hono/valibot-validator';

import { otpsecret } from '@libs/crypto/totp';

import * as v from 'valibot';

import { main } from './main.ts';
import { use_articles } from './articles.ts';
import { DraftForm, OtpSetup, Outline } from './components/index.ts';
import { hero_image, pico_css, bundle } from './assets.ts';
import * as u from './utils.ts';
import { inputs, trimmed } from './common.ts';





const otp_digit = 6;





export async function create_app ({

        kv, store, token, secret, server_timing

}: {

        kv?: Deno.Kv,
        store?: Cache,
        token?: string,
        secret?: string,
        server_timing?: boolean,

}): Promise<{ fetch (_: Request): Response | Promise<Response> }> {

    kv ??= await u.open_Kv();
    store ??= await u.open_caches('assets-v1');

    const guard = u.otp_check(secret);

    const articles = use_articles({ kv, token });

    const mount_assets_to = u.make_cache(bundle, store);

    return mount_assets_to(new_hono(server_timing))

        .get('/', CSP, ctx => u.try_catch(async function () {

            const latest = await articles.load_either(u.use_clock(ctx));

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
                otp: u.mk_otp_schema(otp_digit, guard),
            })),

            vValidator('form', u.local(inputs), new_validator_hook),

            ctx => u.try_catch(async function () {

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
                secret: u.v_base32,
                issuer: trimmed,
                account: trimmed,
                otp: trimmed,
            }))),

            ctx => u.try_catch(async function () {

                const {
                    secret = otpsecret(),
                    issuer = new URL(ctx.req.url).hostname,
                    account = 'admin',
                    otp: token,
                } = ctx.req.valid('form');

                const correct = await u.optional_verify(secret, token);

                const opts = { secret, issuer, account, correct };

                return ctx.render(<OtpSetup action="/setup" { ...opts } />);

            }),

        )

    ;

}





function new_validator_hook (

        { success, issues }: v.SafeParseResult<ReturnType<typeof u.local>>,
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





function new_hono (server_timing = false) {

    return (new Hono()

        .use(prettyJSON({ space: 4 }))

        .use(timing({ enabled: server_timing === true }))

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

    );

}





const CSP = secureHeaders({

    contentSecurityPolicy: {

        defaultSrc: [ `'none'` ],
        styleSrc: [   `'self'`, `'unsafe-inline'` ],
        imgSrc: [     `'self'`, `data:` ],
        frameAncestors: [ 'https://dash.deno.com' ],

    },

    xFrameOptions: false,

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

