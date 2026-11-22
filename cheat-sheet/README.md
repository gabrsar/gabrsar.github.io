# Cheat sheet

Static learning references and interactive tools. No build step or package installation is required.

- `/cheat-sheet/` → Mathematics → Factoring and Trigonometry.
- `matematica/fatoracao/` contains a printable formula reference, guided examples and an exact quadratic factoring tool for integer coefficients from -99 to 99. It distinguishes rational roots, irrational real roots, repeated roots and irreducibility over the reals, and handles linear and constant inputs.
- Run its arithmetic regression tests with `node --test tests/factor-math.test.mjs`.
- `matematica/trigonometria/circulo-unitario/` is the V2 lab. `app.mjs` handles interaction; `trig-math.mjs` contains the six functions and graph sampling.
- `matematica/trigonometria/circulo-unitario/v1/` preserves the original p5.js experiment, using the assets in `/unit-circle/`.
- The previous `/unit-circle/` entry redirects to the lab.

Preview from the repository root with `python3 -m http.server 8000`.
Run the mathematical regression tests with `node --test tests/trig-math.test.mjs`.

Sine/cosine zeros are normalized at cardinal angles so poles return `null`, not a large finite floating-point approximation. Graph segments stop at poles and at the visible range; they never connect across an asymptote. All diagram resize writes are deferred to an animation frame and triggered by width changes only.
