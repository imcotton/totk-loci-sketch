import * as v from 'valibot';

import { right, error } from './either.ts';





export type Articles = Awaited<
    ReturnType<
        ReturnType<typeof use_articles>['load']
    >
>;





export function use_articles ({

        token,
        store,
        prefix = 'https://mataroa.blog',
        timeout = 5000,
        max_age = 60 * 60 * 1, // 1 hour

}: Readonly<Partial<{

        token: string,
        store: Cache,
        prefix: string,
        timeout: number,
        max_age: number,

}>>) {

    const url = prefix.concat('/api/posts/');

    async function load () {

        v.parse(v.string('missing the API token'), token);

        const cached = await store?.match(url);

        const response = cached ? cached : await fetch(url, {

            signal: AbortSignal.timeout(timeout),

            headers: {
                Authorization: `Bearer ${ token }`,
            },

        }).then(async function (res) {

            if (res.ok === true && store) {

                await store.put(url, new Response(res.clone().body, {
                    headers: {
                        'Cache-Control': `max-age=${ max_age }`,
                    },
                }));

            }

            return res;

        });

        v.parse(is_true, response.ok, { message: response.statusText });

        return response.json().then(parse);

    }

    return {

        load,

        async load_either () {

            try {

                return right(await load());

            } catch (cause) {

                return error(cause);

            }

        },

        async obsolete () {

            if (store != null) {
                await store.delete(url);
            }

        },

    };

}





const is_true = v.literal(true);

const base = {
    title: v.string('title'),
    slug: v.string('slug'),
    url: v.pipe(v.string('url'), v.url()),
};

const published_at = v.pipe(
    v.string('published_at'),
    v.regex(/^\d{4}-\d{2}-\d{2}$/),
    v.description('ISO date'),
);

const has_dates_on = v.parser(v.array(v.object({
    ...base,
    published_at,
})));

const parse = v.parser(v.pipe(

    v.object({

        ok: is_true,

        post_list: v.optional(v.array(v.object({
            ...base,
            published_at: v.nullish(v.string('published_at')),
        }))),

    }),

    v.transform(function ({ post_list = [] }) {

        return Object.groupBy(
            post_list,
            entry => entry.published_at ? 'published' : 'draft',
        );

    }),

    v.transform(function ({ draft = [], published = [] }) {

        return {
            draft,
            published: has_dates_on(published),
        };

    }),

));

