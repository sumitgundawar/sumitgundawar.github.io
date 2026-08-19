/* One canonical host, enforced where it actually can be.
 *
 * Search Console reported four URLs as "page with redirect", which is the right
 * answer for http and for www: those variants exist to be redirected and the
 * apex https URL is the one that gets indexed. Three of the four behaved. The
 * fourth, https://www.sumitgundawar.com/, served the whole site with a 200, so
 * the same content had two live addresses and only a canonical tag arguing
 * which one counted. A canonical is a hint. A 301 is not.
 *
 * This lives in a Pages Function rather than in _redirects because the source
 * side of a _redirects rule is a path: it cannot match on hostname, so the rule
 * written there was inert. Verified by deploying it and watching www keep
 * answering 200.
 *
 * Path and query are preserved, so a shared deep link on the wrong host lands
 * on the right page rather than on the home page.
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
};
