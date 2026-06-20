/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = `lingua-${version}`;
const appShell = [...build, ...files];

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(cacheName).then((cache) => {
			return cache.addAll(appShell);
		})
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)));
		})
	);
});

worker.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	const isSafeAsset = appShell.includes(url.pathname);
	const isPublicMenu = url.pathname.startsWith('/r/') || url.pathname.startsWith('/assets/');

	if (!isSafeAsset && !isPublicMenu) return;

	event.respondWith(
		caches.open(cacheName).then(async (cache) => {
			const cached = await cache.match(event.request);

			try {
				const response = await fetch(event.request);
				if (response.ok) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch (error) {
				if (cached) return cached;
				throw error;
			}
		})
	);
});
