/*
 * Created by Tiger on 28/03/2024
 */

import { EConnectStep, EConnectStepStatus, EErrorCode } from "@services/define";
import helper from "@utils/helper";
import {
  formatBytes,
  generateToken,
  parseMAC,
  uint8Array2hexString,
} from "@utils/util";
import { QingUUID } from "./QingUUID";
import {
  CharValueChangeType,
  ConnectStateChangeType,
  FormatType,
  IBleDeviceFoundCallback,
  ICommand,
  IConnectOption,
  IError,
  IQingBlueToothDevice,
  IWechatBlueToothDevice,
} from "typings/types";

/**
 * 连接、管理蓝牙设备类
 */
export class QingBleService {
  private static LogTag = "QingBleService";
  // 超时时间，默认 20 秒
  private timeout: number = 20000;
  private scanTimer: any = null;
  private targetDeviceOption: IConnectOption | null = null;
  private currentDevice: IQingBlueToothDevice | null = null;
  private isConnected: boolean = false;
  private print = (...args: any) => helper.log(QingBleService.LogTag, ...args);
  // 待onBLECharacteristicValueChange方法处理的的命令map
  private commandMap: Map<string, ICommand> = new Map();

  // 扫描到符合targetDeviceOption设备后的回调
  private scanResolve: ((value: IQingBlueToothDevice | IError) => void) | null =
    null;

  private onConnectStatusChange:
    | ((
        step: EConnectStep,
        status: EConnectStepStatus,
        device: IQingBlueToothDevice | null
      ) => void)
    | null = null;

  constructor(
    onConnectStatusChange: (
      step: EConnectStep,
      status: EConnectStepStatus,
      device: IQingBlueToothDevice | null
    ) => void
  ) {
    this.onConnectStatusChange = onConnectStatusChange;
    this.setupSubscriptions();
  }

  // 扫描到设备后的回调
  private onBluetoothDeviceFound: IBleDeviceFoundCallback = ({ devices }) => {
    // this.print("扫描到设备", devices);
    if (devices.length === 0) {
      return;
    }
    const parsedDevices = devices
      .filter(this.filterBroadcast)
      .map(this.parseBroadcastData);
    this.print("解析后的设备", parsedDevices);
    // 扫描到设备后，判断是否有目标设备
    const targetDevice = parsedDevices.find((device) => {
      if (this.targetDeviceOption?.mac) {
        return device.mac === this.targetDeviceOption.mac;
      }
      return device.productID === this.targetDeviceOption?.productId;
    });

    if (targetDevice) {
      this.stopScan();
      this.scanResolve?.(targetDevice);
      this.scanTimer && clearTimeout(this.scanTimer);
      this.scanResolve = null;
    }
  };

  /**
   * 连接设备
   * @param option 连接参数
   */
  public async startConnect(
    option: IConnectOption
  ): Promise<IError | IQingBlueToothDevice> {
    try {
      // 开始连接前设置屏幕长亮
      wx.setKeepScreenOn({
        keepScreenOn: true,
      });

      this.targetDeviceOption = option;

      const result = await this.startScan();
      if ("errCode" in result) {
        this.onConnectStatusChange?.(
          EConnectStep.Scan,
          EConnectStepStatus.Failed,
          this.currentDevice
        );
        throw result;
      }

      this.onConnectStatusChange?.(
        EConnectStep.Scan,
        EConnectStepStatus.Success,
        this.currentDevice
      );

      // 连接设备
      this.currentDevice = result;
      const { deviceId } = this.currentDevice;
      this.onConnectStatusChange?.(
        EConnectStep.Connect,
        EConnectStepStatus.InProgress,
        this.currentDevice
      );
      await wx.createBLEConnection({
        deviceId,
        timeout: option.timeout || this.timeout,
      });

      // 设置连接状态
      this.isConnected = true;
      this.onConnectStatusChange?.(
        EConnectStep.Connect,
        EConnectStepStatus.Success,
        this.currentDevice
      );

      // 服务监听
      await this.startServiceListen();

      const token = this.targetDeviceOption?.token || generateToken();
      // 设置 token
      const setTokenResult = await this.setToken(token);
      if (!setTokenResult) {
        this.onConnectStatusChange?.(
          EConnectStep.SetToken,
          EConnectStepStatus.Failed,
          this.currentDevice
        );
        throw {
          errCode: EErrorCode.NotFound,
          errMessage: "设置 token 失败",
        };
      }

      // 验证token
      const verifyTokenResult = await this.setToken(token, "verify");
      if (!verifyTokenResult) {
        this.onConnectStatusChange?.(
          EConnectStep.VerifyToken,
          EConnectStepStatus.Failed,
          this.currentDevice
        );
        throw {
          errCode: EErrorCode.NotFound,
          errMessage: "验证 token 失败",
        };
      }

      // 获取 Wi-Fi 列表
      const wifiList = await this.getWifiList();

      return this.currentDevice;
    } catch (error) {
      this.onConnectStatusChange?.(
        EConnectStep.Connect,
        EConnectStepStatus.Failed,
        this.currentDevice
      );
      this.print("连接失败", error);
      throw error;
    } finally {
      // 结束连接后取消屏幕长亮
      wx.setKeepScreenOn({
        keepScreenOn: false,
      });

      // 清空扫描定时器
      this.scanTimer && clearTimeout(this.scanTimer);
      this.scanTimer = null;
      this.scanResolve = null;
    }
  }

