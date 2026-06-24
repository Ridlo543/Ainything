<script lang="ts">
	import LandingNav from '$lib/ui/landing/LandingNav.svelte';
	import LandingHero from '$lib/ui/landing/LandingHero.svelte';
	import LandingFeatures from '$lib/ui/landing/LandingFeatures.svelte';
	import LandingHowItWorks from '$lib/ui/landing/LandingHowItWorks.svelte';
	import LandingTestimonials from '$lib/ui/landing/LandingTestimonials.svelte';
	import LandingPricing from '$lib/ui/landing/LandingPricing.svelte';
	import LandingFooter from '$lib/ui/landing/LandingFooter.svelte';
</script>

<svelte:head>
	<title>Lingua — Platform Digital UMKM Indonesia</title>
	<meta
		name="description"
		content="Katalog produk digital, QR code, keranjang, dan manajemen pesanan untuk UMKM Indonesia. Setup dalam 2 menit, tanpa install app."
	/>
	<meta property="og:title" content="Lingua — Platform Digital UMKM Indonesia" />
	<meta
		property="og:description"
		content="Pelanggan scan QR → lihat katalog → pesan langsung. Semua tanpa install app."
	/>
</svelte:head>

<LandingNav />

<main>
	<LandingHero />
	<LandingFeatures />
	<LandingHowItWorks />
	<LandingTestimonials />
	<LandingPricing />
</main>

<LandingFooter />
