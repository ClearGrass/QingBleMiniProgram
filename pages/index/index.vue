<template>
  <view class="content">
    <image class="add" src="/static/add.png" @click="add"></image>
  </view>
</template>

<script>

export default {
  onLoad() { },
  
  methods: {
    permissionCheck() {
      if (uni.getSystemInfoSync().platform !== "android") {
        return true;
      }
      const authSettings = uni.getAppAuthorizeSetting()
      if (authSettings.locationAuthorized !== 'denied') {
        return true;
      }
			uni.showModal({
			  content: "添加设备需要打开位置权限",
			  confirmText: "去设置",
			  success: (res) => {
			    if (res.confirm) {
						uni.openAppAuthorizeSetting({})
			    }
			  },
			});
      return false;
    },
		add() {
      if (this.permissionCheck()) {
        uni.navigateTo({
          url: "/pages/connect/connect",
        });
      }
		}
	},
};
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.add {
  height: 80rpx;
  width: 80rpx;
  position: fixed;
  bottom: 50%;
  top: 50%;
  left: 50%;
  right: 50%;
  transform: translate(-50%, -50%);
}
</style>
