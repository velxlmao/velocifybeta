/* velocify: coolmath/hooda ad extension, neutered + auto-skip.
   The splash waits for the ad SDK to call cmgAdStarted() (-> ad room 4)
   then cmgAdEnded() (-> game room 1). With no ad SDK that never fires,
   so the game hangs on the hoodamath splash. We expose veloSkipAd(),
   which sl_get_info() calls the moment the splash room starts, to play
   an instant empty ad and drop straight into the game. When the game
   room is reached we also tell the velocify parent frame we're ready so
   it can lift its own splash overlay. */

function cmgAdStarted() {
	try { gml_Script_gmcallback_cmgAdStart(); } catch (e) {}
}

function cmgAdEnded() {
	try { gml_Script_gmcallback_cmgAdEnd(); } catch (e) {}
	// reached the game room -> let the velocify splash know it can fade
	try { window.parent.postMessage({ velocify: "game-ready" }, "*"); } catch (e) {}
}

window.veloSkipAd = (function () {
	var done = false;
	return function () {
		if (done) return;
		if (typeof window.gml_Script_gmcallback_cmgAdStart !== "function") return;
		done = true;
		// mirror the real ad lifecycle: splash -> ad room (4) -> game (1)
		try { cmgAdStarted(); } catch (e) {}
		setTimeout(function () { try { cmgAdEnded(); } catch (e) {} }, 600);
	};
})();

// Fallback in case the splash hook never runs (e.g. unknown browser path).
setTimeout(function () { try { window.veloSkipAd(); } catch (e) {} }, 12000);
