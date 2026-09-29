# System1 domain redirects

This small service permanently redirects the 22 configured domain hostnames to `https://system1models.ai/`. It keeps the requested path and query string and appends the registered root domain as `utm_source`.

The service has no pages or domain-specific content. Unknown hosts return an empty 404. The host map is in `domains.json`.
