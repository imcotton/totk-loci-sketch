/** @jsx jsx */ void jsx;

import { jsx, memo } from 'hono/jsx';

import type { Articles } from '../articles.ts';





export const Outline = memo(function ({ draft, published }: Articles) {

    return (<div>

        { draft.length > 0 && <details>

            <summary role="button" class="secondary outline">
                <i>Draft</i>
            </summary>

            <ul>

                { draft.slice(0, 3).map(item => <li>

                    <a href={ item.url } target="_blank">
                        { item.slug }
                    </a>

                    { item.title.slice(9) }

                </li>) }

            </ul>

        </details> }

        { published.length > 0 && <details open>

            <summary role="button" class="outline">
                Published
            </summary>

            <ul>

                { published.slice(0, 3).map(item => <li>

                    <strong>
                        <a href={ item.url } target="_blank">
                            { item.slug }
                        </a>
                    </strong>

                    { item.title.slice(9) }

                </li>) }

            </ul>

        </details> }

    </div>);

}, (fst, snd) => compare(fst.published, snd.published)
              && compare(fst.draft,     snd.draft)
);





function compare <T extends Pick<Articles['draft'][number], 'slug'>> (

        fst: readonly T[],
        snd: readonly T[],

): boolean {

    if (fst.length === snd.length) {

        return fst.every((x, i) => x.slug === snd.at(i)?.slug);

    }

    return false;

}

