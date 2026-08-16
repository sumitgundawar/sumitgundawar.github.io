# DNS rollback, sumitgundawar.com

State captured immediately before the Cloudflare Pages migration.
Every record was proxied (orange cloud), TTL auto.

## To go back to GitHub Pages

Delete the Pages CNAMEs, then recreate:

    A     sumitgundawar.com       185.199.108.153    proxied
    A     sumitgundawar.com       185.199.109.153    proxied
    A     sumitgundawar.com       185.199.110.153    proxied
    A     sumitgundawar.com       185.199.111.153    proxied
    AAAA  sumitgundawar.com       2606:50c0:8000::153  proxied
    AAAA  sumitgundawar.com       2606:50c0:8001::153  proxied
    AAAA  sumitgundawar.com       2606:50c0:8002::153  proxied
    AAAA  sumitgundawar.com       2606:50c0:8003::153  proxied
    CNAME www.sumitgundawar.com   sumitgundawar.github.io  proxied

Also restore public/404.html and the redirect shim in index.html, which
GitHub Pages needs and Cloudflare Pages does not.

## Untouched by the migration

    CNAME _domainconnect.sumitgundawar.com  _domainconnect.domains.squarespace.com

A leftover from a previous registrar. Unrelated to hosting, left alone.
