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

		// Create empty zone at the bottom
		for (let y = 1; y < EMPTY_ZONE_HEIGHT; y++) {
			for (let x = 1; x < MAZE_WIDTH - 1; x++) {
				maze[MAZE_HEIGHT - y - 1][x] = 0;
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

		// Create multiple exits at the end of the maze
		for (let i = 0; i < 5; i++) {
			const x = Math.floor(Math.random() * (MAZE_WIDTH - 2)) + 1;
			maze[MAZE_HEIGHT - EMPTY_ZONE_HEIGHT - 1][x] = 0;
			maze[MAZE_HEIGHT - EMPTY_ZONE_HEIGHT - 2][x] = 0;
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

	function checkCollision(cellX: number, cellY: number): boolean {
		if (cellX < 0 || cellX >= MAZE_WIDTH || cellY < 0 || cellY >= MAZE_HEIGHT) {
			return true; // Treat out-of-bounds as collision
		}
		return maze[cellY][cellX] === 1;
	}

	let lastMousePosition = 0;
	function handleMouseMove(event: { clientX: number }) {
		const targetCellX = Math.floor(event.clientX / CELL_SIZE);
		lastMousePosition = event.clientX;

		// Move to the target cell until we hit a wall
		if (targetCellX < $playerX) {
			for (let x = $playerX - 1; x >= targetCellX; x--) {
				if (checkCollision(x, $playerY)) {
					break;
				}
				playerX.set(x);
			}
		} else if (targetCellX > $playerX) {
			for (let x = $playerX + 1; x <= targetCellX; x++) {
				if (checkCollision(x, $playerY)) {
					break;
				}
				playerX.set(x);
			}
		}
	}

	let lastScrollPosition = 0;
	function handleScroll(event: UIEvent) {
		if (typeof window !== 'undefined') {
			const newScrollY = window.scrollY;
			const targetCellY = Math.floor(newScrollY / CELL_SIZE) + 10; // +10 is an offset, adjust as needed

			// Move to the target cell until we hit a wall
			if (targetCellY < $playerY) {
				for (let y = $playerY - 1; y >= targetCellY; y--) {
					if (checkCollision($playerX, y)) {
						window.scrollTo({
							top: lastScrollPosition
						});
						break;
					}
					playerY.set(y);
				}
			} else if (targetCellY > $playerY) {
				for (let y = $playerY + 1; y <= targetCellY; y++) {
					if (checkCollision($playerX, y)) {
						window.scrollTo({
							top: lastScrollPosition
						});
						break;
					}
					playerY.set(y);
				}
			}
			lastScrollPosition = window.scrollY;
			handleMouseMove({ clientX: lastMousePosition });
		}
	}

	onMount(() => {
		// set sizes
		MAZE_WIDTH = Math.ceil(innerWidth / CELL_SIZE);
		MAZE_HEIGHT = Math.floor((3 * innerHeight) / CELL_SIZE);
		EMPTY_ZONE_HEIGHT = Math.floor(innerHeight / 2 / CELL_SIZE);

		// set player position
		playerX.set(Math.floor(MAZE_WIDTH / 2));

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

<div class="w-screen h-[350vh] pointer-events-none">
	<div
		class="fixed top-0 left-0 w-full h-12 bg-gray-800 text-white flex items-center justify-center z-10"
	>
		Inventory: Stone ({inventory.stone}) Paper ({inventory.paper}) Scissors ({inventory.scissors})
	</div>
	<div class="absolute top-0 left-0 w-screen h-[350vh]">
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
			class="absolute w-5 h-5 bg-red-600 transition-all duration-100 ease-out"
			style="left: {$playerX * CELL_SIZE}px; top: {$playerY * CELL_SIZE}px;"
		></div>
	</div>
</div>
