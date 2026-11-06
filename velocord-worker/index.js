const headers = {
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "GET,POST,OPTIONS",
	"access-control-allow-headers": "content-type",
	"content-type": "application/json",
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const clean = (value, max) => String(value || "").trim().slice(0, max);
const pair = (a, b) => [a, b].sort().join(":");
const code = () => crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();

export default {
	fetch(request, env) {
		if (request.method === "OPTIONS") return new Response(null, { headers });
		return env.VELOCORD.get(env.VELOCORD.idFromName("global")).fetch(request);
	},
};

export class Velocord {
	constructor(state) {
		this.state = state;
		this.sockets = new Map();
	}
	async fetch(request) {
		const url = new URL(request.url);
		if (url.pathname === "/connect") return this.connect(request, url.searchParams.get("token"));
		if (url.pathname === "/api/profile" && request.method === "POST") return this.profile(await request.json());
		if (url.pathname === "/api/state" && request.method === "GET") return this.snapshot(url.searchParams.get("token"));
		if (url.pathname === "/api/action" && request.method === "POST") return this.action(await request.json());
		return json({ error: "not found" }, 404);
	}
	async userFromToken(token) {
		const id = token && await this.state.storage.get("token:" + token);
		return id && this.state.storage.get("user:" + id);
	}
	async profile(body) {
		const displayName = clean(body.displayName, 32);
		const username = clean(body.username, 24).toLowerCase().replace(/[^a-z0-9_.]/g, "");
		const avatar = clean(body.avatar, 280000);
		if (!displayName || username.length < 2) return json({ error: "invalid profile" }, 400);
		let user = await this.userFromToken(body.token);
		const owner = await this.state.storage.get("username:" + username);
		if (owner && owner !== user?.id) return json({ error: "username taken" }, 409);
		const token = user?.token || crypto.randomUUID();
		user ||= { id: crypto.randomUUID(), token, friends: [], requests: [], createdAt: Date.now() };
		if (user.username && user.username !== username) await this.state.storage.delete("username:" + user.username);
		Object.assign(user, { displayName, username, avatar });
		await this.state.storage.put({ ["user:" + user.id]: user, ["username:" + username]: user.id, ["token:" + token]: user.id });
		await this.joinOfficial(user.id);
		this.notifyAll();
		return json({ token, user: this.publicUser(user) });
	}
	publicUser(user) {
		return { id: user.id, displayName: user.displayName, username: user.username, avatar: user.avatar || "", createdAt: user.createdAt };
	}
	async all(prefix) {
		return [...(await this.state.storage.list({ prefix })).values()];
	}
	async joinOfficial(userId) {
		const servers = await this.all("server:");
		let id = await this.state.storage.get("official-server");
		let server = servers.find((item) => item.id === id);
		if (!server) {
			server = servers.find((item) => item.name.toLowerCase() === "velocify");
			if (!server) {
				const ownerId = await this.state.storage.get("username:velx") || "";
				server = { id: crypto.randomUUID(), name: "velocify", code: "VELOCIFY", ownerId, members: ownerId ? [ownerId] : [], channels: [{ id: crypto.randomUUID(), name: "general", messages: [] }], icon: "", official: true };
				await this.state.storage.put("server:" + server.id, server);
			}
			id = server.id;
			await this.state.storage.put("official-server", id);
		}
		if (!server.ownerId) {
			server.ownerId = await this.state.storage.get("username:velx") || "";
		}
		server.official = true;
		if (!server.members.includes(userId)) server.members.push(userId);
		await this.state.storage.put("server:" + server.id, server);
	}
	async snapshot(token) {
		const user = await this.userFromToken(token);
		if (!user) return json({ error: "unauthorized" }, 401);
		await this.joinOfficial(user.id);
		const users = await this.all("user:");
		const userMap = new Map(users.map((item) => [item.id, item]));
		const servers = (await this.all("server:")).filter((server) => server.members.includes(user.id));
		const dms = {};
		for (const friendId of user.friends) dms[friendId] = await this.state.storage.get("dm:" + pair(user.id, friendId)) || [];
		return json({
			user: this.publicUser(user),
			friends: user.friends.map((id) => userMap.get(id)).filter(Boolean).map((item) => this.publicUser(item)),
			requests: user.requests.map((id) => userMap.get(id)).filter(Boolean).map((item) => this.publicUser(item)),
			servers,
			dms,
		});
	}
	async action(body) {
		const user = await this.userFromToken(body.token);
		if (!user) return json({ error: "unauthorized" }, 401);
		const type = body.type;
		if (type === "friend_request") {
			const id = await this.state.storage.get("username:" + clean(body.username, 24).toLowerCase());
			if (!id || id === user.id) return json({ error: "user not found" }, 404);
			const target = await this.state.storage.get("user:" + id);
			if (!target.requests.includes(user.id) && !target.friends.includes(user.id)) target.requests.push(user.id);
			await this.state.storage.put("user:" + id, target);
		} else if (type === "friend_accept") {
			const id = clean(body.userId, 64);
			if (!user.requests.includes(id)) return json({ error: "request not found" }, 404);
			const friend = await this.state.storage.get("user:" + id);
			user.requests = user.requests.filter((item) => item !== id);
			if (!user.friends.includes(id)) user.friends.push(id);
			if (!friend.friends.includes(user.id)) friend.friends.push(user.id);
			await this.state.storage.put({ ["user:" + user.id]: user, ["user:" + id]: friend });
		} else if (type === "dm_send") {
			const id = clean(body.userId, 64);
			if (!user.friends.includes(id)) return json({ error: "not friends" }, 403);
			const key = "dm:" + pair(user.id, id);
			const messages = await this.state.storage.get(key) || [];
			messages.push({ id: crypto.randomUUID(), authorId: user.id, text: clean(body.text, 2000), at: Date.now() });
			await this.state.storage.put(key, messages.slice(-150));
		} else if (type === "dm_edit" || type === "dm_delete") {
			const id = clean(body.userId, 64);
			if (!user.friends.includes(id)) return json({ error: "not friends" }, 403);
			const key = "dm:" + pair(user.id, id);
			const messages = await this.state.storage.get(key) || [];
			const message = messages.find((item) => item.id === body.messageId);
			if (!message || message.authorId !== user.id) return json({ error: "forbidden" }, 403);
			if (type === "dm_edit") Object.assign(message, { text: clean(body.text, 2000), editedAt: Date.now() });
			else messages.splice(messages.indexOf(message), 1);
			await this.state.storage.put(key, messages);
		} else if (type === "server_create") {
			const server = { id: crypto.randomUUID(), name: clean(body.name, 40) || "new server", code: clean(body.code, 16).toUpperCase() || code(), ownerId: user.id, members: [user.id], channels: [{ id: crypto.randomUUID(), name: "general", messages: [] }], icon: clean(body.icon, 280000) };
			const duplicate = (await this.all("server:")).some((item) => item.code === server.code);
			if (duplicate) return json({ error: "code already used" }, 409);
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "server_join") {
			const wanted = clean(body.code, 16).toUpperCase();
			const server = (await this.all("server:")).find((item) => item.code === wanted);
			if (!server) return json({ error: "server not found" }, 404);
			if (!server.members.includes(user.id)) server.members.push(user.id);
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "channel_create") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || server.ownerId !== user.id) return json({ error: "forbidden" }, 403);
			server.channels.push({ id: crypto.randomUUID(), name: clean(body.name, 30).toLowerCase().replace(/\s+/g, "-") || "new-channel", messages: [] });
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "channel_update" || type === "channel_delete") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || server.ownerId !== user.id) return json({ error: "forbidden" }, 403);
			const channel = server.channels.find((item) => item.id === body.channelId);
			if (!channel) return json({ error: "channel not found" }, 404);
			if (type === "channel_update") channel.name = clean(body.name, 30).toLowerCase().replace(/\s+/g, "-") || channel.name;
			else if (server.channels.length > 1) server.channels.splice(server.channels.indexOf(channel), 1);
			else return json({ error: "server needs one channel" }, 400);
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "server_update") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || server.ownerId !== user.id) return json({ error: "forbidden" }, 403);
			server.name = clean(body.name, 40) || server.name;
			server.icon = clean(body.icon, 280000) || server.icon;
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "server_delete") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || server.ownerId !== user.id || server.official) return json({ error: "forbidden" }, 403);
			await this.state.storage.delete("server:" + server.id);
		} else if (type === "server_send") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || !server.members.includes(user.id)) return json({ error: "forbidden" }, 403);
			const channel = server.channels.find((item) => item.id === body.channelId);
			if (!channel) return json({ error: "channel not found" }, 404);
			channel.messages.push({ id: crypto.randomUUID(), authorId: user.id, author: this.publicUser(user), text: clean(body.text, 2000), at: Date.now() });
			channel.messages = channel.messages.slice(-150);
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "server_edit" || type === "server_message_delete") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || !server.members.includes(user.id)) return json({ error: "forbidden" }, 403);
			const channel = server.channels.find((item) => item.id === body.channelId);
			const message = channel?.messages.find((item) => item.id === body.messageId);
			if (!message || (message.authorId !== user.id && server.ownerId !== user.id)) return json({ error: "forbidden" }, 403);
			if (type === "server_edit") {
				if (message.authorId !== user.id) return json({ error: "forbidden" }, 403);
				Object.assign(message, { text: clean(body.text, 2000), editedAt: Date.now() });
			} else channel.messages.splice(channel.messages.indexOf(message), 1);
			await this.state.storage.put("server:" + server.id, server);
		} else return json({ error: "unknown action" }, 400);
		this.notifyAll();
		return json({ ok: true });
	}
	connect(request, token) {
		if (request.headers.get("upgrade") !== "websocket" || !token) return json({ error: "websocket required" }, 426);
		const pair = new WebSocketPair();
		pair[1].accept();
		if (!this.sockets.has(token)) this.sockets.set(token, new Set());
		this.sockets.get(token).add(pair[1]);
		pair[1].addEventListener("close", () => this.sockets.get(token)?.delete(pair[1]));
		return new Response(null, { status: 101, webSocket: pair[0] });
	}
	notifyAll() {
		for (const sockets of this.sockets.values()) for (const socket of sockets) {
			try { socket.send('{"type":"refresh"}'); } catch {}
		}
	}
}
