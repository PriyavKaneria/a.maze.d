<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { tweened } from 'svelte/motion';

	let maze: Array<Array<number | string>> = [];
	let playerX = tweened(50, { duration: 0 });
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

	function checkCollision(x: number, y: number, direction?: number): boolean {
		const cellX = direction === 1 || true ? Math.floor(x / CELL_SIZE) : Math.ceil(x / CELL_SIZE);
		const cellY = direction === 1 || true ? Math.floor(y / CELL_SIZE) : Math.ceil(y / CELL_SIZE);
		if (cellX < 0 || cellX >= MAZE_WIDTH || cellY < 0 || cellY >= MAZE_HEIGHT) {
			return false;
		}
		return maze[cellY][cellX] === 1;
	}

	function handleMouseMove(event: { clientX: number }) {
		const targetX = event.clientX;
		const currentX = $playerX * CELL_SIZE;

		if (!checkCollision(targetX, $playerY * CELL_SIZE)) {
			playerX.set(targetX / CELL_SIZE);
		}

		const cellX = Math.floor($playerX);
		const cellY = Math.floor($playerY);
		if (typeof maze[cellY][cellX] === 'string') {
			const item = maze[cellY][cellX] as 'stone' | 'paper' | 'scissors';
			inventory[item]++;
			maze[cellY][cellX] = 0;
		}
	}

	let lastScrollPosition = 0;
	function handleScroll(event: UIEvent) {
		if (browser) {
			const scrollDirection = window.scrollY - lastScrollPosition > 0 ? 1 : -1;
			const targetY = window.scrollY / CELL_SIZE + 10;
			const hitCellY = scrollDirection === 1 ? Math.floor($playerY) + 1 : Math.floor($playerY);
			// scroll position of last valid position
			const currentMaxScroll =
				(scrollDirection === 1 ? hitCellY - 1 : hitCellY + 1) * CELL_SIZE -
				(EMPTY_ZONE_HEIGHT * CELL_SIZE) / 2;
			console.log(
				scrollDirection,
				hitCellY,
				currentMaxScroll,
				scrollDirection === 1 ? currentMaxScroll : currentMaxScroll + CELL_SIZE
			);

			if (!checkCollision($playerX * CELL_SIZE, hitCellY * CELL_SIZE, scrollDirection)) {
				playerY.set(targetY);
				console.log('set', targetY);
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
			class="absolute w-3 h-3 bg-red-600 rounded-full transition-all duration-100 ease-out"
			style="left: {$playerX * CELL_SIZE}px; top: {$playerY *
				CELL_SIZE}px;transform: translate(-50%, 50%);"
		>
			<!-- temp text	
			{#if maze.length}
				<div class="absolute -top-32 -left-32 bg-gray-800 text-white p-1 rounded w-32 h-32">
					{Math.floor($playerX)}, {Math.floor($playerY)}
					{#if checkCollision($playerX * CELL_SIZE, $playerY * CELL_SIZE)}
						(1)
					{/if}
				</div>
			{/if} -->
		</div>
	</div>
</div>
