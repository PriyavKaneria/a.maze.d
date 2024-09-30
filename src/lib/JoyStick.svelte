<script>
	import { onMount } from 'svelte';

	export let radius = 50;
	export let inner_radius = radius / 2;
	export let x = 0;
	export let y = 0;
	export let mouse_support = false;
	export let up = false;
	export let down = false;
	export let left = false;
	export let right = false;
	export let ondblclick = () => {};

	let base, control;

	function __is_up(dx, dy) {
		if (dy >= 0) return false;
		if (Math.abs(dx) > 2 * Math.abs(dy)) return false;
		return true;
	}

	function __is_down(dx, dy) {
		if (dy <= 0) return false;
		if (Math.abs(dx) > 2 * Math.abs(dy)) return false;
		return true;
	}

	function __is_left(dx, dy) {
		if (dx >= 0) return false;
		if (Math.abs(dy) > 2 * Math.abs(dx)) return false;
		return true;
	}

	function __is_right(dx, dy) {
		if (dx <= 0) return false;
		if (Math.abs(dy) > 2 * Math.abs(dx)) return false;
		return true;
	}

	function touch_handler(evt) {
		const touch_obj = evt.changedTouches ? evt.changedTouches[0] : evt;
		if (mouse_support && !(touch_obj.buttons === 1)) return;

		control.style.left = touch_obj.clientX - x + inner_radius + 'px';
		control.style.top = touch_obj.clientY - y + inner_radius + 'px';

		const dx = touch_obj.clientX - x;
		const dy = touch_obj.clientY - y;
		up = __is_up(dx, dy);
		down = __is_down(dx, dy);
		left = __is_left(dx, dy);
		right = __is_right(dx, dy);
	}

	function clear_flags() {
		left = false;
		right = false;
		up = false;
		down = false;

		control.style.top = inner_radius + 'px';
		control.style.left = inner_radius + 'px';
	}

	onMount(() => {
		control.style.top = inner_radius + 'px';
		control.style.left = inner_radius + 'px';
	});
</script>

<div class="fixed w-24 h-24 -translate-x-1/2 -translate-y-1/2" style="top: {y}px; left: {x}px;">
	<span
		bind:this={base}
		class="absolute border border-gray-300 rounded-full"
		style="width: {radius * 2}px; height: {radius * 2}px; top: 0px; left: 0px;"
	></span>
	<span
		aria-hidden="true"
		bind:this={control}
		class="absolute bg-gray-300 border border-gray-400 rounded-full"
		style="width: {inner_radius * 2}px; height: {inner_radius *
			2}px; top: {inner_radius}px; left: {inner_radius}px;"
		on:touchmove={touch_handler}
		on:touchstart={touch_handler}
		on:touchend={clear_flags}
		on:mousedown={mouse_support ? touch_handler : null}
		on:mousemove={mouse_support ? touch_handler : null}
		on:mouseup={mouse_support ? clear_flags : null}
		on:dblclick={ondblclick}
	></span>
</div>
