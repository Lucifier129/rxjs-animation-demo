import { frame } from "./frame";
import { map, takeWhile } from "rxjs/operators";

// from 0 to 1
export function Duration(duration: number) {
  return frame().pipe(
    map((elapsed) => elapsed / duration),
    takeWhile((n) => n <= 1)
  );
}
