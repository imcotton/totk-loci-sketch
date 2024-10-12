/** @jsx jsx */ void jsx;

import { jsx, memo } from 'hono/jsx';
import { css }       from 'hono/css';





const Coord = ({ name, min, max, of, pattern = '-?\d{4}' }: {

        name: string,
        min: number,
        max: number,
        of?: string,
        pattern?: string,

}) => (

    <input  type="number"
            name={ name }
            minlength={ min }
            maxlength={ max }
            pattern={ pattern }
            placeholder={ of }
            required
    />

);





export const DraftForm = memo(function ({ action, digit, need_otp }: {

        action: string,
        digit: number,
        need_otp: boolean,

}) {

    return (<article x-draft-form>

        <form action={ action } method="post">

            <header>

                <label class={ publish }>
                    <span>draft</span>
                    <input type="checkbox" role="switch" name="publish" />
                    <span x-on>publish</span>
                </label>

            </header>

            <fieldset>

                <label>issue N<u>o</u>
                    <input  name="issue"
                            type="number"
                            inputmode="numeric"
                            required
                    />
                </label>

                <label>title
                    <input  name="title"
                            type="text"
                            autocapitalize="off"
                            required
                    />
                </label>

                <label>intro
                    <input type="text" name="intro" required />
                </label>

                <label>image
                    <input  name="image"
                            type="text"
                            autocorrect="off"
                            autocomplete="off"
                            autocapitalize="off"
                            required
                    />
                </label>

                <label>coordinates
                    <div class="grid">
                        <Coord name="coordinates" of="x" min={ 4 } max={ 5 } />
                        <Coord name="coordinates" of="y" min={ 4 } max={ 5 } />
                        <Coord name="coordinates" of="z" min={ 4 } max={ 5 } />
                    </div>
                </label>

            </fieldset>

            <footer>

                { need_otp === false

                    ? <input type="submit" value="Create" />

                    : <fieldset role="group">

                        <input  name="otp"
                                type="text"
                                inputmode="numeric"
                                autocomplete="one-time-code"
                                minlength={ digit }
                                maxlength={ digit }
                                placeholder="OTP code"
                                required
                        />

                        <input type="submit" value="Create" />

                    </fieldset>

                }

                <small>
                    <a href="/setup-otp">setup <strong>OTP</strong></a>
                    <br />
                    <a href="/setup-auth-key">setup <strong>Auth Key</strong></a>
                </small>

            </footer>

        </form>

    </article>);

});





const publish = css`

    margin: auto;

    & input {
        margin-left: 1rem;
        margin-right: 1rem;
    }

    & input:checked + [x-on] {
        font-weight: bold;
        text-decoration: underline;
    }

`;

