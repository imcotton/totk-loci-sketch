/** @jsx jsx */ void jsx;

import { jsx } from 'hono/jsx';

import { type Inputs, main } from '../main.ts';





export async function Create ({ data, token, draft, update }: {

        data: Inputs,
        draft: boolean,
        token: string,
        update: () => Promise<void>,

}) {

    const { promise, resolve: print } = Promise.withResolvers<string>();

    const [ url ] = await Promise.all([

        promise,

        main(data, { token, draft, print }).then(update),

    ]);

    return (<ul>

        <li>
            <a href="/">back</a>
        </li>

        <li>
            go to <a href={ url } target="_blank">{ url }</a>
        </li>

    </ul>);

}

