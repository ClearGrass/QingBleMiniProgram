import helper from '../utils/helper'

/**
 * 连接、管理蓝牙设备类
 */
export class QingBleService {
  private static LogTag = "QingBleService";
  // 超时时间，默认 20 秒
  private timeout: number = 20000

  /**
   * 连接设备
   * @param option 连接参数
   */
  public async startConnect(option: IConnectOption): Promise<IError | IDevice> {

    return {} as IDevice
  }

  /**
   * 开始扫描
   */
  private startScan() {
    this.print('开始扫描')

  }

  /**
   * 停止扫描
   */
  private stopScan() {

  }

  /**
   * 打印日志
   * @param args 
   */
  private print(...args: any) {
    helper.log(QingBleService.LogTag, ...args)
  }

  
}