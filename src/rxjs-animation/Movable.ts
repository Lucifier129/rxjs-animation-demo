import { Subject, merge } from "rxjs";
import {
  withLatestFrom,
  map,
  tap,
  takeUntil,
  pairwise,
  switchMap,
  startWith,
  shareReplay,
  publish,
  refCount,
} from "rxjs/operators";
import { Duration } from "./duration";
import * as Easing from "./easing";

export type EasingFn = (input: number) => number;
export type EasingType = keyof typeof Easing | EasingFn;

export type MovablePosition = {
  x: number;
  y: number;
};

export type InteractionPosition = {
  x: number;
  y: number;
} | null;

export type AnimateOptions = {
  position: MovablePosition;
  duration: number;
  easing: EasingFn;
};

export type MovableInfo = {
  type: string;
  position: MovablePosition;
  interationPosition: InteractionPosition;
  isMoving: boolean;
  isAnimating: boolean;
};

export const Movable = (initialPosition: MovablePosition = { x: 0, y: 0 }) => {
  // subjects
  let positionSubject = new Subject<MovablePosition>();
  let interactionPositionSubject = new Subject<InteractionPosition>();

  let moveToSubject = new Subject<MovablePosition>();
  let animateToSubject = new Subject<AnimateOptions>();

  let startingSubject = new Subject<MovablePosition>();
  let movingSubject = new Subject<MovablePosition>();
  let endingSubject = new Subject<MovablePosition>();

  let animationStartSubject = new Subject();
  let animationEndSubject = new Subject();

  let movementStartSubject = new Subject();
  let movementEndSubject = new Subject();

  // observables
  let position$ = positionSubject.pipe(
    startWith(initialPosition),
    shareReplay(1)
  );

  let interactionPosition$ = interactionPositionSubject.pipe(startWith(null));

  let moveTo$ = moveToSubject.asObservable();
  let animateTo$ = animateToSubject.asObservable();

  let starting$ = startingSubject.pipe(
    tap<MovablePosition>(movementStartSubject)
  );
  let moving$ = movingSubject.asObservable();
  let ending$ = endingSubject.pipe(tap<MovablePosition>(movementEndSubject));

  let animationStart$ = animationStartSubject.asObservable();
  let animationEnd$ = animationEndSubject.asObservable();

  let movementStart$ = movementStartSubject.asObservable();
  let movementEnd$ = movementEndSubject.asObservable();

  // positions
  let moveToPosition$ = moveTo$.pipe(
    tap<MovablePosition>((position) => {
      positionSubject.next(position);
    })
  );

  let movingPosition$ = starting$.pipe(
    switchMap((startPosition) => {
      return moving$.pipe(
        takeUntil(ending$),
        startWith(startPosition),
        pairwise(),
        map(([prev, curr]) => {
          return {
            x: curr.x - prev.x,
            y: curr.y - prev.y,
          };
        }),
        withLatestFrom(position$),
        map(([offset, currentPosition]) => {
          let x = currentPosition.x + offset.x;
          let y = currentPosition.y + offset.y;
          return { x, y } as MovablePosition;
        })
      );
    }),
    tap<MovablePosition>((position) => {
      positionSubject.next(position);
    })
  );

  let animatingPosition$ = animateTo$.pipe(
    withLatestFrom(position$),
    switchMap(([options, prevPosition]) => {
      let startX = prevPosition.x;
      let startY = prevPosition.y;
      let diffX = options.position.x - startX;
      let diffY = options.position.y - startY;
      let isStart = false;

      return Duration(options.duration).pipe(
        takeUntil(starting$),
        map(options.easing),
        map((currentDuration) => {
          let newPosition: MovablePosition = {
            x: currentDuration * diffX + startX,
            y: currentDuration * diffY + startY,
          };
          return newPosition;
        }),
        tap<MovablePosition>({
          next: () => {
            if (isStart) return;
            isStart = true;
            animationStartSubject.next();
          },
          complete: () => animationEndSubject.next(),
        })
      );
    }),
    tap<MovablePosition>((position) => {
      positionSubject.next(position);
    })
  );

  let animationStartPosition$ = animationStart$.pipe(
    withLatestFrom(position$),
    map(([_, position]) => position)
  );

  let animationEndPosition$ = animationEnd$.pipe(
    withLatestFrom(position$),
    map(([_, position]) => position)
  );

  let movementStartPosition$ = movementStart$.pipe(
    withLatestFrom(position$),
    map(([_, position]) => position)
  );

  let movementEndPosition$ = movementEnd$.pipe(
    withLatestFrom(position$),
    map(([_, position]) => position)
  );

  // actions
  let start = (x: number, y: number) => {
    let position = { x, y };
    startingSubject.next(position);
    interactionPositionSubject.next(position);
  };

  let move = (x: number, y: number) => {
    let position = { x, y };
    movingSubject.next(position);
    interactionPositionSubject.next(position);
  };

  let end = (x: number = 0, y: number = 0) => {
    let position = { x, y };
    endingSubject.next(position);
    interactionPositionSubject.next(null);
  };

  let moveTo = (x: number, y: number) => {
    let position = { x, y };
    moveToSubject.next(position);
  };

  let animateTo = (
    x: number,
    y: number,
    duration: number = 500,
    easing: EasingType = "easeOutCubic"
  ) => {
    let position = { x, y };
    let easingFn = typeof easing === "function" ? easing : Easing[easing];
    animateToSubject.next({
      position,
      duration,
      easing: easingFn,
    });
  };

  let actions = {
    start,
    move,
    end,
    moveTo,
    animateTo,
  };

  // merged state
  let state$ = merge(
    moveToPosition$.pipe(
      map((position) => {
        return {
          type: "MoveTo",
          position,
          isMoving: false,
          isAnimating: false,
        };
      })
    ),
    movingPosition$.pipe(
      map((position) => {
        return {
          type: "Moving",
          position,
          isMoving: true,
          isAnimating: false,
        };
      })
    ),
    movementStartPosition$.pipe(
      map((position) => {
        return {
          type: "MovementStart",
          position,
          isMoving: true,
          isAnimating: false,
        };
      })
    ),
    movementEndPosition$.pipe(
      map((position) => {
        return {
          type: "MovementEnd",
          position,
          isMoving: false,
          isAnimating: false,
        };
      })
    ),
    animatingPosition$.pipe(
      map((position) => {
        return {
          type: "Animating",
          position,
          isMoving: false,
          isAnimating: true,
        };
      })
    ),
    animationStartPosition$.pipe(
      map((position) => {
        return {
          type: "AnimationStart",
          position,
          isMoving: false,
          isAnimating: true,
        };
      })
    ),
    animationEndPosition$.pipe(
      map((position) => {
        return {
          type: "AnimationEnd",
          position,
          isMoving: false,
          isAnimating: false,
        };
      })
    )
  ).pipe(
    startWith({
      type: "Initial",
      position: initialPosition,
      isMoving: false,
      isAnimating: false,
    }),
    withLatestFrom(interactionPosition$),
    map(([info, interationPosition]) => {
      let result: MovableInfo = {
        ...info,
        interationPosition,
      };
      return result;
    }),
    publish(),
    refCount()
  );

  // output
  return {
    state$,
    actions,
  };
};
