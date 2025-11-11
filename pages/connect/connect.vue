<template>
	<view class="connect-container">
		<!-- 连接状态显示 -->
		<view class="status-section">
			<view class="device-info" v-if="currentDevice">
				<text class="device-name">{{ currentDevice.name }}</text>
				<text class="device-mac">{{ currentDevice.mac }}</text>
				<text class="device-battery">电量: {{ currentDevice.battery }}%</text>
			</view>
		</view>

		<!-- 连接步骤 -->
		<view class="steps-section">
			<view class="step-item" v-for="step in connectSteps" :key="step.key" 
				  :class="getStepClass(step)">
				<view class="step-icon">
					<text class="icon" v-if="step.status === 'success'">✓</text>
					<text class="icon" v-else-if="step.status === 'failed'">✗</text>
					<view class="loading" v-else-if="step.status === 'progress'"></view>
					<text class="icon pending" v-else>○</text>
				</view>
				<text class="step-text">{{ step.text }}</text>
			</view>
		</view>

		<!-- WiFi 配置区域 -->
		<view class="wifi-section" v-if="showWifiConfig">
			<view class="section-title">WiFi 配置</view>
			
			<!-- WiFi 列表 -->
			<view class="wifi-list" v-if="wifiList.length > 0">
				<view class="wifi-item" v-for="wifi in wifiList" :key="wifi.name"
					  @click="selectWifi(wifi)" :class="{ active: selectedWifi?.name === wifi.name }">
					<text class="wifi-name">{{ wifi.name }}</text>
					<text class="wifi-signal">{{ getSignalText(wifi.rssi) }}</text>
					<text class="wifi-auth" v-if="wifi.auth > 0">🔒</text>
				</view>
			</view>

			<!-- WiFi 密码输入 -->
			<view class="wifi-password" v-if="selectedWifi">
				<input class="password-input" v-model="wifiPassword" 
					   :password="!showPassword" placeholder="请输入WiFi密码" />
				<view class="password-toggle" @click="togglePassword">
					<image :src="showPassword ? '/static/wifi/eye_open@3x.png' : '/static/wifi/eye_close@3x.png'" 
						   class="eye-icon" />
				</view>
			</view>

			<button class="wifi-connect-btn" @click="connectWifi" 
					:disabled="!selectedWifi || connecting">连接WiFi</button>
		</view>


		<!-- 操作按钮 -->
		<view class="action-section">
			<button class="primary-btn" @click="startConnect" v-if="!connecting && !connected" 
					:disabled="connecting">开始连接</button>
			<button class="secondary-btn" @click="getWifiList" v-if="connected && !showWifiConfig" 
					:disabled="connecting">获取WiFi列表</button>
			<button class="danger-btn" @click="disconnect" v-if="connected" 
					:disabled="connecting">断开连接</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { QingBleService } from '../../services/QingBleService'
import { EConnectStep, EConnectStepStatus, EQingProductID, IQingBlueToothDevice, IWiFiItem } from '../../services/define'

// 响应式数据
const connecting = ref(false)
const connected = ref(false)
const currentDevice = ref<IQingBlueToothDevice | null>(null)
const wifiList = ref<IWiFiItem[]>([])
const selectedWifi = ref<IWiFiItem | null>(null)
const wifiPassword = ref('')
const showPassword = ref(false)
const showWifiConfig = ref(false)

// 连接步骤
const connectSteps = ref([
	{ key: EConnectStep.Scan, text: '扫描设备', status: 'pending' },
	{ key: EConnectStep.Connect, text: '连接设备', status: 'pending' },
	{ key: EConnectStep.Subscribe, text: '订阅服务', status: 'pending' },
	{ key: EConnectStep.SetToken, text: '设置Token', status: 'pending' },
	{ key: EConnectStep.VerifyToken, text: '验证Token', status: 'pending' }
])

// BLE服务实例
let bleService: QingBleService | null = null

// 计算属性
const getStepClass = (step: any) => {
	return {
		'step-success': step.status === 'success',
		'step-failed': step.status === 'failed',
		'step-progress': step.status === 'progress',
		'step-pending': step.status === 'pending'
	}
}

// 方法
const onConnectStatusChange = (step: EConnectStep, status: EConnectStepStatus, device: IQingBlueToothDevice | null) => {
	console.log('连接状态变化:', step, status, device)
	
	const stepItem = connectSteps.value.find(s => s.key === step)
	if (stepItem) {
		switch (status) {
			case EConnectStepStatus.InProgress:
				stepItem.status = 'progress'
				break
			case EConnectStepStatus.Success:
				stepItem.status = 'success'
				break
			case EConnectStepStatus.Failed:
				stepItem.status = 'failed'
				break
		}
	}
	
	if (device) {
		currentDevice.value = device
	}
	
	// 连接完成后的处理
	if (step === EConnectStep.VerifyToken && status === EConnectStepStatus.Success) {
		connected.value = true
		connecting.value = false
		uni.showToast({ title: '连接成功', icon: 'success' })
	}
	
	// 连接失败处理
	if (status === EConnectStepStatus.Failed) {
		connecting.value = false
		uni.showToast({ title: '连接失败', icon: 'error' })
	}
	
	// 断开连接处理
	if (step === EConnectStep.Disconnected) {
		connected.value = false
		connecting.value = false
		currentDevice.value = null
		resetSteps()
		uni.showToast({ title: '设备已断开', icon: 'none' })
	}
}

