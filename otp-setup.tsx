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
        align-items: center;
    }

    [x-check] > fieldset {
        margin-bottom: 0;
    }

`;





export const OtpSetup = ({

        action,
        secret, issuer, account,
        url, svg,
        correct,

}: {

        action: string,
        secret: string,
        issuer: string,
        account: string,
        url: string,
        svg: string,
        correct?: boolean,

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
                <a href={ url } target="_blank">setup key</a>
            </p>

            <footer class="grid" x-check>

                <fieldset role="group">

                    <input  name="otp"
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            aria-invalid={
                                correct ===  true ? 'false' :
                                correct === false ?  'true' :
                                correct
                            }
                    />

                    <input type="submit" value="Check" />

                </fieldset>

                <span>
                    <a href={ `${ action }?rnd=${ Math.random() * 1e9 }` }
                    >reload</a>
                </span>

            </footer>

        </article>

    </form>

);

