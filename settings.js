"use strict";
(() => {
	const themes = [
		{ id: "", bg: "#0f1216", accent: "#6f96c9" },
		{ id: "slate", bg: "#14171c", accent: "#8aa0c4" },
		{ id: "forest", bg: "#0e1512", accent: "#5fab84" },
		{ id: "plum", bg: "#14101a", accent: "#a07fc9" },
		{ id: "light", bg: "#eef1f5", accent: "#3a6ea5" },
	];

	const overlay = document.getElementById("settings-overlay");
	const btnSettings = document.getElementById("nav-settings");
	const btnHome = document.getElementById("nav-home");
	const btnClose = document.getElementById("settings-close");
	const swatchWrap = document.getElementById("theme-swatches");

	let current = "";
	try {
		current = localStorage.getItem("velocify-theme") || "";
	} catch (e) {}

	function apply(id) {
		if (id) document.documentElement.dataset.theme = id;
		else delete document.documentElement.dataset.theme;
		try {
			if (id) localStorage.setItem("velocify-theme", id);
			else localStorage.removeItem("velocify-theme");
		} catch (e) {}
		current = id;
		for (const el of swatchWrap.children)
			el.classList.toggle("active", el.dataset.id === id);
	}

	for (const t of themes) {
		const b = document.createElement("button");
		b.className = "swatch";
		b.dataset.id = t.id;
		b.title = t.id || "default";
		b.style.background = t.bg;
		b.style.borderColor = t.accent;
		b.addEventListener("click", () => apply(t.id));
		swatchWrap.appendChild(b);
	}
	apply(current);

	function makeOverlay(overlayEl, navBtn, closeBtn) {
		let animating = false;
		function open() {
			closeAll(overlayEl);
			overlayEl.hidden = false;
			overlayEl.classList.remove("closing");
			overlayEl.classList.add("open");
			navBtn.classList.add("active");
		}
		function close() {
			if (overlayEl.hidden || animating) return;
			animating = true;
			overlayEl.classList.remove("open");
			overlayEl.classList.add("closing");
			navBtn.classList.remove("active");
			const done = (e) => {
				if (e.target !== overlayEl) return;
				overlayEl.removeEventListener("animationend", done);
				overlayEl.hidden = true;
				overlayEl.classList.remove("closing");
				animating = false;
			};
			overlayEl.addEventListener("animationend", done);
		}
		navBtn.addEventListener("click", () =>
			overlayEl.hidden ? open() : close()
		);
		closeBtn.addEventListener("click", close);
		overlayEl.addEventListener("click", (e) => {
			if (e.target === overlayEl) close();
		});
		return { open, close };
	}

	const overlays = [];
	function closeAll(except) {
		overlays.forEach((o) => o.el !== except && o.ctl.close());
	}

	// lets other scripts (links.js) add panels that behave the same way
	window.__veloOverlay = (el, navBtn, closeBtn) => {
		const ctl = makeOverlay(el, navBtn, closeBtn);
		overlays.push({ el, ctl });
		return ctl;
	};

	const settings = makeOverlay(
		overlay,
		btnSettings,
		document.getElementById("settings-close")
	);
	overlays.push({ el: overlay, ctl: settings });

	btnHome.addEventListener("click", () => {
		closeAll(null);
		const view = document.getElementById("view");
		const home = document.getElementById("home");
		if (view && !view.hidden) {
			view.hidden = true;
			home.hidden = false;
			const a = document.getElementById("sj-address");
			if (a) a.value = "";
			document.body.classList.remove("view-mode");
			document.getElementById("sidebar").classList.remove("peek");
		}
	});

	// ---- decoy / panic settings (persisted) ----
	const store = {
		get(k, d) {
			try {
				const v = localStorage.getItem(k);
				return v === null ? d : v;
			} catch (e) {
				return d;
			}
		},
		set(k, v) {
			try {
				localStorage.setItem(k, v);
			} catch (e) {}
		},
	};

	const bindPanic = document.getElementById("bind-panic");
	const panicType = document.getElementById("panic-type");

	// panic key bind
	function keyLabel(k) {
		if (k === " ") return "Space";
		return k.length === 1 ? k : k;
	}
	bindPanic.textContent = keyLabel(store.get("velocify-panic-key", "`"));
	bindPanic.addEventListener("click", () => {
		bindPanic.classList.add("binding");
		bindPanic.textContent = "press a key";
		window.__bindingPanic = true;
		const onKey = (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.key === "Escape") {
				// cancel
			} else {
				store.set("velocify-panic-key", e.key);
			}
			bindPanic.textContent = keyLabel(store.get("velocify-panic-key", "`"));
			bindPanic.classList.remove("binding");
			window.__bindingPanic = false;
			window.removeEventListener("keydown", onKey, true);
		};
		window.addEventListener("keydown", onKey, true);
	});

	// panic type
	panicType.value = store.get("velocify-panic-type", "decoy");
	panicType.addEventListener("change", () => {
		store.set("velocify-panic-type", panicType.value);
	});

	// confirm-before-closing (on by default)
	const toggleAnticlose = document.getElementById("toggle-anticlose");
	if (toggleAnticlose) {
		// a NON-empty returnValue is required for the prompt to show
		// reliably; an empty string is spec-allowed to be ignored.
		const beforeUnload = (e) => {
			e.preventDefault();
			e.returnValue = "Leave velocify?";
			return "Leave velocify?";
		};
		const applyAnticlose = () => {
			const on = store.get("velocify-anticlose", "1") !== "0";
			toggleAnticlose.setAttribute("aria-checked", on ? "true" : "false");
			window.removeEventListener("beforeunload", beforeUnload);
			if (on) window.addEventListener("beforeunload", beforeUnload);
		};
		applyAnticlose();
		toggleAnticlose.addEventListener("click", () => {
			const on = toggleAnticlose.getAttribute("aria-checked") === "true";
			store.set("velocify-anticlose", on ? "0" : "1");
			applyAnticlose();
		});
	}

	store.set("velocify-cloak", "0");
	const toggleCloak = document.getElementById("toggle-cloak");
	if (toggleCloak) {
		toggleCloak.setAttribute("aria-checked", "false");
		toggleCloak.disabled = true;
		toggleCloak.title = "disabled";
	}
})();
