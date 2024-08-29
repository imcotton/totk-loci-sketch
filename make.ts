import dedent from 'strip-indent';

import type { Inputs } from './main.ts';





export function make ({ issue, title, intro, image, coordinates }: Inputs): {

        slug: string;
        full: string;
        body: string;

} {

    const [x, y, z] = coordinates;

    const [prev, slug, next] = pagination(issue);

    const full = `${slug} ${title}`;

    const src = refine(image);

    const body = dedent(`

        <p>${intro}</p>

        <details>

            <summary>
                <img src="${src}" title="${[x, y, z].join(',')}" />
            </summary>

            <blockquote>
                <code>${x}</code>,
                <code>${y}</code>,
                <code>${z}</code>
            </blockquote>

        </details>

        <p>
            <a href="../${prev}/">prev</a>
            /
            <a href="../${next}/">next</a>
        </p>

    `);

    return { slug, full, body };

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





function refine (src: string) {

    return Array.of<(_: string) => string>(

        img => img.includes('.') ? img : img.concat('.jpeg'),

        img => /^https?:\/\//i.test(img) ? img : '/images/'.concat(img),

    ).reduce((x, f) => f(x), src);

}

