<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { tweened } from 'svelte/motion';
	import StonePaperScissors from '$lib/stone-paper-scissor.svg';
	import StonePaperScissorsMobile from '$lib/stone-paper-scissor-mobile.svg';
	import { goto } from '$app/navigation';
	import JoyStick from '$lib/JoyStick.svelte';

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
	let playerYOffset = 10;

	let useEmojis = true;
	let useTwoFingerMovement = false;
	let timerStarted = false;
	$: timer = 0;
	let usedItems = 0;
	let timerInterval: NodeJS.Timeout;
	let freeRoam = false;
	let showOverlay = false;
	let overlayDiv: HTMLDivElement;
	let joystickUp = false;
	let joystickDown = false;
	let joystickLeft = false;
	let joystickRight = false;

	let hardMode = false;

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
				const y =
					Math.floor(Math.random() * (EMPTY_ZONE_HEIGHT - 2 - playerYOffset)) + playerYOffset;
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

	const crossBrowserScroll = (scrollY: number, direct: boolean = false) => {
		const ios = () => {
			if (typeof window === `undefined` || typeof navigator === `undefined`) return false;

			return /iPhone|iPad|iPod/i.test(
				navigator.userAgent ||
					navigator.vendor ||
					// @ts-ignore
					(window.opera && opera.toString() === `[object Opera]`)
			);
		};

		if (ios()) {
			// iOS
			if (typeof window !== 'undefined') {
				window.scroll(0, scrollY);
			}
		} else {
			// Other browsers
			if (typeof window !== 'undefined') {
				window.scrollTo({
					top: scrollY,
					behavior: direct || innerWidth >= 768 ? 'auto' : 'smooth'
				});
			}
		}
	};

	const generateMaze = () => {
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
		for (let i = 0; i < (hardMode ? numberItems + 100 : numberItems); i++) {
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
	};

	const checkCollision = (cellX: number, cellY: number): boolean => {
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
	};

	let lastMousePosition = 0;
	const handleMouseMove = (event: MouseEvent) => {
		if (showPopup) return;
		// reject touch
		if (innerWidth <= 768) return;
		if (useTwoFingerMovement) return;
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
	};

	let lastScrollPosition = 0;
	const handleScroll = (event: UIEvent) => {
		if (showPopup) return;
		if (typeof window !== 'undefined') {
			const newScrollY = window.scrollY;
			const targetCellY = Math.floor(newScrollY / CELL_SIZE) + playerYOffset;

			// Move to the target cell until we hit a wall
			if (targetCellY < $playerY) {
				for (let y = $playerY - 1; y >= targetCellY; y--) {
					if (checkCollision($playerX, y)) {
						if (!freeRoam) {
							crossBrowserScroll(lastScrollPosition);
							break;
						}
					}
					playerY.set(y);
				}
			} else if (targetCellY > $playerY) {
				for (let y = $playerY + 1; y <= targetCellY; y++) {
					if (checkCollision($playerX, y)) {
						if (!freeRoam) {
							crossBrowserScroll(lastScrollPosition);
							break;
						}
					}
					playerY.set(y);
				}
			}
			lastScrollPosition = window.scrollY;
			if (innerWidth > 768 && lastMousePosition != -1) {
				const mouseEvent = new MouseEvent('mousemove', {
					clientX: lastMousePosition
				});
				console.log(lastMousePosition);

				handleMouseMove(mouseEvent);
			}
		}
		console.log('scroll');
	};

	let debounceHack = 0;
	const handleWheel = (event: WheelEvent) => {
		// for left right movement on left right scroll using two fingers
		// reject mobile
		if (innerWidth <= 768) return;
		debounceHack++;
		if (debounceHack % 13 == 0 && Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
			lastMousePosition = -1;
			debounceHack = 0;
			if (event.deltaX > 0) {
				if (checkCollision($playerX - 1, $playerY)) {
					return;
				}
				playerX.set($playerX - 1);
			} else {
				if (checkCollision($playerX + 1, $playerY)) {
					return;
				}
				playerX.set($playerX + 1);
			}
		}
	};

	const setCheckpoint = () => {
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
	};

	const handleMouseDown = (event: MouseEvent | TouchEvent) => {
		if (showPopup) return;
		// check touch input
		if (event.type === 'touchstart') {
			event.preventDefault();
		}
		// reject on mobile
		if (innerWidth <= 768) {
			return;
		}

		event = event as MouseEvent;
		if (event.detail > 1) {
			// double click stop text selection
			event.preventDefault();
		}
		// single left click places a yellow checkpoint at the player's current position
		if (event.button === 0) {
			setCheckpoint();
		}
	};

	const handleRightClick = (event: MouseEvent) => {
		if (showPopup) return;
		event.preventDefault();
		// right click moves the player to the last checkpoint
		if (checkpoints.length > 0) {
			const lastCheckpoint = checkpoints[checkpoints.length - 1];
			playerX.set(lastCheckpoint.x);
			playerY.set(lastCheckpoint.y);
			crossBrowserScroll(lastCheckpoint.scrollY, true);
			maze[lastCheckpoint.y][lastCheckpoint.x] = 0; // remove the checkpoint
			checkpoints.pop();
		}
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (showPopup) return;
		if (event.key === ' ') {
			event.preventDefault();
			// space bar to place checkpoint
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
		// arrow keys to move
		switch (event.key) {
			case 'ArrowLeft':
				if (checkCollision($playerX - 1, $playerY)) {
					break;
				}
				playerX.set($playerX - 1);
				lastMousePosition = $playerX * CELL_SIZE;
				break;
			case 'ArrowRight':
				if (checkCollision($playerX + 1, $playerY)) {
					break;
				}
				playerX.set($playerX + 1);
				lastMousePosition = $playerX * CELL_SIZE;
				break;
			default:
				break;
		}
	};

	let joystickInterval: NodeJS.Timeout;
	const debounceCheckJoystick = (delay: number | undefined) => {
		joystickInterval = setInterval(() => {
			checkJoystick();
		}, delay);
	};

	const checkJoystick = () => {
		if (joystickUp) {
			if (checkCollision($playerX, $playerY - 1)) {
				return;
			}
			// playerY.set($playerY - 1);
			crossBrowserScroll(window.scrollY - CELL_SIZE);
		}
		if (joystickDown) {
			if (checkCollision($playerX, $playerY + 1)) {
				return;
			}
			// playerY.set($playerY + 1);
			crossBrowserScroll(window.scrollY + CELL_SIZE);
		}
		if (joystickLeft) {
			if (checkCollision($playerX - 1, $playerY)) {
				return;
			}
			playerX.set($playerX - 1);
		}
		if (joystickRight) {
			if (checkCollision($playerX + 1, $playerY)) {
				return;
			}
			playerX.set($playerX + 1);
		}
	};

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		hardMode = urlParams.get('hardmode') === 'true';

		if (hardMode) {
			alert('Try this hard mode maze now for a challenge. No goto spawn button now!');
		}

		// set sizes
		MAZE_WIDTH = Math.ceil(innerWidth / CELL_SIZE);
		MAZE_HEIGHT = hardMode
			? Math.ceil((innerHeight * 5) / CELL_SIZE)
			: innerWidth > 768
				? Math.floor((3 * innerHeight) / CELL_SIZE)
				: Math.floor((4 * innerHeight) / CELL_SIZE);

		EMPTY_ZONE_HEIGHT =
			innerWidth > 768
				? Math.floor(innerHeight / 2 / CELL_SIZE)
				: Math.floor((0.6 * innerHeight) / CELL_SIZE);

		// set player position
		if (innerWidth > 768) {
			playerX.set(Math.floor(MAZE_WIDTH / 2));
			playerYOffset = 10;
		} else {
			playerX.set(5);
			playerYOffset = Math.floor(innerHeight / CELL_SIZE / 2);
		}
		playerY.set(playerYOffset);

		generateMaze();
		if (browser) {
			crossBrowserScroll(0, true);
		}

		// for mobile devices enable joystick
		if (innerWidth <= 768) {
			debounceCheckJoystick(100);
		}
		return () => {
			if (timerInterval) clearInterval(timerInterval);
			if (joystickInterval) clearInterval(joystickInterval);
		};
	});

	const handleSubmit = async () => {
		const response = await fetch('/api/leaderboard', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: playerName,
				link: playerLink,
				time: timer,
				items: usedItems,
				hardmode: hardMode
			})
		});
		if (response.ok) {
			showPopup = false;
			alert('Your score has been added to the leaderboard!');
			if (hardMode) {
				goto('/leaderboard?hardmode=true');
			}
			enableHardMode();
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
		crossBrowserScroll(0, true);
		// set player position
		if (innerWidth > 768) {
			playerX.set(Math.floor(MAZE_WIDTH / 2));
			playerYOffset = 10;
		} else {
			playerX.set(5);
			playerYOffset = Math.floor(innerHeight / CELL_SIZE / 2);
		}
		playerY.set(playerYOffset);
		usedItems = 0;
		checkpoints = [];
		inventory = { stone: 3, paper: 3, scissors: 3, checkpoints: 5 };
		generateMaze();
		clearInterval(timerInterval);
	};

	const enableHardMode = () => {
		window.location.href = '/?hardmode=true';
	};
