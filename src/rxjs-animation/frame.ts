import { Observable, Subscriber } from "rxjs";

type SubscribeInfo = {
  subscriber: Subscriber<number>;
  startTime: number;
};

let subscriberInfoList: SubscribeInfo[] = [];
let isStarted = false;
let requestId = -1;

let tick = () => {
  let list = [...subscriberInfoList];
  let currentTime = Date.now();

  for (let i = 0; i < list.length; i++) {
    let { subscriber, startTime } = list[i];
    subscriber.next(currentTime - startTime);
  }

  if (subscriberInfoList.length) {
    requestId = requestAnimationFrame(tick);
  }
};

let start = () => {
  if (isStarted) return;
  isStarted = true;
  requestId = requestAnimationFrame(tick);
};

export const frame = () =>
  new Observable<number>((subscriber) => {
    let subscriberInfo = {
      subscriber,
      startTime: Date.now(),
    };
    subscriberInfoList.push(subscriberInfo);
    start();
    return () => {
      let index = subscriberInfoList.indexOf(subscriberInfo);
      if (index !== -1) {
        subscriberInfoList.splice(index, 1);
      }
      if (subscriberInfoList.length === 0) {
        isStarted = false
        cancelAnimationFrame(requestId);
      }
    };
  });
