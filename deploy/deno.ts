import { env } from 'node:process';

import { create_app } from '../app.tsx';





const {

        MATAROA_API_KEY: token,
             OTP_SECRET: secret,

} = env;





const kv = await Deno?.openKv?.();

const store = await caches.open('assets-v1');

const server_timing = false;





export default await create_app({ kv, store, token, secret, server_timing });

