import dedent from 'dedent';

import * as v from 'valibot';





export interface Inputs {

    readonly issue: number,
    readonly title: string,
    readonly intro: string,
    readonly image: string,
    readonly coordinates: [ x: string, y: string, z: string ],

}





export async function main (raw: Inputs, {

        posts = 'https://mataroa.blog/api/posts',

        token = '__UNSET__',

        draft = true,

        print = console.log,

} = {}): Promise<void> {

    const url = await v.parseAsync(v.pipeAsync(

        inputs,

        v.transform(make),

        v.transformAsync(post({ posts, draft, token })),

    ), raw);

    print(url);

}





const digits = v.pipe(v.string(), v.regex(/^-?\d{4}/));

const inputs = v.object({

    issue: v.pipe(v.number(), v.safeInteger()),
    title: v.string(),
    intro: v.string(),
    image: v.string(),
    coordinates: v.tuple([ digits, digits, digits ]),

});





function post ({ posts, token, draft }: {

        posts: string,
        token: string,
        draft?: boolean,

}) {

    return async function ({ slug, full, body }: ReturnType<typeof make>) {

        const date = new Date().toISOString().slice(0, 10);
        const published_at = draft === false ? date : undefined;

        v.parse(
            v.object({
                ok: v.literal(true),
                slug: v.literal(slug),
            }),
            await send(`${ posts }/`, {
                token,
                method: 'POST',
                data: { body, published_at, title: slug },
            }),
        );

        const { url } = v.parse(
            v.object({
                ok: v.literal(true),
                url: v.pipe(v.string(), v.url()),
            }),
            await send(`${ posts }/${ slug }/`, {
                token,
                method: 'PATCH',
                data: { title: full },
            }),
        );

        return url;

    };

}





async function send (url: string, { method, token, data }: {

        method: 'POST' | 'PATCH',
        token: string,
        data: object,

}) {

    const res = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${ token }`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    v.parse(v.literal(true), res.ok, { message: res.statusText });

    return res.json();

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





export function make ({ issue, title, intro, image, coordinates }: Inputs): {

        slug: string,
        full: string,
        body: string,

} {

    const [ x, y, z ] = coordinates;

    const [ prev, slug, next ] = pagination(issue);

    const full = `${ slug } ${ title }`;

    const src = refine(image);

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

}

