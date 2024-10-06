import { env } from 'node:process';

import { create_app } from '../app.tsx';





const {

        MATAROA_API_KEY: token,
             OTP_SECRET: otp_secret,

} = env;

const app: Deno.ServeDefaultExport = await create_app({

    token,
    otp_secret,
    server_timing: false,

});

export default app;

