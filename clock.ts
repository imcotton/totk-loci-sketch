import type { Context }  from 'hono';
import { startTime, endTime } from 'hono/timing';
export { timing } from 'hono/timing';





export type Clock = Readonly<ReturnType<typeof use_clock>>;





export function use_clock (ctx: Context) {

    return {

        start (name: string, description?: string) {

            startTime(ctx, name, description);

            return name;

        },

        end (name: string, precision?: number) {

            endTime(ctx, name, precision);

        },

    };

}

