import * as v from 'valibot';





export function catch_refine (refine: (err: unknown) => never) {

    return async function <T> (task: () => Promise<T>) {

        try {

            return await task();

        } catch (err) {

            throw refine(err);

        }

    }

}





const digits = v.pipe(v.string(), v.regex(/^-?\d{4}$/));





export const inputs = v.object({

    issue: v.pipe(v.number(), v.safeInteger()),
    title: v.string(),
    intro: v.string(),
    image: v.string(),
    coordinates: v.pipe(v.tuple([ digits, digits, digits ]), v.readonly()),

});





export function text_encode (str: string): Uint8Array {

    return txt.encode(str);

}

const txt = new TextEncoder();

