const headers = {
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "GET,POST,OPTIONS",
	"access-control-allow-headers": "content-type,authorization",
	"content-type": "application/json",
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const clean = (value, max) => String(value || "").trim().slice(0, max);
const pair = (a, b) => [a, b].sort().join(":");
const code = () => crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
const hour = 60 * 60 * 1000;

export default {
	fetch(request, env) {
		if (request.method === "OPTIONS") return new Response(null, { headers });
		return env.VELOCORD.get(env.VELOCORD.idFromName("global")).fetch(request);
	},
};

export class Velocord {
	constructor(state, env) {
		this.state = state;
		this.env = env;
		this.sockets = new Map();
	}
	async fetch(request) {
		const url = new URL(request.url);
		if (url.pathname === "/api/visitor" && request.method === "POST") return this.visitor(await request.json());
		if (url.pathname === "/api/owner/login" && request.method === "POST") return this.ownerLogin(await request.json());
		if (url.pathname === "/api/owner/state" && request.method === "GET") return this.ownerState(request);
		if (url.pathname === "/api/owner/action" && request.method === "POST") return this.ownerAction(request, await request.json());
		if (url.pathname === "/admin/clear" && request.method === "POST") return this.clearContent(request);
		if (url.pathname === "/connect") return this.connect(request, url.searchParams.get("token"));
		if (url.pathname === "/api/profile" && request.method === "POST") return this.profile(await request.json());
		if (url.pathname === "/api/state" && request.method === "GET") return this.snapshot(url.searchParams.get("token"));
		if (url.pathname === "/api/action" && request.method === "POST") return this.action(await request.json());
		return json({ error: "not found" }, 404);
	}
	async ownerFromRequest(request) {
		const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
		const expires = token && await this.state.storage.get("owner-session:" + token);
		return expires > Date.now();
	}
	async ownerLogin(body) {
		if (!this.env.OWNER_PASSWORD || body.password !== this.env.OWNER_PASSWORD) return json({ error: "invalid password" }, 401);
		const token = crypto.randomUUID();
		await this.state.storage.put("owner-session:" + token, Date.now() + 12 * hour, { expirationTtl: 12 * 60 * 60 });
		return json({ token });
	}
	async visitor(body) {
		const browserId = clean(body.browserId, 80);
		if (!browserId) return json({ error: "invalid browser" }, 400);
		const key = "visitor:" + browserId;
		const visitor = await this.state.storage.get(key) || { browserId, names: [], firstSeen: Date.now() };
		const name = clean(body.name, 32);
		if (name && !visitor.siteName) {
			visitor.siteName = name;
			visitor.names = [name];
		}
		visitor.lastSeen = Date.now();
		await this.state.storage.put(key, visitor);
		return json({ siteName: visitor.siteName || "", siteBanned: Boolean(await this.state.storage.get("site-ban:" + browserId)) });
	}
	async ownerState(request) {
		if (!await this.ownerFromRequest(request)) return json({ error: "unauthorized" }, 401);
		const visitors = await this.all("visitor:");
		const users = await this.all("user:");
		const userMap = new Map();
		for (const user of users) if (user.browserId) {
			const item = userMap.get(user.browserId) || [];
			if (!item.includes(user.displayName)) item.push(user.displayName);
			userMap.set(user.browserId, item);
		}
		for (const visitor of visitors) visitor.names = [...new Set([...(visitor.names || []), ...(userMap.get(visitor.browserId) || [])])];
		return json({ visitors, users: users.map((user) => this.publicUser(user)), siteBans: [...(await this.state.storage.list({ prefix: "site-ban:" })).keys()].map((key) => key.slice(9)), chatBans: [...(await this.state.storage.list({ prefix: "chat-ban:" })).keys()].map((key) => key.slice(9)) });
	}
	async ownerAction(request, body) {
		if (!await this.ownerFromRequest(request)) return json({ error: "unauthorized" }, 401);
		const browserId = clean(body.browserId, 80);
		const userId = clean(body.userId, 80);
		if (body.type === "site_ban" && browserId) await this.state.storage.put("site-ban:" + browserId, Date.now());
		else if (body.type === "site_unban" && browserId) await this.state.storage.delete("site-ban:" + browserId);
		else if (body.type === "chat_ban" && userId) await this.state.storage.put("chat-ban:" + userId, Date.now());
		else if (body.type === "chat_unban" && userId) await this.state.storage.delete("chat-ban:" + userId);
		else return json({ error: "invalid action" }, 400);
		this.notifyAll();
		return json({ ok: true });
	}
	async clearContent(request) {
		if (!this.env.ADMIN_KEY || request.headers.get("authorization") !== "Bearer " + this.env.ADMIN_KEY) return json({ error: "unauthorized" }, 401);
		const dms = await this.state.storage.list({ prefix: "dm:" });
		if (dms.size) await this.state.storage.delete([...dms.keys()]);
		const servers = await this.all("server:");
		for (const server of servers) {
			for (const channel of server.channels) channel.messages = [];
			await this.state.storage.put("server:" + server.id, server);
		}
		const groups = await this.all("group:");
		for (const group of groups) {
			group.messages = [];
			await this.state.storage.put("group:" + group.id, group);
		}
		this.notifyAll();
		return json({ ok: true, dms: dms.size, servers: servers.length, groups: groups.length });
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
		const ownerSession = body.ownerToken && await this.state.storage.get("owner-session:" + clean(body.ownerToken, 80));
		Object.assign(user, { displayName, username, avatar, browserId: clean(body.browserId, 80), ownerUntil: ownerSession > Date.now() ? ownerSession : 0 });
		await this.state.storage.put({ ["user:" + user.id]: user, ["username:" + username]: user.id, ["token:" + token]: user.id });
		await this.joinOfficial(user.id);
		await this.joinPublicGroup(user.id);
		this.notifyAll();
		return json({ token, user: this.publicUser(user) });
	}
	publicUser(user) {
		return { id: user.id, displayName: user.displayName, username: user.username, avatar: user.avatar || "", createdAt: user.createdAt, browserId: user.browserId || "", owner: user.ownerUntil > Date.now() };
	}
	isOwner(user) {
		return user.ownerUntil > Date.now();
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
	async joinPublicGroup(userId) {
		let id = await this.state.storage.get("public-group");
		let group = id && await this.state.storage.get("group:" + id);
		if (!group) {
			group = { id: crypto.randomUUID(), name: "public velocify", ownerId: await this.state.storage.get("username:velx") || "", members: [], messages: [], createdAt: Date.now(), official: true };
			await this.state.storage.put("public-group", group.id);
		}
		if (!group.ownerId) group.ownerId = await this.state.storage.get("username:velx") || "";
		if (!group.members.includes(userId)) group.members.push(userId);
		await this.state.storage.put("group:" + group.id, group);
	}
	async snapshot(token) {
		const user = await this.userFromToken(token);
		if (!user) return json({ error: "unauthorized" }, 401);
		await this.joinOfficial(user.id);
		await this.joinPublicGroup(user.id);
		const users = await this.all("user:");
		const userMap = new Map(users.map((item) => [item.id, item]));
		const servers = (await this.all("server:")).filter((server) => server.members.includes(user.id));
		const groups = (await this.all("group:")).filter((group) => group.members.includes(user.id)).map((group) => ({ ...group, memberUsers: group.members.map((id) => userMap.get(id)).filter(Boolean).map((item) => this.publicUser(item)) }));
		const dms = {};
		for (const friendId of user.friends) dms[friendId] = await this.state.storage.get("dm:" + pair(user.id, friendId)) || [];
		return json({
			user: this.publicUser(user),
			chatBanned: Boolean(await this.state.storage.get("chat-ban:" + user.id)),
			friends: user.friends.map((id) => userMap.get(id)).filter(Boolean).map((item) => this.publicUser(item)),
			requests: user.requests.map((id) => userMap.get(id)).filter(Boolean).map((item) => this.publicUser(item)),
			servers,
			groups,
			dms,
		});
	}
	async action(body) {
		const user = await this.userFromToken(body.token);
		if (!user) return json({ error: "unauthorized" }, 401);
		if (await this.state.storage.get("chat-ban:" + user.id)) return json({ error: "banned from messaging" }, 403);
		const type = body.type;
		if (type === "friend_request") {
			const id = await this.state.storage.get("username:" + clean(body.username, 24).toLowerCase());
			if (!id || id === user.id) return json({ error: "user not found" }, 404);
			const target = await this.state.storage.get("user:" + id);
			if (!target.requests.includes(user.id) && !target.friends.includes(user.id)) target.requests.push(user.id);
			await this.state.storage.put("user:" + id, target);
		} else if (type === "contact_add") {
			const id = await this.state.storage.get("username:" + clean(body.username, 24).toLowerCase().replace(/^@/, ""));
			if (!id || id === user.id) return json({ error: "user not found" }, 404);
			const contact = await this.state.storage.get("user:" + id);
			if (!user.friends.includes(id)) user.friends.push(id);
			if (!contact.friends.includes(user.id)) contact.friends.push(user.id);
			await this.state.storage.put({ ["user:" + user.id]: user, ["user:" + id]: contact });
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
			if (!message || message.authorId !== user.id && !this.isOwner(user) || type === "dm_edit" && message.authorId !== user.id) return json({ error: "forbidden" }, 403);
			if (type === "dm_edit") Object.assign(message, { text: clean(body.text, 2000), editedAt: Date.now() });
			else messages.splice(messages.indexOf(message), 1);
			await this.state.storage.put(key, messages);
		} else if (type === "dm_close") {
			const id = clean(body.userId, 64);
			if (!user.friends.includes(id)) return json({ error: "conversation not found" }, 404);
			user.friends = user.friends.filter((item) => item !== id);
			await this.state.storage.put("user:" + user.id, user);
			if (this.isOwner(user)) await this.state.storage.delete("dm:" + pair(user.id, id));
		} else if (type === "server_create") {
			const server = { id: crypto.randomUUID(), name: clean(body.name, 40) || "new server", code: clean(body.code, 16).toUpperCase() || code(), ownerId: user.id, members: [user.id], channels: [{ id: crypto.randomUUID(), name: "general", messages: [] }], icon: clean(body.icon, 280000) };
			const duplicate = (await this.all("server:")).some((item) => item.code === server.code);
			if (duplicate) return json({ error: "code already used" }, 409);
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "group_create") {
			const usernames = Array.isArray(body.usernames) ? body.usernames : [];
			const members = [user.id];
			for (const username of usernames.slice(0, 24)) {
				const id = await this.state.storage.get("username:" + clean(username, 24).toLowerCase().replace(/^@/, ""));
				if (id && !members.includes(id)) members.push(id);
			}
			if (members.length < 2) return json({ error: "add at least one valid username" }, 400);
			const group = { id: crypto.randomUUID(), name: clean(body.name, 40) || "new group", ownerId: user.id, members, messages: [], createdAt: Date.now() };
			await this.state.storage.put("group:" + group.id, group);
		} else if (type === "group_send") {
			const group = await this.state.storage.get("group:" + body.groupId);
			if (!group || !group.members.includes(user.id)) return json({ error: "forbidden" }, 403);
			group.messages.push({ id: crypto.randomUUID(), authorId: user.id, author: this.publicUser(user), text: clean(body.text, 2000), at: Date.now() });
			group.messages = group.messages.slice(-200);
			await this.state.storage.put("group:" + group.id, group);
		} else if (type === "group_close") {
			const group = await this.state.storage.get("group:" + body.groupId);
			if (!group || !group.members.includes(user.id)) return json({ error: "group not found" }, 404);
			if (group.official && !this.isOwner(user)) return json({ error: "official group cannot be deleted" }, 403);
			if (group.ownerId === user.id || this.isOwner(user)) await this.state.storage.delete("group:" + group.id);
			else {
				group.members = group.members.filter((id) => id !== user.id);
				await this.state.storage.put("group:" + group.id, group);
			}
		} else if (type === "group_edit" || type === "group_delete") {
			const group = await this.state.storage.get("group:" + body.groupId);
			if (!group || !group.members.includes(user.id)) return json({ error: "forbidden" }, 403);
			const message = group.messages.find((item) => item.id === body.messageId);
			if (!message || type === "group_edit" && message.authorId !== user.id || type === "group_delete" && message.authorId !== user.id && group.ownerId !== user.id && !this.isOwner(user)) return json({ error: "forbidden" }, 403);
			if (type === "group_edit") Object.assign(message, { text: clean(body.text, 2000), editedAt: Date.now() });
			else group.messages.splice(group.messages.indexOf(message), 1);
			await this.state.storage.put("group:" + group.id, group);
		} else if (type === "server_join") {
			const wanted = clean(body.code, 16).toUpperCase();
			const server = (await this.all("server:")).find((item) => item.code === wanted);
			if (!server) return json({ error: "server not found" }, 404);
			if (!server.members.includes(user.id)) server.members.push(user.id);
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "channel_create") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || server.ownerId !== user.id && !this.isOwner(user)) return json({ error: "forbidden" }, 403);
			server.channels.push({ id: crypto.randomUUID(), name: clean(body.name, 30).toLowerCase().replace(/\s+/g, "-") || "new-channel", messages: [] });
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "channel_update" || type === "channel_delete") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || server.ownerId !== user.id && !this.isOwner(user)) return json({ error: "forbidden" }, 403);
			const channel = server.channels.find((item) => item.id === body.channelId);
			if (!channel) return json({ error: "channel not found" }, 404);
			if (type === "channel_update") channel.name = clean(body.name, 30).toLowerCase().replace(/\s+/g, "-") || channel.name;
			else if (server.channels.length > 1) server.channels.splice(server.channels.indexOf(channel), 1);
			else return json({ error: "server needs one channel" }, 400);
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "server_update") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || server.ownerId !== user.id && !this.isOwner(user)) return json({ error: "forbidden" }, 403);
			server.name = clean(body.name, 40) || server.name;
			server.icon = clean(body.icon, 280000) || server.icon;
			await this.state.storage.put("server:" + server.id, server);
		} else if (type === "server_delete") {
			const server = await this.state.storage.get("server:" + body.serverId);
			if (!server || server.ownerId !== user.id && !this.isOwner(user) || server.official && !this.isOwner(user)) return json({ error: "forbidden" }, 403);
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
			if (!message || message.authorId !== user.id && server.ownerId !== user.id && !this.isOwner(user)) return json({ error: "forbidden" }, 403);
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
