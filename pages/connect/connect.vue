<template>
  <view class="connect-container">
    <!-- 连接步骤 -->
    <view class="steps-section">
			<img class="device-press-tip" src="/static/pheasant_press.png" alt="" v-if="currentStep.status === EConnectStepStatus.InProgress && connectStep.value === EConnectStep.Scan">
      <text class="device-mac">{{ currentDevice?.mac || "" }}</text>
      <view class="step-content">
        <uni-load-more
          v-if="currentStep.status === EConnectStepStatus.InProgress"
          :icon-size="loadingStatus.iconSize"
          :status="loadingStatus.status"
          :show-text="loadingStatus.showText"
          :content-text="loadingStatus.contentText"
        />
        <view v-else class="step-icon" :class="getStepIconClass(currentStep)">
          <text
            class="icon"
            v-if="currentStep.status === EConnectStepStatus.Success"
            >✓</text
          >
          <text
            class="icon"
            v-else-if="currentStep.status === EConnectStepStatus.Failed"
            >✗</text
          >
        </view>
        <text class="step-text">{{ currentStep.text }}</text>
      </view>
    </view>

    <!-- WiFi 配置区域 -->
    <view class="wifi-section" v-if="showWifiConfig">
      <button class="secondary-btn" @click="getWifiList">获取WiFi列表</button>

      <!-- WiFi 列表 -->
      <view class="wifi-list" v-if="wifiList.length > 0">
        <view
          class="wifi-item"
          v-for="wifi in wifiList"
          :key="wifi.name"
          @click="selectWifi(wifi)"
          :class="{ active: selectedWifi?.name === wifi.name }"
        >
          <text class="wifi-name">{{ wifi.name }}</text>

          <view class="wifi-signal-auth">
            <image
              v-if="wifi.auth > 0"
              class="wifi-auth"
              src="/static/wifi/wifi_lock.png"
            />
            <image
              v-if="wifi.rssi > -50"
              class="wifi-signal-icon"
              src="/static/wifi/wifi_rssi3.png"
            />
            <image
              v-else-if="wifi.rssi > -70"
              class="wifi-signal-icon"
              src="/static/wifi/wifi_rssi2.png"
            />
            <image
              v-else-if="wifi.rssi > -80"
              class="wifi-signal-icon"
              src="/static/wifi/wifi_rssi1.png"
            />
            <image
              v-else
              class="wifi-signal-icon"
              src="/static/wifi/wifi_rssi0.png"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { QingBleService } from "../../services/QingBleService";
import {
  EConnectStep,
  EConnectStepStatus,
  EQingProductID,
  IQingBlueToothDevice,
  IWiFiItem,
} from "../../services/define";

// 响应式数据
const connected = ref(false);
const currentDevice = ref<IQingBlueToothDevice | null>(null);
const wifiList = ref<IWiFiItem[]>([]);
const selectedWifi = ref<IWiFiItem | null>(null);
const wifiPassword = ref("");
const showWifiConfig = ref(false);
const connectStatus = ref<EConnectStepStatus>(EConnectStepStatus.InProgress);
const connectStep = ref<EConnectStep>(EConnectStep.Scan);
const loadingStatus = ref({
	status: 'loading',
	iconSize: 20,
	showText: false,
	iconType: 'circle',
	contentText: {
		contentdown: '',
		contentrefresh: '',
		contentnomore: '',
	}
});

// BLE服务实例
let bleService: QingBleService | null = null;

// 计算属性
const currentStep = computed(() => {
  const description = (step: EConnectStep) => {
    switch (step) {
      case EConnectStep.Scan:
        return "扫描设备,请长安机身按钮 2 秒，直至蓝牙图标闪烁";
      case EConnectStep.Connect:
        return "连接设备";
      case EConnectStep.Subscribe:
        return "订阅服务";
      case EConnectStep.SetToken:
        return "设置Token";
      case EConnectStep.VerifyToken:
        return "验证Token";
      case EConnectStep.GetWifiList:
        return "获取WiFi列表";
      case EConnectStep.SetWifi:
        return "设置WiFi";
      case EConnectStep.Disconnected:
        return "设备已断开";
      default:
        return "未知步骤";
    }
  };

  return {
    step: connectStep.value,
    status: connectStatus.value,
    text: description(connectStep.value),
  };
});

const getStepIconClass = (step: any) => {
  return {
    "step-success": step.status === EConnectStepStatus.Success,
    "step-failed": step.status === EConnectStepStatus.Failed,
  };
};

// 方法
const onConnectStatusChange = (
  step: EConnectStep,
  status: EConnectStepStatus,
  device: IQingBlueToothDevice | null
) => {
  console.log("连接状态变化:", step, status, device);
  connectStep.value = step;
  connectStatus.value = status;
  if (device) {
    currentDevice.value = device;
  }

  // 断开连接处理
  if (step === EConnectStep.Disconnected) {
    uni.showToast({ title: "设备已断开", icon: "none" });
  }
};

