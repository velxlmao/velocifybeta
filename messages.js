"use strict";
(() => {
	const api = "https://velocify-beta-messages.realdashvr.workers.dev";
	const tokenKey = "messages-token";
	const button = document.querySelector(".messages-button");
	const win = document.querySelector(".messages-window");
	const onboarding = win.querySelector(".msg-onboarding");
	const profileForm = win.querySelector(".msg-profile-form");
	const app = win.querySelector(".msg-app");
	const threads = win.querySelector(".msg-threads");
	const profile = win.querySelector(".msg-profile");
	const head = win.querySelector(".msg-head");
	const list = win.querySelector(".msg-list");
	const compose = win.querySelector(".msg-compose");
	const composeInput = compose.querySelector("input");
	const modal = win.querySelector(".msg-modal");
	const modalBody = win.querySelector(".msg-modal-body");
	const search = win.querySelector(".msg-search");
	let token = localStorage.getItem(tokenKey) || "";
	let data;
	let view;
	let open = false;
	let minimized = false;
	let maximized = false;
	let restoreStyle = "";
	let animation;
	let socket;
	let refreshTimer;

	function color(value) {
		let hash = 0;
		for (const character of value || "m") hash = (hash * 31 + character.charCodeAt(0)) | 0;
		return `hsl(${Math.abs(hash) % 360} 58% 45%)`;
	}
	function avatar(user, size = 42) {
		const item = document.createElement("span");
		item.className = "msg-avatar";
		item.style.width = size + "px";
		item.style.height = size + "px";
		item.style.background = user.avatar ? "transparent" : color(user.username || user.displayName);
		if (user.avatar) {
			const image = document.createElement("img");
			image.src = user.avatar;
			image.alt = "";
			item.append(image);
		} else item.textContent = (user.displayName || "?")[0].toUpperCase();
		return item;
	}
	async function imageData(file) {
		if (!file || !file.size) return "";
		const source = await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const image = new Image();
				image.onload = () => resolve(image);
				image.onerror = reject;
				image.src = reader.result;
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 128;
		const side = Math.min(source.width, source.height);
		canvas.getContext("2d").drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, 128, 128);
		return canvas.toDataURL("image/webp", .82);
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
		refresh();
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
	function render() {
		renderThreads();
		renderProfile();
		renderConversation();
	}
	function renderThreads() {
		threads.replaceChildren();
		const query = search.value.trim().toLowerCase();
		for (const group of data.groups.filter((item) => item.name.toLowerCase().includes(query))) {
			const item = threadButton(group.name, group.memberUsers.map((user) => user.displayName).join(", "), { displayName: group.name, username: group.id });
			if (view?.type === "group" && view.id === group.id) item.classList.add("active");
			item.addEventListener("click", () => { view = { type: "group", id: group.id }; render(); });
			threads.append(item);
		}
		for (const friend of data.friends.filter((item) => (item.displayName + item.username).toLowerCase().includes(query))) {
			const item = threadButton(friend.displayName, "@" + friend.username, friend);
			if (view?.type === "dm" && view.id === friend.id) item.classList.add("active");
			item.addEventListener("click", () => { view = { type: "dm", id: friend.id }; render(); });
			threads.append(item);
		}
	}
	function threadButton(title, subtitle, user) {
		const item = document.createElement("button");
		item.className = "msg-thread";
		item.type = "button";
		const copy = document.createElement("span");
		const strong = document.createElement("strong");
		strong.textContent = title;
		const small = document.createElement("small");
		small.textContent = subtitle;
		copy.append(strong, small);
		item.append(avatar(user, 42), copy);
		return item;
	}
	function renderProfile() {
		profile.replaceChildren(avatar(data.user, 34));
		const copy = document.createElement("span");
		const strong = document.createElement("strong");
		strong.textContent = data.user.displayName;
		const small = document.createElement("small");
		small.textContent = "@" + data.user.username;
		copy.append(strong, small);
		profile.append(copy);
	}
	function renderConversation() {
		head.replaceChildren();
		list.replaceChildren();
		compose.hidden = true;
		if (!view) {
			head.textContent = "messages";
			const empty = document.createElement("div");
			empty.className = "msg-empty";
			empty.textContent = "choose a conversation or start a new one";
			list.append(empty);
			return;
		}
		if (view.type === "dm") renderDm();
		else renderGroup();
	}
	function renderDm() {
		const friend = data.friends.find((item) => item.id === view.id);
		if (!friend) { view = undefined; return render(); }
		head.replaceChildren(avatar(friend, 34));
		const title = document.createElement("span");
		title.textContent = friend.displayName;
		head.append(title);
		for (const message of data.dms[friend.id] || []) renderMessage(message, message.authorId === data.user.id ? data.user : friend, { type: "dm", id: friend.id });
		compose.hidden = false;
	}
	function renderGroup() {
		const group = data.groups.find((item) => item.id === view.id);
		if (!group) { view = undefined; return render(); }
		const title = document.createElement("span");
		title.textContent = group.name;
		const sub = document.createElement("small");
		sub.textContent = group.memberUsers.length + " members";
		head.append(title, sub);
		for (const message of group.messages) renderMessage(message, message.author || data.user, { type: "group", group });
		compose.hidden = false;
	}
	function renderMessage(message, author, context) {
		const mine = message.authorId === data.user.id;
		const row = document.createElement("article");
		row.className = "msg-bubble-row" + (mine ? " mine" : "");
		const bubble = document.createElement("div");
		bubble.className = "msg-bubble";
		if (context.type === "group" && !mine) {
			const name = document.createElement("strong");
			name.textContent = author.displayName;
			bubble.append(name);
		}
		const text = document.createElement("p");
		text.textContent = message.text;
		const meta = document.createElement("small");
		meta.textContent = new Date(message.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + (message.editedAt ? " edited" : "");
		bubble.append(text, meta);
		if (mine) {
			bubble.addEventListener("dblclick", () => messageMenu(message, context));
			bubble.title = "double-click to edit or delete";
		}
		row.append(bubble);
		list.append(row);
		list.scrollTop = list.scrollHeight;
	}
	function openModal(content) {
		modalBody.replaceChildren(content);
		modal.hidden = false;
	}
	function field(label, name, value = "") {
		const wrapper = document.createElement("label");
		wrapper.textContent = label;
		const input = document.createElement("input");
		input.name = name;
		input.value = value;
		input.required = true;
		wrapper.append(input);
		return wrapper;
	}
	function form(title, fields, submit, submitText) {
		const element = document.createElement("form");
		const heading = document.createElement("h2");
		heading.textContent = title;
		const error = document.createElement("p");
		error.className = "msg-error";
		const send = document.createElement("button");
		send.type = "submit";
		send.textContent = submitText;
		element.append(heading, ...fields, send, error);
		element.addEventListener("submit", async (event) => {
			event.preventDefault();
			try { await submit(new FormData(element)); modal.hidden = true; } catch (problem) { error.textContent = problem.message; }
		});
		return element;
	}
	function newConversation() {
		const container = document.createElement("div");
		container.append(form("new message", [field("username", "username")], async (values) => {
			await action("contact_add", { username: values.get("username") });
			const friend = data.friends.find((item) => item.username === values.get("username").replace(/^@/, "").toLowerCase());
			if (friend) view = { type: "dm", id: friend.id };
		}, "start chat"));
		const divider = document.createElement("hr");
		container.append(divider, form("new group", [field("group name", "name"), field("usernames separated by commas", "usernames")], (values) => action("group_create", { name: values.get("name"), usernames: values.get("usernames").split(",").map((item) => item.trim()).filter(Boolean) }), "create group"));
		openModal(container);
	}
	function messageMenu(message, context) {
		const container = document.createElement("div");
		container.append(form("edit message", [field("message", "text", message.text)], (values) => context.type === "dm" ? action("dm_edit", { userId: context.id, messageId: message.id, text: values.get("text") }) : action("group_edit", { groupId: context.group.id, messageId: message.id, text: values.get("text") }), "save"));
		const remove = document.createElement("button");
		remove.className = "msg-danger";
		remove.type = "button";
		remove.textContent = "delete message";
		remove.addEventListener("click", async () => {
			if (context.type === "dm") await action("dm_delete", { userId: context.id, messageId: message.id });
			else await action("group_delete", { groupId: context.group.id, messageId: message.id });
			modal.hidden = true;
		});
		container.append(remove);
		openModal(container);
	}
	profileForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const values = new FormData(profileForm);
		const error = profileForm.querySelector(".msg-error");
		try {
			const result = await request("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, displayName: values.get("displayName"), username: values.get("username"), avatar: await imageData(values.get("avatar")) }) });
			token = result.token;
			localStorage.setItem(tokenKey, token);
			await refresh();
		} catch (problem) { error.textContent = problem.message; }
	});
	compose.addEventListener("submit", async (event) => {
		event.preventDefault();
		const text = composeInput.value.trim();
		if (!text || !view) return;
		composeInput.value = "";
		if (view.type === "dm") await action("dm_send", { userId: view.id, text });
		else await action("group_send", { groupId: view.id, text });
	});
	search.addEventListener("input", renderThreads);
	win.querySelector(".msg-new").addEventListener("click", newConversation);
	win.querySelector(".msg-modal-close").addEventListener("click", () => { modal.hidden = true; });
	button.addEventListener("click", showWindow);
	win.querySelector(".msg-minimize").addEventListener("click", minimize);
	win.querySelector(".msg-maximize").addEventListener("click", toggleMaximize);
	win.querySelector(".msg-close").addEventListener("click", close);
	makeDraggable(win, win.querySelector(".window-titlebar"));
	showOnboarding();
})();
