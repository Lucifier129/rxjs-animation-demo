import React, { useEffect, useMemo, useRef } from "react";
import { useColorList } from "../hooks/useColorList";
import { MovableInfo } from "../rxjs-animation/Movable";
import { StaticMovableList, Rect, Size } from "../rxjs-animation/MovableList";
import { createDragable, getPageOffset } from "../rxjs-animation/DOM";

const renderRect = (
  ctx: CanvasRenderingContext2D,
  color: string,
  rect: Rect
) => {
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
};

export function CanvasDemo() {
  let containerRef = useRef<HTMLDivElement>(null);
  let canvasRef = useRef<HTMLCanvasElement>(null);
  let [colorList, setColorList] = useColorList(100);

  let size = useMemo(() => {
    return {
      width: Math.floor(50 + 50 * Math.random()),
      height: Math.floor(50 + 50 * Math.random()),
    };
  }, [colorList]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    let container = containerRef.current;
    let canvas = canvasRef.current;
    let ctx = canvas.getContext("2d");
    let keyList = colorList.map((_, index) => index.toString());

    if (!ctx) return;

    let movableList = StaticMovableList({
      mode: "Grid",
      width: size.width,
      height: size.height,
      columnCount: 10,
      keyList,
      // A getter: re-measured at every drag start and every hit-test, so
      // scrolling and resizing never desynchronise the pointer from the layout.
      offset: () => getPageOffset(container),
      animation: {
        disable: false,
      },
      margin: {
        top: 5,
        left: 5,
        right: 5,
        bottom: 5,
      },
    });

    type Item = {
      info: MovableInfo;
      key: string;
      size: Size;
    };

    let renderItem = (item: Item) => {
      if (!ctx) return;
      let rect: Rect = {
        width: item.size.width,
        height: item.size.height,
        x: item.info.position.x,
        y: item.info.position.y,
      };
      renderRect(ctx, colorList[Number(item.key)], rect);
    };

    let render = (list: Item[]) => {
      let movingItem: Item | null = null;

      let animatingItems: Item[] = [];

      ctx?.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < list.length; i++) {
        let item = list[i];

        if (item.info.isMoving) {
          movingItem = item;
        } else if (item.info.isAnimating) {
          animatingItems.push(item);
        } else if (ctx) {
          renderItem(item);
        }
      }

      for (let i = 0; i < animatingItems.length; i++) {
        renderItem(animatingItems[i]);
      }

      if (movingItem && ctx) {
        renderItem(movingItem);
      }
    };

    let latestList: Item[] = [];

    let subscription = movableList.state$.subscribe((list) => {
      latestList = list;
      render(list);
    });

    // Resizing a canvas clears it, so keep the last list and repaint.
    let handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 100;
      render(latestList);
    };

    window.addEventListener("resize", handleResize, false);

    // null between drags: a press on empty canvas must not reuse the key of
    // the previous drag.
    let currentKey: string | null = null;

    let handler = createDragable(canvas, {
      onStart(x, y) {
        let activeInfo = movableList.actions.getActiveInfo(x, y);
        currentKey = activeInfo ? activeInfo.key : null;
        if (currentKey === null) return;
        movableList.actions.start(currentKey, x, y);
      },
      onMove(x, y) {
        if (currentKey === null) return;
        movableList.actions.move(currentKey, x, y);
      },
      onEnd(x, y) {
        if (currentKey === null) return;
        movableList.actions.end(currentKey, x, y);
        currentKey = null;
      },
    });

    handler.listen();

    return () => {
      subscription.unsubscribe();
      handler.unlisten();
      window.removeEventListener("resize", handleResize, false);
    };
  }, [colorList, size, containerRef]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight - 100}
      />
    </div>
  );
}
