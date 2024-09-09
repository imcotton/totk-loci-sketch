import { env } from 'node:process';

import { app } from '../app.tsx';





const {

        MATAROA_API_KEY: token,
             OTP_SECRET: secret,

} = env;





export default app({ token, secret });

