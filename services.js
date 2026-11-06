"use strict";

window.__VELO_SERVICES = ["=AzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=EzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=IzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=MzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=QzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=UzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=YzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=czLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=gzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "=kzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "wEzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "xEzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "yEzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d", "zEzLsVmbuFGaj9idlRmLzJXZrJ3b35ic2h2chRGbhVmcuMXZ09mbtknZpN2bsVmdv8iOzN3d"].map(value => atob(value.split("").reverse().join("")));

window.connectService = async function (servers, connect, progress, signal, timeout = 10000) {
	for (let i = 0; i < servers.length; i++) {
		signal.throwIfAborted();
		progress(i + 1, servers.length);
		const attempt = new AbortController();
		let timer;
		let abort;
		try {
			await Promise.race([
				Promise.resolve().then(() => connect(servers[i], attempt.signal)),
				new Promise((_, reject) => {
					timer = setTimeout(() => {
						const error = new Error("service connection timed out");
						attempt.abort(error);
						reject(error);
					}, timeout);
					abort = () => {
						attempt.abort(signal.reason);
						reject(signal.reason);
					};
					signal.addEventListener("abort", abort, { once: true });
				}),
			]);
			signal.throwIfAborted();
			return servers[i];
		} catch (err) {
			signal.throwIfAborted();
		} finally {
			clearTimeout(timer);
			attempt.abort();
			signal.removeEventListener("abort", abort);
		}
	}
	throw new Error("could not connect through any service");
};
