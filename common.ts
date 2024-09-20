import * as v from 'valibot';





export function catch_refine <E> (refine: (err: unknown) => E) {

    return async function <T> (task: () => Promise<T>) {

        try {

            return await task();

        } catch (err) {

            return refine(err);

        }

    }

}





export const trimmed = v.pipe(v.string(), v.trim());





const digits = v.pipe(trimmed, v.regex(/^-?\d{4}$/));





export const inputs = v.object({

    issue: v.pipe(v.number(), v.safeInteger()),
    title: trimmed,
    intro: trimmed,
    image: trimmed,
    coordinates: v.pipe(v.tuple([ digits, digits, digits ]), v.readonly()),

});





export function text_encode (str: string): Uint8Array {

    return txt.encode(str);

}

const txt = new TextEncoder();

