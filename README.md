# Image Service

A small image-processing system built as a pnpm workspace with three packages:

- **`core`** — a framework-agnostic TypeScript library over [sharp](https://sharp.pixelplumbing.com/) that does all the actual image work (resize, format conversion, thumbnails, metadata extraction).
- **`api`** — a thin Express server that exposes `core` over HTTP.
- **`ui`** — a small React/Vite client that talks to `api`.

Live demo:
- UI: https://freepixel-wine-nine.vercel.app/
- API: [`https://<your-render-app>.onrender.com`](https://freepixel-task.onrender.com)

> Note: the API is hosted on Render's free tier, which spins down after inactivity — the first request after a period of idleness can take 20–30 seconds to respond while the instance wakes up.

---

## Technologies

| Package | Stack |
|---|---|
| `core`  | TypeScript, [sharp](https://www.npmjs.com/package/sharp), [exif-reader](https://www.npmjs.com/package/exif-reader), Vitest |
| `api`   | Node.js, Express 5, Multer (multipart parsing), CORS |
| `ui`    | React, Vite, TypeScript |
| tooling | pnpm workspaces, `tsc` (build), `tsx` (dev server) |

**Versions used during development:**
- Node.js `v22.18.0`
- pnpm `12.5.1`
- TypeScript `7.0.2`
- sharp `0.35.4`

---

## Package structure

```
image-service/
├── pnpm-workspace.yaml
├── package.json                  # root — only orchestrates `pnpm -r <script>`
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── index.ts          # public entry point / exports
│   │   │   ├── types.ts          # ImageInput, TransformOptions, Metadata, etc.
│   │   │   ├── errors.ts         # ImageProcessingError + normalizer
│   │   │   ├── input.ts          # normalizes path | Buffer | Readable into a sharp pipeline
│   │   │   ├── validate.ts       # option validation (width/height/format/fit/quality)
│   │   │   ├── transform.ts      # transform() + createTransformStream()
│   │   │   ├── thumbnail.ts      # thumbnail() convenience wrapper
│   │   │   └── metadata.ts       # getMetadata() + EXIF extraction
│   │   ├── test/
│   │   │   ├── core.test.ts
│   │   │   └── fixtures/         # rotated-exif.jpg, plain.png, sample.webp, corrupt.bin
│   │   └── scripts/
│   │       └── generate-fixtures.mjs   # regenerates the fixtures above
│   ├── api/
│   │   └── src/
│   │       ├── server.ts         # Express app + listen()
│   │       ├── routes.ts         # POST /transform, POST /info — thin handlers
│   │       ├── parseOptions.ts   # turns multipart string fields into typed options
│   │       └── errors.ts         # central error handler + async wrapper
│   └── ui/
│       └── src/
│           └── App.tsx           # single-page upload/transform/preview UI
```

---

## Architecture

```
ui (React, browser)
   │  fetch() with FormData, multipart/form-data
   ▼
api (Express, Node)
   │  in-process function call — no network hop
   ▼
core (TypeScript library)
   │  sharp()
   ▼
libvips (native image codec)
```

**Why `core` is a separate package.** It contains all image-processing logic and knows nothing about HTTP — no `req`/`res` anywhere in it. That means it's independently unit-testable (a function call, not a fake HTTP request), reusable outside a web server (a CLI tool or a background worker could import it unchanged), and it forces business logic to stay out of the route handlers. `api` consumes it via the `workspace:*` protocol (`"@imgsvc/core": "workspace:*"` in `api/package.json`), the same way it would consume any published npm package — just resolved from the local workspace instead of the registry.

**Streaming.** Route handlers in `api` never call `fs.readFileSync`/`writeFileSync`, and never buffer a full image into a local variable before touching sharp. `core.createTransformStream()` builds a `sharp()` duplex pipeline; `/transform`'s handler pipes the uploaded file straight into that pipeline and pipes the pipeline's output straight into the HTTP response (`upload.pipe(pipeline).pipe(res)`).

One documented trade-off: file uploads are parsed with `multer`'s `memoryStorage()`, which does buffer the raw multipart body into a `Buffer` before handing it to our code (a lower-level library like `busboy` would avoid even that). From that point on, though, every step is a real stream — the buffer is wrapped in a `Readable` and piped through `core`, never read/written via the synchronous `fs` APIs the assignment explicitly disallows. Given the time box, this was the pragmatic choice; a fully zero-buffer upload path would be the next thing to build with more time.

**EXIF orientation.** `core.createTransformStream()` always calls `.rotate()` with no arguments as the *first* pipeline step, before resize — this applies the image's EXIF orientation tag so the output pixels are visually correct, regardless of how the camera stored them. `getMetadata()` mirrors this: when the raw EXIF orientation value is 5–8 (a 90°/270° turn), the returned `width`/`height` are swapped from the raw pixel grid, so callers always see the *displayed* dimensions, matching what `.rotate()` actually produces.

**Errors.** `core` never throws a raw `Error` — every failure is an `ImageProcessingError` with a `code` (`INVALID_INPUT`, `INVALID_OPTIONS`, `UNSUPPORTED_FORMAT`, `PROCESSING_FAILED`). `api`'s central error handler maps that `code` to an HTTP status (400 for the first three, 500 for `PROCESSING_FAILED`) and a `{ error: string }` JSON body — no route handler contains its own try/catch error-formatting logic.

---

## Setup

```bash
git clone https://github.com/rajpootGovind/freePixel_task.git
cd freePixel_task
pnpm install
```

### Environment variables

`packages/ui` reads the API's base URL from a Vite env variable at build time:

```bash
# packages/ui/.env (local development)
VITE_API_URL=http://localhost:3000
```

```bash
# packages/ui/.env.production (used when building for deployment)
VITE_API_URL=https://<your-render-app>.onrender.com
```

`packages/api` needs no `.env` file — its only environment-driven value is `PORT`, which hosting platforms like Render inject automatically.

---

## Development commands

Run these from the repo root, in two separate terminals:

```bash
# Terminal 1 — API (http://localhost:3000)
pnpm --filter @imgsvc/api dev

# Terminal 2 — UI (http://localhost:5173)
pnpm --filter @imgsvc/ui dev
```

Workspace-wide commands:

```bash
pnpm -r build     # builds core, api, and ui
pnpm -r test      # runs core's Vitest suite
pnpm -r lint      # placeholder in api/ui — see Known Limitations
```

To regenerate `core`'s test fixtures from scratch:

```bash
pnpm --filter @imgsvc/core fixtures
```

---

## API usage

### `POST /transform`

`multipart/form-data` with fields:

| Field | Required | Notes |
|---|---|---|
| `file` | yes | the image to process |
| `width` | no | positive integer |
| `height` | no | positive integer |
| `fit` | no | `cover` (default) \| `contain` \| `fill` \| `inside` \| `outside` |
| `format` | no | `jpeg` \| `png` \| `webp` \| `avif` — input format is kept if omitted |
| `quality` | no | 1–100, default 80. Ignored for `png` |

**Response:** `200`, raw image bytes, `Content-Type` matching the output format.
**Errors:** `400` with `{ "error": string }` for missing file, invalid options, unsupported format, or corrupt input.

```bash
curl -X POST http://localhost:3000/transform \
  -F "file=@packages/core/test/fixtures/rotated-exif.jpg" \
  -F "width=200" \
  -F "format=webp" \
  --output result.webp
```

### `POST /info`

`multipart/form-data` with one field, `file`.

**Response:** `200`, JSON:

```json
{
  "width": 60,
  "height": 120,
  "format": "jpeg",
  "orientation": 6
}
```

`width`/`height` reflect the *displayed* dimensions, already accounting for EXIF orientation — not the raw pixel grid.

```bash
curl -X POST http://localhost:3000/info \
  -F "file=@packages/core/test/fixtures/rotated-exif.jpg"
```

Sample output for that fixture, whose raw grid is `120×60` with EXIF orientation `6`:

```json
{ "width": 60, "height": 120, "format": "jpeg", "orientation": 6 }
```

---

## Testing

```bash
pnpm --filter @imgsvc/core test
```

16 tests, covering:

- **resize** — output dimensions match requested `width`/`height`
- **format conversion** — jpeg/png/webp/avif all produce correctly-tagged output, including converting an existing webp file to another format
- **thumbnail** — always exactly square, using `cover` (crop) by default
- **EXIF orientation** — `rotated-exif.jpg` (raw grid `120×60`, orientation `6`) is auto-rotated to `60×120` output pixels by `transform`, and `getMetadata` reports the same oriented `60×120` dimensions
- **error paths** — corrupt/non-image input, a missing file path, and an unsupported requested format each reject with a typed `ImageProcessingError`, without crashing the process

Fixtures live in `packages/core/test/fixtures/` and are generated by `packages/core/scripts/generate-fixtures.mjs` using sharp itself (a synthetic two-tone image), so they're small, reproducible, and don't depend on any external image source. `rotated-exif.jpg` is the one that matters most — it's tagged with real EXIF orientation `6` via `.withMetadata({ orientation: 6 })`.

API-level tests (e.g. with `supertest`) were left out given the time box, per the assignment's own "nice to have, not required" note — `core`'s tests were prioritized since that's where the actual processing logic and its edge cases live.

---

## Known limitations

- **Upload buffering.** `api` uses `multer.memoryStorage()`, which buffers the incoming multipart body into memory before `core` ever sees it. Everything downstream of that point streams through sharp with no further buffering, but a large upload does spend memory proportional to its size during parsing. A `busboy`-based streaming parser would avoid this entirely.
- **AVIF format name.** sharp internally reports AVIF output as `"heif"` in its own metadata (`avif` is a HEIF brand). `core.transform()` normalizes this — its returned `format` field always matches what the caller requested — but this is worth knowing if you inspect sharp's output directly.
- **CORS is fully open** (`cors()` with no origin restriction) for ease of testing the deployed demo. For a production deployment this should be scoped to the actual frontend origin via an env var.
- **`lint` scripts are placeholders** (`echo "lint not set up yet"`) in `api` and default CRA/Vite config in `ui` — a shared ESLint flat config across all three packages wasn't finished within the time box.
- **AVIF encoding** was verified working locally (Windows, sharp `0.35.4`) and on Render's Linux build environment — both produce valid AVIF output in this environment.
- **Mid-stream errors** in `/transform`: if sharp fails after the response's headers are already sent (rare — most invalid input is caught before this point via option validation), the connection is simply closed rather than sending a clean error body, since HTTP doesn't allow changing the status code after headers are flushed.

With more time, next steps would be: a `busboy`-based zero-buffer upload path, real ESLint configs for `api`/`ui`, `supertest` coverage for the two routes, and a small in-memory cache for repeated identical transform requests.