const resetSteps = () => {
	connectSteps.value.forEach(step => {
		step.status = 'pending'
	})
}

const startConnect = async () => {
	try {
		connecting.value = true
		resetSteps()
		
		if (!bleService) {
			bleService = new QingBleService(onConnectStatusChange)
		}
		
		const result = await bleService.startConnect({
			productId: EQingProductID.PheasantS9118
		})
		
		if ('errCode' in result) {
			throw new Error(result.errMessage || '连接失败')
		}
		
	} catch (error: any) {
		console.error('连接失败:', error)
		connecting.value = false
		uni.showToast({ title: error.message || '连接失败', icon: 'error' })
	}
}

const getWifiList = async () => {
	try {
		if (!bleService || !connected.value) return
		
		uni.showLoading({ title: '获取WiFi列表...' })
		const list = await bleService.getWifiList()
		wifiList.value = list
		showWifiConfig.value = true
		uni.hideLoading()
		
		if (list.length === 0) {
			uni.showToast({ title: '未找到WiFi', icon: 'none' })
		}
	} catch (error) {
		console.error('获取WiFi列表失败:', error)
		uni.hideLoading()
		uni.showToast({ title: '获取WiFi列表失败', icon: 'error' })
	}
}

const selectWifi = (wifi: IWiFiItem) => {
	selectedWifi.value = wifi
	wifiPassword.value = ''
}

const togglePassword = () => {
	showPassword.value = !showPassword.value
}

const connectWifi = async () => {
	try {
		if (!bleService || !selectedWifi.value) return
		
		connecting.value = true
		uni.showLoading({ title: '连接WiFi...' })
		
		const success = await bleService.setWifi(selectedWifi.value.name, wifiPassword.value)
		
		uni.hideLoading()
		connecting.value = false
		
		if (success) {
			uni.showToast({ title: 'WiFi连接成功，配置完成！', icon: 'success' })
			showWifiConfig.value = false
		} else {
			uni.showToast({ title: 'WiFi连接失败', icon: 'error' })
		}
	} catch (error) {
		console.error('WiFi连接失败:', error)
		uni.hideLoading()
		connecting.value = false
		uni.showToast({ title: 'WiFi连接失败', icon: 'error' })
	}
}


const disconnect = async () => {
	try {
		if (!bleService) return
		
		await bleService.disconnect()
		connected.value = false
		currentDevice.value = null
		resetSteps()
		showWifiConfig.value = false
		uni.showToast({ title: '已断开连接', icon: 'success' })
	} catch (error) {
		console.error('断开连接失败:', error)
		uni.showToast({ title: '断开连接失败', icon: 'error' })
	}
}

const getSignalText = (rssi: number) => {
	if (rssi > -50) return '强'
	if (rssi > -70) return '中'
	return '弱'
}

// 生命周期
onMounted(() => {
	console.log('连接页面已加载')
})

onUnmounted(() => {
	if (bleService) {
		bleService.release()
		bleService = null
	}
})
</script>

<style lang="scss">
.connect-container {
	padding: 20rpx;
	min-height: 100vh;
	background-color: #f5f5f5;
}

.status-section {
	margin-bottom: 30rpx;
	
	.device-info {
		background: white;
		border-radius: 16rpx;
		padding: 30rpx;
		text-align: center;
		
		.device-name {
			display: block;
			font-size: 36rpx;
			font-weight: bold;
			color: #333;
			margin-bottom: 10rpx;
		}
		
		.device-mac {
			display: block;
			font-size: 28rpx;
			color: #666;
			margin-bottom: 10rpx;
		}
		
		.device-battery {
			display: block;
			font-size: 24rpx;
			color: #999;
		}
	}
}

.steps-section {
	background: white;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	
	.step-item {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
		
		&:last-child {
			border-bottom: none;
		}
		
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
			
			.loading {
				width: 20rpx;
				height: 20rpx;
				border: 2rpx solid #007aff;
				border-top: 2rpx solid transparent;
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}
		}
		
		.step-text {
			font-size: 28rpx;
			color: #333;
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
		
		.wifi-signal {
			font-size: 24rpx;
			color: #666;
			margin-right: 10rpx;
		}
		
		.wifi-auth {
			font-size: 24rpx;
		}
	}
}

.wifi-password {
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
	
	.password-input {
		flex: 1;
		padding: 20rpx;
		border: 1rpx solid #e0e0e0;
		border-radius: 8rpx;
		font-size: 28rpx;
	}
	
	.password-toggle {
		margin-left: 10rpx;
		padding: 10rpx;
		
		.eye-icon {
			width: 40rpx;
			height: 40rpx;
		}
	}
}

.form-group {
	margin-bottom: 20rpx;
	
	.label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	input {
		width: 100%;
		padding: 20rpx;
		border: 1rpx solid #e0e0e0;
		border-radius: 8rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}
}

.action-section {
	padding: 20rpx 0;
	
	button {
		width: 100%;
		padding: 24rpx;
		border-radius: 12rpx;
		font-size: 32rpx;
		margin-bottom: 20rpx;
		border: none;
		
		&.primary-btn {
			background: #007aff;
			color: white;
		}
		
		&.secondary-btn {
			background: #f0f0f0;
			color: #333;
		}
		
		&.danger-btn {
			background: #ff3b30;
			color: white;
		}
		
		&.wifi-connect-btn {
			background: #4cd964;
			color: white;
		}
		
		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}
</style>