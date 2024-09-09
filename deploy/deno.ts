import { env } from 'node:process';

import { app } from '../app.tsx';





const {

        MATAROA_API_KEY: token,
             OTP_SECRET: secret,

} = env;





const store = await caches.open('assets-v1');





export default app({ token, secret, store });

