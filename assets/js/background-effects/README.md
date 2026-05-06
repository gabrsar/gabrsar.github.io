# Background Effects

The hero background is intentionally isolated from the rest of the site.

Each effect should live in its own folder and expose a small mount function on
`window.BackgroundEffects`. The page decides which effect to mount; the effect
owns only its canvas, input handlers, animation loop, and cleanup.

Current effects:

- `lorenz-attractor/effect.js`: particle simulation based on the Lorenz attractor.

Expected shape for new effects:

```js
window.BackgroundEffects.mountSomeEffect(canvas);
```

The next planned effect can follow the same contract:

- `game-of-life/effect.js`
- grid coordinates based on the existing hero plane
- click toggles a cell
- `Enter` pauses/resumes
- keyboard letters spawn known patterns near the mouse
- mouse wheel zooms
- drag pans the grid

## Lorenz Attractor Notes

The Lorenz system uses:

```text
dx/dt = sigma * (y - x)
dy/dt = x * (rho - z) - y
dz/dt = x * y - beta * z
```

The implementation starts near the classic constants:

```text
sigma = 10
rho = 28
beta = 8 / 3
```

Interaction heat gradually alters those constants to make the attractor feel
looser and more energetic. Particle color uses a blackbody approximation:
internal energy is mapped to a Kelvin-like temperature, and radiance follows a
compressed `T^4` curve inspired by Stefan-Boltzmann emission.

Diffraction stars are visual only. A particle can only render as a star above
`6000K`, and repeated clicks over the same hot particles increase their star
brightness.
