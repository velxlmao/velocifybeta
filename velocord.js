"use strict";
(() => {
	const api = "https://velocify-beta-velocord.realdashvr.workers.dev";
	const tokenKey = "velocord-token";
	const button = document.querySelector(".velocord-button");
	const windowElement = document.querySelector(".velocord-window");
	const titlebar = windowElement.querySelector(".window-titlebar");
	const minimizeButton = windowElement.querySelector(".vc-minimize");
	const maximizeButton = windowElement.querySelector(".vc-maximize");
	const closeButton = windowElement.querySelector(".vc-close");
	const onboarding = windowElement.querySelector(".vc-onboarding");
	const profileForm = windowElement.querySelector(".vc-profile-form");
	const preview = windowElement.querySelector(".vc-avatar-preview");
	const app = windowElement.querySelector(".vc-app");
	const serversElement = windowElement.querySelector(".vc-servers");
	const sideHead = windowElement.querySelector(".vc-side-head");
	const sideList = windowElement.querySelector(".vc-side-list");
	const profileElement = windowElement.querySelector(".vc-profile");
	const chatHead = windowElement.querySelector(".vc-chat-head");
	const messagesElement = windowElement.querySelector(".vc-messages");
	const compose = windowElement.querySelector(".vc-compose");
	const composeInput = compose.querySelector("input");
	const modal = windowElement.querySelector(".vc-modal");
	const modalBody = windowElement.querySelector(".vc-modal-body");
	const modalClose = windowElement.querySelector(".vc-modal-close");
	let token = localStorage.getItem(tokenKey) || "";
	let data;
	let view = { type: "home" };
	let open = false;
	let minimized = false;
	let maximized = false;
	let restoreStyle = "";
	let animation;
	let socket;
	let refreshTimer;

	function color(value) {
		let hash = 0;
		for (const character of value || "v") hash = (hash * 31 + character.charCodeAt(0)) | 0;
		return `hsl(${Math.abs(hash) % 360} 55% 42%)`;
	}
	function avatar(user, size = 32) {
		const element = document.createElement("span");
		element.className = "vc-avatar";
		element.style.width = size + "px";
		element.style.height = size + "px";
		element.style.background = color(user.username || user.displayName);
		if (user.avatar) {
			const image = document.createElement("img");
			image.src = user.avatar;
			image.alt = "";
			element.append(image);
		} else element.textContent = (user.displayName || "?")[0].toUpperCase();
		return element;
	}
	async function fileToAvatar(file) {
		if (!file || !file.size) return "";
		const bitmap = await createImageBitmap(file);
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 128;
		const context = canvas.getContext("2d");
		const side = Math.min(bitmap.width, bitmap.height);
		context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 128, 128);
		bitmap.close();
		return canvas.toDataURL("image/webp", 0.82);
	}
	async function request(path, options = {}) {
		const response = await fetch(api + path, options);
		const result = await response.json();
		if (!response.ok) throw new Error(result.error || "request failed");
		return result;
	}
	async function action(type, values = {}) {
		await request("/api/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, type, ...values }) });
		await refresh();
	}
	async function refresh() {
		if (!token) return showOnboarding();
		try {
			data = await request("/api/state?token=" + encodeURIComponent(token));
			onboarding.hidden = true;
			app.hidden = false;
			render();
			connect();
		} catch {
			token = "";
			localStorage.removeItem(tokenKey);
			showOnboarding();
		}
	}
	function connect() {
		if (socket && socket.readyState < 2) return;
		socket = new WebSocket(api.replace("https://", "wss://") + "/connect?token=" + encodeURIComponent(token));
		socket.addEventListener("message", () => {
			clearTimeout(refreshTimer);
			refreshTimer = setTimeout(refresh, 80);
		});
		socket.addEventListener("close", () => { if (token) setTimeout(connect, 1500); });
	}
	function showOnboarding() {
		onboarding.hidden = false;
		app.hidden = true;
		preview.replaceChildren();
		preview.style.background = color(String(Math.random()));
		preview.textContent = "v";
	}
	function showWindow() {
		if (open && !minimized && !windowElement.hidden) return focusWindow(windowElement);
		animation?.cancel();
		open = true;
		minimized = false;
		windowElement.hidden = false;
		button.classList.add("running");
		button.setAttribute("aria-expanded", "true");
		focusWindow(windowElement);
		animation = animateWindow(windowElement, true, () => { animation = null; });
		refresh();
	}
	function minimize() {
		if (!open || minimized) return;
		minimized = true;
		button.setAttribute("aria-expanded", "false");
		animation?.cancel();
		animation = animateWindow(windowElement, false, () => { windowElement.hidden = true; animation = null; });
		button.focus();
	}
	function close() {
		if (!open) return;
		open = false;
		minimized = false;
		button.classList.remove("running");
		button.setAttribute("aria-expanded", "false");
		animation?.cancel();
		animation = animateWindow(windowElement, false, () => { windowElement.hidden = true; animation = null; });
		button.focus();
	}
	function toggleMaximize() {
		if (!maximized) {
			restoreStyle = windowElement.getAttribute("style") || "";
			windowElement.classList.add("maximized");
			maximizeButton.setAttribute("aria-label", "restore velocord");
			maximized = true;
		} else {
			windowElement.classList.remove("maximized");
			restoreStyle ? windowElement.setAttribute("style", restoreStyle) : windowElement.removeAttribute("style");
			maximizeButton.setAttribute("aria-label", "maximize velocord");
			maximized = false;
		}
	}
	function iconButton(label, path) {
		const item = document.createElement("button");
		item.className = "vc-small-button";
		item.type = "button";
		item.setAttribute("aria-label", label);
		item.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${path}"/></svg>`;
		return item;
	}
	function render() {
		renderServers();
		renderSidebar();
		renderProfile();
		renderMain();
	}
	function renderServers() {
		serversElement.replaceChildren();
		const home = document.createElement("button");
		home.className = "vc-server" + (view.type === "home" || view.type === "dm" ? " active" : "");
		home.type = "button";
		home.textContent = "V";
		home.title = "direct messages";
		home.addEventListener("click", () => { view = { type: "home" }; render(); });
		serversElement.append(home);
		for (const server of data.servers) {
			const item = document.createElement("button");
			item.className = "vc-server" + (view.type === "server" && view.serverId === server.id ? " active" : "");
			item.type = "button";
			item.title = server.name;
			if (server.icon) {
				const image = document.createElement("img");
				image.src = server.icon;
				image.alt = "";
				item.append(image);
			} else item.textContent = server.name.slice(0, 2).toUpperCase();
			item.addEventListener("click", () => { view = { type: "server", serverId: server.id, channelId: server.channels[0]?.id }; render(); });
			serversElement.append(item);
		}
		const add = document.createElement("button");
		add.className = "vc-server vc-server-add";
		add.type = "button";
		add.textContent = "+";
		add.title = "create or join server";
		add.addEventListener("click", serverModal);
		serversElement.append(add);
	}
	function renderSidebar() {
		sideHead.replaceChildren();
		sideList.replaceChildren();
		if (view.type === "server") return renderServerSidebar();
		const title = document.createElement("span");
		title.textContent = "direct messages";
		const add = iconButton("add friend", "M12 5v14M5 12h14");
		add.addEventListener("click", friendModal);
		sideHead.append(title, add);
		if (data.requests.length) {
			const label = document.createElement("p");
			label.className = "vc-section-label";
			label.textContent = "requests";
			sideList.append(label);
			for (const user of data.requests) {
				const item = listUser(user);
				const accept = iconButton("accept", "m5 12 4 4L19 6");
				accept.addEventListener("click", (event) => { event.stopPropagation(); action("friend_accept", { userId: user.id }); });
				item.append(accept);
				sideList.append(item);
			}
		}
		const label = document.createElement("p");
		label.className = "vc-section-label";
		label.textContent = "friends";
		sideList.append(label);
		for (const friend of data.friends) {
			const item = listUser(friend);
			if (view.type === "dm" && view.userId === friend.id) item.classList.add("active");
			item.addEventListener("click", () => { view = { type: "dm", userId: friend.id }; render(); });
			sideList.append(item);
		}
	}
	function listUser(user) {
		const item = document.createElement("button");
		item.className = "vc-list-item";
		item.type = "button";
		const name = document.createElement("span");
		name.textContent = user.displayName;
		item.append(avatar(user, 27), name);
		return item;
	}
	function renderServerSidebar() {
		const server = data.servers.find((item) => item.id === view.serverId);
		if (!server) { view = { type: "home" }; return renderSidebar(); }
		const title = document.createElement("span");
		title.textContent = server.name;
		sideHead.append(title);
		if (server.ownerId === data.user.id) {
			const settings = iconButton("server settings", "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1");
			settings.addEventListener("click", () => customizeServerModal(server));
			sideHead.append(settings);
		}
		const invite = document.createElement("button");
		invite.className = "vc-list-item";
		invite.type = "button";
		invite.textContent = "invite code: " + server.code;
		invite.addEventListener("click", () => navigator.clipboard?.writeText(server.code));
		sideList.append(invite);
		const row = document.createElement("p");
		row.className = "vc-section-label";
		row.textContent = "text channels";
		if (server.ownerId === data.user.id) {
			const add = iconButton("create channel", "M12 5v14M5 12h14");
			add.style.float = "right";
			add.addEventListener("click", () => channelModal(server));
			row.append(add);
		}
		sideList.append(row);
		for (const channel of server.channels) {
			const item = document.createElement("button");
			item.className = "vc-list-item" + (view.channelId === channel.id ? " active" : "");
			item.type = "button";
			item.textContent = "# " + channel.name;
			item.addEventListener("click", () => { view.channelId = channel.id; render(); });
			sideList.append(item);
		}
	}
	function renderProfile() {
		profileElement.replaceChildren(avatar(data.user));
		const copy = document.createElement("div");
		copy.className = "vc-profile-copy";
		const display = document.createElement("div");
		display.className = "vc-display";
		display.textContent = data.user.displayName;
		const username = document.createElement("div");
		username.className = "vc-username";
		username.textContent = "@" + data.user.username;
		copy.append(display, username);
		profileElement.append(copy);
	}
	function renderMain() {
		chatHead.replaceChildren();
		messagesElement.replaceChildren();
		compose.hidden = true;
		if (view.type === "home") {
			chatHead.textContent = "friends";
			const empty = document.createElement("div");
			empty.className = "vc-empty";
			empty.textContent = data.friends.length ? "pick a friend to start messaging" : "add a friend by username to start talking";
			messagesElement.append(empty);
			return;
		}
		if (view.type === "dm") return renderDm();
		renderServerChat();
	}
	function renderDm() {
		const friend = data.friends.find((item) => item.id === view.userId);
		if (!friend) { view = { type: "home" }; return renderMain(); }
		chatHead.textContent = "@ " + friend.displayName;
		for (const message of data.dms[friend.id] || []) renderMessage(message, message.authorId === data.user.id ? data.user : friend);
		compose.hidden = false;
		composeInput.placeholder = "message @" + friend.username;
	}
	function renderServerChat() {
		const server = data.servers.find((item) => item.id === view.serverId);
		const channel = server?.channels.find((item) => item.id === view.channelId) || server?.channels[0];
		if (!server || !channel) return;
		view.channelId = channel.id;
		chatHead.textContent = "# " + channel.name;
		for (const message of channel.messages) renderMessage(message, message.author || data.user);
		compose.hidden = false;
		composeInput.placeholder = "message #" + channel.name;
	}
	function renderMessage(message, author) {
		const item = document.createElement("article");
		item.className = "vc-message";
		const copy = document.createElement("div");
		copy.className = "vc-message-copy";
		const head = document.createElement("div");
		head.className = "vc-message-head";
		const name = document.createElement("span");
		name.className = "vc-message-name";
		name.textContent = author.displayName;
		const time = document.createElement("time");
		time.className = "vc-message-time";
		time.textContent = new Date(message.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
		const text = document.createElement("div");
		text.className = "vc-message-text";
		text.textContent = message.text;
		head.append(name, time);
		copy.append(head, text);
		item.append(avatar(author, 36), copy);
		messagesElement.append(item);
		messagesElement.scrollTop = messagesElement.scrollHeight;
	}
	function openModal(content) {
		modalBody.replaceChildren(content);
		modal.hidden = false;
	}
	function formField(label, name, value = "") {
		const wrapper = document.createElement("label");
		wrapper.className = "vc-field";
		wrapper.textContent = label;
		const input = document.createElement("input");
		input.name = name;
		input.value = value;
		input.required = true;
		wrapper.append(input);
		return wrapper;
	}
	function modalForm(title, fields, submit, label = "continue") {
		const form = document.createElement("form");
		const heading = document.createElement("h2");
		heading.textContent = title;
		form.append(heading, ...fields);
		const buttonElement = document.createElement("button");
		buttonElement.className = "vc-primary";
		buttonElement.type = "submit";
		buttonElement.textContent = label;
		const error = document.createElement("p");
		error.className = "vc-error";
		form.append(buttonElement, error);
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			try { await submit(new FormData(form)); modal.hidden = true; } catch (problem) { error.textContent = problem.message; }
		});
		return form;
	}
	function friendModal() {
		openModal(modalForm("add friend", [formField("username", "username")], (values) => action("friend_request", { username: values.get("username") }), "send request"));
	}
	function serverModal() {
		const container = document.createElement("div");
		container.append(modalForm("create server", [formField("server name", "name"), formField("custom invite code", "code")], (values) => action("server_create", { name: values.get("name"), code: values.get("code") }), "create server"));
		const divider = document.createElement("div");
		divider.className = "vc-divider";
		container.append(divider, modalForm("join server", [formField("invite code", "code")], (values) => action("server_join", { code: values.get("code") }), "join server"));
		openModal(container);
	}
	function channelModal(server) {
		openModal(modalForm("create channel", [formField("channel name", "name")], (values) => action("channel_create", { serverId: server.id, name: values.get("name") }), "create channel"));
	}
	function customizeServerModal(server) {
		const nameField = formField("server name", "name", server.name);
		const file = document.createElement("input");
		file.type = "file";
		file.name = "icon";
		file.accept = "image/*";
		const fileLabel = document.createElement("label");
		fileLabel.className = "vc-field";
		fileLabel.textContent = "server icon";
		fileLabel.append(file);
		openModal(modalForm("server settings", [nameField, fileLabel], async (values) => action("server_update", { serverId: server.id, name: values.get("name"), icon: await fileToAvatar(values.get("icon")) }), "save changes"));
	}
	profileForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const values = new FormData(profileForm);
		const error = profileForm.querySelector(".vc-error");
		try {
			const result = await request("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, displayName: values.get("displayName"), username: values.get("username"), avatar: await fileToAvatar(values.get("avatar")) }) });
			token = result.token;
			localStorage.setItem(tokenKey, token);
			await refresh();
		} catch (problem) { error.textContent = problem.message; }
	});
	profileForm.avatar.addEventListener("change", async () => {
		const source = await fileToAvatar(profileForm.avatar.files[0]);
		if (!source) return;
		preview.replaceChildren();
		const image = document.createElement("img");
		image.src = source;
		image.alt = "";
		preview.append(image);
	});
	compose.addEventListener("submit", async (event) => {
		event.preventDefault();
		const text = composeInput.value.trim();
		if (!text) return;
		composeInput.value = "";
		if (view.type === "dm") await action("dm_send", { userId: view.userId, text });
		else if (view.type === "server") await action("server_send", { serverId: view.serverId, channelId: view.channelId, text });
	});
	button.addEventListener("click", showWindow);
	minimizeButton.addEventListener("click", minimize);
	maximizeButton.addEventListener("click", toggleMaximize);
	closeButton.addEventListener("click", close);
	modalClose.addEventListener("click", () => { modal.hidden = true; });
	makeDraggable(windowElement, titlebar);
	showOnboarding();
})();
