import React, { useState } from "react";
import { VerticalDemo } from "./demos/Vertical";
import { HorizontalDemo } from "./demos/Horizontal";
import { GridDemo } from "./demos/Grid";
import { CanvasDemo } from "./demos/Canvas";

const modeList: string[] = [
  "Vertical",
  "Horizontal",
  "Grid",
  "Canvas"
];

const App = () => {
  let [currentMode, setMode] = useState("Vertical");

  return (
    <div>
      <div style={{ textAlign: "center", paddingTop: 10, paddingBottom: 10 }}>
        {modeList.map((mode) => {
          let style = {
            color: currentMode !== mode ? "blue" : void 0,
          };
          let handleClick = () => {
            setMode(mode);
          };
          return (
            <React.Fragment key={mode}>
              <span style={style} onClick={handleClick}>
                {mode}
              </span>{" "}
            </React.Fragment>
          );
        })}
      </div>
      {currentMode === "Vertical" && <VerticalDemo />}
      {currentMode === "Horizontal" && <HorizontalDemo />}
      {currentMode === "Grid" && <GridDemo />}
      {currentMode === "Canvas" && <CanvasDemo />}
    </div>
  );
};

export default App;
