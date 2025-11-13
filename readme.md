# 本分支基于 `uni-app` 开发

## 目前支持的设备类型为 `青萍商用温湿度计 S`， 参数如下
| 参数 | 值 |
| --- | --- |
| MODEL | CGP22w |
| PID | 0x5c |

## 使用方法如下 
```javascript

// 创建实例  onConnectStatusChange 方法是连接过程中的状态回调
const bleService = new QingBleService(onConnectStatusChange)

// 开始连接 包括：扫描目标设备、连接设备、订阅服务、设置token、验证token
bleService.startConnect({
  productId: EQingProductID.PheasantS9118,
  timeout: 60 * 1000, // 超时时间 可以不传，默认超时时间20秒
})

// 获取WiFi列表
const wifiList = await bleService.getWifiList()

// 设置WiFi
await bleService.setWifi("WiFi名称", "WiFi密码")

// 断开蓝牙
await bleService.release()
```

## [connect.vue](./pages/connect/connect.vue) 中实现了整个流程

可从 `onMounted` 方法中 startConnect 开始阅读