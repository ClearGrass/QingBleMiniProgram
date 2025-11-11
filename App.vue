<script lang="ts">
	import { EConnectStep, EConnectStepStatus, EQingProductID, IQingBlueToothDevice } from './services/define';
import { QingBleService } from './services/QingBleService';
	export default {
		onLaunch: function() {
			console.log('App Launch')
			const onConnectStatusChange = (step: EConnectStep, status: EConnectStepStatus, device: IQingBlueToothDevice | null) => {
				console.log('onConnectStatusChange', step, status, device)
			}
			const bleService = new QingBleService(onConnectStatusChange)
			bleService.startConnect({
				productId: EQingProductID.PheasantS9118,
			}).then(res => {
				console.log('connect success', res)
			}).catch(err => {
				console.log('connect error', err)
			})
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
