<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { tweened } from 'svelte/motion';
	import StonePaperScissors from '$lib/stone-paper-scissor.svg';
	import StonePaperScissorsMobile from '$lib/stone-paper-scissor-mobile.svg';
	import { goto } from '$app/navigation';

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
	let usedItems = 0;
	let timerInterval: number;
	let freeRoam = false;
	let showOverlay = false;
	let overlayDiv: HTMLDivElement;

	// popup form
	let showPopup = false;
	let playerName = '';
	let playerLink = '';

	const startTimer = () => {
		timer = 0;
		timerInterval = setInterval(() => {
			timer++;
			if (timer % 15 === 0) {
				// spawn a random item at spawn
				const items = ['stone', 'paper', 'scissors'];
				const x = Math.floor(Math.random() * (MAZE_WIDTH - 2)) + 1;
				const y = Math.floor(Math.random() * (EMPTY_ZONE_HEIGHT - 2 - 10)) + 10;
				maze[y][x] = items[Math.floor(Math.random() * items.length)] as
					| 'stone'
					| 'paper'
					| 'scissors'
					| 'checkpoint';
			}
			if (timer === 180) {
				alert('Random items spawn at start every 15s, if you get stuck');
			}
			if (timer === 300) {
				alert('Use checkpoints efficiently to move around for collecting required items');
			}
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
		const numberItems =
			innerWidth > 1440 ? 400 : innerWidth > 1024 ? 300 : innerWidth > 768 ? 200 : 150;
		for (let i = 0; i < numberItems; i++) {
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
					usedItems++;
					maze[cellY][cellX] = 0;
					break;
				case 'paper':
					if (inventory.scissors === 0) {
						return true;
					}
					inventory.scissors--;
					inventory.paper++;
					usedItems++;
					maze[cellY][cellX] = 0;
					break;
				case 'scissors':
					if (inventory.stone === 0) {
						return true;
					}
					inventory.stone--;
					inventory.scissors++;
					usedItems++;
					maze[cellY][cellX] = 0;
					break;
				default:
					break;
			}
		}
		return maze[cellY][cellX] === 1;
	}

	let lastMousePosition = 0;
	function handleMouseMove(event: MouseEvent | TouchEvent) {
		// check touch input
		if (event.type === 'touchmove') {
			const touch = (event as TouchEvent).touches[0];
			event = new MouseEvent('mousemove', {
				clientX: touch.clientX
			});
		}
		event = event as MouseEvent;
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
							// window.scrollTo({
							// 	top: lastScrollPosition
							// });
							// break;
						}
					}
					playerY.set(y);
				}
			} else if (targetCellY > $playerY) {
				for (let y = $playerY + 1; y <= targetCellY; y++) {
					if (checkCollision($playerX, y)) {
						if (!freeRoam) {
							// window.scrollTo({
							// 	top: lastScrollPosition
							// });
							// break;
						}
					}
					playerY.set(y);
				}
			}
			lastScrollPosition = window.scrollY;
			const mouseEvent = new MouseEvent('mousemove', {
				clientX: lastMousePosition
			});
			handleMouseMove(mouseEvent);
		}
	}

	const handleMouseDown = (event: MouseEvent | TouchEvent) => {
		// check touch input
		if (event.type === 'touchstart') {
			const touch = (event as TouchEvent).touches[0];

			// double click to add checkpoint
			if (touch.target === event.currentTarget) {
				event.preventDefault();
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
		}

		event = event as MouseEvent;
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
		return () => {
			if (timerInterval) clearInterval(timerInterval);
		};
	});

	const handleSubmit = async () => {
		const response = await fetch('/api/leaderboard', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: playerName, link: playerLink, time: timer, items: usedItems })
		});
		if (response.ok) {
			showPopup = false;
			alert('Your score has been added to the leaderboard!');
			goto('/leaderboard');
		} else {
			alert('Failed to add your score. Please try again.');
		}
	};

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
		// winnning condition
		if (!freeRoam && value >= MAZE_HEIGHT - EMPTY_ZONE_HEIGHT - 1) {
			if (maxY < MAZE_HEIGHT - EMPTY_ZONE_HEIGHT - 1) {
				alert('Cheating detected! You did not complete the maze!');
				location.reload();
			}
			showPopup = true; // Show the popup form
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
		usedItems = 0;
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
		class="fixed top-0 left-0 w-full h-32 md:h-12 bg-white text-sm md:text-lg text-black flex items-center justify-center z-10 select-none gap-6 flex-col md:flex-row overflow-visible"
	>
		<div class="flex gap-6">
			<span>Inventory:</span>
			<div class="flex gap-6 flex-col md:flex-row">
				<div class="flex gap-6">
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
				</div>
				<div class="flex gap-6">
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
				</div>
			</div>
		</div>

		<div class="flex items-center gap-4">
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
				<span class="md:text-lg">Time: {timer}s</span>
				<button
					class="bg-blue-500 text-white px-2 md:px-4 py-1 md:py-2 rounded-md pointer-events-auto cursor-pointer"
					on:click={handleRestart}
				>
					Restart
				</button>
			{/if}
			<a
				class="bg-amber-500 text-white px-2 md:px-4 py-1 md:py-2 rounded-md pointer-events-auto cursor-pointer fixed top-32 md:top-12 right-6"
				href="/leaderboard"
			>
				Leaderboard
			</a>
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
	</div>
	<div class="flex justify-center items-start">
		<img
			alt="Stone(red) replaces Scissors(blue) replaces Paper(green) replaces stone, click to place checkpoint, right click to teleport to last checkpoint"
			src={innerWidth > 768 ? StonePaperScissors : StonePaperScissorsMobile}
			class="absolute top-16 mt-24 md:mt-6 h-[30%] md:h-[35%] pointer-events-none select-none"
		/>
	</div>
	<!-- go to checkpoint button for mobile -->
	{#if checkpoints.length > 0}
		<button
			class="fixed bottom-0 right-0 m-4 bg-yellow-400 text-black p-2 rounded-md pointer-events-auto cursor-pointer z-10"
			on:click={handleRightClick}
		>
			🚩
		</button>
	{/if}
	<div
		class="absolute top-0 left-0 w-screen h-[350vh] pointer-events-auto overflow-hidden"
		aria-hidden="true"
		on:mousedown={handleMouseDown}
		on:touchmove={handleMouseMove}
		on:contextmenu={handleRightClick}
	>
		{#each maze as row, y}
			<div class="flex">
				{#each row as cell, x}
					<div
						class="w-5 h-5 flex-shrink-0 text-center items-center justify-center flex overflow-visible"
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

{#if showPopup}
	<div class="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
		<div class="bg-white p-6 rounded-lg shadow-lg">
			<h2 class="text-xl font-bold mb-4">
				Congratulations! You completed the maze in {timer} seconds and used {usedItems} items.
			</h2>
			<form on:submit|preventDefault={handleSubmit}>
				<div class="mb-4">
					<label class="block text-gray-700 text-sm font-bold mb-2" for="name">Name</label>
					<input
						class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
						id="name"
						type="text"
						bind:value={playerName}
						required
					/>
				</div>
				<div class="mb-4">
					<label class="block text-gray-700 text-sm font-bold mb-2" for="link">
						Social Media Link (optional)
					</label>
					<input
						class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
						id="link"
						type="text"
						bind:value={playerLink}
					/>
				</div>
				<div class="flex items-center justify-between">
					<button
						class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
						type="submit"
					>
						Submit
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
