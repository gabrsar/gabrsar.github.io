# Background Effects

The hero background is intentionally isolated from the rest of the site.

Each effect should live in its own folder and expose a small mount function on
`window.BackgroundEffects`. `assets/js/background-effects/index.js` decides
which effect to mount; each effect owns only its canvas, input handlers,
animation loop, and cleanup.

Current effects:

- `lorenz-attractor/effect.js`: particle simulation based on the Lorenz attractor.
- `game-of-life/effect.js`: Conway's Game of Life on the same hero canvas plane.

Expected shape for new effects:

```js
window.BackgroundEffects.mountSomeEffect(canvas);
```

The Game of Life effect follows this interaction model:

- grid coordinates based on the existing hero plane
- click toggles a cell
- click pauses the simulation
- `Space` pauses/resumes
- keyboard letters spawn known patterns near the mouse
- arrow keys pan the grid
- `+` and `-` zoom
- drag pans the grid
- small yellow hint cells invite keyboard actions and disappear when completed

Current pattern keys: every letter from `a` to `z` spawns a named Life
object/seed. Examples: `a` Acorn, `d` Diehard, `g` Gosper glider gun, `k`
Kok's galaxy, `p` Pulsar, `q` Queen bee shuttle, `r` R-pentomino, and `z`
Z-hexomino.

When the simulation resumes, it starts at `2` ticks per second and ramps toward
the current target. The default target is `3` ticks per second.

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
