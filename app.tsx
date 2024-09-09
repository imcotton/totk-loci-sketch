/** @jsx jsx */ void jsx;

import { Hono }          from 'hono';
import { jsx }           from 'hono/jsx';
import { csrf }          from 'hono/csrf';
import { html }          from 'hono/html';
import { vValidator }    from 'hono/valibot-validator';
import { jsxRenderer }   from 'hono/jsx-renderer';
import { secureHeaders } from 'hono/secure-headers';

import { totpValidate } from '@maks11060/otp';

import * as v from 'valibot';

import { main } from './main.ts';
import { inputs } from './common.ts';





const otp_digit = 6;





const pico_css = {

    version: '2.0.6',

    integrity: 'sha256-3V/VWRr9ge4h3MEXrYXAFNw/HxncLXt9EB6grMKSdMI=',

    get href () {
        return `/static/css/pico/${ this.version }/pico.min.css`;
    },

    get remote () {
        return `https://esm.sh/@picocss/pico@${ this.version }/css/pico.min.css`;
    },

};





const new_hono = () => new Hono()

    .use(csrf())

    .use(jsxRenderer(({ children }) => html`

        <html>

            <head>

                <meta charset="utf-8" />

                <meta name="viewport" content="width=device-width, initial-scale=1" />

                <link   rel="stylesheet"
                        crossorigin="anonymous"
                        href="${ pico_css.href }"
                        integrity="${ pico_css.integrity }"
                >

            </head>

            <body>
                <main class="container">
                    ${ children }
                </main>
            </body>

        </html>

    `))

;





export const app = ({ token, secret }: {

        token?: string,
        secret?: string,

}): { fetch (_: Request): Response | Promise<Response> } => new_hono()

    .get('/', CSP, async function (ctx) { // ----------------------------------

        return ctx.render(<div style="max-width: 30em; margin: auto">

            <form action="/new" method="post">

                <article>

                    <header>New</header>

                    <fieldset>

                        <div class="grid" style="align-items: center">

                            <label>issue
                                <input type="number" name="issue" required />
                            </label>

                            <label>
                                <input type="checkbox" name="publish" />
                                publish
                            </label>

                        </div>

                        <label>title
                            <input type="text" name="title" required />
                        </label>

                        <label>intro
                            <input type="text" name="intro" required />
                        </label>

                        <label>image
                            <input type="text" name="image" required />
                        </label>

                        <label>coordinates
                            <div class="grid">
                                <input type="text" name="coordinates" required />
                                <input type="text" name="coordinates" required />
                                <input type="text" name="coordinates" required />
                            </div>
                        </label>

                    </fieldset>

                    <footer> { secret == null

                        ? <input type="submit" value="Create" />

                        : <fieldset role="group">

                            <input  type="number"
                                    name="otp"
                                    minlength={ otp_digit }
                                    maxlength={ otp_digit }
                                    placeholder={ `${ otp_digit }-digit Code` }
                                    required
                            />

                            <input type="submit" value="Create" />

                        </fieldset>

                    } </footer>

                </article>

            </form>

        </div>);

    })

    .post('/new', // ----------------------------------------------------------

        vValidator('form', local(secret, inputs), function (result, ctx) {

            if (result.success === false) {

                const { nested = {} } = v.flatten(result.issues);

                return ctx.render(<ul> {

                    Object.entries(nested).map(([ key, err ]) => <li>

                        <strong>{ key }</strong>: { err?.at(0) ?? 'unknown' }

                    </li>)

                } </ul>);

            }

        }),

        async function (ctx) {

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

        },

    )

    .get(pico_css.href, async function (ctx) { // -----------------------------

        try {

            const store = await caches.open(`assets-v1`);

            const key = ctx.req.raw;

            const value = await store.match(key, {
                ignoreSearch: true,
            });

            if (value != null) {
                return value;
            }

            const req = await fetch(pico_css.remote, {
                headers: {
                    Accept: 'text/css,*/*',
                },
                integrity: pico_css.integrity,
                signal: AbortSignal.timeout(3000),
            });

            if (req.ok !== true) {
                return req;
            }

            await store.put(key, req.clone());

            return req;

        } catch (err) {

            if (err instanceof Error) {
                return ctx.text(err.message, 500);
            }

            return ctx.text('unknown', 500);

        }

    })

;





function local (

        secret: string | undefined,
        { entries: { issue, ...rest } }: typeof inputs,

) {

    return v.objectAsync({

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

        otp: v.optionalAsync(v.pipeAsync(
            v.string(),
            v.length(otp_digit),
            v.decimal(),
            v.checkAsync(code => secret != null && totpValidate({
                code,
                digits: otp_digit,
                secret: text_encode(secret),
            }), 'OTP verify failed'),
        )),

    });

}





const CSP = secureHeaders({

    contentSecurityPolicy: {

        defaultSrc: [ `'self'` ],
        styleSrc: [   `'self'`, `'unsafe-inline'` ],

    },

});





function text_encode (str: string) {

    return txt.encode(str);

}

const txt = new TextEncoder();

