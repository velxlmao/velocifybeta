(function () {
	if (!window.__VELO_BASE) {
		var p = location.pathname;
		window.__VELO_BASE = p.slice(0, p.lastIndexOf("/") + 1);
	}
	if (typeof window.__VELO_POINTER === "undefined") window.__VELO_POINTER = null;

})();
