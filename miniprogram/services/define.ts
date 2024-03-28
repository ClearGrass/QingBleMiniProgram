

/**
 * 青萍 Product ID 定义
 */
export enum EQingProductID {
  GatewaySparrow = 0x0d,
}


/**
 * 错误类型定义（第一个E是enum的意思）
 */
export enum EErrorCode {
  Timeout = 0x0001,
  NotFound,
  Disconnected,
  NotAvailable,
  InProgress,
}

// 连接状态
export enum EConnectStepStatus {
  // 正在进行
  InProgress = 0x01,
  // 成功
  Success = 0x02,
  // 失败
  Failed = 0x03,
}

/**
 * 连接步骤
 */
export enum EConnectStep {
  Scan = 0x01,
  Connect = 0x02,
  // 订阅服务
  Subscribe = 0x04,
  // 设置 token
  SetToken = 0x05,
  // 验证 token
  VerifyToken = 0x06,
  // 设置时间
  SetTime = 0x07,
  // 设置 Wi-Fi
  SetWifi = 0x08,
  // 设置 MQTT
  SetMqtt = 0x09,
  // 获取 Wi-Fi 列表
  GetWifiList = 0x0a,
  Disconnected = 0x0b,
}
