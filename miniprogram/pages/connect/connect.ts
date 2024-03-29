import {
  EConnectStep,
  EConnectStepStatus,
  EQingProductID,
} from "@services/define";
import helper from "@utils/helper";
import { QingBleService } from "@services/QingBleService";
import { IMqttConfig, IQingBlueToothDevice, IWiFiItem } from "typings/types";
import { fakeWifiList } from "@utils/util";

interface IConnectPageData {
  connectStatus?: string;
  wifiList?: IWiFiItem[];
  mqttConfig?: IMqttConfig;
  refreshWiFiListShow: boolean
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
  setMqtt: (mqtt: IMqttConfig) => void;
  getWiFiList: () => void
}

Page<IConnectPageData, IConnectPageOption>({
  LogType: "MainPage",

  print(...args) {
    helper.log(this.LogType, ...args);
  },

  onConnectStatusChange(step, status, device) {
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
        case EConnectStep.SetWifi:
          return "设置 Wi-Fi";
        case EConnectStep.SetMqtt:
          return "设置 MQTT";
        case EConnectStep.GetWifiList:
          return "获取 Wi-Fi 列表";
        case EConnectStep.Disconnected:
          this.setData({
            wifiList: [],
          });
          return "断开连接";
        default:
          return "unknown";
      }
    };
    switch (status) {
      case EConnectStepStatus.InProgress:
        connectStatus = `正在${getStepDesc()}...` +
          (step === EConnectStep.Scan ? '\n请长按网关顶部 5 秒，直至橙色指示灯快速闪烁。' : '');
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
    refreshWiFiListShow: false,
    // wifiList: fakeWifiList(),
    // 这里请写自己真实的MQTT配置，我这里是测试配置
    mqttConfig: {
      host: "mqtt.bj.cleargrass.com",
      port: 11883,
      username: "50EC508796A2&lv-H1QbGg",
      password:
        "8711e9d5feadfe5e559c4698f58dc211dd24cc8a6467823f61f9422b46dcecb3",

      clientId:
        "50EC508796A2|securemode=3,signmethod=hmacsha256,prefix=,random=server461|",
      subTopic: "/lv-H1QbGg/50EC508796A2/user/get",
      pubTopic: "/lv-H1QbGg/50EC508796A2/user/update",
    },
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    this.bleService = new QingBleService(this.onConnectStatusChange);
    this.bleService
      .startConnect({
        productId: EQingProductID.GatewaySparrow,
      })
      .then((result) => {
        if ("errCode" in result) {
          this.print("连接失败", result);
          return;
        }
        this.print("连接成功", result);
        this.device = result;
        return this.bleService?.getWifiList();
      })
      .then((result) => {
        if (result) {
          this.setData({
            refreshWiFiListShow: true,
            wifiList: result,
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

    wx.showLoading({
      title: `正在连接[${name}]`,
      mask: true,
    });

    try {
      // 连接 Wi-Fi
      const setWifiResult = await this.bleService?.setWifi(name, password);
      const result = await wx.showModal({
        title: `[${name}]连接${setWifiResult ? "成功" : "失败"
          }, 请输入MQTT配置`,
        content: JSON.stringify(this.data.mqttConfig),
        editable: true,
      });
      if (result.confirm) {
        const mqttConfig = JSON.parse(result.content) as IMqttConfig;
        // 设置mqtt
        this.setMqtt(mqttConfig);
      }
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

  async setMqtt(mqtt) {
    const showMessage = (suc: boolean) => {
      this.onConnectStatusChange(
        EConnectStep.SetMqtt,
        suc ? EConnectStepStatus.Success : EConnectStepStatus.Failed,
        null
      );
      wx.showLoading({
        title: `Mqtt 配置设置${suc ? "成功" : "失败"}`,
      });
    };

    try {
      wx.showLoading({ title: "正在设置 MQTT" });
      const result = await this.bleService?.setMqtt(mqtt);
      showMessage(!!result);
    } catch (error) {
      showMessage(false);
    } finally {
      wx.hideLoading();
    }
  },
  getWiFiList() {
    this.setData({
      refreshWiFiListShow: false,
      wifiList: [],
    })
    this.bleService?.getWifiList().then((wifiList) => this.setData({
      wifiList,
      refreshWiFiListShow: true
    }))
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.bleService?.release();
  },
});