  /**
   * 获取 Wi-Fi 列表
   */
  public async getWifiList(): Promise<Uint8Array> {
    try {
      const result = await this.write(
        QingUUID.BASE_WRITE_CHARACTERISTIC_UUID,
        QingUUID.BASE_NOTIFY_CHARACTERISTIC_UUID,
        0x03,
        "hex"
      );
      if ("errCode" in result) {
        this.print("获取 Wi-Fi 列表失败", result);
        throw result;
      }
      this.print("获取 Wi-Fi 列表成功", formatBytes(result.data, "str"));
      return result.data;
    } catch (error) {
      this.print("获取 Wi-Fi 列表失败", error);
      return new Uint8Array();
    }
  }

  /**
   * 设置/验证 token
   */
  private async setToken(
    token: Int8Array,
    type: "set" | "verify" = "set"
  ): Promise<boolean> {
    // 设置token
    try {
      const result = await this.write(
        QingUUID.BASE_WRITE_CHARACTERISTIC_UUID,
        QingUUID.BASE_NOTIFY_CHARACTERISTIC_UUID,
        type === "set" ? 0x01 : 0x02,
        "hex",
        token
      );

      if ("errCode" in result) {
        throw result;
      }
      if ("success" in result) {
        return result.success;
      }
      return false;
    } catch (error) {
      this.print("设置 token 失败", error);
      throw error;
    }
  }

  /**
   * 写入数据，这里不传 serviceUUID是因为写入的服务是固定不变的
   * @param writeCharacteristicUUID  写入数据的特征值 UUID
   * @param type 写入数据的类型
   * @param data 写入的数据
   * @param format 数据格式
   * @param isSplitReceive 是否分包接收
   * @param noResponse 是否不需要回复
   * @returns
   */
  private async write(
    writeCharacteristicUUID: string,
    notifyCharacteristicUUID: string,
    type: number,
    format: FormatType,
    data?: ArrayBuffer,
    isSplitReceive: boolean = false,
    noResponse: boolean = false
  ): Promise<IError | { success: boolean; data: Uint8Array }> {
    if (!this.isConnected) {
      return Promise.resolve({
        errCode: EErrorCode.Disconnected,
        errMessage: "蓝牙已断开",
      } as IError);
    }
    const commandKey = `${notifyCharacteristicUUID}_${type}`;
    if (this.commandMap.has(commandKey)) {
      return Promise.resolve({
        errCode: EErrorCode.InProgress,
        errMessage: "上一次操作未完成",
      } as IError);
    }

    return new Promise(async (resolve) => {
      // 超时回复
      const timeoutId = setTimeout(() => {
        this.commandMap.delete(commandKey);
        resolve({
          errCode: EErrorCode.Timeout,
          errMessage: "写入数据超时",
        });
      }, this.timeout);
      try {
        if (!noResponse) {
          this.commandMap.set(commandKey, {
            type,
            format,
            timeoutId,
            isSplitReceive,
            resolve,
            receivedData: new Uint8Array([]),
          });
        }

        let writeData = data ? new Uint8Array(data) : new Uint8Array([]);
        // writeData 前面增加一个字节，用于标识数据长度
        writeData = new Uint8Array([writeData.length + 1, type, ...writeData]);
        this.print(
          `写入数据[${writeCharacteristicUUID}]`,
          uint8Array2hexString(writeData)
        );

        // 写入数据
        await wx.writeBLECharacteristicValue({
          deviceId: this.currentDevice!.deviceId,
          serviceId: QingUUID.DEVICE_BASE_SERVICE_UUID,
          characteristicId: writeCharacteristicUUID,
          value: writeData.buffer,
        });
        // 不需要回复的话就立即返回，比如分包发送的话 只要发送成功就可以了
        if (noResponse) {
          clearTimeout(timeoutId);
          // 这里延迟100毫秒后再返回
          setTimeout(() => {
            resolve({ success: true, data: new Uint8Array() });
          }, 100);
        }
      } catch (error: any) {
        // 执行失败
        resolve(error);
        // 清理定时器
        clearTimeout(timeoutId);
        this.commandMap.delete(commandKey);
      }
    });
  }

