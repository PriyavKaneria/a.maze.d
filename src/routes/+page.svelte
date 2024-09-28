<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { tweened } from 'svelte/motion';
	import StonePaperScissors from '$lib/stone-paper-scissor.svg';

	let maze: Array<Array<number | 'stone' | 'paper' | 'scissors' | 'checkpoint'>> = [];
	let playerX = tweened(25, { duration: 0 });
	let playerY = tweened(10, { duration: 0 });
	let inventory = { stone: 3, paper: 3, scissors: 3, checkpoints: 5 };
	let checkpoints: { x: number; y: number; scrollY: number }[] = [];
	let innerWidth = 0;
	let innerHeight = 0;

	let MAZE_WIDTH = 100;
	let MAZE_HEIGHT = 150; // 450vh * 5 (assuming 1vh = 5px)
	let CELL_SIZE = 20;
	let EMPTY_ZONE_HEIGHT = 25; // 50vh * 5

	let useEmojis = true;
	let timerStarted = false;
	$: timer = 0;
	let timerInterval: number;
	let freeRoam = false;
	let showOverlay = false;
	let overlayDiv: HTMLDivElement;

	const startTimer = () => {
		timer = 0;
		timerInterval = setInterval(() => {
			timer++;
		}, 1000);
	};

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
		for (let i = 0; i < 400; i++) {
			const x = Math.floor(Math.random() * (MAZE_WIDTH - 2)) + 1;
			const y =
				Math.floor(Math.random() * (MAZE_HEIGHT - 2 * EMPTY_ZONE_HEIGHT - 2)) +
				EMPTY_ZONE_HEIGHT +
				1;
			if (maze[y][x] === 0) {
				maze[y][x] = items[Math.floor(Math.random() * items.length)] as
					| 'stone'
					| 'paper'
					| 'scissors'
					| 'checkpoint';
			}
		}
	}

	function checkCollision(cellX: number, cellY: number): boolean {
		if (cellX < 0 || cellX >= MAZE_WIDTH || cellY < 0 || cellY >= MAZE_HEIGHT) {
			return true; // Treat out-of-bounds as collision
		}

		// Check if it is stone, paper, or scissors
		if (typeof maze[cellY][cellX] === 'string') {
			switch (maze[cellY][cellX]) {
				case 'stone':
					if (inventory.paper === 0) {
						return true;
					}
					inventory.paper--;
					inventory.stone++;
					maze[cellY][cellX] = 0;
					break;
				case 'paper':
					if (inventory.scissors === 0) {
						return true;
					}
					inventory.scissors--;
					inventory.paper++;
					maze[cellY][cellX] = 0;
					break;
				case 'scissors':
					if (inventory.stone === 0) {
						return true;
					}
					inventory.stone--;
					inventory.scissors++;
					maze[cellY][cellX] = 0;
					break;
				default:
					break;
			}
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

		// overlay
		if (showOverlay) {
			const radius = 5;
			const x = $playerX * CELL_SIZE;
			// consider scrolling
			const y = $playerY * CELL_SIZE - window.scrollY;
			overlayDiv.style.transition = 'clip-path 0.25s ease-out';
			overlayDiv.style.clipPath = `circle(${radius * CELL_SIZE}px at ${x}px ${y}px)`;
		}
	}

	let lastScrollPosition = 0;
	let checkpointScroll = false;
	function handleScroll(event: UIEvent) {
		if (checkpointScroll) {
			checkpointScroll = false;
			return;
		}
		if (typeof window !== 'undefined') {
			const newScrollY = window.scrollY;
			const targetCellY = Math.floor(newScrollY / CELL_SIZE) + 10; // +10 is an offset, adjust as needed

			// Move to the target cell until we hit a wall
			if (targetCellY < $playerY) {
				for (let y = $playerY - 1; y >= targetCellY; y--) {
					if (checkCollision($playerX, y)) {
						if (!freeRoam) {
							window.scrollTo({
								top: lastScrollPosition
							});
							break;
						}
					}
					playerY.set(y);
				}
			} else if (targetCellY > $playerY) {
				for (let y = $playerY + 1; y <= targetCellY; y++) {
					if (checkCollision($playerX, y)) {
						if (!freeRoam) {
							window.scrollTo({
								top: lastScrollPosition
							});
							break;
						}
					}
					playerY.set(y);
				}
			}
			lastScrollPosition = window.scrollY;
			handleMouseMove({ clientX: lastMousePosition });
		}
	}

	const handleMouseDown = (event: MouseEvent) => {
		if (event.detail > 1) {
			// double click stop text selection
			event.preventDefault();
		}
		// single left click places a yellow checkpoint at the player's current position
		if (event.button === 0) {
			if (inventory.checkpoints === 0) {
				alert('You are out of checkpoints!');
				return;
			}
			if (maze[$playerY][$playerX] === 'checkpoint') {
				return;
			}
			maze[$playerY][$playerX] = 'checkpoint';
			checkpoints.push({ x: $playerX, y: $playerY, scrollY: window.scrollY });
			inventory.checkpoints--;
		}
	};

	const handleRightClick = (event: MouseEvent) => {
		event.preventDefault();
		// right click moves the player to the last checkpoint
		if (checkpoints.length > 0) {
			const lastCheckpoint = checkpoints[checkpoints.length - 1];
			playerX.set(lastCheckpoint.x);
			playerY.set(lastCheckpoint.y);
			checkpointScroll = true;
			window.scrollTo({
				top: lastCheckpoint.scrollY
			});
			maze[lastCheckpoint.y][lastCheckpoint.x] = 0; // remove the checkpoint
			checkpoints.pop();
			inventory.checkpoints++;
		}
	};

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

	// cheat detection - if player has not moves at every Y position between start and end, they are cheating
	let maxY = EMPTY_ZONE_HEIGHT;
	playerY.subscribe((value) => {
		if (value === maxY) {
			maxY++;
		}
		// start timer
		if (!timerStarted && value > EMPTY_ZONE_HEIGHT - 1) {
			timerStarted = true;
			startTimer();
		}
		// winning condition
		if (!freeRoam && value >= MAZE_HEIGHT - EMPTY_ZONE_HEIGHT - 1) {
			// cheat detection
			if (maxY < MAZE_HEIGHT - EMPTY_ZONE_HEIGHT - 1) {
				alert('Cheating detected! You did not complete the maze!');
				location.reload();
			}
			alert('Congratulations! You completed the maze in ' + timer + ' seconds!');
			clearInterval(timerInterval);
			freeRoam = true;
		}
	});

	const handleRestart = () => {
		timerStarted = false;
		timer = 0;
		playerX.set(Math.floor(MAZE_WIDTH / 2));
		playerY.set(10);
		checkpointScroll = true;
		window.scrollTo({
			top: 0
		});
		checkpoints = [];
		inventory = { stone: 3, paper: 3, scissors: 3, checkpoints: 5 };
		generateMaze();
		clearInterval(timerInterval);
	};
</script>

<svelte:window
	bind:innerWidth
	bind:innerHeight
	on:scroll={handleScroll}
	on:mousemove={handleMouseMove}
/>

<div class="w-screen h-[350vh] pointer-events-none select-none">
	<div
		class="fixed top-0 left-0 w-full h-12 bg-white text-black flex items-center justify-center z-10 select-none gap-6"
	>
		<span>Inventory:</span>
		<span class="flex gap-1">
			{#if useEmojis}
				🪨
			{:else}
				<span class="bg-red-500 w-5 h-5 flex justify-center items-center" />
			{/if}
			Stone : {inventory.stone}
		</span>
		<span class="flex gap-1">
			{#if useEmojis}
				📄
			{:else}
				<span class="bg-blue-500 w-5 h-5 flex justify-center items-center" />
			{/if}
			Paper : {inventory.paper}
		</span>
		<span class="flex gap-1">
			{#if useEmojis}
				✂️
			{:else}
				<span class="bg-green-500 w-5 h-5 flex justify-center items-center" />
			{/if}
			Scissors : {inventory.scissors}
		</span>
		<span class="flex gap-1">
			{#if useEmojis}
				🚩
			{:else}
				<span class="bg-yellow-500 w-5 h-5 flex justify-center items-center" />
			{/if}
			Checkpoints : {inventory.checkpoints}
		</span>

		<!-- radio button group for emojis/color -->
		<div class="flex gap-2 ml-4 pointer-events-auto cursor-pointer z-20">
			<label>
				<input
					type="radio"
					name="useEmojis"
					checked={useEmojis}
					on:change={() => {
						useEmojis = true;
					}}
				/>
				use emojis
			</label>
			<label>
				<input
					type="radio"
					name="useEmojis"
					checked={!useEmojis}
					on:change={() => {
						useEmojis = false;
					}}
				/>
				use colors
			</label>
		</div>
		{#if freeRoam}
			<button
				class="bg-red-500 text-white px-4 py-2 rounded-md pointer-events-auto cursor-pointer"
				on:click={() => {
					location.reload();
				}}
			>
				Play again
			</button>
		{:else if timerStarted}
			<span class="text-lg">Time: {timer}s</span>
			<button
				class="bg-blue-500 text-white px-4 py-2 rounded-md pointer-events-auto cursor-pointer"
				on:click={handleRestart}
			>
				Restart
			</button>
		{/if}
		<!-- <button
			class="bg-red-600 text-white px-4 py-2 rounded-md pointer-events-auto cursor-pointer"
			on:click={() => {
				showOverlay = true;
				handleRestart();
			}}
		>
			Hard mode
		</button> -->
	</div>
	<div class="flex justify-center items-start">
		<img
			alt="Stone(red) replaces Scissors(blue) replaces Paper(green) replaces stone, click to place checkpoint, right click to teleport to last checkpoint"
			src={StonePaperScissors}
			class="absolute top-16 h-[35%] pointer-events-none select-none"
		/>
	</div>
	<div
		class="absolute top-0 left-0 w-screen h-[350vh] pointer-events-auto"
		aria-hidden="true"
		on:mousedown={handleMouseDown}
		on:contextmenu={handleRightClick}
	>
		{#each maze as row, y}
			<div class="flex">
				{#each row as cell, x}
					<div
						class="w-5 h-5 text-center items-center justify-center flex overflow-visible"
						class:bg-gray-800={cell === 1}
						class:bg-red-500={cell === 'stone' && !useEmojis}
						class:bg-blue-500={cell === 'paper' && !useEmojis}
						class:bg-green-500={cell === 'scissors' && !useEmojis}
						class:bg-yellow-500={cell === 'checkpoint' && !useEmojis}
					>
						{#if useEmojis}
							{#if cell === 'stone'}
								🪨
							{:else if cell === 'paper'}
								📄
							{:else if cell === 'scissors'}
								✂️
							{:else if cell === 'checkpoint'}
								🚩
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		{/each}
		<div
			class="absolute w-5 h-5 bg-amber-500 transition-all duration-100 ease-out"
			style="left: {$playerX * CELL_SIZE}px; top: {$playerY * CELL_SIZE}px;"
		></div>
	</div>
</div>

<!-- {#if showOverlay} -->
<!-- Only a circular radius of maze is visible -->
<!-- <div class="fixed top-0 left-0 w-screen h-screen bg-black z-10" bind:this={overlayDiv}></div>
{/if} -->
