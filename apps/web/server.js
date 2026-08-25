/**
 * adapter-node's default entry serves the precompressed `.br` and `.gz` files the build produced,
 * but it cannot precompress what does not exist until a request arrives — so every server-rendered
 * page went out raw. The catalogue is 22KB of HTML that gzips to 3.3KB, on a flow whose users are
 * on a phone and often on mobile data.
 *
 * `compression` skips any response that already carries a Content-Encoding, so the static assets
 * the handler serves brotli'd are passed through untouched rather than compressed twice.
 */
import { handler } from './build/handler.js';
import compression from 'compression';
import polka from 'polka';

const port = Number(process.env.PORT ?? 3000);

polka()
	.use(compression(), handler)
	.listen(port, () => console.log(`Listening on http://0.0.0.0:${port}`));
