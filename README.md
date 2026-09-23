# Rajzolj Mircinek · Draw for Mirci

A drawing game for the browser and for phones (installable as a PWA). Mirci the cat asks you to
draw something. While you draw, she keeps guessing, sometimes spectacularly wrong. In the end she
either accepts your drawing or she doesn't.

**▶ Play: <https://deszepmacskavagymirci.kornel-dc5.workers.dev>** (Hungarian by default, add `?lang=en` for English)

<p align="center">
  <img src="docs/desktop-game.png" alt="Desktop: Mirci recognised a heart with 97% confidence and fell in love" width="640">
  &nbsp;
  <img src="docs/mobile-game.png" alt="Mobile: full-width drawing board, Mirci with heart eyes" width="180">
</p>

- Five rounds, 20 seconds each. The faster Mirci gets it, the more points you earn.
- Mirci asks for 10 easy-to-draw things but can guess 46, so expect a ghost, a snake or a
  cucumber (she is terrified of cucumbers).
- Mirci guesses live while you draw (a Jev call about every half second).
- Mirci is an animated SVG cat with 15 moods. You can pet her head or boop her nose; she gets
  grumpy if you pull her tail.
- Every judgement comes from **[Jev](https://developers.cloudflare.com/ai/models/typesafe/jev/)**,
  TypeSafe's structured decision model, running on **Cloudflare Workers AI**.
- Vue 3 + TypeScript, one Cloudflare Worker for both the static app and the API.
  Hungarian and English UI; adding a language takes one file.

## How Mirci sees a drawing

Jev is a text model. It answers typed questions about a structured state, and it can't look at
images. So the whole game is about **serialising a drawing for Jev**, while Jev always makes the decision.

1. **Vectorise** (`shared/shapes.ts`, deterministic). Strokes that nearly touch are joined, and a
   line that crosses itself is split into its loops. Corners come from the turning angle,
   confirmed by the pen slowing down (the client sends pointer timestamps) and by an RDP
   simplification. Each piece gets the simplest primitive that still fits: circle, ellipse,
   triangle, rectangle, crescent, star, a scalloped cloud-like edge, an outline pinched near one
   end, … Then come the relations between shapes: inside, attached to which end or side, above,
   repeated rays.
2. **Scene graph as Jev state** (`worker/scene.ts`). The shapes and relations go in as a
   structured object, numbered in drawing order and described with a fixed vocabulary.
3. **Shared vocabulary.** Every subject's criteria (`SUBJECTS.describe`) use the same words as the
   scene. A fish is "a horizontal ellipse with a triangle attached to one end". Jev compares like
   with like.
4. **Two paths for realtime** (`worker/encodings.ts`):
   - `live`: while the player draws, the scene goes to a single Jev call (~0.45 s), as soon as the
     previous answer is back.
   - `final`: when a stroke ends, Jev first answers ~20 yes/no visual questions about the drawing
     (`worker/features.ts`), then decides from the scene plus those feature probabilities (~0.85 s).

Every call asks two questions: `guess` (a `choice` over all 46 subjects + `scribble`; blind,
the target is not in the state) and `accept` (a `noul` that names the target). A round is won when
the guess is the target with at least 50% confidence and `accept` is not a clear rejection
(`isAccepted()` in `shared/judge.ts`).

### What was measured

Real Quick, Draw! drawings with pen timestamps (`make qd-data`, raw split). Per task: 15 drawings
of it, which should be accepted, and 8 of other things, which should be rejected. The dev split was
used for tuning and the test split only for the final numbers. Heart and cucumber are not in
Quick, Draw!, so they were checked on our own drawings.

| Serialisation given to Jev | Rounds won | False accept |
|---|---|---|
| ASCII-art grid | ~0% | – |
| SVG of the fitted shapes | 3% | 0% |
| Scanline silhouette (bands, holes, symmetry) | 0% | 0% |
| Geometric prose (first version) | 36% | 5% |
| Scene graph + shared vocabulary, before tuning | 47% | 5% |
| **Scene graph + shared vocabulary (`live`)** | **62%** | **2%** |
| **+ Jev's own visual features (`final`)** | **64%** | **2%** |

The biggest lever was the shared vocabulary between the state and the criteria. Notations Jev can't
map to the criteria (coordinates, SVG, scan bands) fail completely. The weakest task is the
mouse: in Quick, Draw! it is often a computer mouse, and in Hungarian "egér" is ambiguous too.
Without it, the other tasks reach 69–71%.

A small sketch classifier trained on Quick, Draw! (`ml/`, `shared/sketch/`) was also tried as
evidence for Jev. It reached 88%, but it moves the recognition out of Jev, so the game doesn't use it.

## Running it locally

You only need **Docker** and a **Cloudflare account**. Jev only runs on Cloudflare, even in local
development. There is no mock.

```bash
cp .env.example .env   # CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN
make dev               # http://localhost:5173
```

The API token needs **Workers AI: Read** and, for deploys, **Workers Scripts: Edit**. Jev is a
third-party model billed through **AI Gateway credits** (unified billing). If a judge call fails
with `2021: Insufficient AI Gateway credits`, top them up in the dashboard. Jev costs $0.042 per
million input tokens (output is free), so a few dollars covers a lot of games.

| Command | What it does |
|---|---|
| `make dev` | Vite dev server with the Worker running in workerd (HMR, real Jev) |
| `make build` | Typecheck (app + Worker) and production build into `dist/` |
| `make deploy` | Build and `wrangler deploy` |
| `make qd-data` | Download Quick, Draw! drawings into `data/` (train/dev/test splits) |
| `make qd-eval` | Judge accuracy on real drawings; `STRATEGY=scene\|scene-features`, `SET=dev`, `VERBOSE=1` (lab mode) |
| `make eval` | Judge accuracy on our own test drawings, incl. heart and cucumber (needs `make dev` running) |
| `make describe` | Print the description Jev gets for each test drawing |
| `make types` | Regenerate `worker/worker-configuration.d.ts` after editing `wrangler.jsonc` |
| `make icons` | Render the PWA icons from `public/icons/icon.svg` |
| `make shell` | Shell in the toolchain container, e.g. to `npm i -D something` |

Node, npm and wrangler run only inside the container. Dependencies live in a Docker volume, and
the container runs `npm ci` whenever `package-lock.json` changes.

### Deploying your own copy

Change `name` in `wrangler.jsonc`, then run `make deploy`. The app is served from
`https://<name>.<your-subdomain>.workers.dev`. `/api/judge` is rate-limited to 180 requests per
minute per IP (`JUDGE_LIMITER`), because every call is a paid model call.

## Project layout

```
shared/        Code used by both the client and the Worker
  subjects.ts    Everything Mirci can guess (emoji + model-facing description), and TASK_KEYS
  judge.ts       POST /api/judge contract and the win rule
  shapes.ts      Strokes → shapes and relations (vectoriser)
worker/        Cloudflare Worker: validation, rate limit, the Jev calls
  scene.ts       Scene graph state; features.ts: Jev's yes/no visual questions; encodings.ts: live/final
  jev.ts         Typed Jev wrapper (answer types are inferred from the question definitions)
src/           Vue 3 app
  cat/           Mirci: SVG parts + a requestAnimationFrame engine, moods, gestures
  game/          Game state machine, judge client, Mirci's reactions to certain guesses
  i18n/          Every player-facing string: types.ts, hu.ts, en.ts
  screens/, components/
public/        PWA manifest, service worker, icons
scripts/       Eval harness and test drawings, icon renderer
```

## Contributing

Issues and pull requests are welcome. A few conventions:

- Code and comments are in English. Player-facing text lives only in `src/i18n/`.
- **New language:** implement `Messages` (`src/i18n/types.ts`) in a new file and register it
  in `src/i18n/index.ts`. The compiler flags anything missing.
- **New guessable thing:** add it to `shared/subjects.ts`, give it a clear shape description, and
  add its name to every locale. Add it to `TASK_KEYS` only if `make eval` shows Jev recognises
  it reliably.
- **Recognition changes:** run `make eval` before and after, and add a test drawing for the case
  you fixed to `scripts/shapes.mjs`.
- Run `make build` before opening a PR. It typechecks the app and the Worker.

Debug helpers: `?mood=zany` pins Mirci's mood; `?lang=en` switches language.

## License

[MIT](LICENSE) © 2026 Kovács Kornél
