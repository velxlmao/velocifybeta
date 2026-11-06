"use strict";
(() => {
	const installedKey = "velocify-package-velocord";
	const button = document.querySelector(".store-button");
	const win = document.querySelector(".store-window");
	const actionButton = win.querySelector(".store-action");
	const progress = win.querySelector(".store-progress");
	const progressBar = progress.querySelector("div");
	const status = win.querySelector(".store-status");
	const packageElement = win.querySelector(".store-package");
	const velocordButton = document.querySelector(".velocord-button");
	const search = win.querySelector(".store-search");
	const navigation = [...win.querySelectorAll(".store-sidebar>button")];
	let installed = localStorage.getItem(installedKey) === "1";
	let open = false;
	let minimized = false;
	let maximized = false;
	let restoreStyle = "";
	let animation;
	let busy = false;

	function sync() {
		velocordButton.hidden = !installed;
		actionButton.textContent = installed ? "uninstall" : "install";
		actionButton.classList.toggle("remove", installed);
		status.textContent = installed ? "installed" : "available";
		packageElement.classList.toggle("installed", installed);
	}
	function showWindow() {
		if (open && !minimized && !win.hidden) return focusWindow(win);
		animation?.cancel();
		open = true;
		minimized = false;
		win.hidden = false;
		button.classList.add("running");
		button.setAttribute("aria-expanded", "true");
		focusWindow(win);
		animation = animateWindow(win, true, () => { animation = null; });
	}
	function minimize() {
		minimized = true;
		button.setAttribute("aria-expanded", "false");
		animation?.cancel();
		animation = animateWindow(win, false, () => { win.hidden = true; animation = null; });
	}
	function close() {
		open = false;
		minimized = false;
		button.classList.remove("running");
		button.setAttribute("aria-expanded", "false");
		animation?.cancel();
		animation = animateWindow(win, false, () => { win.hidden = true; animation = null; });
	}
	function toggleMaximize() {
		if (!maximized) {
			restoreStyle = win.getAttribute("style") || "";
			win.classList.add("maximized");
			maximized = true;
		} else {
			win.classList.remove("maximized");
			restoreStyle ? win.setAttribute("style", restoreStyle) : win.removeAttribute("style");
			maximized = false;
		}
	}
	async function install() {
		if (busy) return;
		if (installed) {
			installed = false;
			localStorage.removeItem(installedKey);
			document.dispatchEvent(new Event("velocord:uninstall"));
			sync();
			return;
		}
		busy = true;
		actionButton.disabled = true;
		progress.hidden = false;
		const steps = [[18, "downloading package"], [48, "verifying files"], [76, "installing package"], [100, "finishing installation"]];
		for (const [percent, label] of steps) {
			progressBar.style.width = percent + "%";
			status.textContent = `${label} ${percent}%`;
			await new Promise((resolve) => setTimeout(resolve, 420));
		}
		installed = true;
		localStorage.setItem(installedKey, "1");
		progress.hidden = true;
		progressBar.style.width = "0";
		actionButton.disabled = false;
		busy = false;
		sync();
	}
	function filter() {
		const visible = "velocord".includes(search.value.trim().toLowerCase());
		const installedOnly = navigation[1].classList.contains("active");
		packageElement.hidden = !visible || installedOnly && !installed;
	}
	actionButton.addEventListener("click", install);
	search.addEventListener("input", filter);
	navigation.forEach((item) => item.addEventListener("click", () => {
		navigation.forEach((other) => other.classList.remove("active"));
		item.classList.add("active");
		filter();
	}));
	button.addEventListener("click", showWindow);
	win.querySelector(".store-minimize").addEventListener("click", minimize);
	win.querySelector(".store-maximize").addEventListener("click", toggleMaximize);
	win.querySelector(".store-close").addEventListener("click", close);
	makeDraggable(win, win.querySelector(".window-titlebar"));
	sync();
})();
