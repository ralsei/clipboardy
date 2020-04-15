'use strict';
const path = require('path');
const execa = require('execa');

const xsel = 'xsel';
const wlCopy = 'wl-copy';
const wlPaste = 'wl-paste';
const xselFallback = path.join(__dirname, '../fallbacks/linux/xsel');
const wlCopyFallback = path.join(__dirname, '../fallbacks/linux/wl-copy');
const wlPasteFallback = path.join(__dirname, '../fallbacks/linux/wl-paste');

const xselCopyArguments = ['--clipboard', '--input'];
const xselPasteArguments = ['--clipboard', '--output'];

// WAYLAND_DISPLAY doesn't (shouldn't?) exist on Xorg, and is mandatory for
// Wayland apps to draw anything
const isWayland = process.env.WAYLAND_DISPLAY !== undefined;

const makeError = (clipError, fallbackError) => {
	let error;
	if (isWayland) {
		if (clipError.code === 'ENOENT') {
			error = new Error('Couldn\'t find the `wl-copy/wl-paste` binary and fallback didn\'t work. On Debian/Ubuntu you can install wl-clipboard with: sudo apt install wl-clipboard');
		} else {
			error = new Error('Both wl-copy/wl-paste and fallback failed');
			error.clipError = clipError;
		}
	} else if (clipError.code === 'ENOENT') {
		error = new Error('Couldn\'t find the `xsel` binary and fallback didn\'t work. On Debian/Ubuntu you can install xsel with: sudo apt install xsel');
	} else {
		error = new Error('Both xsel and fallback failed');
		error.clipError = clipError;
	}

	error.fallbackError = fallbackError;
	return error;
};

const runWithFallback = async (binary, binaryFallback, argumentList, options) => {
	console.log(binary, binaryFallback, argumentList, options);
	try {
		return await execa.stdout(binary, argumentList, {...options, detached: true});
	} catch (runError) {
		try {
			return await execa.stdout(binaryFallback, argumentList, {...options, detached: true});
		} catch (fallbackError) {
			console.log(makeError(runError, fallbackError));
		}
	}
};

const runWithFallbackSync = (binary, binaryFallback, argumentList, options) => {
	console.log(binary, binaryFallback, argumentList, options);
	try {
		return execa.sync(binary, argumentList, {...options, detached: true});
	} catch (runError) {
		try {
			return execa.sync(binaryFallback, argumentList, {...options, detached: true});
		} catch (fallbackError) {
			console.log(makeError(runError, fallbackError));
		}
	}
};

const copyWithFallback = async options => {
	if (isWayland) {
		await runWithFallback(wlCopy, wlCopyFallback, [], options);
	} else {
		await runWithFallback(xsel, xselFallback, xselCopyArguments, options);
	}
};

const copyWithFallbackSync = options => {
	if (isWayland) {
		return runWithFallbackSync(wlCopy, wlCopyFallback, [], options);
	}

	return runWithFallbackSync(xsel, xselFallback, xselCopyArguments, options);
};

const pasteWithFallback = async options => {
	if (isWayland) {
		await runWithFallback(wlPaste, wlPasteFallback, [], options);
	} else {
		await runWithFallback(xsel, xselFallback, xselPasteArguments, options);
	}
};

const pasteWithFallbackSync = options => {
	if (isWayland) {
		return runWithFallbackSync(wlPaste, wlPasteFallback, [], options);
	}

	return runWithFallbackSync(xsel, xselFallback, xselPasteArguments, options);
};

module.exports = {
	copy: copyWithFallback,
	copySync: copyWithFallbackSync,
	paste: pasteWithFallback,
	pasteSync: pasteWithFallbackSync
};
