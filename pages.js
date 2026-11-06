"use strict";
(() => {
	const pages = {
		games: document.getElementById("games-page"),
		apps: document.getElementById("apps-page"),
		chat: document.getElementById("chat-page"),
	};
	const navs = {
		games: document.getElementById("nav-games"),
		apps: document.getElementById("nav-apps"),
		chat: document.getElementById("nav-chat"),
	};
	const home = document.getElementById("home");
	const navHome = document.getElementById("nav-home");

	let current = null;
	let animating = false;

	function hide(el, nav, then) {
		if (el === pages.chat) window.dispatchEvent(new Event("velx-chat-close"));
		animating = true;
		el.classList.remove("open");
		el.classList.add("closing");
		if (nav) nav.classList.remove("active");
		const done = (e) => {
			if (e.target !== el) return;
			el.removeEventListener("animationend", done);
			el.classList.remove("closing");
			el.hidden = true;
			el.querySelector(".tile-grid")?.replaceChildren();
			animating = false;
			if (then) then();
		};
		el.addEventListener("animationend", done);
	}

	function openPage(name) {
		if (animating) return;
		if (current === name) {
			closeCurrent();
			return;
		}
		const show = () => {
			const el = pages[name];
			if (name === "games" || name === "apps") renderTiles(el, name === "games" ? GAMES : APPS);
			el.hidden = false;
			el.classList.remove("closing");
			el.classList.add("open");
			navs[name].classList.add("active");
			current = name;
			if (name === "chat") window.dispatchEvent(new Event("velx-chat-open"));
		};
		if (current) hide(pages[current], navs[current], show);
		else show();
	}

	function closeCurrent(then) {
		if (!current) {
			if (then) then();
			return;
		}
		const name = current;
		current = null;
		hide(pages[name], navs[name], then);
	}

	// ---- catalogues ----
	const GAMES = [
		{ name: "Untitled Goose Game", url: "games/untitled-goose-game/index.html", img: "games/untitled-goose-game.jpg", local: true, download: true },
		{ name: "Totally Accurate Battle Simulator", url: "games/tabs/index.html", img: "games/tabs.jpg", local: true, download: true },
		{ name: "Clustertruck", url: "games/clustertruck/index.html", img: "games/clustertruck.jpg", local: true, download: true },
		{ name: "Iron Lung", url: "games/iron-lung/index.html", img: "games/iron-lung.jpg", local: true, download: true },
		{ name: "Schoolboy Runaway", url: "games/schoolboy-runaway/index.html", img: "games/schoolboy-runaway.jpg", local: true, download: true },
		{ name: "Tattletail", url: "games/tattletail/index.html", img: "games/tattletail.jpg", local: true, download: true },
		{ name: "Raft", url: "games/raft/index.html", img: "games/raft.jpg", local: true, download: true },
		{ name: "Slime Rancher", url: "games/slime-rancher/index.html", img: "games/slime-rancher.jpg", local: true, download: true },
		{ name: "Baldi’s Basics Plus", url: "games/baldi-plus/index.html", img: "games/baldi-plus.jpg", local: true, download: true },
		{ name: "Bendy and the Ink Machine", url: "games/bendy/index.html", img: "games/bendy.jpg", local: true, download: true },
		{ name: "Amanda the Adventurer", url: "games/amanda-the-adventurer/index.html", img: "games/amanda-the-adventurer.jpg", local: true, download: true },
		{ name: "Balatro", url: "games/balatro/index.html", img: "games/balatro.jpg", local: true, splash: "load" },
		{ name: "R.E.P.O.", url: "games/repo/index.html", img: "games/repo.jpg", local: true, download: true },
		{ name: "WEBFISHING", url: "games/web-fishing/index.html", img: "games/web-fishing.jpg", local: true, download: true },
		{ name: "Pizza Tower", url: "games/pizza-tower/index.html", img: "games/pizza-tower.jpg", local: true, download: true },
		{ name: "That's Not My Neighbor", url: "games/thats-not-my-neighbor/index.html", img: "games/thats-not-my-neighbor.jpg", local: true, download: true },
		{ name: "People Playground", url: "games/people-playground/index.html", img: "games/people-playground.jpg", local: true, download: true },
		{ name: "Spelunky Classic HD", url: "games/spelunky-classic/index.html", img: "games/spelunky-classic.png", local: true, splash: "load" },
		{ name: "Celeste Classic", url: "games/celeste-classic/index.html", img: "games/celeste-classic.gif", local: true, splash: "load" },
		{ name: "DOOM", url: "games/doom/index.html", img: "games/doom.jpg", local: true, splash: "load" },
		{ name: "ClassiCube", url: "games/classicube/index.html", img: "games/classicube.png", local: true, splash: "load" },
		{ name: "Friday Night Funkin’", url: "games/friday-night-funkin/index.html", img: "games/friday-night-funkin.gif", local: true, splash: "load" },
		{ name: "Hextris", url: "games/hextris/index.html", img: "games/hextris.png", local: true, splash: "load" },
		{ name: "Fears to Fathom", url: "games/fears-to-fathom/index.html", img: "games/fears-to-fathom.jpg", local: true, download: true },
		{ name: "Fears to Fathom: Home Alone", url: "games/fears-home-alone/index.html", img: "games/fears-to-fathom.jpg", local: true, download: true },
		{ name: "Hollow Knight", url: "games/hollow-knight/index.html", img: "games/hollow-knight.jpg", local: true, download: true },
		{ name: "Scritchy Scratchy", url: "games/scritchy-scratchy/index.html", img: "games/scritchy-scratchy.jpg", local: true, download: true },
		{ name: "Cuphead", url: "games/cuphead/index.html", img: "games/cuphead.jpg", imgPosition: "center top", local: true, download: true },
		{ name: "A Dance of Fire and Ice", url: "games/adofai/index.html?v=2", img: "games/adofai.jpg", imgPosition: "center top", local: true, download: true },
		{ name: "Flying Gorilla", url: "games/flying-gorilla/index.html", img: "games/flying-gorilla.png", imgPosition: "center top", local: true, download: true },
		{ name: "Geometry Dash", url: "games/geometry-dash/index.html", img: "games/geometry-dash.jpg", imgPosition: "center top", local: true, download: true, splash: "load" },
		{ name: "Web Dashers", url: "games/web-dashers/index.html", img: "games/web-dashers.png", imgPosition: "center top", local: true, download: true },
		{ name: "Buckshot Roulette", url: "games/buckshot-roulette/index.html", img: "games/buckshot-roulette.jpg", imgPosition: "center top", local: true, download: true },
		{
			name: "The Binding of Isaac: Repentance",
			url: "https://velocify-isaac.realdashvr.workers.dev/",
			local: true,
			splash: "load",
			img: "games/isaac.jpg",
			imgPosition: "center top",
		},
		{
			name: "Brotato",
			download: true,
			url: "games/brotato/index.html",
			img: "games/brotato.jpg",
			imgPosition: "center top",
			local: true,
		},
		{
			name: "20 Minutes Till Dawn",
			download: true,
			url: "games/20-minutes/index.html",
			img: "games/20-minutes.jpg",
			imgPosition: "center top",
			local: true,
		},
		{
			name: "Deltarune",
			url: "https://d.ytsodacan.workers.dev/",
			img: "games/deltarune.png",
		},
		{
			name: "Idle Breakout",
			url: "games/idle-breakout/game.html?nocheckorient=1",
			img: "games/idlebreakout.png",
			local: true,
		},
	];
	const APPS = [
		{
			name: "Discord",
			url: "https://discord.com/app",
			img: "apps/discord.png",
		},
	];

	const gl = document.getElementById("game-loader");
	const MIN_SPLASH = 2000; // velocify splash shows at least this long
	let glShownAt = 0;

	function showGameLoader() {
		if (!gl) return;
		glShownAt = Date.now();
		for (const el of gl.querySelectorAll(".connection-status")) el.textContent = "";
		gl.hidden = false;
		setTimeout(() => gl.classList.add("show"), 20);
	}

	// hide, but never before the splash has shown for MIN_SPLASH
	function hideGameLoader() {
		if (!gl || !gl.classList.contains("show")) return;
		const wait = Math.max(0, MIN_SPLASH - (Date.now() - glShownAt));
		setTimeout(() => {
			gl.classList.remove("show");
			const done = (e) => {
				if (e.target !== gl) return;
				gl.removeEventListener("transitionend", done);
				gl.hidden = true;
			};
			gl.addEventListener("transitionend", done);
			setTimeout(() => (gl.hidden = true), 700);
		}, wait);
	}

	// self-hosted games (e.g. Idle Breakout) tell us when they've reached
	// their game room, so we can lift the splash exactly then
	let onGameReady = null;
	window.addEventListener("message", (e) => {
		const activeFrame = document.getElementById("sj-local");
		if (e.origin !== location.origin || e.source !== activeFrame?.contentWindow) return;
		if (e.data?.velocify === "game-download" && Number.isFinite(e.data.loaded) && Number.isFinite(e.data.total)) {
			const total = Math.max(e.data.total, e.data.loaded);
			const scale = 1024 ** 2;
			const text = "downloading content " + (e.data.loaded / scale).toFixed(1) + "/" + (total / scale).toFixed(1) + "mb";
			for (const el of gl.querySelectorAll(".connection-status")) el.textContent = text;
		}
		if (e.data && ["game-ready", "game-error"].includes(e.data.velocify) && onGameReady) {
			const cb = onGameReady;
			onGameReady = null;
			cb();
		}
	});

	function launchLocal(url, g) {
		// self-hosted game: load it directly (no proxy), same origin
		showGameLoader();
		hideModBtn();
		closeCurrent();
		const home = document.getElementById("home");
		const view = document.getElementById("view");
		home.hidden = true;
		view.hidden = false;
		document.body.classList.add("view-mode");
		// hide any scramjet frame, drop any previous local frame
		const sj = document.getElementById("sj-frame");
		if (sj) sj.style.display = "none";
		const prev = document.getElementById("sj-local");
		if (prev) prev.remove();
		const f = document.createElement("iframe");
		f.id = "sj-local";
		// cloud games need autoplay/fullscreen/gamepad unlocked in the frame
		f.allow =
			"autoplay; fullscreen; picture-in-picture; gamepad; microphone; camera; display-capture; keyboard-lock; cross-origin-isolated";
		f.setAttribute("allowfullscreen", "");
		const splashMode = (g && g.splash) || "ready";
		let retries = 0;
		// chrome error pages (refused/blocked loads) deny access to
		// contentDocument -- catch that and reload once to recover
		const checkLoaded = () => {
			let accessible = false;
			let empty = false;
			let complete = false;
			try {
				const doc = f.contentDocument;
				if (doc) {
					accessible = true;
					complete = doc.readyState === "complete";
					const bodyText = (doc.body && doc.body.textContent) || "";
					empty =
						!doc.body ||
						(doc.body.children.length === 0 &&
							bodyText.trim().length === 0);
				}
			} catch (e) {
				accessible = true; // cross-origin: can't inspect, assume fine
			}
			if ((!accessible || (empty && complete)) && retries < 1) {
				retries++;
				f.src = url;
			}
		};
		f.addEventListener("load", () => {
			if (splashMode === "load") hideGameLoader();
			setTimeout(checkLoaded, 600);
		});
		if (splashMode === "load") {
			onGameReady = null;
		} else {
			// lift the splash only once the game says it reached its game room
			onGameReady = hideGameLoader;
		}
		view.appendChild(f);
		f.src = url;
		setTimeout(() => {
			onGameReady = null;
			hideGameLoader();
		}, g?.download ? 20 * 60 * 1000 : splashMode === "load" ? 20000 : 16000); // safety net if the game never signals
	}

	function launch(url, g) {
		if (g && g.local) return launchLocal(url, g);
		// loader is on top (z-index 10), so show it now and close the games
		// page underneath without waiting on its animation
		showGameLoader();
		hideModBtn();
		closeCurrent();

		const a = document.getElementById("sj-address");
		const f = document.getElementById("sj-form");
		if (!a || !f) return;
		a.value = url;
		// show the inject button as soon as a mod app opens (it floats above the
		// frame; the splash/loader sits on top until it loads)
		if (g && g.mod) showModBtn(g.mod);
		const finish = (event) => {
			hideGameLoader();
			if (event.detail.ok && g && g.inject) injectInto(g.inject);
			if (event.detail.ok && g && g.mod) showModBtn(g.mod);
		};
		window.addEventListener("velo-view-finish", finish, { once: true });
		f.requestSubmit();
	}

	async function injectInto(src) {
		let code;
		try {
			code = await fetch(src, { cache: "no-store" }).then((r) => r.text());
		} catch (e) {
			return;
		}
		const fr = document.getElementById("sj-frame");
		if (!fr) return;
		const inject = () => {
			try {
				const doc = fr.contentDocument;
				if (doc && doc.documentElement) {
					const s = doc.createElement("script");
					s.textContent = code;
					doc.documentElement.appendChild(s);
				}
			} catch (e) {}
		};
		// re-inject on every navigation (the page redirects between nodes);
		// the script guards itself per-document so repeats are harmless
		fr.addEventListener("load", () => {
			setTimeout(inject, 1200);
			setTimeout(inject, 3000);
		});
		setTimeout(inject, 1500);
	}

	// ---- manual "inject mod" overlay button (top-left) ----
	// apps with a `mod` script get a floating button; clicking it injects the
	// script into the proxied page on demand (e.g. after you've joined a game).
	let modBtn = null;
	function ensureModBtn() {
		if (modBtn) return modBtn;
		const view = document.getElementById("view");
		if (!view) return null;
		modBtn = document.createElement("button");
		modBtn.id = "mod-inject-btn";
		modBtn.type = "button";
		modBtn.hidden = true;
		modBtn.textContent = "💉 Inject Mod";
		modBtn.addEventListener("click", async () => {
			if (modBtn.disabled) return;
			const src = modBtn.dataset.src;
			if (!src) return;
			modBtn.disabled = true;
			modBtn.textContent = "injecting…";
			const ok = await injectScriptOnce(src);
			modBtn.textContent = ok ? "injected ✓" : "failed — retry";
			setTimeout(() => {
				modBtn.textContent = "💉 Inject Mod";
				modBtn.disabled = false;
			}, 1600);
		});
		view.appendChild(modBtn);
		return modBtn;
	}
	function showModBtn(src) {
		const b = ensureModBtn();
		if (!b) return;
		b.dataset.src = src;
		b.hidden = false;
	}
	function hideModBtn() {
		if (modBtn) modBtn.hidden = true;
	}
	async function injectScriptOnce(src) {
		let code;
		try {
			code = await fetch(src, { cache: "no-store" }).then((r) => r.text());
		} catch (e) {
			return false;
		}
		const fr = document.getElementById("sj-frame");
		if (!fr) return false;
		try {
			const doc = fr.contentDocument;
			if (doc && doc.documentElement) {
				const s = doc.createElement("script");
				s.textContent = code;
				doc.documentElement.appendChild(s);
				return true;
			}
		} catch (e) {}
		return false;
	}

	function renderTiles(pageEl, list) {
		const grid = pageEl.querySelector(".tile-grid");
		if (!grid) return;
		grid.replaceChildren();
		const query = pageEl.querySelector("#game-search")?.value.trim().toLowerCase() || "";
		for (const item of list.filter(item => item.name.toLowerCase().includes(query))) {
			const tile = document.createElement("button");
			tile.className = "game-tile";
			tile.title = item.name;

			const thumb = document.createElement("div");
			thumb.className = "game-thumb";
			thumb.style.backgroundImage = `url("${item.img}")`;
			if (item.imgPosition) thumb.style.backgroundPosition = item.imgPosition;

			const name = document.createElement("span");
			name.className = "game-name";
			name.textContent = item.name;

			tile.appendChild(thumb);
			tile.appendChild(name);
			tile.addEventListener("click", () => launch(item.url, item));
			grid.appendChild(tile);
		}
	}


	document.getElementById("game-search").addEventListener("input", () => renderTiles(pages.games, GAMES));
	navs.games.addEventListener("click", () => openPage("games"));
	navs.apps.addEventListener("click", () => openPage("apps"));
	navs.chat.addEventListener("click", () => openPage("chat"));
	navHome.addEventListener("click", () => closeCurrent());

	for (const name of Object.keys(pages)) {
		pages[name]
			.querySelector("[data-close]")
			.addEventListener("click", () => closeCurrent());
	}

	// sidebar peek: in proxy view the sidebar hides; the left edge slides it in
	const sidebar = document.getElementById("sidebar");
	const edge = document.getElementById("edge");
	if (sidebar && edge) {
		const peekIn = () => sidebar.classList.add("peek");
		const peekOut = () => sidebar.classList.remove("peek");
		edge.addEventListener("mouseenter", peekIn);
		sidebar.addEventListener("mouseenter", peekIn);
		sidebar.addEventListener("mouseleave", peekOut);
	}
})();
