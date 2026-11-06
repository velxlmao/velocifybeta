/* velocify: neutered sitelock + reliable ad-skip trigger.
   Original sl_fn() redirected to hoodamath.com when not hosted there.
   sl_get_info() is called from the splash controller's Create event the
   moment the splash room starts, so it's the perfect place to kick off
   the ad-skip (splash -> ad room 4 -> game room 1). sl_fn() is a no-op
   so the game can never redirect away from velocify. */

function sl_get_info() {
	var anc = "";
	try { anc = (location.ancestorOrigins && location.ancestorOrigins[0]) || ""; } catch (e) {}
	try {
		gml_Script_gmcallback_site_details(-1, -1, anc, document.referrer);
	} catch (e) {}
	// splash is now live -> auto-play an instant empty ad to reach the game
	try { if (window.veloSkipAd) window.veloSkipAd(); } catch (e) {}
}

function unblockedGetParentUrl() {
	var isInIframe = (parent !== window), parentUrl = null;
	if (isInIframe) { parentUrl = document.referrer; }
	if (parentUrl != null && !parentUrl.includes("http")) { return null; }
	return parentUrl;
}

function sl_fn() {
	/* no-op: redirect disabled */
}
