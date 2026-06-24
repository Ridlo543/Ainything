<script lang="ts" generics="T extends { id: string | number }">
	import type { Snippet } from 'svelte';
	import EmptyState from './EmptyState.svelte';

	interface Column {
		key: string;
		label: string;
		class?: string;
	}

	let {
		items,
		columns,
		cell,
		emptyState,
		wrapperClass = ''
	}: {
		items: T[];
		columns: Column[];
		cell: Snippet<[item: T, columnKey: string]>;
		emptyState?: Snippet;
		wrapperClass?: string;
	} = $props();
</script>

{#if items.length === 0}
	{#if emptyState}
		{@render emptyState()}
	{:else}
		<EmptyState title="No data found" />
	{/if}
{:else}
	<div class="overflow-x-auto {wrapperClass}">
		<table class="min-w-full divide-y divide-lingua-border text-left text-sm">
			<thead>
				<tr>
					{#each columns as col}
						<th class="px-4 py-3 text-left text-xs font-medium uppercase text-lingua-subtle {col.class ?? ''}">
							{col.label}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-lingua-border">
				{#each items as item (item.id)}
					<tr>
						{#each columns as col}
							<td class="px-4 py-3 text-sm text-lingua-text">
								{@render cell(item, col.key)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
