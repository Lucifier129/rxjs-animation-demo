import * as Easing from "./easing";

type EasingFn = (t: number) => number;

const easingEntries = Object.entries(Easing) as [string, EasingFn][];
const inOutEntries = easingEntries.filter(([name]) =>
  name.startsWith("easeInOut")
);

describe("easing", () => {
  it("exports 30 easing functions", () => {
    expect(easingEntries).toHaveLength(30);
  });

  it.each(easingEntries)("%s starts at 0 and ends at 1", (_name, fn) => {
    expect(fn(0)).toBeCloseTo(0, 9);
    expect(fn(1)).toBeCloseTo(1, 9);
  });

  it.each(inOutEntries)(
    "%s passes through the midpoint (0.5, 0.5)",
    (_name, fn) => {
      expect(fn(0.5)).toBeCloseTo(0.5, 9);
    }
  );

  it.each(inOutEntries)("%s is continuous at the midpoint", (_name, fn) => {
    // easeInOutCirc has a vertical tangent at t = 0.5, so a +-1e-6 step moves
    // the value by ~2e-3; precision 2 (|diff| < 0.005) accommodates that while
    // still catching the former 0.5 -> 0.88 (bounce) and -0.5 -> 1.5 (elastic)
    // jumps.
    expect(fn(0.5 - 1e-6)).toBeCloseTo(fn(0.5 + 1e-6), 2);
  });

  describe("easeInOutQuad", () => {
    it("is a quadratic ease, not a copy of easeInOutCubic", () => {
      expect(Easing.easeInOutQuad(0.25)).toBeCloseTo(0.125, 9);
      expect(Easing.easeInOutQuad(0.75)).toBeCloseTo(0.875, 9);
      expect(Easing.easeInOutQuad(0.25)).not.toBeCloseTo(
        Easing.easeInOutCubic(0.25),
        2
      );
    });
  });

  describe("easeInOutSine", () => {
    it("rises from 0 to 1 (not from 0 to -1)", () => {
      expect(Easing.easeInOutSine(0.25)).toBeCloseTo(
        (1 - Math.cos(Math.PI / 4)) / 2,
        9
      );
      for (let i = 1; i <= 100; i++) {
        expect(Easing.easeInOutSine(i / 100)).toBeGreaterThanOrEqual(
          Easing.easeInOutSine((i - 1) / 100)
        );
      }
    });
  });

  describe("easeInOutBounce", () => {
    it("mirrors easeInBounce and easeOutBounce around the midpoint", () => {
      expect(Easing.easeInOutBounce(0.25)).toBeCloseTo(
        Easing.easeInBounce(0.5) / 2,
        9
      );
      expect(Easing.easeInOutBounce(0.75)).toBeCloseTo(
        Easing.easeOutBounce(0.5) / 2 + 0.5,
        9
      );
    });
  });

  describe("easeInOutElastic", () => {
    it("matches Robert Penner's reference formula", () => {
      const p = 0.45;
      const s = p / 4;
      const reference = (t: number): number => {
        if (t === 0) return 0;
        if ((t *= 2) === 2) return 1;
        if (t < 1) {
          return (
            -0.5 *
            Math.pow(2, 10 * (t -= 1)) *
            Math.sin(((t - s) * 2 * Math.PI) / p)
          );
        }
        return (
          0.5 *
            Math.pow(2, -10 * (t -= 1)) *
            Math.sin(((t - s) * 2 * Math.PI) / p) +
          1
        );
      };
      for (let i = 0; i <= 100; i++) {
        expect(Easing.easeInOutElastic(i / 100)).toBeCloseTo(
          reference(i / 100),
          9
        );
      }
    });
  });
});
