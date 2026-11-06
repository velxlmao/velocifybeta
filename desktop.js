"use strict";
const q = (selector, root = document) => root.querySelector(selector);
const clock = q(".clock");
const startButton = q(".start-button");
const startWindow = q(".start-window");
const startClose = q(".start-window .window-close");
const browserButton = q(".browser-button");
const browserWindow = q(".browser-window");
const browserTitlebar = q(".browser-window .window-titlebar");
const browserMinimize = q(".window-minimize");
const browserMaximize = q(".window-maximize");
const browserClose = q(".browser-window .window-close");
const tabsElement = q(".tabs");
const newTabButton = q(".new-tab-button");
const addressForm = q(".address-form");
const address = q(".omnibox");
const newtabForm = q(".newtab-form");
const newtabSearch = q(".newtab-search");
const newTabPage = q(".new-tab");
const browserContent = q(".browser-content");
const browserStatus = q(".browser-status");
const backButton = q(".browser-back");
const forwardButton = q(".browser-forward");
const reloadButton = q(".browser-reload");
const searchTemplate = "e:zVSPx9DajJXYlN3Lt92YuUmdhJnYug2YyFWZz9yL6MHc0RHa";
let z = 20;
let browserOpen = false;
let browserMinimized = false;
let browserMaximized = false;
let browserRestoreStyle = "";
let browserAnimation;
let tabId = 0;
let activeTabId;
let tabs = [];
let runtimeReady;
let serviceReady;
let activeService;
const serviceKey = "velocify-v2-service";
const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
	prefix: window.__VELO_BASE + "view/",
	codec: {
		encode: (url) => encodeURIComponent(btoa(Array.from(new TextEncoder().encode(url), (byte) => String.fromCharCode(byte)).join("")).split("").reverse().join("")),
		decode: (url) => new TextDecoder().decode(Uint8Array.from(atob(decodeURIComponent(url).split("").reverse().join("")), (character) => character.charCodeAt(0))),
	},
	files: { wasm: window.__VELO_BASE + "lib/s/reader.wasm", all: window.__VELO_BASE + "lib/s/reader.js?v=bf0df93aa3b1", sync: window.__VELO_BASE + "lib/s/clock.js" },
});
const scramjetReady = scramjet.init();
const connection = new BareMux.BareMuxConnection(window.__VELO_BASE + "lib/m/worker.js");
const probeClient = new BareMux.BareClient(window.__VELO_BASE + "lib/m/worker.js");

