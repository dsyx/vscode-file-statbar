export function formatDevice(dev: bigint, platform: NodeJS.Platform = process.platform): string {
	switch (platform) {
		case 'linux': {
			// glibc sys/sysmacros.h: gnu_dev_major / gnu_dev_minor
			const major = ((dev >> 8n) & 0xfffn) | ((dev >> 32n) & 0xfffff000n);
			const minor = (dev & 0xffn) | ((dev >> 12n) & 0xffffff00n);
			return `${toHex(dev)} (${major},${minor})`;
		}
		case 'darwin': {
			// macOS sys/types.h: major / minor (32-bit dev_t)
			const u32 = BigInt.asUintN(32, dev);
			const major = (u32 >> 24n) & 0xffn;
			const minor = u32 & 0xffffffn;
			return `${toHex(u32)} (${major},${minor})`;
		}
		default:
			return toHex(dev);
	}
}

function toHex(value: bigint): string {
	return `0x${value.toString(16).toUpperCase()}`;
}
