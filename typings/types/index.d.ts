
/**
 * 青萍 Product ID 定义
 */
declare enum EQingProductID {
  GatewaySparrow = 0x0D
}

/**
 * 扫描到设备后解析为IDevice
 */
interface IDevice {
  name: string
  mac: string
}


/**
 * 连接参数
 */
interface IConnectOption {
  // mac 地址，为空的情况下扫描并连接第一个搜索到没有被绑定的设备
  mac?: string
  // 设备产品id（必传），根据 productId 来过滤设备
  productId: EQingProductID
  // 可不传，如果传 mac 的话，token 必传，
  //第一次连接后建议把 token 保存起来，下一次连接的时候（比如需要切换 Wi-Fi 时）将此 token 传递进来
  token?: string
  // 超时时间，不传的话会默认给一个超时时间
  timeout?: number
}

/**
 * 错误类型定义（第一个E是enum的意思）
 */
declare enum EErrorCode {
  Timeout = 0x0001,
  NotFound = 0x0002,
  Disconnected = 0x0003,
  NotAvailable = 0x0004,
}

/**
 * 错误定义
 */
interface IError {
  code: number | EErrorCode
  message?: string
}