function updateClock() {
	const now = new Date();
	q(".clock-time").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	q(".clock-date").textContent = now.toLocaleDateString();
	clock.dateTime = now.toISOString();
}
function focusWindow(element) {
	document.querySelectorAll(".desktop-window.active").forEach((item) => item.classList.remove("active"));
	element.classList.add("active");
	element.style.zIndex = String(++z);
}
function animateWindow(element, open, done = () => {}) {
	const frames = open ? [{ opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1 }] : [{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.98 }];
	const animation = element.animate(frames, { duration: 90, easing: "ease-out" });
	animation.addEventListener("finish", done, { once: true });
	return animation;
}
function setStart(open) {
	startButton.setAttribute("aria-expanded", String(open));
	if (open) {
		startWindow.hidden = false;
		focusWindow(startWindow);
		animateWindow(startWindow, true);
		startClose.focus();
	} else {
		animateWindow(startWindow, false, () => { startWindow.hidden = true; });
		startButton.focus();
	}
}
function showBrowser() {
	if (browserOpen && !browserMinimized && !browserWindow.hidden) {
		focusWindow(browserWindow);
		return;
	}
	browserAnimation?.cancel();
	browserOpen = true;
	browserMinimized = false;
	browserWindow.hidden = false;
	browserButton.classList.add("running");
	browserButton.setAttribute("aria-expanded", "true");
	focusWindow(browserWindow);
	browserAnimation = animateWindow(browserWindow, true, () => { browserAnimation = null; });
}
function minimizeBrowser() {
	if (!browserOpen || browserMinimized) return;
	browserMinimized = true;
	browserButton.setAttribute("aria-expanded", "false");
	browserAnimation?.cancel();
	browserAnimation = animateWindow(browserWindow, false, () => { browserWindow.hidden = true; browserAnimation = null; });
	browserButton.focus();
}
function closeBrowser() {
	if (!browserOpen) return;
	browserOpen = false;
	browserMinimized = false;
	browserButton.classList.remove("running");
	browserButton.setAttribute("aria-expanded", "false");
	tabs.forEach((tab) => tab.controller?.abort());
	browserAnimation?.cancel();
	browserAnimation = animateWindow(browserWindow, false, () => {
		browserWindow.hidden = true;
		browserAnimation = null;
		tabs.forEach((tab) => tab.frame?.frame.remove());
		tabs = [];
		createTab();
	});
	browserButton.focus();
}
function toggleMaximize() {
	if (!browserMaximized) {
		browserRestoreStyle = browserWindow.getAttribute("style") || "";
		browserWindow.classList.add("maximized");
		browserMaximized = true;
		browserMaximize.setAttribute("aria-label", "restore browser");
	} else {
		browserWindow.classList.remove("maximized");
		browserRestoreStyle ? browserWindow.setAttribute("style", browserRestoreStyle) : browserWindow.removeAttribute("style");
		browserMaximized = false;
		browserMaximize.setAttribute("aria-label", "maximize browser");
	}
}
function makeDraggable(element, bar) {
	let drag;
	bar.addEventListener("pointerdown", (event) => {
		focusWindow(element);
		if (event.target.closest(".window-controls") || element.classList.contains("maximized")) return;
		const rect = element.getBoundingClientRect();
		drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
		Object.assign(element.style, { left: rect.left + "px", top: rect.top + "px", bottom: "auto", transform: "none" });
		bar.setPointerCapture(event.pointerId);
	});
	bar.addEventListener("pointermove", (event) => {
		if (!drag) return;
		element.style.left = Math.min(innerWidth - element.offsetWidth, Math.max(0, event.clientX - drag.x)) + "px";
		element.style.top = Math.min(innerHeight - element.offsetHeight, Math.max(0, event.clientY - drag.y)) + "px";
	});
	bar.addEventListener("pointerup", () => { drag = null; });
}
function activeTab() { return tabs.find((tab) => tab.id === activeTabId); }
function renderTabs() {
	tabsElement.replaceChildren(...tabs.map((tab) => {
		const button = document.createElement("button");
		button.className = "browser-tab" + (tab.id === activeTabId ? " active" : "");
		button.type = "button";
		button.role = "tab";
		button.setAttribute("aria-selected", String(tab.id === activeTabId));
		button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><span class="tab-title"></span><span class="tab-close" aria-label="close tab"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m4 4 8 8M12 4l-8 8"/></svg></span>';
		q(".tab-title", button).textContent = tab.title;
		button.addEventListener("click", (event) => event.target.closest(".tab-close") ? closeTab(tab.id) : selectTab(tab.id));
		return button;
	}));
}
function createTab() {
	const tab = { id: ++tabId, title: "New Tab", url: "", frame: null, controller: null };
	tabs.push(tab);
	selectTab(tab.id);
	newtabSearch.value = "";
}
function selectTab(id) {
	activeTabId = id;
	const tab = activeTab();
	tabs.forEach((item) => { if (item.frame) item.frame.frame.hidden = item.id !== id; });
	newTabPage.hidden = Boolean(tab.frame);
	address.value = tab.url;
	setStatus("");
	renderTabs();
}
function closeTab(id) {
	const index = tabs.findIndex((tab) => tab.id === id);
	if (index < 0) return;
	const [tab] = tabs.splice(index, 1);
	tab.controller?.abort();
	tab.frame?.frame.remove();
	if (!tabs.length) createTab();
	else if (activeTabId === id) selectTab(tabs[Math.max(0, index - 1)].id);
	else renderTabs();
}
function setStatus(message, error = false) {
	browserStatus.textContent = message;
	browserStatus.classList.toggle("error", error);
	browserStatus.hidden = !message;
}
async function connectProxy(url, signal) {
	runtimeReady ||= Promise.all([registerSW(), scramjetReady]);
	await runtimeReady;
	if (activeService) return;
	if (!serviceReady) {
		const saved = localStorage.getItem(serviceKey);
		const servers = [...window.__VELO_SERVICES];
		if (saved && servers.includes(saved)) servers.unshift(...servers.splice(servers.indexOf(saved), 1));
		serviceReady = window.connectService(servers, async (serviceUrl, attemptSignal) => {
			attemptSignal.throwIfAborted();
			await connection.setTransport(window.__VELO_BASE + "lib/e/index.mjs?v=64c6bc76c5b3", [{ wisp: serviceUrl }]);
			const response = await probeClient.fetch(url, { method: "GET", redirect: "follow", signal: attemptSignal });
			await response.body?.cancel();
			if (response.status >= 500 || [403, 407, 429].includes(response.status)) throw new Error("upstream unavailable");
		}, (index, total) => setStatus("connecting to service " + index + "/" + total), signal, 3500).then((service) => {
			activeService = service;
			localStorage.setItem(serviceKey, service);
			return service;
		}).catch((error) => {
			serviceReady = null;
			throw error;
		});
	}
	await serviceReady;
	signal.throwIfAborted();
}
async function navigate(value) {
	if (!value.trim()) return;
	showBrowser();
	const tab = activeTab();
	const url = search(value, searchTemplate);
	tab.url = url;
	tab.title = new URL(url).hostname || "Loading";
	address.value = url;
	tab.controller?.abort();
	const controller = new AbortController();
	tab.controller = controller;
	renderTabs();
	setStatus("opening page");
	try {
		await connectProxy(url, controller.signal);
		controller.signal.throwIfAborted();
		if (!tab.frame) {
			tab.frame = scramjet.createFrame();
			tab.frame.frame.className = "browser-frame";
			tab.frame.frame.addEventListener("load", () => {
				if (activeTabId === tab.id) setStatus("");
				try { tab.title = tab.frame.frame.contentDocument.title || tab.title; renderTabs(); } catch {}
			});
			browserContent.appendChild(tab.frame.frame);
		}
		tabs.forEach((item) => { if (item.frame) item.frame.frame.hidden = item.id !== tab.id; });
		newTabPage.hidden = true;
		tab.frame.go(url);
	} catch (error) {
		if (!controller.signal.aborted && activeTabId === tab.id) setStatus("could not open this page", true);
	}
}
startButton.addEventListener("click", () => setStart(startWindow.hidden));
startClose.addEventListener("click", () => setStart(false));
browserButton.addEventListener("click", showBrowser);
browserMinimize.addEventListener("click", minimizeBrowser);
browserMaximize.addEventListener("click", toggleMaximize);
browserClose.addEventListener("click", closeBrowser);
newTabButton.addEventListener("click", createTab);
addressForm.addEventListener("submit", (event) => { event.preventDefault(); navigate(address.value); });
newtabForm.addEventListener("submit", (event) => { event.preventDefault(); navigate(newtabSearch.value); });
backButton.addEventListener("click", () => activeTab()?.frame?.frame.contentWindow.history.back());
forwardButton.addEventListener("click", () => activeTab()?.frame?.frame.contentWindow.history.forward());
reloadButton.addEventListener("click", () => activeTab()?.frame?.frame.contentWindow.location.reload());
document.querySelectorAll(".desktop-window").forEach((element) => element.addEventListener("pointerdown", () => focusWindow(element)));
makeDraggable(startWindow, q(".start-window .window-titlebar"));
makeDraggable(browserWindow, browserTitlebar);
createTab();
updateClock();
setInterval(updateClock, 1000);
