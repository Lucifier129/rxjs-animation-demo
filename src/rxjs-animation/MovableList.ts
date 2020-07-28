import { combineLatest } from "rxjs";
import { map, tap, publish, refCount } from "rxjs/operators";
import { Movable, MovablePosition, MovableInfo, EasingType } from "./Movable";

export type Rect = {
  width: number;
  height: number;
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type LayoutFn = (sizeList: Size[]) => Rect[];

export type Margin = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type AnimationOptions = {
  disable?: boolean;
  duration?: number;
  easing?: EasingType;
};

export type Offset = {
  x: number;
  y: number;
};

export type StaticMovableListOptions =
  | {
      mode: "Horizontal";
      widthList: number[];
      keyList: string[];
      spacing?: number;
      offset?: Offset;
      animation?: AnimationOptions;
      useExchanged?: boolean;
    }
  | {
      mode: "Vertical";
      heightList: number[];
      keyList: string[];
      offset?: Offset;
      spacing?: number;
      animation?: AnimationOptions;
      useExchanged?: boolean;
    }
  | {
      mode: "Grid";
      width: number;
      height: number;
      keyList: string[];
      columnCount: number;
      offset?: Offset;
      margin?: Margin;
      animation?: AnimationOptions;
      useExchanged?: boolean;
    }
  | {
      mode: "Customized";
      sizeList: Size[];
      keyList: string[];
      layout: LayoutFn;
      offset?: Offset;
      animation?: AnimationOptions;
      useExchanged?: boolean;
    };

const createLayout = (options: StaticMovableListOptions): LayoutFn => {
  let mode = options.mode;

  if (options.mode === "Horizontal") {
    return createHorizontalLayout(options.spacing);
  }

  if (options.mode === "Vertical") {
    return createVerticalLayout(options.spacing);
  }

  if (options.mode === "Grid") {
    return createGridLayout(
      options.width,
      options.height,
      options.columnCount,
      options.margin
    );
  }

  if (options.mode === "Customized") {
    return options.layout;
  }

  throw new Error(`Unsupported mode: ${mode}`);
};

const createSizeList = (options: StaticMovableListOptions): Size[] => {
  let mode = options.mode;

  if (options.mode === "Horizontal") {
    return options.widthList.map((width) => {
      return {
        width,
        height: 0,
      };
    });
  }

  if (options.mode === "Vertical") {
    return options.heightList.map((height) => {
      return {
        width: 0,
        height,
      };
    });
  }

  if (options.mode === "Grid") {
    return options.keyList.map(() => {
      return {
        width: options.width,
        height: options.height,
      };
    });
  }

  if (options.mode === "Customized") {
    return options.sizeList;
  }

  throw new Error(`Unsupported mode: ${mode}`);
};

const defaultMargin: Margin = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

const createHorizontalLayout = (spacing: number = 0): LayoutFn => {
  return (sizeList) => {
    let rectList: Rect[] = [];
    let latestX = 0;

    for (let i = 0; i < sizeList.length; i++) {
      let item = sizeList[i];

      let rect: Rect = {
        width: item.width,
        height: item.height,
        x: i === 0 ? 0 : latestX,
        y: 0,
      };

      latestX += item.width + spacing;
      rectList.push(rect);
    }

    return rectList;
  };
};

const createVerticalLayout = (spacing: number = 0): LayoutFn => {
  return (sizeList) => {
    let rectList: Rect[] = [];
    let latestY = 0;

    for (let i = 0; i < sizeList.length; i++) {
      let item = sizeList[i];

      let rect: Rect = {
        width: item.width,
        height: item.height,
        x: 0,
        y: i === 0 ? 0 : latestY,
      };

      latestY += item.height + spacing;
      rectList.push(rect);
    }

    return rectList;
  };
};

const createGridLayout = (
  width: number,
  height: number,
  columnCount: number,
  margin: Margin = defaultMargin
): LayoutFn => {
  columnCount = Math.floor(columnCount);

  return (sizeList) => {
    let rectList: Rect[] = [];

    for (let i = 0; i < sizeList.length; i++) {
      let columnIndex = i % columnCount;
      let rowIndex = Math.floor(i / columnCount);

      let x = margin.left + columnIndex * width + columnIndex * margin.right;
      let y = margin.top + rowIndex * height + rowIndex * margin.bottom;

      let rect: Rect = {
        width: width,
        height: height,
        x,
        y,
      };
      rectList.push(rect);
    }

    return rectList;
  };
};

const isEqualRect = (leftRect: Rect, rightRect: Rect) => {
  let isEqualWidth = leftRect.width === rightRect.width;
  let isEqualHeight = leftRect.height === rightRect.height;
  let isEqualX = leftRect.x === rightRect.x;
  let isEqualY = leftRect.y === rightRect.y;
  return isEqualWidth && isEqualHeight && isEqualX && isEqualY;
};

type IsEnter = (rect: Rect, position: MovablePosition) => boolean;

const isEnterX: IsEnter = (rect, position) => {
  return position.x >= rect.x && position.x <= rect.x + rect.width;
};

const isEnterY: IsEnter = (rect, position) => {
  return position.y >= rect.y && position.y <= rect.y + rect.height;
};

const isEnterArea: IsEnter = (rect, position) => {
  return isEnterX(rect, position) && isEnterY(rect, position);
};

const createEnterPredicateFn = (
  mode: StaticMovableListOptions["mode"]
): IsEnter => {
  if (mode === "Horizontal") {
    return isEnterX;
  }

  if (mode === "Vertical") {
    return isEnterY;
  }

  if (mode === "Grid") {
    return isEnterArea;
  }

  if (mode === "Customized") {
    return isEnterArea;
  }

  throw new Error(`Unsupported mode: ${mode}`);
};

const layoutByPosition = (
  layout: LayoutFn,
  isEnter: IsEnter,
  useExchanged: boolean,
  keyList: string[],
  rectList: Rect[],
  activeKey: string,
  position: MovablePosition
) => {
  let enteredIndex = rectList.findIndex((rect) => isEnter(rect, position));

  if (enteredIndex === -1) {
    return {
      keyList,
      rectList,
    };
  }

  let enteredKey = keyList[enteredIndex];

  if (enteredKey === activeKey) {
    return {
      keyList,
      rectList,
    };
  }

  let activeIndex = keyList.indexOf(activeKey);

  if (activeIndex === -1) {
    throw new Error(`${activeKey} is not in [${keyList}]`);
  }

  if (activeIndex === enteredIndex) {
    return {
      keyList,
      rectList,
    };
  }

  let newKeyList = [...keyList];

  let newSizeList: Size[] = rectList.map((rect) => {
    return {
      width: rect.width,
      height: rect.height,
    };
  });

  let activeSize = newSizeList[activeIndex];
  let enteredSize = newSizeList[enteredIndex];

  if (useExchanged) {
    newKeyList[enteredIndex] = activeKey;
    newKeyList[activeIndex] = enteredKey;

    newSizeList[enteredIndex] = activeSize;
    newSizeList[activeIndex] = enteredSize;
  } else {
    if (activeIndex > enteredIndex) {
      let targetIndex = Math.max(enteredIndex - 1, 0);
      newKeyList.splice(activeIndex, 1);
      newSizeList.splice(activeIndex, 1);
      newKeyList.splice(targetIndex, 0, activeKey);
      newSizeList.splice(targetIndex, 0, activeSize);
    } else {
      let targetIndex = enteredIndex + 1;
      newKeyList.splice(targetIndex, 0, activeKey);
      newSizeList.splice(targetIndex, 0, activeSize);
      newKeyList.splice(activeIndex, 1);
      newSizeList.splice(activeIndex, 1);
    }
  }

  let newRectList = layout(newSizeList);

  return {
    keyList: newKeyList,
    rectList: newRectList,
  };
};

type MoverMap = {
  [key: string]: ReturnType<typeof Movable>;
};

const createMoverMap = (keyList: string[], rectList: Rect[]): MoverMap => {
  let moverMap: MoverMap = {};

  for (let i = 0; i < keyList.length; i++) {
    let key = keyList[i];
    let rect = rectList[i];
    let position = {
      x: rect.x,
      y: rect.y,
    };
    let mover = Movable(position);
    moverMap[key] = mover;
  }

  return moverMap;
};

export const StaticMovableList = (options: StaticMovableListOptions) => {
  let layout = createLayout(options);

  let sizeList = createSizeList(options);

  let isEnter = createEnterPredicateFn(options.mode);

  let originKeyList = [...options.keyList];

  let useExchanged =
    options.useExchanged ??
    (options.mode !== "Vertical" && options.mode !== "Horizontal");

  let latestMovableInfoList: MovableInfo[] = [];

  let animationOptions: AnimationOptions = {
    duration: 500,
    easing: "easeOutCubic",
    disable: false,
    ...options.animation,
  };

  let offset: Offset = {
    x: 0,
    y: 0,
    ...options.offset,
  };

  let keyList = [...originKeyList];

  let rectList = layout(sizeList);

  let moverMap = createMoverMap(keyList, rectList);

  let moverList = Object.values(moverMap);

  let getMover = (key: string) => {
    let mover = moverMap[key];
    if (!mover) return null;
    return mover;
  };

  let start = (key: string, x: number, y: number) => {
    let mover = getMover(key);
    if (!mover) return;
    mover.actions.start(x, y);
  };

  let move = (key: string, x: number, y: number) => {
    let mover = getMover(key);
    if (!mover) return;
    mover.actions.move(x, y);
  };

  let end = (key: string, x: number, y: number) => {
    let mover = getMover(key);
    if (!mover) return;
    let rect = rectList[keyList.indexOf(key)];
    mover.actions.end(x, y);
    mover.actions.animateTo(rect.x, rect.y);
  };

  let animateTo = (
    key: string,
    x: number,
    y: number,
    duration: number = 300,
    easing: EasingType = "easeOutCubic"
  ) => {
    let mover = getMover(key);
    if (!mover) return;
    mover.actions.animateTo(x, y, duration, easing);
  };

  let moveTo = (key: string, x: number, y: number) => {
    let mover = getMover(key);
    if (!mover) return;
    mover.actions.moveTo(x, y);
  };

  let getCurrentRect = (key: string) => {
    let index = keyList.indexOf(key);
    if (index === -1) return;
    return rectList[index];
  };

  let getActiveInfo = (x: number, y: number) => {
    if (!latestMovableInfoList.length) return null;

    let targetPosition = {
      x: x - offset.x,
      y: y - offset.y,
    };

    let targetIndex = -1;
    let targetInfo: MovableInfo | null = null;

    for (let i = 0; i < latestMovableInfoList.length; i++) {
      let info = latestMovableInfoList[i];
      let currentPosition = info.position;
      let { width, height } = rectList[i];
      let currentRect = {
        width,
        height,
        x: currentPosition.x,
        y: currentPosition.y,
      };

      if (!isEnter(currentRect, targetPosition)) continue;

      if (!targetInfo || info.isAnimating) {
        targetInfo = info;
        targetIndex = i;
      }
    }

    if (targetIndex === -1) return null;

    let key = keyList[targetIndex];
    let rect = rectList[targetIndex];

    return {
      key,
      index: targetIndex,
      info: targetInfo,
      rect,
    };
  };

  let actions = {
    start,
    move,
    end,
    moveTo,
    animateTo,
    getCurrentRect,
    getActiveInfo,
  };

  let state$ = combineLatest(moverList.map((item) => item.state$)).pipe(
    map((movableInfoList) => {
      return movableInfoList.map((info, index) => {
        let key = originKeyList[index];
        return {
          info,
          size: sizeList[index],
          key,
        };
      });
    }),
    tap((list) => {
      let activeItem = list.find((item) => item.info.isMoving);

      if (!activeItem || !activeItem.info.interationPosition) return;

      let activeKey = activeItem.key;
      let interationPosition = activeItem.info.interationPosition;

      let position = {
        x: interationPosition.x - offset.x,
        y: interationPosition.y - offset.y,
      };

      let layoutInfo = layoutByPosition(
        layout,
        isEnter,
        useExchanged,
        keyList,
        rectList,
        activeKey,
        position
      );

      let newKeyList = layoutInfo.keyList;
      let newRectList = layoutInfo.rectList;

      let oldKeyList = keyList;
      let oldRectList = rectList;

      if (newKeyList === oldKeyList && newRectList === oldRectList) return;

      keyList = newKeyList;
      rectList = newRectList;

      for (let i = 0; i < newKeyList.length; i++) {
        let key = newKeyList[i];

        if (key === activeKey) continue;

        let newRect = newRectList[i];
        let oldRect = oldRectList[oldKeyList.indexOf(key)];

        let isEqual = isEqualRect(newRect, oldRect);

        if (isEqual) continue;

        if (animationOptions.disable) {
          moveTo(key, newRect.x, newRect.y);
        } else {
          animateTo(
            key,
            newRect.x,
            newRect.y,
            animationOptions.duration,
            animationOptions.easing
          );
        }
      }
    }),
    map((list) => {
      let sortedList: typeof list = Array(list.length);

      for (let i = 0; i < list.length; i++) {
        let item = list[i];
        let targetIndex = keyList.indexOf(item.key);
        sortedList[targetIndex] = item;
        latestMovableInfoList[targetIndex] = item.info;
      }

      return sortedList;
    }),
    publish(),
    refCount()
  );

  return {
    state$,
    actions,
  };
};