const resetSteps = () => {
  connectStep.value = EConnectStep.Scan;
  connectStatus.value = EConnectStepStatus.InProgress;
};

const startConnect = async () => {
  try {
    resetSteps();
    if (!bleService) {
      bleService = new QingBleService(onConnectStatusChange);
    }

    const result = await bleService.startConnect({
      productId: EQingProductID.PheasantS9118,
      timeout: 60 * 1000, // 60秒超时
    });

    if ("errCode" in result) {
      uni.showToast({ title: result.errMessage || "连接失败", icon: "error" });
      return;
    }

    currentDevice.value = result;
    connected.value = true;
    showWifiConfig.value = true;
    getWifiList();
  } catch (error: any) {
    console.error("连接失败:", error);
    uni.showToast({ title: error.message || "连接失败", icon: "error" });
  }
};

const getWifiList = async () => {
  if (!bleService || !connected.value) return;

  const list = await bleService.getWifiList();
  wifiList.value = list;

  if (list.length === 0) {
    uni.showToast({ title: "未找到WiFi", icon: "none" });
  }
};

const selectWifi = (wifi: IWiFiItem) => {
  selectedWifi.value = wifi;
  wifiPassword.value = "";
  // 不需要密码直接连接
  if (wifi.auth <= 0) {
    connectWifi();
    return;
  }
  uni
    .showModal({
      title: `请输入"${wifi.name}"的密码`,
      editable: true,
      placeholderText: "输入密码",
    })
    .then((res) => {
      if (res.confirm) {
        const password = res.content || "";
        if (password.length > 0) {
          wifiPassword.value = password;
          connectWifi();
        }
      }
    });
};

const connectWifi = async () => {
  if (!bleService || !selectedWifi.value) return;

  uni.showLoading({ title: "连接WiFi..." });

  const success = await bleService.setWifi(
    selectedWifi.value.name,
    wifiPassword.value
  );

  await uni.hideLoading();

  if (success) {
		uni.showToast({ title: "WiFi连接成功，配置完成！", icon: "success" });
		const deviceInfo = {
			wifi: selectedWifi.value.name,
			bleMac: currentDevice.value.mac,
			productId: currentDevice.value.productID,
			// token 保存起来，如果需要切换WiFi的时候，调用bleService.startConnect的时候传 token进去，不需要长按设备就可以连接。
			token: currentDevice.value.token, 
		}
		console.warn(`设备配置完成：配置信息为：${deviceInfo}, 可以将此内容保存到服务端`);
		// 断开蓝牙
		bleService.release()
		
  } else {
    uni.showToast({ title: "WiFi连接失败", icon: "error" });
  }
};

const disconnect = async () => {
  if (!bleService) return;
  await bleService.disconnect();
  connected.value = false;
  currentDevice.value = null;
  uni.showToast({ title: "已断开连接", icon: "success" });
};

// 生命周期
onMounted(() => {
  console.log("连接页面已加载");
  startConnect();
});

onUnmounted(() => {
  if (bleService) {
    bleService.release();
    bleService = null;
  }
});
</script>

<style lang="scss">
.connect-container {
  padding: 20rpx;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.device-press-tip {
	width: 60vw;
	height: 60vw;
}

.steps-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;

  .device-mac {
    display: block;
    font-size: 28rpx;
    color: #666;
    margin-bottom: 10rpx;
  }

  .step-content {
    display: flex;
    align-items: center;
    padding: 20rpx 0;

    .step-icon {
      width: 40rpx;
      height: 40rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20rpx;
      background: #f0f0f0;

      .icon {
        font-size: 24rpx;
        color: #999;

        &.pending {
          color: #ccc;
        }
      }
    }

    .step-text {
      font-size: 28rpx;
      color: #333;
			margin-left: 10rpx;
    }

    &.step-success .step-icon {
      background: #4cd964;

      .icon {
        color: white;
      }
    }

    &.step-failed .step-icon {
      background: #ff3b30;

      .icon {
        color: white;
      }
    }

    &.step-progress .step-icon {
      background: #007aff;
    }
  }
}

.wifi-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;

  .section-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }
}

.wifi-list {
  margin-bottom: 20rpx;

  .wifi-item {
    display: flex;
    align-items: center;
    padding: 20rpx;
    border: 1rpx solid #e0e0e0;
    border-radius: 8rpx;
    margin-bottom: 10rpx;
    align-content: space-between;
    cursor: pointer;

    &.active {
      border-color: #007aff;
      background: #f0f8ff;
    }

    .wifi-name {
      flex: 1;
      font-size: 28rpx;
      color: #333;
    }

    .wifi-signal-auth {
      display: flex;
      align-items: center;
    }

    .wifi-signal-icon {
      height: 24rpx;
      width: 22rpx;
      margin-right: 10rpx;
    }

    .wifi-auth {
      width: 22rpx;
      height: 24rpx;
      margin-right: 10rpx;
    }
  }
}
</style>
