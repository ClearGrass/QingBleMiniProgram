<template>
  <view class="content">
    <image class="add" src="/static/add.png" @click="add"></image>
  </view>
</template>

<script>
export default {
  data() {
    return {};
  },
  onLoad() {},
  methods: {
		add() {
			uni.navigateTo({
				url: '/pages/connect/connect'
			})
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
