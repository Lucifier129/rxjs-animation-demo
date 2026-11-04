import { frame } from "./frame";
import { map, takeWhile, endWith } from "rxjs/operators";

// from 0 to 1, always ending on exactly 1
export function Duration(duration: number) {
  return frame().pipe(
    map((elapsed) => elapsed / duration),
    takeWhile((n) => n < 1),
    endWith(1)
  );
}
