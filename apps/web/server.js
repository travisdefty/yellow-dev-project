/**
 * adapter-node's default entry serves the precompressed `.br` and `.gz` files the build produced,
 * but it cannot precompress what does not exist until a request arrives — so every server-rendered
 * page went out raw. The catalogue is 22KB of HTML that gzips to 3.3KB, on a flow whose users are
 * on a phone and often on mobile data.
 *
 * `compression` skips any response that already carries a Content-Encoding, so the static assets
 * the handler serves brotli'd are passed through untouched rather than compressed twice.
 *
 * Running this file directly to check a production build needs ORIGIN set to match the address you
 * browse to — `ORIGIN=http://localhost:3000 node server.js` — or every form action answers 403.
 * Fly sets it in `fly.toml`.
 */
import { handler } from './build/handler.js';
import compression from 'compression';
import polka from 'polka';

const port = Number(process.env.PORT ?? 3000);

polka()
	.use(compression(), handler)
	.listen(port, () => console.log(`Listening on http://0.0.0.0:${port}`));
