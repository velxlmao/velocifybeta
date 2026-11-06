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
const gamesButton = q(".games-button");
const gamesWindow = q(".games-window");
const gamesTitlebar = q(".games-window .window-titlebar");
const gamesMinimize = q(".games-minimize");
const gamesMaximize = q(".games-maximize");
const gamesClose = q(".games-close");
const gamesCatalog = q(".games-catalog");
const gameGrid = q(".game-grid");
const gameSearch = q(".game-search");
const gameStage = q(".game-stage");
const gameBack = q(".game-back");
const gameLoader = q(".game-loader");
const gameLoaderName = q(".game-loader-name");
const gameLoaderStatus = q(".game-loader-status");
const gameProgress = q(".game-progress");
const gameProgressBar = q(".game-progress-bar");
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
let gamesOpen = false;
let gamesMinimized = false;
let gamesMaximized = false;
let gamesRestoreStyle = "";
let gamesAnimation;
let activeGameFrame;
let activeGameProxyFrame;
let gameLoadTimer;
const games = [
	["Untitled Goose Game","games/untitled-goose-game/index.html","games/untitled-goose-game.jpg"],["Totally Accurate Battle Simulator","games/tabs/index.html","games/tabs.jpg"],["Clustertruck","games/clustertruck/index.html","games/clustertruck.jpg"],["Iron Lung","games/iron-lung/index.html","games/iron-lung.jpg"],["Schoolboy Runaway","games/schoolboy-runaway/index.html","games/schoolboy-runaway.jpg"],["Tattletail","games/tattletail/index.html","games/tattletail.jpg"],["Raft","games/raft/index.html","games/raft.jpg"],["Slime Rancher","games/slime-rancher/index.html","games/slime-rancher.jpg"],["Baldi’s Basics Plus","games/baldi-plus/index.html","games/baldi-plus.jpg"],["Bendy and the Ink Machine","games/bendy/index.html","games/bendy.jpg"],["Amanda the Adventurer","games/amanda-the-adventurer/index.html","games/amanda-the-adventurer.jpg"],["Balatro","games/balatro/index.html","games/balatro.jpg"],["R.E.P.O.","games/repo/index.html","games/repo.jpg"],["WEBFISHING","games/web-fishing/index.html","games/web-fishing.jpg"],["Pizza Tower","games/pizza-tower/index.html","games/pizza-tower.jpg"],["That's Not My Neighbor","games/thats-not-my-neighbor/index.html","games/thats-not-my-neighbor.jpg"],["People Playground","games/people-playground/index.html","games/people-playground.jpg"],["Spelunky Classic HD","games/spelunky-classic/index.html","games/spelunky-classic.png"],["Celeste Classic","games/celeste-classic/index.html","games/celeste-classic.gif"],["DOOM","games/doom/index.html","games/doom.jpg"],["ClassiCube","games/classicube/index.html","games/classicube.png"],["Friday Night Funkin’","games/friday-night-funkin/index.html","games/friday-night-funkin.gif"],["Hextris","games/hextris/index.html","games/hextris.png"],["Fears to Fathom","games/fears-to-fathom/index.html","games/fears-to-fathom.jpg"],["Fears to Fathom: Home Alone","games/fears-home-alone/index.html","games/fears-to-fathom.jpg"],["Hollow Knight","games/hollow-knight/index.html","games/hollow-knight.jpg"],["Scritchy Scratchy","games/scritchy-scratchy/index.html","games/scritchy-scratchy.jpg"],["Cuphead","games/cuphead/index.html","games/cuphead.jpg"],["A Dance of Fire and Ice","games/adofai/index.html?v=2","games/adofai.jpg"],["Flying Gorilla","games/flying-gorilla/index.html","games/flying-gorilla.png"],["Geometry Dash","games/geometry-dash/index.html","games/geometry-dash.jpg"],["Web Dashers","games/web-dashers/index.html","games/web-dashers.png"],["Buckshot Roulette","games/buckshot-roulette/index.html","games/buckshot-roulette.jpg"],["The Binding of Isaac: Repentance","https://velocify-isaac.realdashvr.workers.dev/","games/isaac.jpg","direct"],["Brotato","games/brotato/index.html","games/brotato.jpg"],["20 Minutes Till Dawn","games/20-minutes/index.html","games/20-minutes.jpg"],["Deltarune","https://d.ytsodacan.workers.dev/","games/deltarune.png","proxy"],["Idle Breakout","games/idle-breakout/game.html?nocheckorient=1","games/idlebreakout.png"]
].map(([name,url,img,mode])=>({name,url,img,mode}));
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
function renderGames(filter = "") {
	const query = filter.trim().toLowerCase();
	const matches = games.filter((game) => game.name.toLowerCase().includes(query));
	gameGrid.replaceChildren(...matches.map((game) => {
		const card = document.createElement("button");
		const cover = document.createElement("img");
		const name = document.createElement("span");
		card.className = "game-card";
		card.type = "button";
		cover.className = "game-cover";
		cover.src = game.img;
		cover.alt = "";
		cover.loading = "lazy";
		name.className = "game-name";
		name.textContent = game.name;
		card.append(cover, name);
		card.addEventListener("click", () => launchGame(game));
		return card;
	}));
	if (!matches.length) {
		const empty = document.createElement("p");
		empty.className = "games-empty";
		empty.textContent = "no games found";
		gameGrid.append(empty);
	}
}
function showGames() {
	if (gamesOpen && !gamesMinimized && !gamesWindow.hidden) {
		focusWindow(gamesWindow);
		return;
	}
	gamesAnimation?.cancel();
	gamesOpen = true;
	gamesMinimized = false;
	gamesWindow.hidden = false;
	gamesButton.classList.add("running");
	gamesButton.setAttribute("aria-expanded", "true");
	focusWindow(gamesWindow);
	gamesAnimation = animateWindow(gamesWindow, true, () => { gamesAnimation = null; });
}
function minimizeGames() {
	if (!gamesOpen || gamesMinimized) return;
	gamesMinimized = true;
	gamesButton.setAttribute("aria-expanded", "false");
	gamesAnimation?.cancel();
	gamesAnimation = animateWindow(gamesWindow, false, () => { gamesWindow.hidden = true; gamesAnimation = null; });
	gamesButton.focus();
}
function stopGame() {
	clearTimeout(gameLoadTimer);
	activeGameFrame?.remove();
	activeGameProxyFrame?.frame.remove();
	activeGameFrame = null;
	activeGameProxyFrame = null;
	gameStage.hidden = true;
	gamesCatalog.hidden = false;
	gameLoader.hidden = false;
	gameLoader.classList.remove("hide");
}
function closeGames() {
	if (!gamesOpen) return;
	gamesOpen = false;
	gamesMinimized = false;
	gamesButton.classList.remove("running");
	gamesButton.setAttribute("aria-expanded", "false");
	gamesAnimation?.cancel();
	gamesAnimation = animateWindow(gamesWindow, false, () => { gamesWindow.hidden = true; gamesAnimation = null; stopGame(); });
	gamesButton.focus();
}
function toggleGamesMaximize() {
	if (!gamesMaximized) {
		gamesRestoreStyle = gamesWindow.getAttribute("style") || "";
		gamesWindow.classList.add("maximized");
		gamesMaximized = true;
		gamesMaximize.setAttribute("aria-label", "restore games");
	} else {
		gamesWindow.classList.remove("maximized");
		gamesRestoreStyle ? gamesWindow.setAttribute("style", gamesRestoreStyle) : gamesWindow.removeAttribute("style");
		gamesMaximized = false;
		gamesMaximize.setAttribute("aria-label", "maximize games");
	}
}
function hideGameLoader() {
	gameLoader.classList.add("hide");
	setTimeout(() => { gameLoader.hidden = true; }, 180);
}
function prepareGameStage(game) {
	stopGame();
	gamesCatalog.hidden = true;
	gameStage.hidden = false;
	gameLoader.hidden = false;
	gameLoader.classList.remove("hide");
	gameLoaderName.textContent = game.name;
	gameLoaderStatus.textContent = "loading game";
	gameProgress.classList.remove("determinate");
	gameProgressBar.style.width = "35%";
	gameLoadTimer = setTimeout(hideGameLoader, 20000);
}
async function launchGame(game) {
	prepareGameStage(game);
	if (game.mode === "proxy") {
		try {
			await connectProxy(game.url, new AbortController().signal);
			activeGameProxyFrame = scramjet.createFrame();
			activeGameProxyFrame.frame.className = "game-frame";
			activeGameProxyFrame.frame.allow = "autoplay; fullscreen; gamepad; microphone; camera; display-capture; keyboard-lock";
			activeGameProxyFrame.frame.addEventListener("load", () => setTimeout(hideGameLoader, 250), { once: true });
			gameStage.appendChild(activeGameProxyFrame.frame);
			activeGameProxyFrame.go(game.url);
		} catch {
			gameLoaderStatus.textContent = "could not load game";
		}
		return;
	}
	const frame = document.createElement("iframe");
	frame.className = "game-frame";
	frame.allow = "autoplay; fullscreen; gamepad; microphone; camera; display-capture; keyboard-lock; cross-origin-isolated";
	frame.allowFullscreen = true;
	frame.addEventListener("load", () => setTimeout(hideGameLoader, 250), { once: true });
	gameStage.appendChild(frame);
	activeGameFrame = frame;
	frame.src = game.url;
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
		serviceReady = connection.setTransport(window.__VELO_BASE + "lib/e/index.mjs?v=64c6bc76c5b3", [{ wisp: servers[0] }]).then(() => servers[0]).catch(() => window.connectService(servers.slice(1), async (serviceUrl, attemptSignal) => {
			attemptSignal.throwIfAborted();
			await connection.setTransport(window.__VELO_BASE + "lib/e/index.mjs?v=64c6bc76c5b3", [{ wisp: serviceUrl }]);
			const response = await probeClient.fetch(url, { method: "GET", redirect: "follow", signal: attemptSignal });
			await response.body?.cancel();
			if (response.status >= 500 || [403, 407, 429].includes(response.status)) throw new Error("upstream unavailable");
		}, (index, total) => setStatus("connecting to service " + (index + 1) + "/" + (total + 1)), signal, 3500)).then((service) => {
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
async function warmProxy() {
	try {
		await connectProxy("https://example.com/", new AbortController().signal);
		if (!browserOpen) setStatus("");
	} catch {}
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
gamesButton.addEventListener("click", showGames);
gamesMinimize.addEventListener("click", minimizeGames);
gamesMaximize.addEventListener("click", toggleGamesMaximize);
gamesClose.addEventListener("click", closeGames);
gameBack.addEventListener("click", stopGame);
gameSearch.addEventListener("input", () => renderGames(gameSearch.value));
newTabButton.addEventListener("click", createTab);
addressForm.addEventListener("submit", (event) => { event.preventDefault(); navigate(address.value); });
newtabForm.addEventListener("submit", (event) => { event.preventDefault(); navigate(newtabSearch.value); });
backButton.addEventListener("click", () => activeTab()?.frame?.frame.contentWindow.history.back());
forwardButton.addEventListener("click", () => activeTab()?.frame?.frame.contentWindow.history.forward());
reloadButton.addEventListener("click", () => activeTab()?.frame?.frame.contentWindow.location.reload());
document.querySelectorAll(".desktop-window").forEach((element) => element.addEventListener("pointerdown", () => focusWindow(element)));
window.addEventListener("message", (event) => {
	if (event.source !== activeGameFrame?.contentWindow || event.origin !== location.origin) return;
	if (event.data?.velocify === "game-download" && Number.isFinite(event.data.loaded) && Number.isFinite(event.data.total)) {
		const total = Math.max(event.data.total, event.data.loaded);
		gameProgress.classList.add("determinate");
		gameProgressBar.style.width = Math.min(100, total ? event.data.loaded / total * 100 : 0) + "%";
		gameLoaderStatus.textContent = "downloading content " + (event.data.loaded / 1048576).toFixed(1) + "/" + (total / 1048576).toFixed(1) + "mb";
	}
	if (event.data?.velocify === "game-ready") hideGameLoader();
});
makeDraggable(startWindow, q(".start-window .window-titlebar"));
makeDraggable(browserWindow, browserTitlebar);
makeDraggable(gamesWindow, gamesTitlebar);
renderGames();
createTab();
updateClock();
setInterval(updateClock, 1000);
warmProxy();
