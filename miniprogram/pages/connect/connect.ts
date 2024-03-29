import {
  EConnectStep,
  EConnectStepStatus,
  EQingProductID,
} from "@services/define";
import helper from "@utils/helper";
import { QingBleService } from "@services/QingBleService";
import { IQingBlueToothDevice, IWiFiItem } from "typings/types";
import { fakeWifiList } from "@utils/util";

interface IConnectPageData {
  connectStatus?: string;
  wifiList?: IWiFiItem[];
}
interface IConnectPageOption {
  LogType: string;
  bleService?: QingBleService;
  device?: IQingBlueToothDevice;
  print: (...args: any) => void;
  onConnectStatusChange: (
    step: EConnectStep,
    status: EConnectStepStatus,
    device: IQingBlueToothDevice | null
  ) => void;
  selectSSID: (event: WechatMiniprogram.CustomEvent) => void;
}

Page<IConnectPageData, IConnectPageOption>({
  LogType: "MainPage",

  print(...args) {
    helper.log(this.LogType, ...args);
  },

  onConnectStatusChange(step, status, device) {
    this.print("onConnectStatusChange", step, status);
    let connectStatus = "";
    const getStepDesc = () => {
      switch (step) {
        case EConnectStep.Scan:
          return "扫描设备";
        case EConnectStep.Connect:
          return "连接设备";
        case EConnectStep.Subscribe:
          return "订阅服务";
        case EConnectStep.SetToken:
          return "设置 Token";
        case EConnectStep.VerifyToken:
          return "验证 Token";
        case EConnectStep.SetTime:
          return "设置时间";
        case EConnectStep.SetWifi:
          return "设置 Wi-Fi";
        case EConnectStep.SetMqtt:
          return "设置 MQTT";
        case EConnectStep.GetWifiList:
          return "获取 Wi-Fi 列表";
        case EConnectStep.Disconnected:
          return "断开连接";
        default:
          return "unknown";
      }
    };
    switch (status) {
      case EConnectStepStatus.InProgress:
        connectStatus = `正在${getStepDesc()}...`;
        break;
      case EConnectStepStatus.Success:
        connectStatus = `${getStepDesc()} 成功`;
        break;
      case EConnectStepStatus.Failed:
        connectStatus = `${getStepDesc()} 失败`;
        break;
      default:
    }

    this.setData({
      connectStatus: device
        ? `MAC 地址为 ${device.mac} 的设备\n${connectStatus}`
        : connectStatus,
    });
  },

  /**
   * 页面的初始数据
   */
  data: {
    wifiList: fakeWifiList(),
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {},

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    this.bleService = new QingBleService(this.onConnectStatusChange);
    this.bleService
      .startConnect({
        productId: EQingProductID.GatewaySparrow,
      })
      .then((device) => {
        this.print("连接成功", device);
        if ("wifiList" in device) {
          this.setData({
            wifiList: device.wifiList,
          });
        }
      })
      .catch((error) => {
        this.print("连接失败", error);
      });
  },

  async selectSSID(event) {
    const item: IWiFiItem = event.currentTarget.dataset.item;
    const name = item.name;
    let password = "";
    if (item.auth) {
      // 弹出输入框让用户输入密码
      const res = await wx.showModal({
        title: `请输入[${name}]的密码`,
        content: "",
        editable: true,
      });
      if (res.cancel) {
        return;
      }
      password = res.content;
    }

    // loading
    wx.showLoading({
      title: `正在连接[${name}]`,
    });
    // 连接 Wi-Fi
    try {
      const setWifiResult = await this.bleService?.setWifi(name, password);
      wx.showLoading({
        title: `[${name}]连接${setWifiResult ? "成功" : "失败"}`,
      });
    } catch (error) {
      this.onConnectStatusChange(
        EConnectStep.SetWifi,
        EConnectStepStatus.Failed,
        null
      );
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.bleService?.release();
  },
});
