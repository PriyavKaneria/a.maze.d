<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { tweened } from 'svelte/motion';

	let maze: Array<Array<number | string>> = [];
	let playerX = tweened(25, { duration: 0 });
	let playerY = tweened(10, { duration: 0 });
	let inventory = { stone: 1, paper: 1, scissors: 1 };
	let innerWidth = 0;
	let innerHeight = 0;

	let MAZE_WIDTH = 100;
	let MAZE_HEIGHT = 150; // 450vh * 5 (assuming 1vh = 5px)
	let CELL_SIZE = 20;
	let EMPTY_ZONE_HEIGHT = 25; // 50vh * 5

	function generateMaze() {
		maze = Array(MAZE_HEIGHT)
			.fill(0)
			.map(() => Array(MAZE_WIDTH).fill(1));

		// Create border
		for (let y = 0; y < MAZE_HEIGHT; y++) {
			maze[y][0] = 1;
			maze[y][MAZE_WIDTH - 1] = 1;
		}
		for (let x = 0; x < MAZE_WIDTH; x++) {
			maze[0][x] = 1;
			maze[MAZE_HEIGHT - 1][x] = 1;
		}

		// Create empty zone at the top
		for (let y = 1; y < EMPTY_ZONE_HEIGHT; y++) {
			for (let x = 1; x < MAZE_WIDTH - 1; x++) {
				maze[y][x] = 0;
			}
		}

		// Generate maze
		const stack: [number, number][] = [[1, EMPTY_ZONE_HEIGHT]];
		maze[EMPTY_ZONE_HEIGHT][1] = 0;

		while (stack.length > 0) {
			const [x, y] = stack[stack.length - 1];
			const directions = [
				[0, -2],
				[2, 0],
				[0, 2],
				[-2, 0]
			].sort(() => Math.random() - 0.5);

			let moved = false;
			for (const [dx, dy] of directions) {
				const nx = x + dx,
					ny = y + dy;
				if (
					nx > 0 &&
					nx < MAZE_WIDTH - 1 &&
					ny >= EMPTY_ZONE_HEIGHT &&
					ny < MAZE_HEIGHT - 1 &&
					maze[ny][nx] === 1
				) {
					maze[y + dy / 2][x + dx / 2] = 0;
					maze[ny][nx] = 0;
					stack.push([nx, ny]);
					moved = true;
					break;
				}
			}

			if (!moved) {
				stack.pop();
			}
		}

		// Create multiple exits at the bottom
		for (let i = 0; i < 5; i++) {
			const x = Math.floor(Math.random() * (MAZE_WIDTH - 2)) + 1;
			maze[MAZE_HEIGHT - 1][x] = 0;
			maze[MAZE_HEIGHT - 2][x] = 0;
		}

		// Add items
		const items = ['stone', 'paper', 'scissors'];
		for (let i = 0; i < 30; i++) {
			const x = Math.floor(Math.random() * (MAZE_WIDTH - 2)) + 1;
			const y =
				Math.floor(Math.random() * (MAZE_HEIGHT - EMPTY_ZONE_HEIGHT - 2)) + EMPTY_ZONE_HEIGHT + 1;
			if (maze[y][x] === 0) {
				maze[y][x] = items[Math.floor(Math.random() * items.length)];
			}
		}
	}

	function checkCollision(x: number, y: number): boolean {
		const cellX = Math.floor(x / CELL_SIZE);
		const cellY = Math.floor(y / CELL_SIZE);
		if (cellX < 0 || cellX >= MAZE_WIDTH || cellY < 0 || cellY >= MAZE_HEIGHT) {
			return false;
		}
		// console.log('checking collision', cellX, cellY, maze[cellY][cellX]);
		return maze[cellY][cellX] === 1;
	}

	let stuckLeft = false;
	let stuckRight = false;
	let quickStop = false;
	function handleMouseMove(event: { clientX: number; movementX: number }) {
		if (event.movementX === 0) {
			return;
		}
		// mouse movement is too fast, stop the player
		if (Math.abs(event.movementX) > 15) {
			console.log('quick stop');
			quickStop = true;
			return;
		}
		if (quickStop) {
			// if mouse in 10px range from player, reset quickStop
			if (Math.abs(event.clientX - $playerX * CELL_SIZE) < 50) {
				console.log('reset quick stop');
				quickStop = false;
			} else {
				return;
			}
		}
		const mouseDirection = event.movementX > 0 ? 1 : -1;
		// for clamping, do not consider when
		// 	 - mouse moving towards right, and ball clamped left (ballX > mouseX)
		//   - mouse moving towards left, and ball clamped right (ballX < mouseX)
		if (
			(stuckLeft && event.clientX < $playerX * CELL_SIZE) ||
			(stuckRight && event.clientX > $playerX * CELL_SIZE) ||
			(mouseDirection === 1 && stuckRight) ||
			(mouseDirection === -1 && stuckLeft)
		) {
			if (stuckLeft && event.clientX < $playerX * CELL_SIZE) {
				console.log('stuck left, cannot move left');
			} else if (stuckRight && event.clientX > $playerX * CELL_SIZE) {
				console.log('stuck right, cannot move right');
			} else if (mouseDirection === 1 && stuckRight) {
				console.log('stuck right, cannot move right');
			} else if (mouseDirection === -1 && stuckLeft) {
				console.log('stuck left, cannot move left');
			}
			return;
		}
		const targetX = event.clientX;
		const hitCellX = mouseDirection === 1 ? Math.floor($playerX) + 1 : Math.floor($playerX) - 1;

		// console.log('hitCellX', hitCellX, 'targetX', targetX, 'mouseDirection', mouseDirection);
		// clamp the player position to the maze
		if (!checkCollision(hitCellX * CELL_SIZE + 2 * mouseDirection, $playerY * CELL_SIZE)) {
			playerX.set(targetX / CELL_SIZE);
			stuckLeft = false;
			stuckRight = false;
			console.log('not stuck');
		} else {
			// console.log('stuck', hitCellX, $playerX);
			if (mouseDirection === 1) {
				stuckRight = true;
				stuckLeft = false;
				console.log('stuck right');
				playerX.set(hitCellX - 1);
			} else {
				stuckLeft = true;
				stuckRight = false;
				console.log('stuck left');
				playerX.set(hitCellX + 1);
			}
		}

		// const cellX = Math.floor($playerX);
		// const cellY = Math.floor($playerY);
		// if (typeof maze[cellY][cellX] === 'string') {
		// 	const item = maze[cellY][cellX] as 'stone' | 'paper' | 'scissors';
		// 	inventory[item]++;
		// 	maze[cellY][cellX] = 0;
		// }
	}

	let lastScrollPosition = 0;
	function handleScroll(event: UIEvent) {
		if (browser) {
			const scrollDirection = window.scrollY - lastScrollPosition > 0 ? 1 : -1;
			if (window.scrollY - lastScrollPosition > 10) {
				// prevent scrolling too fast
				console.log('scroll too fast');
				window.scrollTo({
					top: lastScrollPosition
				});
				return;
			}
			const targetY = window.scrollY / CELL_SIZE + 10;
			const hitCellY = scrollDirection === 1 ? Math.floor($playerY) + 1 : Math.floor($playerY);
			// scroll position of last valid position
			const currentMaxScroll =
				(scrollDirection === 1 ? hitCellY - 1 : hitCellY + 1) * CELL_SIZE -
				(EMPTY_ZONE_HEIGHT * CELL_SIZE) / 2;

			if (!checkCollision($playerX * CELL_SIZE, hitCellY * CELL_SIZE + 2 * scrollDirection)) {
				playerY.set(targetY);
				stuckLeft = false;
				stuckRight = false;
			} else {
				// scroll back to the previous position if there's a collision
				window.scrollTo({
					top: currentMaxScroll
				});
			}
			lastScrollPosition = window.scrollY;
		}
	}

	onMount(() => {
		// set sizes
		MAZE_WIDTH = Math.ceil(innerWidth / CELL_SIZE);
		MAZE_HEIGHT = Math.floor((3 * innerHeight) / CELL_SIZE);
		EMPTY_ZONE_HEIGHT = Math.floor(innerHeight / 2 / CELL_SIZE);

		// set player position
		playerX.set(MAZE_WIDTH / 2);

		generateMaze();
		if (browser) {
			window.scrollTo({
				top: 0
			});
		}
	});
