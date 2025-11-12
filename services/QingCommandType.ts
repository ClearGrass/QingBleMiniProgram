/*
 * Created by Tiger on 29/03/2024
 *  命令类型定义
 */

export class QingCommandType {
  //  错误
  public static readonly CommandExecResult = 0xff;
  // 设置 token
  public static readonly SetToken = 0x01;
  // 验证 token
  public static readonly VerifyToken = 0x02;
  // 获取 Wi-Fi 列表
  public static readonly GetWifiList = 0x2f;
  // 设置 Wi-Fi
  public static readonly SetWifi = 0x09;
  // 设置 MQTT Part1
  public static readonly SetMqttPart1 = 0x17;
  // 设置 MQTT Part2
  public static readonly SetMqttPart2 = 0x18;
}
