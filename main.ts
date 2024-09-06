import * as v from 'valibot';

import { encodeHex } from '@std/encoding/hex';

import { make, type Outputs } from './make.ts';
import { inputs } from './common.ts';

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

        v.transformAsync(async function ({ image, ...rest }) {

            const refined = refine_image(image);

            const checksum = await fetch_checksum(prefix, refined);

            return { ...rest, checksum, image: refined };

        }),

        v.transform(make({

            integrity: checksum => show(checksum.sha512),

        })),

        v.transformAsync(post({ posts, draft, token })),

    ), raw);

    print(url);

}





async function fetch_checksum (prefix: string, src: string) {

    const url = src.startsWith('http') ? src : prefix.concat(src);

    const bytes = await get_bytes(url);

    return make_checksum(bytes);

}





function now () {

    return new Date().toISOString().slice(0, 10);

}





function post ({ posts, token, draft }: {

        posts: string,
        token: string,
        draft: boolean,

}): (_: Outputs) => Promise<string> {

    return async function ({ slug: title, full, body }) {

        await send('POST', `${ posts }/`, {

            token,

            data: draft ? { title, body }
                        : { title, body, published_at: now() },

        }).then(v.parser(v.object({

            ok: v.literal(true),
            slug: v.literal(title),

        })));

        const { url } = await send('PATCH', `${ posts }/${ title }/`, {

            token,

            data: { title: full },

        }).then(v.parser(v.object({

            ok: v.literal(true),
            url: v.pipe(v.string(), v.url()),

        })));

        return url;

    };

}





async function send (

        method: 'POST' | 'PATCH',

        url: string,

        { token,         data,        }:
        { token: string, data: object },

) {

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

