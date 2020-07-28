import { useState } from 'react'
import { getRandomColor } from "./colors";

export const useColorList = (amount: number) => {
  let [list, setList] = useState(() => {
    return Array(amount).fill(0).map(getRandomColor);
  });
  return [list, setList] as const;
};
