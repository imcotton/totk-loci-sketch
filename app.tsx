/** @jsx jsx */ void jsx;

import { Hono }          from 'hono';
import { jsx, memo }     from 'hono/jsx';
import { jsxRenderer }   from 'hono/jsx-renderer';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { vValidator }    from 'hono/valibot-validator';

import { totpValidate, type TotpOptions } from '@maks11060/otp';

import * as v from 'valibot';

import { main } from './main.ts';
import { inputs, text_encode } from './common.ts';





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

} as const;





const new_hono = () => new Hono()

    .use(jsxRenderer(({ children }) => <html>

        <head>

            <meta charset="utf-8" />

            <meta name="viewport" content="width=device-width, initial-scale=1" />

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





const DraftForm = memo(({ digit, need_otp }: {

        digit: number,
        need_otp: boolean,

}) => <div style="max-width: 30em; margin: auto">

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

            <footer> { need_otp === false

                ? <input type="submit" value="Create" />

                : <fieldset role="group">

                    <input  type="number"
                            name="otp"
                            minlength={ digit }
                            maxlength={ digit }
                            placeholder={ `${ digit }-digit Code` }
                            required
                    />

                    <input type="submit" value="Create" />

                </fieldset>

            } </footer>

        </article>

    </form>

</div>);





export function app ({ token, secret, store }: {

        token?: string,
        secret?: string,
        store: Cache,

}): { fetch (_: Request): Response | Promise<Response> } {

    return new_hono()

        .get('/', CSP, ctx => ctx.render(<DraftForm

            digit={ otp_digit }
            need_otp={ secret != null }

        />))

        .post('/new', // ------------------------------------------------------

            vValidator('form', local(inputs, otp_check(secret)), function (result, ctx) {

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

        .get(pico_css.href, async function (ctx) { // -------------------------

            try {

                const key = ctx.req.raw;

                const value = await store.match(key, {
                    ignoreSearch: true,
                });

                if (value) {
                    return value;
                }

                const req = await fetch(pico_css.remote, {
                    headers: {
                        Accept: 'text/css,*/*',
                    },
                    integrity: pico_css.integrity,
                    signal: AbortSignal.timeout(3000),
                });

                if (req.ok === true) {
                    await store.put(key, req.clone());
                }

                return req;

            } catch (err) {

                if (err instanceof HTTPException) {
                    throw err;
                }

                if (err instanceof Error) {
                    throw new HTTPException(500, { message: err.message });
                }

                throw new HTTPException(500, { message: 'unknown' });

            }

        })

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

