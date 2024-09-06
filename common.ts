import * as v from 'valibot';





const digits = v.pipe(v.string(), v.regex(/^-?\d{4}$/));





export const inputs = v.object({

    issue: v.pipe(v.number(), v.safeInteger()),
    title: v.string(),
    intro: v.string(),
    image: v.string(),
    coordinates: v.pipe(v.tuple([ digits, digits, digits ]), v.readonly()),

});

