import * as v from 'valibot';

import { encodeHex } from '@std/encoding/hex';

import { make, type Outputs } from './make.ts';

const { crypto: webcrypto } = globalThis;





export interface Inputs {

    readonly issue: number;
    readonly title: string;
    readonly intro: string;
    readonly image: string;
    readonly coordinates: readonly [ x: string, y: string, z: string ];

}

export interface Checksum {

    readonly sha256: ArrayBuffer;
    readonly sha512: ArrayBuffer;

}





export async function main (raw: Inputs, {

        prefix = 'https://mataroa.blog',

        token = '__UNSET__',

        draft = true,

        show = bytes_take(8),

        print = console.log,

} = {}): Promise<void> {

    const posts = prefix.concat('/api/posts');

    const url = await v.parseAsync(v.pipeAsync(

        inputs,

        v.transformAsync(async function (rest) {

            const checksum = await fetch_checksum(prefix, rest.image);

            return { ...rest, checksum };

        }),

        v.transform(make({

            integrity: checksum => show(checksum.sha512),

        })),

        v.transformAsync(post({ posts, draft, token })),

    ), raw);

    print(url);

}





const digits = v.pipe(v.string(), v.regex(/^-?\d{4}/));

const inputs = v.object({

    issue: v.pipe(v.number(), v.safeInteger()),
    title: v.string(),
    intro: v.string(),
    image: v.pipe(v.string(), v.transform(refine_image)),
    coordinates: v.pipe(v.tuple([ digits, digits, digits ]), v.readonly()),

});





async function fetch_checksum (prefix: string, src: string) {

    const url = src.startsWith('http') ? src : prefix.concat(src);

    const bytes = await get_bytes(url);

    return make_checksum(bytes);

}





function post ({ posts, token, draft }: {

        posts: string,
        token: string,
        draft?: boolean,

}) {

    return async function ({ slug, full, body }: Outputs) {

        const date = new Date().toISOString().slice(0, 10);
        const published_at = draft === false ? date : undefined;

        await send(`${ posts }/`, {

            token,
            method: 'POST',
            data: { body, published_at, title: slug },

        }).then(v.parser(v.object({

            ok: v.literal(true),
            slug: v.literal(slug),

        })));

        const { url } = await send(`${ posts }/${ slug }/`, {

            token,
            method: 'PATCH',
            data: { title: full },

        }).then(v.parser(v.object({

            ok: v.literal(true),
            url: v.pipe(v.string(), v.url()),

        })));

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





async function get_bytes (url: string, {

        method = 'GET',
        signal = AbortSignal.timeout(5000),
        Accept = 'image/*,*/*',

} = {}) {

    const res = await fetch(url, {
        method,
        signal,
        headers: { Accept },
    });

    v.parse(v.literal(true), res.ok, { message: res.statusText });

    return res.arrayBuffer();

}





async function make_checksum (bytes: BufferSource) {

    const [ sha256, sha512 ] = await Promise.all([

        webcrypto.subtle.digest('SHA-256', bytes),
        webcrypto.subtle.digest('SHA-512', bytes),

    ]);

    return { sha256, sha512 };

}





function bytes_take (n: number) {

    return function (source: BufferSource) {

        const ab = ArrayBuffer.isView(source) ? source.buffer : source;
        const buf = new Uint8Array(ab, 0, Math.min(n, source.byteLength));

        return encodeHex(buf);

    };

}





function refine_image (src: string) {

    let img = src;

    img = img.includes('.') ? img : img.concat('.jpeg');
    img = /^https?:\/\//i.test(img) ? img : '/images/'.concat(img);

    return img;

}

