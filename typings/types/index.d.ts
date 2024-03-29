import { EErrorCode, EQingProductID } from "@services/define";

type ConnectStateChangeType =
  WechatMiniprogram.OnBLEConnectionStateChangeListenerResult;
type CharValueChangeType =
  WechatMiniprogram.OnBLECharacteristicValueChangeListenerResult;

/**
 * 连接参数
 */
interface IConnectOption {
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
interface IError {
  errCode: number | EErrorCode;
  errMessage?: string;
}

/**
 * 蓝牙扫描结果回调
 */
type IBleDeviceFoundCallback = WechatMiniprogram.OnBluetoothDeviceFoundCallback;

/**
 * 微信蓝牙设备
 */
type IWechatBlueToothDevice = WechatMiniprogram.BlueToothDevice;

/**
 * 青萍蓝牙设备
 */

interface IQingBlueToothDevice {
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
}

/**
 * 发送命令
 */
interface ICommand<T = IError | { success: boolean; data: Uint8Array }> {
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
 * 写入命令参数
 */
interface IWriteCommandOption {
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
type FormatType = "hex" | "string";

// Wi-Fi
interface IWiFiItem {
  name: string;
  auth: number;
  rssi: number;
}

// mqtt 配置
interface IMqttConfig {
  host: string;
  port: number;
  username: string;
  password: string;

  clientId: string;
  subTopic: string;
  pubTopic: string;
}