  /**
   * 服务监听
   */
  private async startServiceListen() {
    try {
      this.onConnectStatusChange?.(
        EConnectStep.Subscribe,
        EConnectStepStatus.InProgress,
        this.currentDevice
      );

      const services = await wx.getBLEDeviceServices({
        deviceId: this.currentDevice!.deviceId,
      });
      this.print("服务列表", services);

      const characteristics = await wx.getBLEDeviceCharacteristics({
        deviceId: this.currentDevice!.deviceId,
        serviceId: QingUUID.DEVICE_BASE_SERVICE_UUID,
      });
      this.print("特征值列表", characteristics);

      // 订阅特征值
      characteristics.characteristics.forEach(async (characteristic) => {
        if (characteristic.properties.notify) {
          await wx.notifyBLECharacteristicValueChange({
            deviceId: this.currentDevice!.deviceId,
            serviceId: QingUUID.DEVICE_BASE_SERVICE_UUID,
            characteristicId: characteristic.uuid,
            state: true,
          });
        }
      });
      this.onConnectStatusChange?.(
        EConnectStep.Subscribe,
        EConnectStepStatus.Success,
        this.currentDevice
      );
    } catch (error) {
      this.onConnectStatusChange?.(
        EConnectStep.Subscribe,
        EConnectStepStatus.Failed,
        this.currentDevice
      );
      this.print("订阅服务失败", error);
      throw error;
    }
  }

