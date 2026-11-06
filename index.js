"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const home = document.getElementById("home");
const view = document.getElementById("view");
const homeBtn = document.getElementById("home-btn");
const loader = document.getElementById("loader");

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	prefix: window.__VELO_BASE + "view/",
	codec: {
		encode: (url) => encodeURIComponent(btoa(Array.from(new TextEncoder().encode(url), byte => String.fromCharCode(byte)).join("")).split("").reverse().join("")),
		decode: (url) => new TextDecoder().decode(Uint8Array.from(atob(decodeURIComponent(url).split("").reverse().join("")), ch => ch.charCodeAt(0))),
	},
	files: {
		wasm: window.__VELO_BASE + "lib/s/reader.wasm",
		all: window.__VELO_BASE + "lib/s/reader.js?v=bf0df93aa3b1",
		sync: window.__VELO_BASE + "lib/s/clock.js",
	},
});

const scramjetReady = scramjet.init();

const connection = new BareMux.BareMuxConnection(window.__VELO_BASE + "lib/m/worker.js");

let frame = null;
let navigation = null;
let connecting = false;
const probeClient = new BareMux.BareClient(window.__VELO_BASE + "lib/m/worker.js");

function connectionStatus(text) {
	for (const el of document.querySelectorAll(".connection-status")) el.textContent = text;
}

function finishNavigation(ok) {
	loader.hidden = true;
	connectionStatus("");
	window.dispatchEvent(new CustomEvent("velo-view-finish", { detail: { ok } }));
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	error.textContent = "";
	errorCode.textContent = "";

	navigation?.abort();
	const controller = new AbortController();
	navigation = controller;
	connecting = true;
	const url = search(address.value, searchEngine.value);
	home.hidden = true;
	view.hidden = false;
	document.body.classList.add("view-mode");
	loader.hidden = false;
	connectionStatus("connecting to service 1/" + window.__VELO_SERVICES.length);
	try {
		if (await window.startupReady === false) throw new Error("startup failed, reload to retry");
		await registerSW();
		await scramjetReady;
		const servers = [...window.__VELO_SERVICES];

		await window.connectService(servers, async (serviceUrl, signal) => {
			signal.throwIfAborted();
			await connection.setTransport(window.__VELO_BASE + "lib/e/index.mjs?v=64c6bc76c5b3", [{ wisp: serviceUrl }]);
			signal.throwIfAborted();
			const response = await probeClient.fetch(url, { method: "GET", redirect: "follow", signal });
			await response.body?.cancel();
			signal.throwIfAborted();
			if (response.status >= 500 || [403, 407, 429].includes(response.status)) throw new Error("upstream unavailable");
		}, (index, total) => connectionStatus("connecting to service " + index + "/" + total), controller.signal);
		controller.signal.throwIfAborted();
	} catch (err) {
		if (controller.signal.aborted) return;
		error.textContent = "Could not open this page. Try again.";
		home.hidden = false;
		view.hidden = true;
		document.body.classList.remove("view-mode");
		finishNavigation(false);
		connecting = false;
		return;
	}
	connecting = false;

	if (!frame) {
		frame = scramjet.createFrame();
		frame.frame.id = "sj-frame";
		view.appendChild(frame.frame);
		frame.frame.addEventListener("load", () => {
			if (!connecting && !navigation?.signal.aborted) finishNavigation(true);
		});
	}

	// clear any self-hosted (local) game frame and restore the page frame
	const localFrame = document.getElementById("sj-local");
	if (localFrame) localFrame.remove();
	if (frame && frame.frame) frame.frame.style.display = "";

	home.hidden = true;
	view.hidden = false;
	document.body.classList.add("view-mode");
	loader.hidden = false;
	frame.go(url);
	try { sessionStorage.removeItem(window.__workspaceKey); } catch {}
});

function cancelNavigation() {
	try { sessionStorage.removeItem(window.__workspaceKey); } catch {}
	navigation?.abort();
	connecting = false;
	frame = null;
	for (const game of document.querySelectorAll("#sj-frame, #sj-local")) {
		game.removeAttribute("id");
		try {
			const saved = game.contentWindow.flushGameSaves?.();
			if (saved) {
				Promise.race([saved, new Promise((resolve) => setTimeout(resolve, 2000))]).finally(() => game.remove());
				continue;
			}
		} catch (error) {}
		game.remove();
	}
	finishNavigation(false);
}

document.getElementById("nav-home").addEventListener("click", cancelNavigation);
homeBtn.addEventListener("click", () => {
	cancelNavigation();
	view.hidden = true;
	home.hidden = false;
	address.value = "";
	document.body.classList.remove("view-mode");
	document.getElementById("sidebar").classList.remove("peek");
});

if (window.__workspaceStart) {
 try {
  address.value = new TextDecoder().decode(Uint8Array.from(atob(decodeURIComponent(window.__workspaceStart).split("").reverse().join("")), ch => ch.charCodeAt(0)));
  if (address.value) form.requestSubmit();
 } catch { error.textContent = "This link could not be opened."; }
 window.__workspaceStart = null;
}
