"use strict";

(() => {
	const files = new Map();
	let scheduled = false;
	const report = () => {
		if (scheduled) return;
		scheduled = true;
		setTimeout(() => {
			scheduled = false;
			let loaded = 0, total = 0;
			for (const file of files.values()) {
				loaded += file.loaded;
				total += Math.max(file.total, file.loaded);
			}
			total = Math.max(total, Object.values(window.gameDownloadSizes || {}).reduce((sum, size) => sum + size, 0));
			parent.postMessage({ velocify: "game-download", loaded, total }, location.origin);
		}, 100);
	};
	const record = (url) => {
		const path = new URL(url, document.baseURI).pathname;
		const name = path.split("/").pop();
		if (!/\.(?:part\d+|part-\d+|data|wasm|pck|unityweb|bin)(?:\.part\d+)?$/i.test(name)) return null;
		const key = window.gameDownloadSizes?.[name] ? name : path;
		if (!files.has(key)) files.set(key, { loaded: 0, total: window.gameDownloadSizes?.[name] || 0 });
		return files.get(key);
	};
	const nativeFetch = window.fetch.bind(window);
	window.gameDownloadCache = (name, loaded, total) => {
		const file = record(name);
		if (file) { file.loaded = loaded; file.total = total; report(); }
	};
	window.fetch = async (input, options) => {
		const file = record(typeof input === "string" || input instanceof URL ? String(input) : input.url);
		if (file) { file.loaded = 0; report(); }
		const response = await nativeFetch(input, options);
		if (!file || !response.ok || !response.body) return response;
		if (!file.total && !response.headers.has("content-encoding")) file.total = Number(response.headers.get("content-length")) || 0;
		const reader = response.body.getReader();
		report();
		return new Response(new ReadableStream({
			async pull(controller) {
				try {
					const { done, value } = await reader.read();
					if (done) { controller.close(); return; }
					file.loaded += value.byteLength;
					report();
					controller.enqueue(value);
				} catch (error) { controller.error(error); }
			},
			cancel(reason) { return reader.cancel(reason); },
		}), { status: response.status, statusText: response.statusText, headers: response.headers });
	};
	const open = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function (method, url, ...args) {
		const file = record(String(url));
		if (file) this.addEventListener("progress", (event) => {
			file.loaded = event.loaded;
			if (!file.total && event.lengthComputable) file.total = event.total;
			report();
		});
		return open.call(this, method, url, ...args);
	};
})();
