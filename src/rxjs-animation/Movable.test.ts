import { Movable, MovableInfo } from "./Movable";
import { installRafStub } from "../test-helpers/installRafStub";

installRafStub();

type Mover = ReturnType<typeof Movable>;

const record = (mover: Mover) => {
  const states: MovableInfo[] = [];
  const sub = mover.state$.subscribe((state) => states.push(state));
  return { states, sub };
};

const recordUntil = (mover: Mover, type: string) => {
  const states: MovableInfo[] = [];
  let resolveDone!: (states: MovableInfo[]) => void;
  const done = new Promise<MovableInfo[]>((resolve) => (resolveDone = resolve));
  const sub = mover.state$.subscribe((state) => {
    states.push(state);
    if (state.type === type) resolveDone(states);
  });
  return { done, sub };
};

describe("Movable", () => {
  it("emits Initial synchronously with a null interaction position", () => {
    const mover = Movable({ x: 1, y: 2 });
    const { states, sub } = record(mover);

    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({
      type: "Initial",
      position: { x: 1, y: 2 },
      interationPosition: null,
      isMoving: false,
      isAnimating: false,
    });

    sub.unsubscribe();
  });

  it("gesture states carry the current pointer position, not the previous one", () => {
    const mover = Movable({ x: 0, y: 0 });
    const { states, sub } = record(mover);

    mover.actions.start(10, 10);
    mover.actions.move(15, 20);
    mover.actions.end(15, 20);

    expect(states.map((s) => s.type)).toEqual([
      "Initial",
      "MovementStart",
      "Moving",
      "MovementEnd",
    ]);
    expect(states[1].interationPosition).toEqual({ x: 10, y: 10 });
    expect(states[2].interationPosition).toEqual({ x: 15, y: 20 });
    expect(states[2].position).toEqual({ x: 5, y: 10 }); // pointer delta applied
    expect(states[3].interationPosition).toBeNull();

    sub.unsubscribe();
  });

  it("emits MovementStart once (and no AnimationEnd) when an animating item is grabbed", () => {
    const mover = Movable({ x: 0, y: 0 });
    const { states, sub } = record(mover);

    mover.actions.animateTo(100, 100, 1000);
    mover.actions.start(0, 0);

    const types = states.map((s) => s.type);
    expect(types.filter((t) => t === "MovementStart")).toHaveLength(1);
    expect(types).not.toContain("AnimationEnd");
    expect(states[states.length - 1].isMoving).toBe(true);

    sub.unsubscribe();
  });

  it("finishes a tween exactly on the target and fires AnimationStart/End once each", async () => {
    const mover = Movable({ x: 0, y: 0 });
    const { done, sub } = recordUntil(mover, "AnimationEnd");

    mover.actions.animateTo(100, 50, 60, "easeOutCubic");
    const states = await done;
    sub.unsubscribe();

    const types = states.map((s) => s.type);
    expect(types.filter((t) => t === "AnimationStart")).toHaveLength(1);
    expect(types.filter((t) => t === "AnimationEnd")).toHaveLength(1);

    const last = states[states.length - 1];
    expect(last.type).toBe("AnimationEnd");
    expect(last.position).toEqual({ x: 100, y: 50 });
    expect(last.isAnimating).toBe(false);
  });
});
