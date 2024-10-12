/** @jsx jsx */ void jsx;

import { jsx } from 'hono/jsx';
import { raw } from 'hono/html';
import { css } from 'hono/css';

import { encodeHex } from '@std/encoding/hex';

import { qrcode } from '@libs/qrcode';

import { calc_integrity } from '../utils.ts';





export function AuthKeySetup ({

        pub, fingerprint, state, timestamp, signature

}: {

        pub: Uint8Array,
        fingerprint: string,
        state: string,
        timestamp: string,
        signature: Uint8Array,

}) {

    return (<article class={ style }>

        <header>
            <a href="/">{ '<' } back</a>
        </header>

        <div class="grid">

            <Pane title="public key" data={ pub } />

            <Pane title="fingerprint" data={ fingerprint } />

        </div>

        <details>

            <summary role="button" class="secondary outline">
                more...
            </summary>

            <ul x-more>

                <li>
                    <strong>timestamp</strong>: <code>{ timestamp }</code>
                </li>

                <li>
                    <strong>state</strong>: <code>{ state }</code>
                </li>

                <li>
                    <strong>signature</strong>:
                    <code>{ encodeHex(signature) }</code>
                </li>

            </ul>

        </details>

        { raw(`<script type="module">${ use_client }</script>`) }

    </article>);

}




const use_client: string = `

    const buttons = document.querySelectorAll('button[data-copy-txt]');

    for (const btn of buttons) {

        btn.addEventListener('click', async function () {

            const text = btn.dataset.copyTxt;

            if (text && text.length > 0) {
                await navigator.clipboard.writeText(text);
            }

        });

    }

`;





export const { integrity } = await calc_integrity(use_client);





type Data = string | Uint8Array;





function show (data: Data) {

    const txt = typeof data === 'string' ? data : encodeHex(data);
    const svg = qrcode(txt, { output: 'svg', border: 2 });

    return { txt, svg };

}





function Pane ({ title, data, classes = 'outline' }: {

        title: string,
        data: Data,
        classes?: string,

}) {

    const { txt, svg } = show(data);

    return (<details open>

        <summary role="button" class={ classes }>
            <strong>{ title }</strong>
        </summary>

        <div x-entry>

            <pre x-code-block>

                <code>{ txt }</code>

                <div x-copy>
                    <button type="button"
                            class="secondary"
                            data-copy-txt={ txt }
                    >copy</button>
                </div>

            </pre>

            <picture>{ raw(svg) }</picture>

        </div>

    </details>);

}





const style = css`

    & [x-entry] {

        display: flex;
        align-items: flex-start;

        & > pre {

            flex: 3;
            margin: 0;

        }

        & > picture {

            flex: 1;

            & svg {
                width: 100%;
            }

        }

    }

    & [x-more] {
        & li > code {
            display: block;
        }
    }

    & [x-code-block] {

        white-space: pre-line;
        word-break: keep-all;

        & [x-copy] {

            text-align: right;

            & button {
                padding: 6px;
                line-height: 1.4;
                margin: 6px;
                margin-top: 0;
                font-size: smaller;
            }

        }

    }

`;

