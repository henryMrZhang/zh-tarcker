// history 无法通过 popState 监听pushState、replaceState 只能重写其函数在utils pv
// hash 使用 hashChange 监听
export const createHistoryEvent = <T extends keyof History>(type: T) => {
  const origin = history[type];

  return function (this: any) {
    const res = origin.apply(this, arguments);
    // 创建事件
    const e = new Event(type);
    // 派发事件 到 window
    window.dispatchEvent(e);
    return res;
  };
};