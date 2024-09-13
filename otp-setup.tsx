/** @jsx jsx */ void jsx;

import { jsx }        from 'hono/jsx';
import { raw }        from 'hono/html';
import { css, Style } from 'hono/css';





const style = css`

    [x-column] {
        justify-items: center;
        align-items: center;
    }

    [x-column] [x-qrcode] {
        max-width: 15em;
    }

    [x-column] [x-qrcode] svg {
        width: 100%;
    }

    [x-import-url] {
        text-align: right;
        padding: 1rem;
    }

    [x-check] {
        align-items: baseline;
    }

`;





export const OtpSetup = ({

        action,
        secret, issuer, account,
        svg, url,
        correct, token,

}: {

        action: string,
        secret: string,
        issuer: string,
        account: string,
        svg: string,
        url: string,
        correct?: boolean,
        token?: string,

}) => (

    <form action={ action } method="post">

        <Style>{ style }</Style>

        <article>

            <details>
                <summary role="button" class="secondary">secret</summary>
                <input type="text" name="secret" value={ secret } />
            </details>

            <div class="grid" x-column>

                <fieldset>
                    <label>domain (<strong>issuer</strong>)
                        <input type="text" name="issuer" value={ issuer } />
                    </label>

                    <label>user (<strong>account</strong>)
                        <input type="text" name="account" value={ account } />
                    </label>

                    <input type="submit" class="outline" value="update" />

                </fieldset>

                <div x-qrcode>
                    <p>
                        { raw(svg) }
                    </p>
                </div>

            </div>

            <p x-import-url>
                <a href={ url } target="_blank">URL to import</a>
            </p>

            <footer class="grid" x-check>

                <fieldset role="group">

                    <input  name="otp"
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            value={ token }
                            aria-invalid={
                                correct ===  true ? 'false' :
                                correct === false ?  'true' :
                                correct
                            }
                    />

                    <input type="submit" value="Check" />

                </fieldset>

                <span>
                    <a href={ `${ action }?reload=${ Math.random() }` }
                    >reload</a>
                </span>

            </footer>

        </article>

    </form>

);

