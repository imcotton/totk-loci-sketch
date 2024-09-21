const brand = Symbol('Either');





export type Either =
    | { error: unknown, type: 'left'  } & { readonly brand: typeof brand }
    | { value: unknown, type: 'right' } & { readonly brand: typeof brand }
;





export function right <T> (value: T) {

    return { brand, value, type: 'right' } as const satisfies Either;

}





export function left <T> (error: T) {

    return { brand, error, type: 'left'  } as const satisfies Either;

}





export function error (cause: unknown) {

    if (cause instanceof Error) {
        return left(cause);
    }

    return left(new Error('unknown', { cause }));

}

