importScripts("lib/s/reader.js?v=bf0df93aa3b1");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjetPromise = ensureScramjetDB().then(() => new ScramjetServiceWorker());

self.addEventListener("message", (event) => {
	if (event.data?.document === "svg-check" && event.ports?.[0]) event.ports[0].postMessage({ document: "svg-ready" });
});

const SCOPE = new URL("./", self.location).pathname;
const PROXY_PREFIX = SCOPE + "view/";
const SCRAMJET_STORES = ["config", "cookies", "redirectTrackers", "referrerPolicies", "publicSuffixList"];
async function withTimeout(p, ms) {
	let timer;
	try {
		return await Promise.race([p, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), ms); })]);
	} finally {
		clearTimeout(timer);
	}
}
function openScramjetDB() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open("$scramjet-velocify-static-v2", 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			for (const s of SCRAMJET_STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
		req.onblocked = () => reject(new Error("blocked"));
	});
}
function deleteScramjetDB() {
	return new Promise((resolve) => {
		const req = indexedDB.deleteDatabase("$scramjet-velocify-static-v2");
		req.onsuccess = req.onerror = req.onblocked = () => resolve();
	});
}
async function ensureScramjetDB() {
	try {
		const db = await withTimeout(openScramjetDB(), 3000);
		const ok = SCRAMJET_STORES.every((s) => db.objectStoreNames.contains(s));
		db.close();
		if (!ok) {
			await withTimeout(deleteScramjetDB(), 3000);
			(await withTimeout(openScramjetDB(), 3000)).close();
		}
	} catch (e) {}
}
function withCOI(resp, sameOrigin, isNav, isHTML = false) {
	if (!sameOrigin || !resp || resp.status === 0 || resp.type === "opaque" || resp.type === "opaqueredirect") {
		return resp;
	}
	try {
		const h = new Headers(resp.headers);
		if (isHTML) {
			h.set("Content-Type", "text/html; charset=utf-8");
			h.set("Cache-Control", "no-store");
			h.delete("Content-Length");
			h.delete("Content-Encoding");
		}
		h.set("Cross-Origin-Embedder-Policy", "require-corp");
		h.set("Cross-Origin-Resource-Policy", "cross-origin");
		if (isNav) h.set("Cross-Origin-Opener-Policy", "same-origin");
		return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
	} catch (e) {
		return resp;
	}
}

async function handleRequest(event) {
	const url = new URL(event.request.url);

	if (url.pathname.startsWith(PROXY_PREFIX)) {
		try {
			const scramjet = await scramjetPromise;
			await withTimeout(scramjet.loadConfig(), 15000);
			if (scramjet.route(event)) {
				try {
					const r = await withTimeout(scramjet.fetch(event), 30000);
					if (!r || r.status === 0 || r.type === "opaque" || r.type === "opaqueredirect") return r;
					const dest = event.request.destination;
					if (r.status >= 500 && event.request.mode === "navigate") return new Response("Page unavailable. Go back and try again.", { status: r.status, headers: { "Content-Type": "text/plain", "Cross-Origin-Embedder-Policy": "require-corp", "Cross-Origin-Opener-Policy": "same-origin" } });
					const h = new Headers(r.headers);
					h.delete("permissions-policy");
					if (["document", "iframe", "worker", "sharedworker", "style", "script", ""].indexOf(dest) !== -1) {
						h.set("Cross-Origin-Embedder-Policy", "require-corp");
						h.set("Cross-Origin-Opener-Policy", "same-origin");
					}
					if ((dest === "document" || dest === "iframe" || dest === "") && event.request.mode === "navigate") {
						const ct = h.get("content-type") || "";
						if (!/html/i.test(ct)) h.set("content-type", "text/html; charset=utf-8");
					}
					return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
				} catch (e) {
					return new Response("Page unavailable. Go back and try again.", {
						status: 502,
						headers: { "Content-Type": "text/plain", "Cross-Origin-Embedder-Policy": "require-corp", "Cross-Origin-Opener-Policy": "same-origin" },
					});
				}
			}
		} catch (e) {
			return new Response("Page unavailable. Go back and try again.", {
				status: 502,
				headers: { "Content-Type": "text/plain", "Cross-Origin-Embedder-Policy": "require-corp", "Cross-Origin-Opener-Policy": "same-origin" },
			});
		}
	}

	const sameOrigin = url.origin === self.location.origin;
	const isNav = event.request.mode === "navigate";
	if (isNav && sameOrigin) await scramjetPromise;

	if (isNav && sameOrigin && url.pathname === SCOPE + "index.svg") {
		const page = await fetch(new URL("index.html", self.location), { cache: "no-store" });
		return withCOI(page, true, true, true);
	}
	const resp = await fetch(event.request);
	const isHTML = sameOrigin && isNav && url.pathname.startsWith(SCOPE) && /\.html?$/i.test(url.pathname);
	return withCOI(resp, sameOrigin, isNav, isHTML);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