</script>

<svelte:window
	bind:innerWidth
	bind:innerHeight
	on:scroll={handleScroll}
	on:wheel={handleWheel}
	on:mousemove={handleMouseMove}
	on:keydown={handleKeyDown}
/>

<div class="w-screen h-[350vh] pointer-events-none select-none">
	<div
		class="fixed top-0 pt-3 md:pt-0 left-0 w-full h-32 md:h-12 bg-white text-sm md:text-lg text-black flex items-center justify-center z-10 select-none gap-6 flex-col md:flex-row overflow-visible"
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
			<!-- radio button group for movement control -->
			<div class="flex gap-2 ml-4 pointer-events-auto cursor-pointer z-20">
				<label>
					<input
						type="radio"
						name="useTwoFingerMovement"
						checked={useTwoFingerMovement}
						on:change={() => {
							useTwoFingerMovement = true;
						}}
					/>
					use only twofinger gestures
				</label>
				<label>
					<input
						type="radio"
						name="useMouseX"
						checked={!useTwoFingerMovement}
						on:change={() => {
							useTwoFingerMovement = false;
						}}
					/>
					use mouse X
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
				class="bg-amber-500 text-zinc-600 px-2 md:px-4 py-1 md:py-2 rounded-md pointer-events-auto cursor-pointer fixed top-32 md:top-12 right-6"
				href={`/leaderboard${hardMode ? '?hardmode=true' : ''}`}
			>
				Leaderboard
			</a>
			<button
				class="fixed w-max text-md top-36 md:top-20 right-2 m-4 bg-yellow-400 text-zinc-600 p-2 rounded-md pointer-events-auto cursor-pointer z-10 disabled:bg-gray-400"
				on:click={() => {
					// set player position
					if (innerWidth > 768) {
						playerX.set(Math.floor(MAZE_WIDTH / 2));
						playerYOffset = 10;
					} else {
						playerX.set(5);
						playerYOffset = Math.floor(innerHeight / CELL_SIZE / 2);
					}
					playerY.set(playerYOffset);
					crossBrowserScroll(0, true);
				}}
				disabled={hardMode}
			>
				Go to spawn 🏁
			</button>
			<!-- go to checkpoint button -->
			{#if checkpoints.length > 0}
				<button
					class="fixed w-max text-md top-[11.5rem] md:top-[8rem] right-2 m-4 bg-yellow-400 text-zinc-600 p-2 rounded-md pointer-events-auto cursor-pointer z-10 disabled:bg-gray-400"
					on:click={handleRightClick}
				>
					Go to last ckpt 🚩
				</button>
			{:else}
				<button
					class="fixed w-max text-md top-[11.5rem] md:top-[8rem] right-2 m-4 bg-yellow-400 text-zinc-600 p-2 rounded-md pointer-events-auto cursor-pointer z-10 disabled:bg-gray-400"
					disabled
				>
					Go to last ckpt 🚩
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
	</div>
	<div class="flex justify-center items-start select-none pointer-events-none">
		<img
			alt="Stone(red) replaces Scissors(blue) replaces Paper(green) replaces stone, click to place checkpoint, right click to teleport to last checkpoint"
			src={innerWidth > 768 ? StonePaperScissors : StonePaperScissorsMobile}
			class="absolute top-32 mt-24 md:mt-8 md:top-16 w-[90%] md:w-auto md:h-[35%] pointer-events-none select-none"
		/>
	</div>
	<div
		class="absolute top-0 left-0 w-screen h-[350vh] pointer-events-auto overflow-hidden"
		aria-hidden="true"
		on:mousedown={handleMouseDown}
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
		<div class="bg-white p-6 rounded-lg shadow-lg max-w-[80%]">
			<h2 class="text-xl font-bold mb-4">
				Congratulations! You are officially a-maze-ing by completing the maze in {timer} seconds and
				using only {usedItems} items {hardMode ? 'in hard mode!' : '!'}
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
						class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
						type="button"
						on:click={() => (showPopup = false)}
					>
						Cancel
					</button>
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

<!-- <div class="fixed bottom-0 right-0 z-50 pointer-events-auto touch-auto"> -->
{#if innerWidth <= 768}
	<JoyStick
		bind:up={joystickUp}
		bind:down={joystickDown}
		bind:left={joystickLeft}
		bind:right={joystickRight}
		ondblclick={setCheckpoint}
		radius={50}
		x={innerWidth / 2}
		y={innerHeight - 200}
	/>
{/if}
<!-- </div> -->
