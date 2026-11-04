import { Duration } from "./duration";
import { installRafStub } from "../test-helpers/installRafStub";

installRafStub();

const collect = (duration: number): Promise<number[]> =>
  new Promise((resolve) => {
    const values: number[] = [];
    Duration(duration).subscribe({
      next: (value) => values.push(value),
      complete: () => resolve(values),
    });
  });

describe("Duration", () => {
  it("rises monotonically, ends on exactly 1 and completes", async () => {
    const values = await collect(100);

    expect(values.length).toBeGreaterThan(1);
    expect(values[values.length - 1]).toBe(1);

    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeLessThan(1);
      if (i > 0) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
      }
    }
  });

  it("still lands on 1 for a zero duration", async () => {
    const values = await collect(0);
    expect(values).toEqual([1]);
  });
});
