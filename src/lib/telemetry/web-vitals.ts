type MetricName = 'LCP' | 'FID' | 'INP' | 'CLS' | 'TTFB';

type VitalsEntry = {
	name: MetricName;
	value: number;
	rating: 'good' | 'needs-improvement' | 'poor';
	timestamp: number;
};

function rateMetric(name: MetricName, value: number): VitalsEntry['rating'] {
	switch (name) {
		case 'LCP':
			return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
		case 'FID':
			return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
		case 'INP':
			return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
		case 'CLS':
			return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
		case 'TTFB':
			return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
		default:
			return 'needs-improvement';
	}
}

const vitalsBuffer: VitalsEntry[] = [];
const MAX_BUFFER = 50;

export function reportWebVitals(entry: { name: string; value: number }) {
	const allowedNames: MetricName[] = ['LCP', 'FID', 'INP', 'CLS', 'TTFB'];
	const name = entry.name as MetricName;

	if (!allowedNames.includes(name)) return;

	const vitalsEntry: VitalsEntry = {
		name,
		value: Math.round(entry.value * 100) / 100,
		rating: rateMetric(name, entry.value),
		timestamp: Date.now()
	};

	vitalsBuffer.push(vitalsEntry);
	if (vitalsBuffer.length > MAX_BUFFER) {
		vitalsBuffer.splice(0, vitalsBuffer.length - MAX_BUFFER);
	}
}

export function getRecentVitals(): VitalsEntry[] {
	return [...vitalsBuffer];
}

export function flushVitals(): VitalsEntry[] {
	const snapshot = [...vitalsBuffer];
	vitalsBuffer.length = 0;
	return snapshot;
}
