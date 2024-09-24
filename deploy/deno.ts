import { env } from 'node:process';

import { create_app } from '../app.tsx';





const {

        MATAROA_API_KEY: token,
             OTP_SECRET: secret,

} = env;

const server_timing = false;

export default await create_app({ token, secret, server_timing });

