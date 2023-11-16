import { DefaultOptions, TrackerConfig, Options } from "../types/index";
import { createHistoryEvent } from "../utils/pv";
const btnList = ["click", "dbClick"];
// 可以自定义添加---这里不用这么多
// "contextmenu",
//   "mouseover",
//   "mouseout",
//   "mousemove",
//   "mousedown",
//   "mouseup",
//   "touchstart",
//   "touchmove",
//   "touchend",
export default class Tracker {
  public data: Options;
  constructor(options: Options) {
    this.data = {
      ...this.initDef(),
      ...options,
    };
    this.installTracker();
  }
  private initDef() {
    // 重写history方法
    window.history["pushState"] = createHistoryEvent("pushState");
    window.history["replaceState"] = createHistoryEvent("replaceState");
    return <DefaultOptions>{
      historyTracker: false,
      hashTracker: false,
      domTracker: false,
      jsError: false,
      sdkVersion: TrackerConfig.version,
    };
  }
  // userId
  public setUserId<T extends DefaultOptions["uuid"]>(uuid: T) {
    this.data.uuid = uuid;
  }
  public setExtra<T extends DefaultOptions["extra"]>(extra: T) {
    this.data.extra = extra;
  }

  // 手动上报
  public handleSendTracker<T>(data: T) {
    this.reportTracker(data);
  }
  // 自动上报
  private captureEvent<T>(
    mouseEventList: string[],
    targetKey: string,
    data?: T
  ) {
    // targetKey 一般是后台约定的 key
    mouseEventList.forEach((event) => {
      window.addEventListener(event, () => {
        console.log("监听到了");
        this.reportTracker({
          event,
          targetKey,
          data,
        });
      });
    });
  }
  // 安装上报
  private installTracker() {
    // 根据用户设置，将哪些功能进行上报
    if (this.data.historyTracker) {
        this.captureEvent(["popState","pushState","replaceState"], "history")
    }
    if (this.data.hashTracker) {
      this.captureEvent(["hashChange"], "hash");
    }
    if (this.data.domTracker) {
      this.targetKeyReport();
    }
    if (this.data.jsError) {
      this.jsError();
    }
  }
  // 上报方法
  private reportTracker<T>(data: T) {
    // 借助 sendBeacon 发送数据到后台
    const params = Object.assign(this.data, data, {
      time: new Date().getTime(),
    });
    // sendBeacon 无法发送json,借助 blob 格式发送
    let blob = new Blob([JSON.stringify(params)], {
      type: "application/x-www-form-urlencoded",
    });
    navigator.sendBeacon(this.data.requestUrl, blob);
  }
  // dom 事件监听上报
  private targetKeyReport() {
    btnList.forEach((ev: any) => {
      window.addEventListener(ev, (e) => {
        const target = e.target as HTMLElement;
        const targetKey = target.getAttribute("target-key");
        if (targetKey) {
          this.reportTracker({
            ev,
            targetKey,
          });
        }
      });
    });
  }
  // 统一收集为 jsError
  private jsError() {
    this.errorEvent();
    this.promiseReject();
  }
  // error 错误上报
  private errorEvent() {
    window.addEventListener("error", (event) => {
      this.reportTracker({
        event: "error",
        targetKey: "message",
        message: event.message,
      });
    });
  }
  // promise 错误上报
  private promiseReject() {
    window.addEventListener("unhandledrejection", (event) => {
      event.promise.catch((err) => {
        this.reportTracker({
          event: "promise",
          targetKey: "message",
          message: err,
        });
      });
    });
  }
}
