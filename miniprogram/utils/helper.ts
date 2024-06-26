/*
 * Created by Tiger on 28/03/2024
 */

import { formatTime } from "./util"


/**
 * 打印日志
 * @param tag 模块标签名称
 * @param restArgs 打印信息
 */
const printLog = (tag: string, ...restArgs: any) => {
  const time = formatTime(new Date());
  console.log(`[${time}-${tag}]`, ...restArgs);
}


export default {
  log: printLog
}