  /**
   * 开始扫描
   */
  private startScan(): Promise<IQingBlueToothDevice | IError> {
    return new Promise(async (resolve) => {
      // 开始扫描
      this.onConnectStatusChange?.(
        EConnectStep.Scan,
        EConnectStepStatus.InProgress,
        this.currentDevice
      );
      this.print("开始扫描");
      // 保存 resolve 方法
      this.scanResolve = resolve;
      let scanError: IError = {
        errCode: EErrorCode.NotFound,
        errMessage: "未找到设备",
      };

      if (this.scanTimer) {
        clearTimeout(this.scanTimer);
        this.scanTimer = null;
      }

      this.scanTimer = setTimeout(() => {
        this.stopScan();
        this.scanResolve?.(scanError);
      }, this.timeout);

      // 初始化蓝牙模块
      await wx.openBluetoothAdapter({
        mode: "central",
      });

      // 获取蓝牙状态
      const { available, discovering } = await wx.getBluetoothAdapterState();
      if (!available) {
        scanError = {
          errCode: EErrorCode.NotAvailable,
          errMessage: "蓝牙不可用",
        };
        return scanError;
      }
      if (discovering) {
        this.print("正在扫描中...");
        return;
      }

      // 设置回调
      wx.onBluetoothDeviceFound(this.onBluetoothDeviceFound);
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: true,
        interval: 500,
        powerLevel: "high",
      });
    });
  }

  /**
   * 过滤青萍设备
   */
  private filterBroadcast(device: IWechatBlueToothDevice) {
    const { name, localName, serviceData, connectable } = device;
    const finalName = name || localName;

    return (
      connectable &&
      finalName &&
      serviceData &&
      ((serviceData["0000FDCD-0000-1000-8000-00805F9B34FB"] &&
        serviceData["0000FDCD-0000-1000-8000-00805F9B34FB"].byteLength >= 8) ||
        (serviceData["0000fdcd-0000-1000-8000-00805f9b34fb"] &&
          serviceData["0000fdcd-0000-1000-8000-00805f9b34fb"].byteLength >= 8))
    );
  }

  /**
   * 解析广播
   */
  private parseBroadcastData(
    bleDevice: IWechatBlueToothDevice
  ): IQingBlueToothDevice {
    const { serviceData, name, localName, RSSI, deviceId } = bleDevice;

    let sData = serviceData["0000FDCD-0000-1000-8000-00805F9B34FB"];
    if (!sData) {
      sData = serviceData["0000fdcd-0000-1000-8000-00805f9b34fb"];
    }
    const byteArray = new Uint8Array(sData);
    // product id
    const productID = byteArray[1];
    // frameControl
    const frameControl = byteArray[0];
    const isBind = (frameControl & 0b10000000) > 0;

    // sData 转为 hex
    const sDataHex = uint8Array2hexString(byteArray);
    const mac = parseMAC(sDataHex.substring(4, 16));

    const eventData = sDataHex.substring(16);
    let battery = 100;
    if (eventData.length > 5 && eventData.substring(0, 2) === "02") {
      battery = parseInt(eventData.substring(4, 6), 16);
    }

    return {
      deviceId,
      battery,
      name: name || localName,
      RSSI,
      mac,
      isBind,
      productID,
      broadcastData: sDataHex,
      rawData: bleDevice,
    };
  }

  /**
   * 蓝牙特征值变化
   */
  private onBLECharacteristicValueChange = ({
    characteristicId,
    deviceId,
    value,
  }: CharValueChangeType) => {
    if (deviceId !== this.currentDevice?.deviceId) {
      this.print("onBLECharacteristicValueChange: deviceId 不匹配", deviceId);
      return;
    }
    this.print(
      "onBLECharacteristicValueChange:",
      characteristicId,
      uint8Array2hexString(new Uint8Array(value))
    );
    // value 转换成 Int8Array
    const valueInt8Array = new Uint8Array(value);
    // valueInt8Array 的数据格式是 1 byte的数据长度 + 1 byte的命令字 + 数据
    const dataLength = valueInt8Array[0];
    let type = valueInt8Array[1];
    let data = valueInt8Array.slice(2, dataLength);
    if (type === 0xff) {
      type = valueInt8Array[2];
      data = valueInt8Array.slice(3);
    }
    const commandKey = `${characteristicId}_${type}`;
    if (!this.commandMap.has(commandKey)) {
      this.print(
        `未找到对应的命令:${commandKey}, 已经存命令:${Array.from(
          this.commandMap.keys()
        )}`
      );
      return;
    }
    const command = this.commandMap.get(commandKey)!;
    if (type === 0xff) {
      if (data[0] === 0x01) {
        command.resolve({ success: true, data });
      } else {
        command.resolve({ success: false, data });
      }
      clearTimeout(command.timeoutId);
      this.commandMap.delete(commandKey);
      return;
    }
    if (command.isSplitReceive) {
      // 分包接收
      const total = data[0];
      const current = data[1];
      const currentData = data.slice(2);
      command.receivedData = new Uint8Array([
        ...command.receivedData,
        ...currentData,
      ]);
      if (current < total) {
        this.commandMap.set(commandKey, command);
        return;
      }
      command.resolve({ success: true, data: command.receivedData });
      clearTimeout(command.timeoutId);
      this.commandMap.delete(commandKey);
    } else {
      // 非分包接收
      command.resolve({ success: true, data });
      clearTimeout(command.timeoutId);
      this.commandMap.delete(commandKey);
    }
  };

  private onBLEConnectionStateChange = ({
    deviceId,
    connected,
  }: ConnectStateChangeType) => {
    this.print("onBLEConnectionStateChange:", deviceId, connected);
    if (deviceId !== this.currentDevice?.deviceId) {
      return;
    }
    this.isConnected = connected;
    if (!connected) {
      this.onConnectStatusChange?.(
        EConnectStep.Connect,
        EConnectStepStatus.Failed,
        this.currentDevice
      );
      this.removeSubscriptions();
    }
  };

  /**
   * 订阅状态变化
   */
  private setupSubscriptions() {
    // 监听蓝牙低功耗设备的特征值变化事件
    wx.onBLECharacteristicValueChange(this.onBLECharacteristicValueChange);
    wx.onBLEConnectionStateChange(this.onBLEConnectionStateChange);
  }

  /**
   * 移除状态
   */
  private removeSubscriptions() {
    wx.offBLECharacteristicValueChange();
    wx.offBLEConnectionStateChange();
  }

  /**
   * 停止扫描
   */
  private async stopScan() {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    this.print("停止扫描");
    // 取消屏幕常亮
    await wx.setKeepScreenOn({
      keepScreenOn: false,
    });

    // 停止搜寻附近的蓝牙外围设备。若已经找到需要的蓝牙设备并不需要继续搜索时，建议调用该接口停止蓝牙搜索。
    await wx.stopBluetoothDevicesDiscovery();

    // 移除搜索到新设备的事件的全部监听函数
    await wx.offBluetoothDeviceFound();
  }

  /**
   * 断开连接
   */
  public async disconnect() {
    try {
      if (this.isConnected) {
        await wx.closeBLEConnection({
          deviceId: this.currentDevice!.deviceId,
        });
      }
    } catch (error) {
      this.print("断开连接失败", error);
      throw error;
    } finally {
      this.isConnected = false;
      this.currentDevice = null;
      this.removeSubscriptions();
    }
  }

  public release() {
    this.disconnect();
  }
}
