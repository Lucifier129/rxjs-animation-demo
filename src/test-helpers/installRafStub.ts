/**
 * Replace requestAnimationFrame / cancelAnimationFrame with a deterministic
 * setTimeout-based stand-in for the duration of each test. jsdom does not
 * reliably provide a frame scheduler, and the engine's frame.ts relies on one.
 *
 * Call it once at the top level of a test file (it registers beforeEach and
 * afterEach hooks).
 */
export const installRafStub = (frameMs: number = 16): void => {
  let originalRaf: typeof window.requestAnimationFrame;
  let originalCaf: typeof window.cancelAnimationFrame;

  beforeEach(() => {
    originalRaf = window.requestAnimationFrame;
    originalCaf = window.cancelAnimationFrame;
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      window.setTimeout(() => callback(Date.now()), frameMs);
    window.cancelAnimationFrame = (id: number): void =>
      window.clearTimeout(id);
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCaf;
  });
};
