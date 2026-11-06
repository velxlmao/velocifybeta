"use strict";
(() => {
	const decoy = document.getElementById("decoy");
	const page = document.getElementById("g-page");
	const app = document.getElementById("app");
	if (!decoy || !page || !app) return;

	const KEY = "velocify";
	let triggered = false;

	function ls(k, d) {
		try {
			const v = localStorage.getItem(k);
			return v === null ? d : v;
		} catch (e) {
			return d;
		}
	}

	// re-arm the decoy to a clean, blank Google Doc
	function resetDecoy() {
		const old = document.getElementById("reveal-letters");
		if (old) old.remove();
		decoy.querySelectorAll(".g-part").forEach((p) => p.classList.remove("g-gone"));
		const spin = page.querySelector(".spinner-sm");
		if (spin) spin.remove();
		page.textContent = "";
		page.contentEditable = "true";
		triggered = false;
	}

	// panic: jump back to the decoy (or the real Docs site) with a quick fade
	function panic() {
		const type = ls("velocify-panic-type", "decoy");
		if (type === "website") {
			location.href = "https://docs.google.com/document/u/0/";
			return;
		}
		app.classList.remove("revealed");
		resetDecoy();
		decoy.hidden = false;
		decoy.classList.remove("fade-out");
		decoy.style.transition = "opacity 0.15s ease";
		decoy.style.opacity = "0";
		void decoy.offsetWidth;
		decoy.style.opacity = "1";
		setTimeout(() => page.focus(), 160);
	}

	window.addEventListener(
		"keydown",
		(e) => {
			if (window.__bindingPanic) return;
			if (e.key !== ls("velocify-panic-key", "`")) return;
			e.preventDefault();
			panic();
		},
		true
	);

	page.addEventListener("input", () => {
		if (triggered) return;
		if (!page.innerText.toLowerCase().includes(KEY)) return;
		triggered = true;
		page.contentEditable = "false";

		// wait a beat, then the spinner spins for 3s
		setTimeout(() => {
			const spin = document.createElement("span");
			spin.className = "spinner-sm";
			spin.contentEditable = "false";
			page.appendChild(spin);
			setTimeout(reveal, 3000);
		}, 1000);
	});

	function reveal() {
		const spin = page.querySelector(".spinner-sm");
		if (spin) spin.remove();

		// wrap the "velocify" the user actually typed, letter by letter
		const esc = (s) =>
			s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const text = page.innerText;
		const idx = text.toLowerCase().lastIndexOf(KEY);
		const chars = text.slice(idx, idx + KEY.length).split("");
		let typed = '<span id="typed">';
		chars.forEach((c) => (typed += '<span class="tc">' + esc(c) + "</span>"));
		typed += "</span>";
		page.innerHTML = esc(text.slice(0, idx)) + typed + esc(text.slice(idx + KEY.length));
		const startRects = [...page.querySelectorAll("#typed .tc")].map((s) =>
			s.getBoundingClientRect()
		);

		// build the final logo-letter layer where the real logo will sit
		const logo = document.querySelector("#home .logo");
		const r = logo.getBoundingClientRect();
		const layer = document.createElement("div");
		layer.id = "reveal-letters";
		layer.style.left = r.left + "px";
		layer.style.top = r.top + "px";
		layer.style.width = r.width + "px";
		layer.style.height = r.height + "px";
		chars.forEach((c) => {
			const s = document.createElement("span");
			s.textContent = c;
			layer.appendChild(s);
		});
		document.body.appendChild(layer);

		// start each letter at its typed position, then fly it into place
		const targets = [...layer.children];
		const targetRects = targets.map((s) => s.getBoundingClientRect());
		const typedEl = document.getElementById("typed");
		if (typedEl) typedEl.style.visibility = "hidden";

		targets.forEach((s, i) => {
			const st = startRects[i] || startRects[startRects.length - 1];
			const tr = targetRects[i];
			const dx = st.left + st.width / 2 - (tr.left + tr.width / 2);
			const dy = st.top + st.height / 2 - (tr.top + tr.height / 2);
			const scale = Math.max(st.height / tr.height, 0.1);
			const rot = (Math.random() * 2 - 1) * 16;
			s.animate(
				[
					{
						transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${rot}deg)`,
						offset: 0,
					},
					{
						transform: `translate(${dx * 0.05}px, -7px) scale(1.09) rotate(${-rot * 0.12}deg)`,
						offset: 0.72,
					},
					{ transform: "translate(0,0) scale(1) rotate(0)", offset: 1 },
				],
				{
					duration: 950,
					delay: i * 95,
					easing: "cubic-bezier(0.25, 0.9, 0.3, 1)",
					fill: "both",
				}
			);
		});
		setTimeout(() => layer.classList.add("glow"), chars.length * 95 + 900);

		// dismantle the doc top-to-bottom, one strip at a time
		const parts = [...decoy.querySelectorAll(".g-part")];
		const partStart = 1800; // let the letters gather first
		const partGap = 260;
		parts.forEach((p, i) => {
			setTimeout(() => p.classList.add("g-gone"), partStart + i * partGap);
		});

		// as the dark site shows through, flip the letters to light
		const docGone = partStart + parts.length * partGap;
		setTimeout(() => {
			app.classList.add("revealed");
			layer.classList.add("lit");
			decoy.classList.add("fade-out");
		}, docGone - 200);

		// hand off from the animated letters to the real logo
		setTimeout(() => {
			layer.classList.add("done");
			decoy.hidden = true;
			setTimeout(() => layer.remove(), 600);
			const addr = document.getElementById("sj-address");
			if (addr) addr.focus();
		}, docGone + 400);
	}
})();
