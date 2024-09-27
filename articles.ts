import * as v from 'valibot';

import { either as E } from './common.ts';
import { type Clock } from './utils.ts';





export type Articles = Awaited<
    ReturnType<
        ReturnType<typeof use_articles>['load']
    >
>;





export function use_articles ({

        kv,
        token,
        prefix = 'https://mataroa.blog',
        timeout = 5000,
        ttl_in_ms: expireIn = 1000 * 60 * 60 * 1, // 1 hour

}: Readonly<Partial<{

        kv: Deno.Kv,
        token: string,
        prefix: string,
        timeout: number,
        ttl_in_ms: number,

}>>) {

    async function load (clock?: Clock) {

        if (kv) {

            const timing_kv = clock?.start('kv');

            const result = await kv.getMany([

                keys.draft.path,
                keys.published.path,

            ], { consistency: 'eventual' }).then(v.parser(v.strictTuple([

                keys.draft.schema,
                keys.published.schema,

            ]))).then(E.right, E.error);

            if (clock &&  timing_kv) {
                clock.end(timing_kv);
            }

            if (result.type === 'right') {

                const [
                    { value: draft },
                    { value: published },
                ] = result.value;

                return { draft, published };

            }

        }

        v.parse(v.string('missing the API token'), token);

        const url = prefix.concat('/api/posts/');

        const timing_fetch = clock?.start('fetch');

        const response = await fetch(url, {

            signal: AbortSignal.timeout(timeout),

            headers: {
                Authorization: `Bearer ${ token }`,
            },

        });

        v.parse(is_true, response.ok, { message: response.statusText });

        const raw = await response.json();

        if (clock &&  timing_fetch) {
            clock.end(timing_fetch);
        }

        const { draft, published } = parse(raw);

        if (kv) {

            kv.atomic()
                .set(keys.draft.path,         draft, { expireIn })
                .set(keys.published.path, published, { expireIn })
                .commit()
                .catch(E.error)
            ;

        }

        return { draft, published };

    }

    return {

        load,

        async load_either (clock?: Clock) {

            try {

                return E.right(await load(clock));

            } catch (cause) {

                return E.error(cause);

            }

        },

        async obsolete () {

            if (kv) {

                await kv.atomic()
                    .delete(keys.draft.path)
                    .delete(keys.published.path)
                    .commit()
                ;

            }

        },

    };

}





const is_true = v.literal(true);

const base = {
    title: v.string('title'),
    slug: v.string('slug'),
    url: v.pipe(v.string('url'), v.url()),
    published_at: v.nullish(v.string('published_at')),
};

const published_at = v.pipe(
    v.string('published_at'),
    v.regex(/^\d{4}-\d{2}-\d{2}$/),
    v.description('ISO date'),
);

const arr_draft = v.array(v.object(base));

const arr_published = v.array(v.object({ ...base, published_at }));

const keys = {

    draft: gen([     'api', 'posts',     'draft' ], arr_draft),

    published: gen([ 'api', 'posts', 'published' ], arr_published),

};

const has_dates_on = v.parser(arr_published);

const parse = v.parser(v.pipe(

    v.object({
        ok: is_true,
        post_list: v.optional(arr_draft),
    }),

    v.transform(function ({ post_list = [] }) {

        return Object.groupBy(
            post_list,
            entry => entry.published_at ? 'published' : 'draft',
        );

    }),

    v.transform(function ({ draft = [], published = [] }) {

        return {
            draft: draft.slice(0, 3),
            published: has_dates_on(published).slice(0, 5),
        };

    }),

));





function gen <

    const K extends readonly string[],
    V extends v.GenericSchema,

> (path: K, value: V) {

    const schema = v.object({
        value,
        key: v.strictTuple(path.map(v.literal)),
        versionstamp: v.string(),
    });

    return { path, schema };

}

