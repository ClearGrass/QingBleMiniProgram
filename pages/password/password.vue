<template>
	<view class="container">
		<view class="password-input-container">
			<input 
				type="text" 
				password 
				auto-focus
				:placeholder="'请输入' + wifiName + '的密码'" 
				v-model="password"
				class="password-input"
				@input="onPasswordInput"
			/>
		</view>
		
		<view class="button-group">
			<button class="btn cancel-btn" @click="handleCancel">取消</button>
			<button 
				class="btn confirm-btn" 
				@click="handleConfirm" 
				:disabled="!isValidPassword"
			>确定</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			wifiName: '',
			password: ''
		}
	},
	computed: {
		isValidPassword() {
			return this.password.length >= 8 && this.password.length <= 63;
		}
	},
	onLoad(options) {
    // 从页面参数获取WiFi名称
		if (options.wifiName) {

			this.wifiName = decodeURIComponent(options.wifiName);
    }
    // 设置页面标题
    uni.setNavigationBarTitle({
      title: this.wifiName
    });
	},
	methods: {
		onPasswordInput(e) {
			this.password = e.detail.value;
		},
		handleCancel() {
			uni.navigateBack();
		},
		handleConfirm() {
			if (!this.isValidPassword) {
				uni.showToast({
					title: '密码长度应为8-63个字符',
					icon: 'none'
				});
				return;
			}
			
			// 返回密码给上一页面
			const eventChannel = this.getOpenerEventChannel();
			if (eventChannel) {
				eventChannel.emit('password', {
					password: this.password
				});
			}
			
			uni.navigateBack();
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	padding: 40rpx;
	min-height: 100vh;
	box-sizing: border-box;
	background-color: #f5f5f5;
}

.password-input-container {
	margin-bottom: 50rpx;
}

.password-input {
	width: 100%;
	height: 80rpx;
	padding: 0 20rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 10rpx;
	font-size: 32rpx;
	box-sizing: border-box;
	background-color: white;
}

.error-text {
	display: block;
	color: #ff4757;
	font-size: 24rpx;
	margin-top: 10rpx;
	margin-left: 10rpx;
}

.button-group {
	display: flex;
	justify-content: space-between;
}

.btn {
	flex: 1;
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 10rpx;
	font-size: 32rpx;
	font-weight: bold;
	margin: 20rpx;
}

.cancel-btn {
	background-color: #f0f0f0;
	color: #666;
	border: 2rpx solid #d0d0d0;
}

.confirm-btn {
	background-color: #007aff;
	color: white;
	border: 2rpx solid #d0d0d0;
}

.confirm-btn:disabled {
	background-color: #cccccc;
	border-color: #cccccc;
	color: #999999;
	opacity: 0.6;
}
</style>