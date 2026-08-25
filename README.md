# Lumen Cinema

Lumen Cinema is a single page movie catalogue for Task 5. It generates an unlimited catalogue from a 48 bit seed and renders the same result on every device when the request parameters are the same.

## What is included

* ASP.NET Core 8 backend written in C#
* Bogus as the required third party fake data library
* English USA and Arabic Saudi locale resources
* Deterministic server side movie, review, poster, and trailer plans
* Paginated table view
* Infinite gallery view
* Expandable details without page reloads
* Canvas trailers with sound and a duration between 5 and 10 seconds
* No database and no authentication
* Docker and Render deployment configuration
* Determinism smoke tests

## Run locally

Install the .NET 8 SDK, then run:

```bash
dotnet restore
dotnet run --project src/Task5MovieStore
```

Open the address shown in the terminal.

## Run the checks

```bash
dotnet run --project tests/Task5MovieStore.SmokeTests
```

The checks verify repeatability, parameter independence, fractional averages, locale changes, and numbering across pages.

## API

### Locales

```text
GET /api/locales
```

### Random 48 bit seed

```text
GET /api/seed
```

### Generated batch

```text
GET /api/movies?locale=en_US&seed=123456789012&likes=3.5&reviews=2.5&page=1&pageSize=12
```

The backend accepts page sizes from 1 to 24. There is no final catalogue limit.

## Determinism design

The request seed, locale, page, record position, and data stream name are combined into stable 64 bit values. Core movie data, likes, reviews, posters, and trailers have separate streams. This means changing average likes changes only likes. Changing average reviews changes only the review count and preserves already generated review text. Changing the seed or locale changes the complete record.

The browser never selects a seeded value. The server sends the complete trailer plan including scene type, palette, timing, camera values, objects, transitions, and sound parameters. JavaScript only draws and animates that plan.

## Locale resources

All locale specific vocabulary is stored under `Resources/locales`. Adding another locale does not require changing generator code. Add a JSON file with title patterns, genres, review text, trailer phrases, and word lists.

## Deploy with Render

1. Push this repository to a public GitHub repository.
2. Sign in to Render and create a Blueprint from the repository.
3. Render reads `render.yaml` and the `Dockerfile` automatically.
4. Wait for the health check to pass, then open the public address.

The project does not require environment secrets or a database.
