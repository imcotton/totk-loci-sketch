import app from './deploy/deno.ts';





if (import.meta.main) {

    Deno.serve(app.fetch);

}

