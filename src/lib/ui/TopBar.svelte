<script lang="ts">
	import { Bell, Menu, ChevronDown, Settings, LogOut } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/ui/dropdown-menu';

	interface Props {
		tenantName?: string;
		userName?: string;
		userRole?: string;
		notificationCount?: number;
		showMenuButton?: boolean;
		onmenuclick?: () => void;
	}

	let {
		tenantName = '',
		userName = '',
		userRole = '',
		notificationCount = 0,
		showMenuButton = true,
		onmenuclick
	}: Props = $props();
</script>

<!--
	@component
	Top bar for authenticated dashboards.
	Shows hamburger (mobile), tenant name, notifications, and user avatar dropdown menu.
-->
<header
	class="sticky top-0 z-30 flex h-14 items-center gap-3 bg-card/95 backdrop-blur-sm px-4"
>
	<!-- Hamburger (mobile only) -->
	{#if showMenuButton}
		<button
			class="tap-target flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors lg:hidden"
			onclick={onmenuclick}
			aria-label="Open navigation"
		>
			<Menu size={20} />
		</button>
	{/if}

	<!-- Tenant name (mobile) -->
	{#if tenantName}
		<p class="flex-1 truncate text-sm font-semibold text-foreground lg:hidden">
			{tenantName}
		</p>
	{/if}

	<!-- Spacer (desktop) -->
	<div class="hidden lg:block lg:flex-1"></div>

	<!-- Right side actions -->
	<div class="flex items-center gap-2 ml-auto">
		<!-- Notifications -->
		<button
			class="tap-target relative flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
			aria-label="Notifications{notificationCount > 0 ? ` (${notificationCount} unread)` : ''}"
		>
			<Bell size={20} />
			{#if notificationCount > 0}
				<span
					class="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--color-lingua-accent)] text-white text-[10px] font-bold leading-none"
					aria-hidden="true"
				>
					{notificationCount > 9 ? '9+' : notificationCount}
				</span>
			{/if}
		</button>

		<!-- User avatar + dropdown -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="tap-target flex items-center gap-2 rounded-lg px-2 text-foreground hover:bg-accent transition-colors"
						aria-label="User menu"
					>
						<div
							class="flex size-7 items-center justify-center rounded-full bg-[var(--color-lingua-primary-soft)] text-[var(--color-lingua-primary-strong)] text-xs font-bold"
							aria-hidden="true"
						>
							{userName ? userName.charAt(0).toUpperCase() : '?'}
						</div>
						<span class="hidden text-sm font-medium sm:block">{userName || 'Account'}</span>
						<ChevronDown size={14} class="hidden text-muted-foreground sm:block" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>

			<DropdownMenu.Content align="end" class="w-52">
				<!-- User info header -->
				<div class="px-3 py-2">
					<p class="text-sm font-semibold truncate">{userName}</p>
					{#if userRole}
						<p class="text-xs capitalize text-muted-foreground">{userRole}</p>
					{/if}
				</div>
				<DropdownMenu.Separator />
				<DropdownMenu.Item>
					{#snippet child({ props })}
						<a href="/dashboard/settings" {...props}>
							<Settings size={15} class="text-muted-foreground" />
							Settings
						</a>
					{/snippet}
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="text-destructive focus:text-destructive">
					{#snippet child({ props })}
						<form method="POST" action="/logout">
							<button type="submit" class="flex w-full items-center gap-2" {...props}>
								<LogOut size={15} />
								Sign out
							</button>
						</form>
					{/snippet}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</header>
