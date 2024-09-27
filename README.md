# totk-loci-sketch

[![jsr](https://jsr.io/badges/@imcotton/totk-loci-sketch)](https://jsr.io/@imcotton/totk-loci-sketch)


tools for authoring https://totk-loci.mataroa.blog





<br><br><br><br><br>
*️⃣

## `.env` file

- **`MATAROA_API_KEY`**\
  learn more or get from https://mataroa.blog/api/docs/

- **`OTP_SECRET`**\
  random seed for **TOTP**,
  optional but highly recommended for public facing deployment





<br><br><br><br><br>
🎬

## Run

### local dev

```
deno task dev
```

### Deno Deploy Playground

```js
export { default } from 'jsr:@imcotton/totk-loci-sketch'
```

### CLI

```
deno serve --env --allow-all jsr:@imcotton/totk-loci-sketch
```





<br><br><br><br><br>
🔐

## Permissions

> other than `--allow-all`

```sh
-E=MATAROA_API_KEY,OTP_SECRET -N=mataroa.blog:443,esm.sh:443
```



- `-E` <sup>(--allow-env)</sup>
  - `MATAROA_API_KEY`: **Bearer** token
  - `OTP_SECRET`: random seed for **TOTP**

- `-N` <sup>(--allow-network)</sup>
  - `mataroa.blog:443`: to interact with its **API** endpoints
  - `esm.sh:443`: to load external assets (e.g. **Pico CSS**)

