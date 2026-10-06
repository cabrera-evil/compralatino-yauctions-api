# YAuctions sync

Imports the open lots of the public yacauctions.com GraphQL API (`POST ${YAC_API_URL}`) into the `yauctions_svc` schema (`yac_categories`, `yac_auctions`, `yac_lots`) and serves them through the public endpoints:

- `GET /api/v1/yauctions/categories` returns `{ data: { code, label, count }[] }`; count is computed from open lots and categories without open lots are omitted.
- `GET /api/v1/yauctions/products` accepts `q, categories, minPrice, maxPrice, sort, page, pageSize` as a plain query string (`pageSize` max 50, `page` max 10000) and returns `{ data, pagination }`.
- `GET /api/v1/yauctions/products/:code` returns `{ data }` or 404 `Product not found`.

Product id and code are `yac-<auction_lot_id>`. Additive fields: `imageUrl` on list items and `photos[].url` on details (cloudfront URLs, never `/asset/`). Only queries are sent (no mutations, no authentication, no personal data fields).

## Running the sync

```bash
# dry-run (default): reads the source, maps lots, prints a summary, writes nothing
pnpm sync:yauctions -- --dry-run --max-auctions 1 --max-lots 20
# writes to the database; requires an explicit flag
pnpm sync:yauctions -- --apply
```

Flags: `--dry-run` (default), `--apply`, `--max-auctions <n>`, `--max-lots <n>` (override `YAC_MAX_AUCTIONS`, `YAC_MAX_LOTS_PER_AUCTION`). A dry-run never opens a database connection. The optional in-process interval (`SCRAPER_ENABLED=true`) runs the same sync with apply semantics, one run at a time.

## Environment variables

The read API boots without any of them. Sync-only variables are validated (Joi) when a sync starts, or at boot when `SCRAPER_ENABLED=true`.

| Variable                      | Default                                                | Purpose                                                                                                |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `YAC_SOURCE_CURRENCY`         | none, required for sync                                | ISO code of the source `$` amounts (stored with each lot)                                              |
| `YAC_FX_SOURCE_TO_USD`        | none, required for sync                                | Decimal rate > 0: 1 source unit in USD                                                                 |
| `YAC_FX_USD_TO_JPY`           | none, required for sync                                | Decimal rate > 0: 1 USD in JPY                                                                         |
| `YAC_FX_AS_OF`                | none, required for sync                                | ISO timestamp of the rates; exposed as `exchangedAt`                                                   |
| `YAC_SELLER_NAME`             | none, required for sync                                | `seller.name` (the auction house; consignor data is personal and never stored)                         |
| `YAC_API_URL`                 | `https://www.yacauctions.com/api`                      | GraphQL endpoint                                                                                       |
| `YAC_USER_AGENT`              | `CompraLatinoBot/<package version> (academic project)` | Honest User-Agent                                                                                      |
| `YAC_MIN_REQUEST_INTERVAL_MS` | `5000`                                                 | Minimum spacing between requests                                                                       |
| `YAC_REQUEST_TIMEOUT_MS`      | `30000`                                                | Per-request timeout                                                                                    |
| `YAC_MAX_ATTEMPTS`            | `3`                                                    | Attempts per request on 429/5xx/network errors                                                         |
| `YAC_BACKOFF_BASE_MS`         | `2000`                                                 | Exponential backoff base (doubles each retry)                                                          |
| `YAC_MAX_RETRY_WAIT_MS`       | `60000`                                                | Abort the run if a retry would wait longer (including `Retry-After` / `ratelimit-reset`)               |
| `YAC_MAX_AUCTIONS`            | `5` (max `50`)                                         | Auctions read per run (earliest ending first)                                                          |
| `YAC_MAX_LOTS_PER_AUCTION`    | `500` (max `2000`)                                     | Lots read per auction                                                                                  |
| `YAC_MAX_REQUESTS_PER_RUN`    | `200`                                                  | Request cap per run (retries included); the run aborts safely when reached                             |
| `YAC_MAX_END_RATIO`           | `0.5` (0 to 1)                                         | Skip ending lots when a run would end a larger fraction of the open lots (guard applies from 20 open)  |
| `YAC_LOTS_PAGE_SIZE`          | `100`                                                  | Lots per request                                                                                       |
| `YAC_ENRICH_DETAILS`          | `false`                                                | Also run the single-lot query per lot (one extra request per lot) for all photos and plain description |
| `SCRAPER_ENABLED`             | `false`                                                | In-process interval sync                                                                               |
| `SCRAPER_INTERVAL_MS`         | `21600000`                                             | Interval of the in-process sync (min 60000)                                                            |

## Rules and assumptions

- Politeness: the source's `robots.txt` disallows `/api/`; the project chose to use it with minimal traffic. Requests are serialized and spaced by `YAC_MIN_REQUEST_INTERVAL_MS`. 429/5xx/network errors are retried with exponential backoff (honoring `Retry-After` and `ratelimit-reset`) up to `YAC_MAX_ATTEMPTS`, then the run aborts. A 400 `GRAPHQL_VALIDATION_FAILED` means the source schema changed and aborts without retry.
- Current bid = `winning_bid_amount`, else `starting_bid` (then `required_bid`); `minIncrement` = `bid_increment_amount`. Lots without a price, category or valid dates, and lots flagged `is_passed`, `is_no_sale` or `is_past_end_time`, are skipped.
- Money: raw source amounts are stored; USD is rounded to 2 dp and JPY to 0 dp, half-up (assumed ISO 4217 minor units); JPY is derived from the unrounded USD value. All arithmetic uses decimal types.
- Categories: `code` is the slug of the source category name (suffixed with the source id on a clash); the source `category_id` is stored.
- Ended lots: lots missing from a later run are marked `ended` (never deleted) only when every page of their auction was read within the bounds, or when the auction is no longer listed and the auction list was complete. Aborted or bound-truncated runs mark nothing. Ended lots are not served.
- Description HTML is reduced to plain-text paragraphs; specs come from dynamic fields resolved through `options.choices`, empty values skipped.
- Unknown data is not invented: `conditionGrade` and `conditionSummary` are `''`, `seller.positiveRatePercent` is `0`, `shipping` only carries `pickupPoint` (lot or auction city and state).

## Safeguards

- `--max-auctions` and `--max-lots` can only lower the env bounds (`min(cli, env)`).
- Public endpoints serve a lot only while `status = open` and `endsAt` is in the future, so expired lots disappear before the next sync.
- An empty or `total: 0` auction listing never triggers the "no longer listed" ending, and a run that would end more than `YAC_MAX_END_RATIO` of the open lots (when at least 20 are open) ends none and reports `persisted.endingSkipped: "end-ratio-exceeded"`.
- Request pacing is serialized; `ratelimit-reset` is read as epoch ms (> 1e12), epoch seconds (> 1e9) or relative seconds. Waits above `YAC_MAX_RETRY_WAIT_MS` abort the run.
- Lots whose raw amount has more than 2 decimals or overflows `DECIMAL(14,2)` (or whose converted value overflows) are skipped and counted as `skipped.invalid-amount`; a `winning_bid_amount` of 0 counts as absent.
- Only `city` and `state_name` of auction and lot locations are requested. Config errors report key names and rule types, never values.
- Known limitation: there is no advisory lock or multi-replica coordination. Do not run `--apply` while the scheduler (`SCRAPER_ENABLED=true`) is active or on several instances.
