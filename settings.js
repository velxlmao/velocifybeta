"use strict";
(() => {
	const button = document.querySelector(".settings-button");
	const win = document.querySelector(".settings-window");
	const input = win.querySelector(".wallpaper-input");
	const preview = win.querySelector(".wallpaper-preview");
	const status = win.querySelector(".wallpaper-status");
	let open = false;
	let minimized = false;
	let maximized = false;
	let restoreStyle = "";
	let animation;
	let wallpaperUrl;

	function database() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open("velocify-settings", 1);
			request.onupgradeneeded = () => request.result.createObjectStore("appearance");
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
	async function readWallpaper() {
		const db = await database();
		return new Promise((resolve, reject) => {
			const request = db.transaction("appearance").objectStore("appearance").get("wallpaper");
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
	async function writeWallpaper(blob) {
		const db = await database();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction("appearance", "readwrite");
			const store = transaction.objectStore("appearance");
			blob ? store.put(blob, "wallpaper") : store.delete("wallpaper");
			transaction.oncomplete = resolve;
			transaction.onerror = () => reject(transaction.error);
		});
	}
	function applyWallpaper(blob) {
		if (wallpaperUrl) URL.revokeObjectURL(wallpaperUrl);
		wallpaperUrl = blob ? URL.createObjectURL(blob) : "";
		document.documentElement.style.backgroundImage = wallpaperUrl ? `url("${wallpaperUrl}")` : "";
		document.body.style.backgroundImage = wallpaperUrl ? `url("${wallpaperUrl}")` : "";
		preview.style.backgroundImage = wallpaperUrl ? `url("${wallpaperUrl}")` : "url(\"wallpaper.png\")";
		status.textContent = blob ? "using custom background" : "using default background";
	}
	async function prepareWallpaper(file) {
		const image = await createImageBitmap(file);
		const scale = Math.min(1, 1920 / image.width, 1080 / image.height);
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(image.width * scale));
		canvas.height = Math.max(1, Math.round(image.height * scale));
		canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
		image.close();
		return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .88));
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
	input.addEventListener("change", async () => {
		const file = input.files[0];
		if (!file) return;
		status.textContent = "processing image";
		try {
			const blob = await prepareWallpaper(file);
			await writeWallpaper(blob);
			applyWallpaper(blob);
		} catch {
			status.textContent = "could not use image";
		}
		input.value = "";
	});
	win.querySelector(".wallpaper-reset").addEventListener("click", async () => {
		await writeWallpaper();
		applyWallpaper();
	});
	button.addEventListener("click", showWindow);
	win.querySelector(".settings-minimize").addEventListener("click", minimize);
	win.querySelector(".settings-maximize").addEventListener("click", toggleMaximize);
	win.querySelector(".settings-close").addEventListener("click", close);
	makeDraggable(win, win.querySelector(".window-titlebar"));
	readWallpaper().then(applyWallpaper).catch(() => applyWallpaper());
})();
