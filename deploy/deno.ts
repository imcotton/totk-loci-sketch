import { env } from 'node:process';

import { create_app } from '../app.tsx';





const {

        MATAROA_API_KEY: token,
             OTP_SECRET: secret,

} = env;

const server_timing = false;

const app: Deno.ServeDefaultExport = await create_app({

    token,
    secret,
    server_timing,

});

export default app;

