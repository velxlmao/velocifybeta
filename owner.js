(function () {
	const apis = {
		velocord: "https://velocify-beta-velocord.realdashvr.workers.dev",
		messages: "https://velocify-beta-messages.realdashvr.workers.dev",
	};
	const browserId = localStorage.getItem("velocify-browser-id") || crypto.randomUUID();
	localStorage.setItem("velocify-browser-id", browserId);
	window.__VELO_BROWSER_ID = browserId;
	window.__VELO_OWNER_TOKENS = JSON.parse(sessionStorage.getItem("velocify-owner-tokens") || "{}");
	const nav = [...document.querySelectorAll("[data-settings-panel]")];
	const panels = [...document.querySelectorAll("[data-settings-content]")];
	const login = document.querySelector(".owner-login");
	const dashboard = document.querySelector(".owner-dashboard");
	const users = document.querySelector(".owner-users");
	const error = document.querySelector(".owner-error");
	const ownerName = localStorage.getItem("velocify-site-name");

	function selectPanel(name) {
		for (const button of nav) button.classList.toggle("active", button.dataset.settingsPanel === name);
		for (const panel of panels) panel.hidden = panel.dataset.settingsContent !== name;
	}
	for (const button of nav) button.addEventListener("click", () => selectPanel(button.dataset.settingsPanel));

	async function call(api, path, options = {}) {
		const response = await fetch(api + path, options);
		const data = await response.json();
		if (!response.ok) throw new Error(data.error || "request failed");
		return data;
	}
	async function identify(name) {
		return call(apis.velocord, "/api/visitor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ browserId, name }) });
	}
	let blockedShown = false;
	function blocked(message) {
		if (blockedShown) return;
		blockedShown = true;
		const layer = document.createElement("div");
		layer.className = "site-ban-layer";
		const text = document.createElement("strong");
		text.textContent = message;
		layer.append(text);
		document.body.append(layer);
	}
	function setupProfile() {
		const layer = document.createElement("div");
		layer.className = "profile-setup-layer";
		const form = document.createElement("form");
		form.className = "profile-setup-card";
		const title = document.createElement("h1");
		title.textContent = "set up your profile";
		const copy = document.createElement("p");
		copy.textContent = "choose your permanent site name";
		const input = document.createElement("input");
		input.name = "name";
		input.maxLength = 32;
		input.minLength = 2;
		input.required = true;
		input.autocomplete = "off";
		input.placeholder = "site name";
		const submit = document.createElement("button");
		submit.type = "submit";
		submit.textContent = "continue";
		const message = document.createElement("small");
		form.append(title, copy, input, submit, message);
		layer.append(form);
		document.body.append(layer);
		input.focus();
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			submit.disabled = true;
			try {
				const profile = await identify(input.value.trim());
				localStorage.setItem("velocify-site-name", profile.siteName || input.value.trim());
				layer.remove();
			} catch (cause) {
				message.textContent = cause.message;
				submit.disabled = false;
			}
		});
	}
	async function ownerState() {
		const entries = await Promise.all(Object.entries(apis).map(async ([service, api]) => {
			const token = window.__VELO_OWNER_TOKENS[service];
			if (!token) return { service, visitors: [], users: [], siteBans: [], chatBans: [] };
			return { service, ...await call(api, "/api/owner/state", { headers: { authorization: "Bearer " + token } }) };
		}));
		users.replaceChildren();
		const visitors = new Map();
		for (const entry of entries) for (const visitor of entry.visitors) {
			const current = visitors.get(visitor.browserId) || { ...visitor, names: [] };
			current.names = [...new Set([...current.names, ...(visitor.names || [])])];
			visitors.set(visitor.browserId, current);
		}
		for (const entry of entries) for (const user of entry.users) if (user.browserId) {
			const current = visitors.get(user.browserId) || { browserId: user.browserId, names: [] };
			if (!current.names.includes(user.displayName)) current.names.push(user.displayName);
			visitors.set(user.browserId, current);
		}
		for (const visitor of visitors.values()) users.append(visitorRow(visitor, entries));
		for (const entry of entries) for (const user of entry.users.filter((item) => !item.browserId)) users.append(userRow(user, entry));
	}
	function actionButton(label, action) {
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = label;
		button.addEventListener("click", async () => { button.disabled = true; await action(); await ownerState(); });
		return button;
	}
	function visitorRow(visitor, entries) {
		const row = document.createElement("article");
		row.className = "owner-user";
		const copy = document.createElement("span");
		const name = document.createElement("strong");
		name.textContent = visitor.names.at(-1) || "unnamed browser";
		const history = document.createElement("small");
		history.textContent = visitor.names.join(" · ") || visitor.browserId;
		copy.append(name, history);
		const central = entries.find((entry) => entry.service === "velocord");
		const banned = central.siteBans.includes(visitor.browserId);
		const controls = document.createElement("div");
		controls.append(actionButton(banned ? "unban site" : "ban site", () => ownerAction("velocord", banned ? "site_unban" : "site_ban", { browserId: visitor.browserId })));
		for (const entry of entries) for (const user of entry.users.filter((item) => item.browserId === visitor.browserId)) {
			const chatBanned = entry.chatBans.includes(user.id);
			controls.append(actionButton((chatBanned ? "unban " : "ban ") + entry.service, () => ownerAction(entry.service, chatBanned ? "chat_unban" : "chat_ban", { userId: user.id })));
		}
		row.append(copy, controls);
		return row;
	}
	function userRow(user, entry) {
		const row = document.createElement("article");
		row.className = "owner-user";
		const copy = document.createElement("span");
		const name = document.createElement("strong");
		name.textContent = user.displayName;
		const history = document.createElement("small");
		history.textContent = "legacy " + entry.service + " profile";
		copy.append(name, history);
		const controls = document.createElement("div");
		const banned = entry.chatBans.includes(user.id);
		controls.append(actionButton((banned ? "unban " : "ban ") + entry.service, () => ownerAction(entry.service, banned ? "chat_unban" : "chat_ban", { userId: user.id })));
		row.append(copy, controls);
		return row;
	}
	async function ownerAction(service, type, body) {
		return call(apis[service], "/api/owner/action", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + window.__VELO_OWNER_TOKENS[service] }, body: JSON.stringify({ type, ...body }) });
	}
	login.addEventListener("submit", async (event) => {
		event.preventDefault();
		error.textContent = "";
		const password = new FormData(login).get("password");
		try {
			for (const [service, api] of Object.entries(apis)) window.__VELO_OWNER_TOKENS[service] = (await call(api, "/api/owner/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) })).token;
			sessionStorage.setItem("velocify-owner-tokens", JSON.stringify(window.__VELO_OWNER_TOKENS));
			login.reset();
			login.hidden = true;
			dashboard.hidden = false;
			await ownerState();
			document.dispatchEvent(new CustomEvent("velocify-owner-login"));
		} catch (cause) { error.textContent = cause.message; }
	});
	document.querySelector(".owner-refresh").addEventListener("click", ownerState);
	document.querySelector(".owner-logout").addEventListener("click", () => {
		window.__VELO_OWNER_TOKENS = {};
		sessionStorage.removeItem("velocify-owner-tokens");
		dashboard.hidden = true;
		login.hidden = false;
	});
	if (Object.keys(window.__VELO_OWNER_TOKENS).length === 2) {
		login.hidden = true;
		dashboard.hidden = false;
		ownerState().catch(() => document.querySelector(".owner-logout").click());
	}
	if (ownerName) {
		const checkBan = () => identify(ownerName).then((data) => { if (data.siteBanned) blocked("you have been banned from using velocify by the site owner"); }).catch(() => {});
		checkBan();
		setInterval(checkBan, 5000);
	}
	else setupProfile();
})();
