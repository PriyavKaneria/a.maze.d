<script lang="ts">
	import type { Entry } from '$lib';
	import { onMount } from 'svelte';

	let entries: Entry[] = [];
	let currentPage = 1;
	const entriesPerPage = 50;
	let disableNext = false;

	let hardmode = false;

	const fetchEntries = async (hardmode: boolean) => {
		const response = await fetch(
			`/api/leaderboard?limit=${entriesPerPage}&offset=${(currentPage - 1) * entriesPerPage}${
				hardmode ? '&hardmode=true' : ''
			}`
		);
		const data = await response.json();
		if (data.results.length > 0) {
			entries = data.results;
			return true;
		}
		return false;
	};

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		hardmode = urlParams.get('hardmode') === 'true';
		fetchEntries(hardmode);

		document.documentElement.style.touchAction = 'auto';
	});

	const nextPage = () => {
		currentPage++;
		fetchEntries(hardmode).then((res) => {
			if (!res) {
				currentPage--;
				disableNext = true;
			}
		});
	};

	const prevPage = () => {
		disableNext = false;
		if (currentPage > 1) {
			currentPage--;
			fetchEntries(hardmode);
		}
	};
</script>

<div class="container mx-auto p-4 touch-auto">
	<div class="flex justify-between">
		<div class="flex items-end justify-start gap-6">
			<h1 class="text-2xl font-bold mb-4">{hardmode ? 'Hardboard' : ''} Leaderboard</h1>
			<a href="/" class="text-blue-500 mb-4">
				<span class="text-sm text-gray-500">Go back</span>
			</a>
		</div>
		{#if !hardmode}
			<button
				class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 h-max px-3 text-xs rounded"
				on:click={() => (window.location.href = '/leaderboard?hardmode=true')}
			>
				Hard mode
			</button>
		{:else}
			<button
				class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 h-max px-3 text-xs rounded"
				on:click={() => (window.location.href = '/leaderboard')}
			>
				Normal mode
			</button>
		{/if}
		<button
			class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 h-max px-3 text-xs rounded hidden"
			on:click={() => (window.location.href = '/api/leaderboard?all=true')}
		>
			Export all data
		</button>
	</div>
	<table class="min-w-full bg-white">
		<thead>
			<tr>
				<th class="py-2 px-2 md:px-4 border-b text-left">Rank</th>
				<th class="py-2 px-2 md:px-4 border-b text-left">Name</th>
				<th class="py-2 px-2 md:px-4 border-b text-left">Social Media</th>
				<th class="py-2 px-2 md:px-4 border-b text-left">Time (seconds)</th>
				<th class="py-2 px-2 md:px-4 border-b text-left">Items used</th>
			</tr>
		</thead>
		<tbody>
			{#each entries as entry, index}
				<tr>
					<td class="py-2 px-2 md:px-4 border-b"
						>{(currentPage - 1) * entriesPerPage + index + 1}</td
					>
					<td class="py-2 px-2 md:px-4 border-b">{entry.name}</td>
					<td class="py-2 px-2 md:px-4 border-b">
						<a href={entry.link} target="_blank" class="text-blue-500">{entry.link}</a>
					</td>
					<td class="py-2 px-2 md:px-4 border-b">{entry.time}</td>
					<td class="py-2 px-2 md:px-4 border-b">{entry.items}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<div class="flex justify-between mt-4">
		<button
			class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-100"
			on:click={prevPage}
			disabled={currentPage === 1}
		>
			Previous
		</button>
		<button
			class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-100"
			on:click={nextPage}
			disabled={disableNext}
		>
			Next
		</button>
	</div>
</div>
