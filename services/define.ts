

/**
 * 青萍 Product ID 定义
 */
export enum EQingProductID {
	PheasantS9118 = 0x5c,
}

export type ConnectStateChangeType =
  UniApp.OnBLEConnectionStateChangeListenerResult;
export type CharValueChangeType = UniApp.OnBLECharacteristicValueChangeListenerResult;


/**
 * 命令定义
 */

export enum EQingCommandType {
  //  错误
  Error = 0xff,
  // 设置 token
  SetToken = 0x01,
  // 验证 token
  VerifyToken = 0x02,
  // 获取 Wi-Fi 列表
  GetWifiList = 0x07,
  // 设置 Wi-Fi
  SetWifi = 0x01,

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



/**
 * 连接参数
 */
export interface IConnectOption {
  // mac 地址，为空的情况下扫描并连接第一个搜索到没有被绑定的设备
  mac?: string;
  // 设备产品id（必传），根据 productId 来过滤设备
  productId: EQingProductID;
  // 可不传，如果传 mac 的话，token 必传，
  //第一次连接后建议把 token 保存起来，下一次连接的时候（比如需要切换 Wi-Fi 时）将此 token 传递进来
  token?: Int8Array;
  // 超时时间，不传的话会默认给一个超时时间
  timeout?: number;
}

/**
 * 错误定义
 */
export interface IError {
  errCode: number | EErrorCode;
  errMessage?: string;
}


/**
 * 发送命令
 */
export interface ICommand<T = IError | { success: boolean; data: Uint8Array }> {
  // 命令字
  type: number;
  // 是否分包接收
  isSplitReceive?: boolean;
  // 超时定时器 id
  timeoutId: number;
  receivedData: Uint8Array;

  resolve: (value: T) => void;
}

/**
 * 蓝牙扫描结果回调
 */
export type IBleDeviceFoundCallback = UniApp.OnBluetoothDeviceFoundResult;


/**
 * 微信蓝牙设备
 */
export type IWechatBlueToothDevice = UniApp.BluetoothDeviceInfo;

/**
 * 青萍蓝牙设备
 */

export interface IQingBlueToothDevice {
  deviceId: string;
  // 设备名称
  name: string;
  // 设备信号强度
  RSSI: number;

  // 设备 MAC 地址
  mac: string;
  // 电池电量
  battery?: number;
  // 是否是绑定包
  isBind: boolean;

  // productID
  productID: number;
  // 原始数据
  rawData?: IWechatBlueToothDevice;
  // 广播数据
  broadcastData: string;
  // token
  token?: Int8Array;
}



/**
 * 写入命令参数
 */
export interface IWriteCommandOption {
  // 写入数据的特征值 UUID
  writeCharacteristicUUID: string;
  // 回复数据的特征值 UUID (如果noResponse为true，则不需要传)
  notifyCharacteristicUUID?: string;
  // 命令字
  type: number;
  // 是否不需要回复
  noResponse?: boolean;
  // 数据
  data?: ArrayBuffer;
  // 是否分包接收
  isSplitReceive?: boolean;
  // 超时时间
  timeout?: number;
}

// 格式化数据类型
export type FormatType = "hex" | "string";

// Wi-Fi
export interface IWiFiItem {
  name: string;
  auth: number;
  rssi: number;
}

// mqtt 配置
export interface IMqttConfig {
  host: string;
  port: number;
  username: string;
  password: string;

  clientId: string;
  subTopic: string;
  pubTopic: string;
}
