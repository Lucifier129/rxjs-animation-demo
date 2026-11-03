import { getPageOffset } from "./DOM";

describe("getPageOffset", () => {
  it("adds the scroll position to the viewport-relative rect", () => {
    const elem = document.createElement("div");
    elem.getBoundingClientRect = (): DOMRect => ({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 10,
      bottom: 20,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(window, "pageXOffset", {
      value: 5,
      configurable: true,
    });
    Object.defineProperty(window, "pageYOffset", {
      value: 300,
      configurable: true,
    });

    expect(getPageOffset(elem)).toEqual({ x: 15, y: 320 });
  });
});
