import dedent from 'strip-indent';

import type { Inputs, Checksum } from './main.ts';





export interface Outputs {

    readonly slug: string;
    readonly full: string;
    readonly body: string;

}





export function make ({ integrity }: {

        integrity: (_: Checksum) => string,

}): (_: Inputs & { readonly checksum: Checksum }) => Outputs {

    return function ({ issue, title, intro, image, checksum, coordinates }) {

        const [ x, y, z ] = coordinates;

        const [ prev, slug, next ] = pagination(issue);

        const full = `${ slug } ${ title }`;

        const src = `${ image }#${ integrity(checksum) }`;

        const body = dedent(`

            <p>${ intro }</p>

            <details>

                <summary>
                    <img src="${ src }" title="${ [ x, y, z ].join(',') }" />
                </summary>

                <blockquote>
                    <code>${ x }</code>,
                    <code>${ y }</code>,
                    <code>${ z }</code>
                </blockquote>

            </details>

            <p>
                <a href="../${ prev }/">prev</a>
                /
                <a href="../${ next }/">next</a>
            </p>

        `);

        return { slug, full, body };

    };

}





function pagination (n: number, {

        padding = 3,
        pad = '0',
        prefix = 'issue-',

} = {}) {

    const map = (m: number) => prefix.concat(
        m.toString().padStart(padding, pad)
    );

    return [
        map(n - 1),
        map(n + 0),
        map(n + 1),
    ] as const;

}

