/*
 * Created by Tiger on 28/03/2024
 */

import { EConnectStep, EConnectStepStatus, EErrorCode } from "@services/define";
import helper from "@utils/helper";
import { parseMAC, uint8Array2hexString } from "@utils/util";
import { QingUUID } from "./QingUUID";
import {
  CharValueChangeType,
  ConnectStateChangeType,
  IBleDeviceFoundCallback,
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

  // 扫描到符合targetDeviceOption设备后的回调
  private scanResolve: ((value: IQingBlueToothDevice | IError) => void) | null =
    null;

  private onConnectStatusChange:
    | ((step: EConnectStep, status: EConnectStepStatus, device: IQingBlueToothDevice | null) => void)
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
          this.currentDevice,
        );
        throw result;
      }

      this.onConnectStatusChange?.(
        EConnectStep.Scan,
        EConnectStepStatus.Success,
        this.currentDevice,
      );

      // 连接设备
      this.currentDevice = result;
      const { deviceId } = this.currentDevice;
      this.onConnectStatusChange?.(
        EConnectStep.Connect,
        EConnectStepStatus.InProgress,
        this.currentDevice,
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
        this.currentDevice,
      );

      // 服务监听
      await this.startServiceListen();

      return this.currentDevice;
    } catch (error) {
      this.onConnectStatusChange?.(
        EConnectStep.Connect,
        EConnectStepStatus.Failed,
        this.currentDevice,
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
   * 服务监听
   */
  private async startServiceListen() {
    try {
      this.onConnectStatusChange?.(
        EConnectStep.Subscribe,
        EConnectStepStatus.InProgress,
        this.currentDevice,
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
        this.currentDevice,
      );
    } catch (error) {
      this.onConnectStatusChange?.(
        EConnectStep.Subscribe,
        EConnectStepStatus.Failed,
        this.currentDevice,
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
        this.currentDevice,
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
  private onBLECharacteristicValueChange(data: CharValueChangeType) {
    // TODO
  }

  private onBLEConnectionStateChange({
    deviceId,
    connected,
  }: ConnectStateChangeType) {
    this.print("onBLEConnectionStateChange:", deviceId, connected);
    if (deviceId !== this.currentDevice?.deviceId) {
      return;
    }
    this.isConnected = connected;
    if (!connected) {
      this.onConnectStatusChange?.(
        EConnectStep.Connect,
        EConnectStepStatus.Failed,
        this.currentDevice,
      );
      this.removeSubscriptions();
    }
  }

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
    this.disconnect()
  }
}
