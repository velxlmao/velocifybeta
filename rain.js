"use strict";
(() => {
	const canvas = document.getElementById("rain");
	if (!canvas) return;
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
 const lowPower = /CrOS/.test(navigator.userAgent || "") || navigator.deviceMemory <= 4 || navigator.hardwareConcurrency <= 4;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const visible = () => !document.hidden && !document.body.classList.contains("view-mode") && !document.querySelector(".fullpage.open");

	let w, h, drops, lastFrame = 0;

	function reset() {
		w = canvas.width = Math.min(window.innerWidth, 1280);
		h = canvas.height = Math.round(window.innerHeight * w / window.innerWidth);
		const count = Math.min(lowPower ? 220 : 500, Math.round((w * h) / (lowPower ? 4500 : 2800)));
		drops = new Array(count).fill(0).map(spawn);
	}

	function spawn() {
		return {
			x: Math.random() * w,
			y: Math.random() * h,
			len: 8 + Math.random() * 16,
			speed: 1 + Math.random() * 2.2,
			alpha: 0.22 + Math.random() * 0.35,
		};
	}

	function frame(now = 0) {
		if (!visible()) { setTimeout(frame, 200); return; }
		if (now && now - lastFrame < 33) { requestAnimationFrame(frame); return; }
  const elapsed = lastFrame && now ? Math.min(2, (now - lastFrame) / 33) : 1;
  lastFrame = now;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--accent').trim();
		ctx.lineWidth = 1;
		for (const d of drops) {
			ctx.globalAlpha = d.alpha;
			ctx.beginPath();
			ctx.moveTo(d.x, d.y);
			ctx.lineTo(d.x - 1, d.y + d.len);
			ctx.stroke();
			d.y += d.speed * elapsed;
			d.x -= 0.15 * elapsed;
			if (d.y > h || d.x < 0) {
				d.y = -d.len;
				d.x = Math.random() * w;
			}
		}
		requestAnimationFrame(frame);
	}

	window.addEventListener("resize", reset);
	reset();
	frame();

	if (lowPower) return;
	const glow = document.createElement("div");
	glow.id = "cursor-glow";
	document.body.appendChild(glow);
	let tx = window.innerWidth / 2,
		ty = window.innerHeight / 2,
		gx = tx,
		gy = ty;
	window.addEventListener("pointermove", (e) => {
		tx = e.clientX;
		ty = e.clientY;
	});
	const logo = document.querySelector("#home .logo");

	function trail() {
		if (!visible()) { setTimeout(trail, 200); return; }
		gx += (tx - gx) * 0.12;
		gy += (ty - gy) * 0.12;
		glow.style.transform = `translate(${gx}px, ${gy}px)`;
		if (logo) {
			const rx = ((gy - window.innerHeight / 2) / window.innerHeight) * -14;
			const ry = ((gx - window.innerWidth / 2) / window.innerWidth) * 14;
			logo.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
		}
		requestAnimationFrame(trail);
	}
	trail();
})();
