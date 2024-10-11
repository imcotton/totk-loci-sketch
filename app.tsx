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

import * as v from 'valibot';

import { make_totp } from './otp.ts';
import { use_articles } from './articles.ts';
import { hero_image, pico_css, bundle } from './assets.ts';
import { Create } from './components/create.tsx';
import { DraftForm, OtpSetup, Outline } from './components/index.ts';
import type { Predicate } from './common.ts';
import { inputs, trimmed, nmap, assert, lookup, is_fn, mins
} from './common.ts';
import * as u from './utils.ts';





const otp_digit = 6;

const { verify, setup_uri } = make_totp(otp_digit);





export async function create_app ({

        kv, store,
        token, otp_secret,
        authorized, signing_site,
        server_timing,

}: {

        kv?: Deno.Kv,
        store?: Cache,

        token?: string,
        otp_secret?: string,

        authorized?: Iterable<string> | Predicate<string>,
        signing_site?: string,

        server_timing?: boolean,

}): Promise<{ fetch (_: Request): Response | Promise<Response> }> {

    kv ??= await u.open_Kv();
    store ??= await u.open_caches('assets-v1');

    const guard = shield_by_optional(otp_secret);

    const public_keys = nmap(f => is_fn(f) ? f : lookup(f), authorized);

    const articles = use_articles({ kv, token });

    const mount_assets_to = u.make_cache(bundle, store);

    return mount_assets_to(new_hono(server_timing))

        .get('/', CSP, ctx => u.try_catch(async function () {

            const latest = await articles.load_either(u.use_clock(ctx));

            const post = public_keys ? '/stage' : '/new';

            return ctx.render(<div class={ styles.home }>

                <DraftForm action={ post.concat('?pretty') }

                    digit={ otp_digit }
                    need_otp={ guard != null }

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

                assert(token?.length, 'API token is missing or invalid');

                const { publish, ...data } = ctx.req.valid('form');

                return ctx.render(<Create { ...{ data, token } }

                    draft={ publish !== true }
                    update={ articles.obsolete }

                />);

            }),

        )

        .post('/stage',

            vValidator('form', v.objectAsync({
                otp: u.mk_otp_schema(otp_digit, guard),
            })),

            vValidator('form', u.local(inputs), new_validator_hook),

            ctx => u.try_catch(async function () {

                assert(kv, 'Deno.Kv is unavailable');

                const state = u.UUIDv4();
                const challenge = u.UUIDv4();

                { // kv

                    const key = u.stash_by(state);
                    const expireIn = mins(2);

                    const { publish, ...data } = ctx.req.valid('form');
                    const draft = publish !== true;

                    u.okay(await kv.atomic()
                        .check({ key, versionstamp: null })
                        .set(key, { data, draft, challenge }, { expireIn })
                        .commit()
                    );

                }

                const { origin, href } = new URL('/back-stage', ctx.req.url);

                const client_id = await u.uuid_v5_url(origin);

                const signing_url = u.compose_signing_url({
                    state,
                    challenge,
                    client_id,
                    site: signing_site,
                    redirect_uri: href,
                    response_mode: 'body',
                });

                return ctx.redirect(signing_url);

            }),

        )

        .post('/back-stage',

            vValidator('form', u.signing_back),

            ctx => u.try_catch(async function () {

                assert(kv, 'Deno.Kv is unavailable');
                assert(token?.length, 'API token is missing or invalid');

                const { fingerprint, state, ...param } = ctx.req.valid('form');

                if (public_keys?.(fingerprint) !== true) {

                    await u.timing_bomb({ // Side-Channel resistance
                        till: Math.random() * 500,
                        note: 'unauthorized signing',
                    });

                }

                const { data, draft } = await kv.get(

                    u.stash_by(state)

                ).then(u.evaluate(param));

                return ctx.render(<Create { ...{ data, token, draft } }

                    update={ articles.obsolete }

                />);

            }),

        )

        .on([ 'GET', 'POST' ], '/setup-otp', CSP,

            vValidator('form', v.partial(v.object({
                secret: trimmed,
                issuer: trimmed,
                account: trimmed,
                otp: trimmed,
            }))),

            ctx => u.try_catch(async function () {

                const {
                    secret = u.UUIDv4(),
                    issuer = new URL(ctx.req.url).hostname,
                    account = 'admin',
                    otp,
                } = ctx.req.valid('form');

                const entropy = await u.hash_seed(secret);
                const href = setup_uri(entropy, { issuer, account });
                const correct = nmap(verify, otp)?.(entropy);

                const opts = { secret, issuer, account, href, correct };

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





const shield_by_optional = v.parser(v.optional(v.pipe(
    trimmed,
    v.nonEmpty('otp secret is empty'),
    v.transform(secret => function (otp: string) {

        return u.hash_seed(secret).then(verify(otp));

    }),
)));





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

        frameAncestors: [
            'https://dash.deno.com',  // Deno Deploy Playground
        ],

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

