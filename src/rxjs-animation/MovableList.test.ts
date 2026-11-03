import { ObservedValueOf } from "rxjs";
import { StaticMovableList } from "./MovableList";
import { installRafStub } from "../test-helpers/installRafStub";

installRafStub();

type List = ReturnType<typeof StaticMovableList>;
type ListState = ObservedValueOf<List["state$"]>;

const record = (list: List) => {
  const states: ListState[] = [];
  const sub = list.state$.subscribe((state) => states.push(state));
  const latest = () => states[states.length - 1];
  const keys = () => latest().map((item) => item.key);
  return { states, sub, latest, keys };
};

const recordUntil = (list: List, key: string, type: string) => {
  const states: ListState[] = [];
  let resolveDone!: (states: ListState[]) => void;
  const done = new Promise<ListState[]>((resolve) => (resolveDone = resolve));
  const sub = list.state$.subscribe((state) => {
    states.push(state);
    const item = state.find((i) => i.key === key);
    if (item && item.info.type === type) resolveDone(states);
  });
  return { done, sub };
};

describe("StaticMovableList", () => {
  it("maps movers to keys in keyList order, not Object.values() order", () => {
    // "10" and "2" are integer-like keys: Object.values() would order them
    // numerically ("2", "10", "b") and shift every item by one.
    const list = StaticMovableList({
      mode: "Horizontal",
      widthList: [10, 20, 30],
      keyList: ["10", "2", "b"],
    });
    const { states, sub } = record(list);

    const first = states[0];
    expect(first.map((i) => i.key)).toEqual(["10", "2", "b"]);
    expect(first.map((i) => i.size.width)).toEqual([10, 20, 30]);
    expect(first.map((i) => i.info.position.x)).toEqual([0, 10, 30]);

    sub.unsubscribe();
  });

  it("rejects duplicate keys", () => {
    expect(() =>
      StaticMovableList({
        mode: "Vertical",
        heightList: [1, 1],
        keyList: ["a", "a"],
      })
    ).toThrow(/Duplicate key/);
  });

  describe("shift reorder (Vertical / Horizontal default)", () => {
    const makeList = () =>
      StaticMovableList({
        mode: "Vertical",
        heightList: [100, 100, 100, 100], // slots: a 0-100, b 100-200, c 200-300, d 300-400
        keyList: ["a", "b", "c", "d"],
      });

    it("moves the dragged item exactly one slot when dragged forward", () => {
      const list = makeList();
      const { sub, keys } = record(list);

      list.actions.start("a", 0, 50);
      list.actions.move("a", 0, 150); // pointer in b's slot

      expect(keys()).toEqual(["b", "a", "c", "d"]);
      sub.unsubscribe();
    });

    it("moves the dragged item exactly one slot when dragged backward", () => {
      const list = makeList();
      const { sub, keys } = record(list);

      list.actions.start("d", 0, 350);
      list.actions.move("d", 0, 250); // pointer in c's slot

      // Before the fix this produced ["a", "d", "b", "c"] (two slots).
      expect(keys()).toEqual(["a", "b", "d", "c"]);
      sub.unsubscribe();
    });

    it("re-evaluates immediately because gesture states carry the current pointer", () => {
      const list = makeList();
      const { sub, keys, latest } = record(list);

      list.actions.start("a", 0, 50);
      const started = latest().find((i) => i.key === "a")!;
      expect(started.info.type).toBe("MovementStart");
      expect(started.info.interationPosition).toEqual({ x: 0, y: 50 });

      list.actions.move("a", 0, 250); // straight into c's slot in one event
      expect(keys()).toEqual(["b", "c", "a", "d"]);
      sub.unsubscribe();
    });
  });

  describe("end()", () => {
    it("snaps with moveTo when animation is disabled", () => {
      const list = StaticMovableList({
        mode: "Vertical",
        heightList: [100, 100],
        keyList: ["a", "b"],
        animation: { disable: true },
      });
      const { sub, latest } = record(list);

      list.actions.start("a", 0, 50);
      list.actions.move("a", 0, 60);
      list.actions.end("a", 0, 60);

      const a = latest().find((i) => i.key === "a")!;
      expect(a.info.type).toBe("MoveTo");
      expect(a.info.position).toEqual({ x: 0, y: 0 });
      sub.unsubscribe();
    });

    it("uses the list's animation options for the snap", async () => {
      const easing = jest.fn((t: number) => t);
      const list = StaticMovableList({
        mode: "Vertical",
        heightList: [100, 100],
        keyList: ["a", "b"],
        animation: { duration: 40, easing },
      });
      const { done, sub } = recordUntil(list, "a", "AnimationEnd");

      list.actions.start("a", 0, 50);
      list.actions.move("a", 0, 60);
      list.actions.end("a", 0, 60);

      const states = await done;
      sub.unsubscribe();

      expect(easing).toHaveBeenCalled();
      const a = states[states.length - 1].find((i) => i.key === "a")!;
      expect(a.info.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe("offset", () => {
    it("accepts a getter that is re-read at every drag start and applied to hit-testing", () => {
      const getOffset = jest.fn(() => ({ x: 0, y: 100 }));
      const list = StaticMovableList({
        mode: "Vertical",
        heightList: [100, 100],
        keyList: ["a", "b"],
        offset: getOffset,
      });
      const { sub, keys } = record(list);

      expect(getOffset).toHaveBeenCalledTimes(1); // at construction

      list.actions.start("a", 0, 150); // page 150 - offset 100 = layout 50 → a's slot
      expect(getOffset).toHaveBeenCalledTimes(2); // re-read at drag start

      list.actions.move("a", 0, 250); // layout 150 → b's slot
      expect(keys()).toEqual(["b", "a"]);
      sub.unsubscribe();
    });

    it("getActiveInfo re-reads the getter and hit-tests in page coordinates", () => {
      const getOffset = jest.fn(() => ({ x: 0, y: 100 }));
      const list = StaticMovableList({
        mode: "Vertical",
        heightList: [100, 100],
        keyList: ["a", "b"],
        offset: getOffset,
      });
      const { sub } = record(list);

      const hit = list.actions.getActiveInfo(0, 250); // layout y 150 → b
      expect(getOffset).toHaveBeenCalledTimes(2);
      expect(hit && hit.key).toBe("b");

      expect(list.actions.getActiveInfo(0, 50)).toBeNull(); // layout y -50 → nothing
      sub.unsubscribe();
    });
  });
});
