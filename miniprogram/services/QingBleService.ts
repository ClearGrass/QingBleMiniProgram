import helper from "../utils/helper";

/**
 * 连接、管理蓝牙设备类
 */
export class QingBleService {
  private static LogTag = "QingBleService";
  // 超时时间，默认 20 秒
  private timeout: number = 20000;
  private scanTimer: any = null;
  // private scanResolve:

  /**
   * 连接设备
   * @param option 连接参数
   */
  public async startConnect(option: IConnectOption): Promise<IError | IDevice> {
    // 开始连接前设置屏幕长亮
    wx.setKeepScreenOn({
      keepScreenOn: true,
    });

    // 结束连接后取消屏幕长亮
    wx.setKeepScreenOn({
      keepScreenOn: false,
    });
    return {} as IDevice;
  }

  /**
   * 开始扫描
   */
  private async startScan(): Promise<IDevice | IError> {
    this.print("开始扫描");
    let scanError: IError | null = null;

    this.scanTimer = setTimeout(() => {
      this.stopScan();
    }, this.timeout);

    // 初始化蓝牙模块
    await wx.openBluetoothAdapter({
      mode: "central", // central: 主机模式，peripheral: 从机模式
    });

    // 获取蓝牙状态
    const { available, discovering } = await wx.getBluetoothAdapterState();
    if (!available) {
      scanError = { code: EErrorCode.NotAvailable, message: "蓝牙不可用" };
      return scanError;
    }
    if (discovering) {
      this.print("正在扫描中...");
      // return 
    }

    const error: IError = { code: EErrorCode.NotFound, message: "未找到设备" };
    return error;
  }

  /**
   * 停止扫描
   */
  private stopScan() {}

  /**
   * 打印日志
   * @param args
   */
  private print(...args: any) {
    helper.log(QingBleService.LogTag, ...args);
  }
}
