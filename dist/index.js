(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.tracker = factory());
})(this, (function () { 'use strict';

    //版本
    var TrackerConfig;
    (function (TrackerConfig) {
        TrackerConfig["version"] = "1.0.0";
    })(TrackerConfig || (TrackerConfig = {}));

    // history 无法通过 popState 监听pushState、replaceState 只能重写其函数在utils pv
    // hash 使用 hashChange 监听
    const createHistoryEvent = (type) => {
        const origin = history[type];
        return function () {
            const res = origin.apply(this, arguments);
            // 创建事件
            const e = new Event(type);
            // 派发事件 到 window
            window.dispatchEvent(e);
            return res;
        };
    };

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
    class Tracker {
        constructor(options) {
            this.data = Object.assign(Object.assign({}, this.initDef()), options);
            this.installTracker();
        }
        initDef() {
            // 重写history方法
            window.history["pushState"] = createHistoryEvent("pushState");
            window.history["replaceState"] = createHistoryEvent("replaceState");
            return {
                historyTracker: false,
                hashTracker: false,
                domTracker: false,
                jsError: false,
                sdkVersion: TrackerConfig.version,
            };
        }
        // userId
        setUserId(uuid) {
            this.data.uuid = uuid;
        }
        setExtra(extra) {
            this.data.extra = extra;
        }
        // 手动上报
        handleSendTracker(data) {
            this.reportTracker(data);
        }
        // 自动上报
        captureEvent(mouseEventList, targetKey, data) {
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
        installTracker() {
            // 根据用户设置，将哪些功能进行上报
            if (this.data.historyTracker) {
                this.captureEvent(["popState", "pushState", "replaceState"], "history");
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
        reportTracker(data) {
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
        targetKeyReport() {
            btnList.forEach((ev) => {
                window.addEventListener(ev, (e) => {
                    const target = e.target;
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
        jsError() {
            this.errorEvent();
            this.promiseReject();
        }
        // error 错误上报
        errorEvent() {
            window.addEventListener("error", (event) => {
                this.reportTracker({
                    event: "error",
                    targetKey: "message",
                    message: event.message,
                });
            });
        }
        // promise 错误上报
        promiseReject() {
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

    return Tracker;

}));
