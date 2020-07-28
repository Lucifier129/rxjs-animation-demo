export type CreateDraggableOptions = {
  onStart(x: number, y: number): void;
  onMove(x: number, y: number): void;
  onEnd(x: number, y: number): void;
};

export const createDragable = (
  elem: HTMLElement,
  options: CreateDraggableOptions
) => {
  let handleMouseDown = (event: MouseEvent) => {
    let handleMouseMove = (event: MouseEvent) => {
      options.onMove(event.pageX, event.pageY);
    };

    let handleMouseUp = (event: MouseEvent) => {
      options.onEnd(event.pageX, event.pageY);
      document.removeEventListener("mousemove", handleMouseMove, false);
      document.removeEventListener("mouseup", handleMouseUp, false);
    };

    document.addEventListener("mousemove", handleMouseMove, false);
    document.addEventListener("mouseup", handleMouseUp, false);

    options.onStart(event.pageX, event.pageY);
  };

  let handleTouchStart = (event: TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    let touchEvent = event.touches[0];
    // fix: touchend event may not have touches
    let latestTouch: Touch | null = null;

    let handleTouchMove = (event: TouchEvent) => {
      let touch = event.touches[0];

      latestTouch = touch;
      options.onMove(touch.pageX, touch.pageY);
    };

    let handleTouchEnd = (event: TouchEvent) => {
      let touch = event.touches[0] ?? latestTouch;

      document.removeEventListener("touchmove", handleTouchMove, false);
      document.removeEventListener("touchend", handleTouchEnd, false);

      options.onEnd(touch?.pageX ?? 0, touch?.pageY ?? 0);
    };

    document.addEventListener("touchmove", handleTouchMove, false);
    document.addEventListener("touchend", handleTouchEnd, false);

    options.onStart(touchEvent.pageX, touchEvent.pageY);
  };

  let listen = () => {
    elem.addEventListener("mousedown", handleMouseDown, false);
    elem.addEventListener("touchstart", handleTouchStart, false);
  };

  let unlisten = () => {
    elem.removeEventListener("mousedown", handleMouseDown, false);
    elem.removeEventListener("touchstart", handleTouchStart, false);
  };

  return {
    listen,
    unlisten,
  };
};
