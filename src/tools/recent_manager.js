// 最近应用管理模块


const x1 = device.width * 0.85
const y = device.height / 2
swipe(0, y, x1, y, 180)  //向右滑动


/**
 * 显示最近应用
 * @param {number} delay 延迟时间，单位毫秒
 */
export function showRecents (delay = 1500) {
    recents();
    sleep(delay);
}
