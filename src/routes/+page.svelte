<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	let maze: Array<Array<number | string>> = [];
	let playerX = tweened(50, { duration: 0 });
	let playerY = tweened(10, { duration: 0 });
	let inventory = { stone: 1, paper: 1, scissors: 1 };
	const MAZE_WIDTH = 100;
	const MAZE_HEIGHT = 400;
	const CELL_SIZE = 20;
	let innerWidth = 0;
	let innerHeight = 0;
	let canMoveDown = true;

	function generateMaze() {
		maze = Array(MAZE_HEIGHT)
			.fill(0)
			.map(() => Array(MAZE_WIDTH).fill(1));

		const stack: [number, number][] = [[1, 1]];
		maze[1][1] = 0;

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
				if (nx >= 0 && nx < MAZE_WIDTH && ny >= 0 && ny < MAZE_HEIGHT && maze[ny][nx] === 1) {
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

		// Add items
		const items = ['stone', 'paper', 'scissors'];
		for (let i = 0; i < 30; i++) {
			const x = Math.floor(Math.random() * MAZE_WIDTH);
			const y = Math.floor(Math.random() * MAZE_HEIGHT);
			if (maze[y][x] === 0) {
				maze[y][x] = items[Math.floor(Math.random() * items.length)];
			}
		}
	}

	function checkCollision(x: number, y: number): boolean {
		const defaultYOffset = Math.floor(innerHeight / CELL_SIZE / 2);
		const cellX = Math.floor(x / CELL_SIZE);
		const cellY = Math.floor((y - defaultYOffset * CELL_SIZE) / CELL_SIZE);
		console.log(cellX, cellY);
		if (cellX < 0 || cellX >= MAZE_WIDTH || cellY < 0 || cellY >= MAZE_HEIGHT) {
			return false;
		}
		return maze[cellY][cellX] === 1;
	}

	function handleMouseMove(event: { clientX: number }) {
		const targetX = event.clientX;
		const currentX = $playerX * CELL_SIZE;

		if (!checkCollision(targetX, $playerY * CELL_SIZE)) {
			console.log('Moving player');
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

	function handleScroll(event: UIEvent) {
		if (browser) {
			const targetY = (window.scrollY + 50) / CELL_SIZE;
			if (!checkCollision($playerX * CELL_SIZE, targetY * CELL_SIZE)) {
				console.log('Moving player');
				playerY.set(targetY);
				canMoveDown = true;
			} else {
				console.log('Cannot move down');
				canMoveDown = false;
			}
			if (!canMoveDown) {
				document.documentElement.style.overflow = 'hidden';
				document.documentElement.style.height = '100vh';
			} else {
				document.documentElement.style.overflow = 'auto';
				document.documentElement.style.height = 'auto';
			}
		}
	}

	onMount(() => {
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
		class="fixed top-0 left-0 w-full h-12 bg-gray-800 text-white flex items-center justify-center"
	>
		Inventory: Stone ({inventory.stone}) Paper ({inventory.paper}) Scissors ({inventory.scissors})
	</div>
	<div class="absolute top-[50vh] left-0 w-screen h-[400vh]">
		{#each maze as row, y}
			<div class="flex">
				{#each row as cell, x}
					<div
						class="w-5 h-5"
						class:bg-gray-800={cell === 1}
						class:bg-red-500={cell === 'stone'}
						class:bg-blue-500={cell === 'paper'}
						class:bg-green-500={cell === 'scissors'}
					></div>
				{/each}
			</div>
		{/each}
		<div
			class="absolute w-5 h-5 bg-red-600 rounded-full transition-all duration-100 ease-out"
			style="left: {$playerX * CELL_SIZE}px; top: {($playerY -
				Math.floor(innerHeight / CELL_SIZE / 2)) *
				CELL_SIZE}px;"
		></div>
	</div>
</div>