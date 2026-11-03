# rxjs-animation-demo

A demo for rxjs animation: a drag-and-drop, auto-reordering, animated list
engine built from RxJS 6 observables, with four React demos (Vertical,
Horizontal, Grid and Canvas).

**Live demo:** https://netxpert.ch/rxjs-animation-demo/build/

This is a fork of
[Lucifier129/rxjs-animation-demo](https://github.com/Lucifier129/rxjs-animation-demo).
The changes below are offered back upstream in
[PR #14](https://github.com/Lucifier129/rxjs-animation-demo/pull/14).

## What this fork adds

- **Fixes.** Four broken `easeInOut…` easing curves, and nine engine and demo
  quirks: tweens now end exactly on the target, backward reorders no longer
  overshoot, movers follow `keyList` order, gesture states carry the current
  pointer, the drop snap honours the list's animation options, grabbing an
  animating item fires one `MovementStart`, the container offset is a getter
  that handles scrolling, the canvas demo forgets the last dragged key between
  drags, and the canvas repaints on resize. Each fix is explained in
  [`docs/project-explanations.md`](docs/project-explanations.md), section 7.
- **Tests.** A Jest suite for the engine (`npm test`, 5 suites, 71 tests).
- **Documentation.** A step-by-step walkthrough of the architecture, each
  module, a trace of one drag gesture, the RxJS patterns used and the lessons
  learned: [`docs/project-explanations.md`](docs/project-explanations.md).
- **Recording.** One drag per demo, captured in Chrome:
  [`docs/browser-test.gif`](docs/browser-test.gif).

## Running it

```bash
npm ci
npm test                                            # Jest
NODE_OPTIONS=--openssl-legacy-provider npm start    # http://localhost:3000/rxjs-animation-demo/build/
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

The `NODE_OPTIONS` flag is needed on Node 17 or newer because react-scripts 3
uses webpack 4. The `build/` folder is committed on purpose: GitHub Pages
serves the repository root, and `homepage` in `package.json` points the bundle
at `/rxjs-animation-demo/build/`. After changing the source, rebuild and commit
`build/` to update the live demo.

## How it works, in one paragraph

Each draggable item is a `Movable`: a small state machine whose transitions are
RxJS streams. Pointer gestures become position deltas via `pairwise`, a tween is
a shared `requestAnimationFrame` ticker mapped through an easing curve, and
`switchMap` together with `withLatestFrom` gives smooth retargeting whenever an
animation is interrupted. `StaticMovableList` composes many movables, hit-tests
the pointer against layout slots and animates the neighbours into their new
places. React only mounts the DOM; every animation frame is written directly
from a subscription. The full walkthrough is in the docs folder.
