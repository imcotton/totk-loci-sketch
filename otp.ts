import { generateTOTP, verifyTOTP, createTOTPKeyURI } from '@oslojs/otp';





export function make_totp (digit: number, interval = 30) {

    return {

        generate (secret: Uint8Array) {

            return generateTOTP(secret, interval, digit);

        },

        verify (otp: string): (_: Uint8Array) => boolean {

            return secret => verifyTOTP(secret, interval, digit, otp);

        },

        setup_uri (secret: Uint8Array, { issuer, account }: {

                issuer: string,
                account: string,

        }) {

            return createTOTPKeyURI(issuer, account, secret, interval, digit);

        },

    };

}

