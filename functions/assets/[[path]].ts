/* Immutable caching for hashed assets, without the trap that came with it.
 *
 * _headers matches on the request PATH, and a hit and a miss for a hashed asset
 * share the same path, so there is no way to give them different caching there.
 * That is not a nitpick: the rule that used to say
 * `/assets/* max-age=31536000, immutable` also applied to the SPA fallback that
 * Pages serves when an asset is not there, so one request in the seconds after a
 * deploy cached index.html under the new bundle's URL for a year. The browser
 * refuses text/html as a module script, so the whole site rendered blank for
 * everyone on that colo, with no remedy but a cache purge. Measured, not
 * theorised: a request for /assets/definitely-missing-xyz.js returned 200,
 * text/html, max-age=31536000, immutable.
 *
 * Removing the rule fixed the trap and cost the caching: Pages does not apply
 * immutable by itself, so every asset was revalidated on every visit.
 *
 * A Function can tell a hit from a miss, which _headers cannot, because it sees
 * the RESPONSE. Two other routes were tried first and both are recorded in
 * public/_redirects: a 404 rule with no destination file is inert, and adding a
 * real public/404.html takes over routing and 404s every client-side route.
 *
 * The discriminator is the content type. Everything genuinely under /assets/ is
 * JavaScript, CSS or a font; nothing there is HTML. So an HTML response to an
 * /assets/ request is the fallback, which means the asset does not exist, which
 * means the honest answer is 404 and it must not be cached.
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const IMMUTABLE = "public, max-age=31536000, immutable";

export const onRequest: PagesFunction<Env> = async (context) => {
  const res = await context.env.ASSETS.fetch(context.request);
  const type = res.headers.get("content-type") ?? "";

  /* The fallback, dressed as an asset. Never cache this: caching it is the
     entire bug this file exists to prevent. */
  if (res.status === 200 && type.includes("text/html")) {
    return new Response("Not found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (res.status !== 200) return res;

  /* A real hashed asset. The name changes whenever the contents do, so this can
     be cached permanently and never revalidated. */
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", IMMUTABLE);
  return out;
};
