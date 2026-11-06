"use strict";

window.persistGameSaves = function (sync) {
	let pending = null;
	const flush = () => {
		if (pending) return pending;
		pending = Promise.resolve().then(sync).catch((error) => {
			console.error("Browser save failed:", error);
		}).finally(() => { pending = null; });
		return pending;
	};
	setInterval(flush, window.gamePerformance?.constrained ? 15000 : 10000);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) flush();
	});
	window.addEventListener("pagehide", flush);
	window.flushGameSaves = flush;
	navigator.storage?.persist?.().catch(() => {});
	return flush;
};
