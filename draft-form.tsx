/** @jsx jsx */ void jsx;

import { jsx, memo } from 'hono/jsx';





const Coord = ({ name, min, max, pattern = '-?\d{4}' }: {

        name: string,
        min: number,
        max: number,
        pattern?: string,

}) => <input    type="number"
                name={ name }
                minlength={ min }
                maxlength={ max }
                pattern={ pattern }
                required
/>;





export const DraftForm = memo(({ digit, need_otp }: {

        digit: number,
        need_otp: boolean,

}) => <div style="max-width: 30em; margin: auto">

    <form action="/new" method="post">

        <article>

            <header>New</header>

            <fieldset>

                <div class="grid" style="align-items: center">

                    <label>issue
                        <input type="number" inputmode="numeric" name="issue" required />
                    </label>

                    <label>
                        <input type="checkbox" name="publish" />
                        publish
                    </label>

                </div>

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
                        <Coord name="coordinates" min={ 4 } max={ 5 } />
                        <Coord name="coordinates" min={ 4 } max={ 5 } />
                        <Coord name="coordinates" min={ 4 } max={ 5 } />
                    </div>
                </label>

            </fieldset>

            <footer> { need_otp === false

                ? <input type="submit" value="Create" />

                : <fieldset role="group">

                    <input  name="otp"
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            minlength={ digit }
                            maxlength={ digit }
                            placeholder={ `${ digit }-digit Code` }
                            required
                    />

                    <input type="submit" value="Create" />

                </fieldset>

            } </footer>

        </article>

    </form>

</div>);

