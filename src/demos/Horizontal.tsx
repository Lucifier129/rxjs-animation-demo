import React, { useEffect, useMemo, useRef } from "react";
import { useColorList } from "../hooks/useColorList";
import { StaticMovableList } from "../rxjs-animation/MovableList";
import { createDragable } from "../rxjs-animation/DOM";

export function HorizontalDemo() {
  let containerRef = useRef<HTMLDivElement>(null);

  let [colorList, _] = useColorList(12);

  let widthList = useMemo(() => {
    return colorList.map(() => Math.floor(50 + 50 * Math.random()));
  }, [colorList]);

  useEffect(() => {
    if (!containerRef.current) return;

    let container = containerRef.current;
    let containerRect = container.getBoundingClientRect();
    let keyList = widthList.map((_, index) => index.toString());

    let offset = {
      x: containerRect.x,
      y: containerRect.y,
    };

    let movableList = StaticMovableList({
      mode: "Horizontal",
      widthList,
      keyList,
      offset,
      spacing: 5,
    });

    let subscription = movableList.state$.subscribe((list) => {
      for (let i = 0; i < list.length; i++) {
        let item = list[i];
        let child = container.children[Number(item.key)] as HTMLDivElement;
        if (item.info.isMoving) {
          child.style.zIndex = "3";
        } else if (item.info.isAnimating) {
          child.style.zIndex = "2";
        } else {
          child.style.zIndex = "1";
        }
        child.style.display = "";
        child.style.transform = `translate3d(${item.info.position.x}px, 0, 0)`;
      }
    });

    let handlers: ReturnType<typeof createDragable>[] = [];

    for (let i = 0; i < container.children.length; i++) {
      let child = container.children[i] as HTMLDivElement;
      let key = i.toString();
      let handler = createDragable(child, {
        onStart(x, y) {
          movableList.actions.start(key, x, y);
        },
        onMove(x, y) {
          movableList.actions.move(key, x, y);
        },
        onEnd(x, y) {
          movableList.actions.end(key, x, y);
        },
      });
      handler.listen();
      handlers.push(handler);
    }

    return () => {
      subscription.unsubscribe();
      handlers.forEach((handler) => handler.unlisten());
    };
  }, [colorList, widthList, containerRef]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {colorList.map((color, index) => {
        let width = widthList[index];
        let style: React.CSSProperties = {
          display: "none",
          position: "absolute",
          top: 0,
          left: 0,
          width: width,
          height: 400,
          lineHeight: `${400}px`,
          textAlign: "center",
          color: "white",
          background: color,
          userSelect: "none",
        };
        return (
          <div key={index} style={style}>
            {index}
          </div>
        );
      })}
    </div>
  );
}
