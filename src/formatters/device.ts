const LINUX_MAJOR_LOW_MASK = 0xfffn;
const LINUX_MAJOR_HIGH_MASK = 0xfffff000n;
const LINUX_MINOR_LOW_MASK = 0xffn;
const LINUX_MINOR_HIGH_MASK = 0xffffff00n;
const DARWIN_MAJOR_MASK = 0xffn;
const DARWIN_MINOR_MASK = 0xffffffn;

export function formatDevice(dev: bigint, platform: NodeJS.Platform = process.platform): string | undefined {
	if (dev < 0n) {
		return undefined;
	}

	const hex = `0x${dev.toString(16).toUpperCase()}`;
	if (platform === 'linux') {
		const major = ((dev >> 8n) & LINUX_MAJOR_LOW_MASK) | ((dev >> 32n) & LINUX_MAJOR_HIGH_MASK);
		const minor = (dev & LINUX_MINOR_LOW_MASK) | ((dev >> 12n) & LINUX_MINOR_HIGH_MASK);
		return `${hex} (${major},${minor})`;
	}

	if (platform === 'darwin') {
		const major = (dev >> 24n) & DARWIN_MAJOR_MASK;
		const minor = dev & DARWIN_MINOR_MASK;
		return `${hex} (${major},${minor})`;
	}

	return hex;
}