</script>

<svelte:window
	bind:innerWidth
	bind:innerHeight
	on:scroll={handleScroll}
	on:mousemove={handleMouseMove}
/>

<div class="w-screen h-[450vh]">
	<div
		class="fixed top-0 left-0 w-full h-12 bg-gray-800 text-white flex items-center justify-center z-10"
	>
		Inventory: Stone ({inventory.stone}) Paper ({inventory.paper}) Scissors ({inventory.scissors})
	</div>
	<div class="absolute top-0 left-0 w-screen h-[450vh]">
		{#each maze as row, y}
			<div class="flex">
				{#each row as cell, x}
					<div
						class="w-5 h-5"
						class:bg-gray-800={cell === 1}
						class:bg-red-500={cell === 'stone'}
						class:bg-blue-500={cell === 'paper'}
						class:bg-green-500={cell === 'scissors'}
					/>
				{/each}
			</div>
		{/each}
		<div
			class="absolute w-3 h-3 bg-red-600 transition-all duration-100 ease-out"
			style="left: {$playerX * CELL_SIZE}px; top: {$playerY *
				CELL_SIZE}px;transform: translate(0%, 50%);"
		>
			<!-- temp text	 -->
			{#if maze.length}
				<div class="absolute -top-32 -left-32 bg-gray-800 text-white p-1 rounded w-32 h-32">
					{Math.floor($playerX)}, {Math.floor($playerY)}
				</div>
			{/if}
		</div>
	</div>
</div>
