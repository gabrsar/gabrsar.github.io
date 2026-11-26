# AVS Lab

Browser-local audio visualizer and coding playground. Static files, no build step.

## Run

From the repository root:

```sh
python -m http.server 8791 --bind 127.0.0.1
```

Open `http://127.0.0.1:8791/avs/`. GitHub Pages serves the same folder at `/avs/`.
p5.js and Ace load from their CDNs. DM Sans and Space Grotesk are self-hosted
under their SIL Open Font Licenses in assets/fonts/.

## Three ways to explore

- **Primeira visita** explains the app and offers a no-permission visual demo.
- **Quero brincar** focuses on music, visual selection, shuffle and sound controls.
- **Laboratório completo** exposes code, FFT, individual bands, seeds and local presets.

Checkboxes on preset cards control shuffle eligibility. Manual selection remains possible.
Shuffle draws from enabled presets without repeating within a cycle. Timing is randomized;
sustained changes in energy/timbre may advance a transition, with a minimum dwell time.
Crossfades use a separate image overlay, so feedback renderers are not contaminated.

## Audio

Use Chrome/Edge for shared tab/system audio. The browser must offer audio for the
selected source; enable its share-audio checkbox. Keep the capture window open.
It analyzes audio locally and uses a same-origin BroadcastChannel to supply FFT data.
Reloading the main window preserves this connection; closing/reloading capture ends it.
Microphone and local audio-file playback are also available. Demo is synthetic visual input.

## Privacy and local presets

The integrated presets do not record or upload audio. Editor code, saved presets,
selection settings and seeds stay in browser storage. No analytics are added.
Custom JavaScript executes the code the user loads. The third-party p5.js/Ace libraries use CDNs; fonts are self-hosted.

Local storage is scoped to a browser profile **and origin**. Export the JSON library to
transfer presets between localhost, WebStorm and the public site. Export `.js` for a single
code body. JSON/JS imports validate before updating the library. A failed save/import
preserves existing saved presets. Starting to edit pauses shuffle and file watching.

## Preset API

Each `.js` in `presets/` is the body of `draw(p,a,s)`:

- `p`: p5 instance, `s`: state until the next apply.
- `a.time`, `a.elapsed`, `a.dt`, `a.frame`, `a.fps`.
- `a.seed`, `a.rand(min,max)`; seed also resets p5 random/noise generators.
- `a.mouse`: position, normalized position, velocity, acceleration, click/press/release.
- `a.keyboard.down/pressed/released(key)`; input ignores editable controls.
- `a.clock`: local browser date/time fields.
- `a.groups`: selected frequency grouping; `db`, `magnitude`, `hit`, `level`, etc.
- `a.music`: rolling-window energy, trend, direction, timbral centroid, volatility and pulse.
- `a.renderScale`: stable resolution choice; `a.showHUD`: laboratory-mode diagnostics.

`state.dispose` releases offscreen canvases and per-preset input listeners on transitions.
Preset errors stop that visual and show a recoverable message; audio remains connected.
The main history uses fixed time coordinates; performance culls only its faded oldest tail.

## Validation

```sh
node --test tests/avs-lab.test.mjs tests/factor-math.test.mjs tests/trig-math.test.mjs
```

Use `--test-isolation=none` when the environment blocks test subprocesses.
Tests cover band boundaries, fixed dB scaling, rolling trends, every bundled preset with
regrouping and resize, bounded fractal camera motion, atomic local saves and asset wiring.
GPU appearance, browser audio permissions and actual frame rates require browser checks.

The library includes original reinterpretations of AVS Bass Spin, Dot Plane, Scope Star and
Roto Blitter, plus moire, polar, kaleidoscope, fire, fractal, Lorenz and landscape visuals.
References are linked in the app footer; these are not binary AVS preset conversions.
