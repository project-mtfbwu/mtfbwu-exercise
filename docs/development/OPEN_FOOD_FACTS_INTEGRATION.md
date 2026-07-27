# Open Food Facts integration

`src/modules/nutrition/off/client.ts` is a `server-only` barcode/product
reader. It validates barcode syntax, requests a minimal field set, sends the
configured `OPEN_FOOD_FACTS_USER_AGENT`, uses a seven-second timeout, and
retries only transient failures once.

Open Food Facts supports branded product discovery; it does not override a
more appropriate USDA or user-selected record without preserving provenance.
Server code may normalize a product into `foods`, `branded_products`, and
`barcodes`; authenticated browsers can read catalog data but cannot write
provider cache rows.

Respect OFF's published rate limits and attribution/license obligations
(database ODbL, contents DbCL, images CC-BY-SA). Do not copy Product Opener's
AGPL application code. Camera scanning itself is deferred.
