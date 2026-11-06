/* Canvas fireworks: rockets, chrysanthemums, rings, hearts and falling embers. */
class BirthdayFireworks {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.active = false;
    this.motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rockets = [];
    this.sparks = [];
    this.flashes = [];
    this.queue = [];
    this.frameId = null;
    this.lastTime = 0;
    this.clock = 0;
    this.nextLaunch = 0;
    this.lastTap = -1000;
    this.colors = ['#ffb83f', '#ff418a', '#a266ff', '#35dbff', '#54ed9d', '#ff624c', '#5c8fff'];
    this.onBurst = null;
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.mobile = this.width < 700;
    const scale = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 1.75);
    this.canvas.width = Math.round(this.width * scale);
    this.canvas.height = Math.round(this.height * scale);
    if (this.ctx) this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (this.active && !this.motion) this.drawStill();
  }

  start() {
    this.stop();
    this.active = true;
    this.clock = 0;
    this.nextLaunch = 100;
    if (!this.ctx) return;
    if (!this.motion) { this.drawStill(); return; }
    // The first three blooms greet her immediately, followed by rising rockets.
    this.burst(this.width * .16, this.height * .24, 0, 'chrysanthemum', false);
    this.burst(this.width * .81, this.height * .3, 1, 'ring', false);
    this.burst(this.width * .6, this.height * .13, 2, 'chrysanthemum', false);
    this.finale();
    this.resume();
  }

  stop() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.active = false;
    this.lastTime = 0;
    this.rockets = [];
    this.sparks = [];
    this.flashes = [];
    this.queue = [];
    if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
  }

  suspend() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.lastTime = 0;
  }

  resume() {
    if (this.active && this.motion && this.ctx && this.frameId === null && !document.hidden) {
      this.lastTime = 0;
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  setMotion(enabled) {
    this.motion = enabled;
    if (!this.active) return;
    this.suspend();
    this.rockets = [];
    this.sparks = [];
    this.flashes = [];
    this.queue = [];
    if (enabled) {
      this.nextLaunch = this.clock;
      this.finale();
      this.resume();
    } else this.drawStill();
  }

  launch(x, y, colorIndex, kind) {
    if (!this.active || !this.motion || this.rockets.length >= 8) return;
    const startX = x + (Math.random() - .5) * this.width * .24;
    const startY = this.height + 10;
    const travel = 56 + Math.random() * 18;
    this.rockets.push({
      x: startX, y: startY, startX, startY, targetX: x, targetY: y,
      age: 0, travel, colorIndex, kind, trail: []
    });
  }

  burst(x, y, colorIndex = 0, kind = 'chrysanthemum', sound = true) {
    const count = this.mobile ? 88 : 140;
    const maxSparks = this.mobile ? 1100 : 2000;
    const overflow = this.sparks.length + count - maxSparks;
    if (overflow > 0) this.sparks.splice(0, overflow);
    const color = this.colors[colorIndex % this.colors.length];
    const accent = this.colors[(colorIndex + 2) % this.colors.length];
    const size = (this.mobile ? 2.8 : 4.1) + Math.random() * 1.4;
    // Every bloom has an outer shell, a contrasting inner bloom and warm embers.
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const inner = kind !== 'heart' && i % 4 === 0;
      const glitter = kind !== 'heart' && i % 11 === 0;
      let vx, vy;
      if (kind === 'heart') {
        vx = (16 * Math.pow(Math.sin(angle), 3)) / 15 * size * 1.05;
        vy = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) / 15 * size * 1.05;
      } else {
        const spread = kind === 'ring' ? 1 : .58 + Math.random() * .42;
        const speed = size * spread * (inner ? .48 : 1);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      }
      this.sparks.push({
        x, y, px: x, py: y, vx, vy,
        color: glitter || kind === 'willow' ? '#ffc25c' : inner ? accent : color,
        age: 0, life: (kind === 'willow' ? 125 : 95) + Math.random() * 60,
        drag: kind === 'heart' ? .990 : kind === 'willow' ? .986 : .983,
        gravity: kind === 'heart' ? .012 : kind === 'willow' ? .04 : .024,
        size: (glitter ? 1.1 : .85) + Math.random() * .9,
        twinkle: glitter,
        phase: Math.random() * Math.PI * 2
      });
    }
    // A localized glow blooms gently; it never flashes the entire screen.
    this.flashes.push({ x, y, color, life: 23, age: 0 });
    if (sound && this.onBurst) this.onBurst();
  }

  finale() {
    if (!this.active) return;
    if (!this.motion) { this.drawStill(); return; }
    // Bounded queue also handles repeated button taps without runaway particles.
    if (this.queue.length > 16) return;
    const positions = [.12, .88, .3, .7, .48, .18, .82, .54];
    positions.forEach((x, i) => this.queue.push({
      time: this.clock + i * 260,
      x: this.width * (x + (Math.random() - .5) * .05),
      y: this.height * (.13 + Math.random() * .3),
      color: i % this.colors.length,
      kind: i === 4 ? 'heart' : i === 7 ? 'willow' : i % 3 === 0 ? 'ring' : 'chrysanthemum'
    }));
    this.queue.sort((a, b) => a.time - b.time);
  }

  tap(x, y) {
    if (!this.active) return;
    const now = performance.now();
    if (now - this.lastTap < 200) return;
    this.lastTap = now;
    if (!this.motion) { this.drawStill(x, y); return; }
    this.launch(Math.max(20, Math.min(this.width - 20, x)), Math.max(35, Math.min(this.height * .8, y)), Math.floor(Math.random() * this.colors.length), Math.random() < .3 ? 'heart' : 'chrysanthemum');
  }

  drawStill(tapX, tapY) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'source-over';
    const blooms = [[.13,.24],[.86,.28],[.56,.13],[.17,.68],[.8,.72],[.9,.5]];
    if (Number.isFinite(tapX)) blooms.push([tapX / this.width, tapY / this.height]);
    blooms.forEach(([nx, ny], index) => {
      const x = nx * this.width, y = ny * this.height;
      const radius = (this.mobile ? 48 : 85) + index * 4;
      ctx.strokeStyle = this.colors[index % this.colors.length];
      for (let i = 0; i < 48; i++) {
        const angle = i * Math.PI / 24;
        ctx.strokeStyle = this.colors[(index + (i % 4 === 0 ? 2 : 0)) % this.colors.length];
        const inner = radius * (.22 + (i % 3) * .12);
        const outer = radius * (.7 + (i % 4) * .1);
        ctx.globalAlpha = .5 + (i % 3) * .16;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
        ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  tick(timestamp) {
    this.frameId = null;
    if (!this.active || !this.motion || document.hidden) return;
    const elapsed = this.lastTime ? Math.min(timestamp - this.lastTime, 35) : 16.67;
    const dt = elapsed / 16.67;
    this.lastTime = timestamp;
    this.clock += elapsed;
    const ctx = this.ctx;
    // Fade only the canvas pixels, preserving the night sky behind it.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${1 - Math.pow(.84, dt)})`;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    while (this.queue.length && this.queue[0].time <= this.clock) {
      const shot = this.queue.shift();
      this.launch(shot.x, shot.y, shot.color, shot.kind);
    }
    if (this.clock >= this.nextLaunch) {
      const types = ['chrysanthemum', 'chrysanthemum', 'ring', 'heart', 'willow'];
      this.launch(this.width * (.07 + Math.random() * .86), this.height * (.12 + Math.random() * .43), Math.floor(Math.random() * this.colors.length), types[Math.floor(Math.random() * types.length)]);
      this.nextLaunch = this.clock + 380 + Math.random() * 450;
    }

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i];
      rocket.age += dt;
      const progress = Math.min(1, rocket.age / rocket.travel);
      const ease = 1 - Math.pow(1 - progress, 1.45);
      rocket.trail.push({ x: rocket.x, y: rocket.y });
      if (rocket.trail.length > 13) rocket.trail.shift();
      rocket.x = rocket.startX + (rocket.targetX - rocket.startX) * ease;
      rocket.y = rocket.startY + (rocket.targetY - rocket.startY) * ease;
      ctx.strokeStyle = this.colors[rocket.colorIndex];
      ctx.lineWidth = 1.5;
      for (let j = 1; j < rocket.trail.length; j++) {
        ctx.globalAlpha = (j / rocket.trail.length) * .65;
        ctx.beginPath(); ctx.moveTo(rocket.trail[j - 1].x, rocket.trail[j - 1].y);
        ctx.lineTo(rocket.trail[j].x, rocket.trail[j].y); ctx.stroke();
      }
      ctx.globalAlpha = .9;
      ctx.fillStyle = '#fff2ce';
      ctx.beginPath(); ctx.arc(rocket.x, rocket.y, 1.6, 0, Math.PI * 2); ctx.fill();
      if (progress >= 1) {
        this.burst(rocket.x, rocket.y, rocket.colorIndex, rocket.kind);
        this.rockets.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.age += dt;
      if (spark.age >= spark.life || spark.y > this.height + 20) { this.sparks.splice(i, 1); continue; }
      spark.px = spark.x; spark.py = spark.y;
      spark.vx *= Math.pow(spark.drag, dt);
      spark.vy = spark.vy * Math.pow(spark.drag, dt) + spark.gravity * dt;
      spark.x += spark.vx * dt; spark.y += spark.vy * dt;
      const remaining = 1 - spark.age / spark.life;
      ctx.globalAlpha = Math.min(1, remaining * 1.5) * (spark.twinkle && spark.age > 55 ? .72 + .28 * Math.sin(spark.age * .16 + spark.phase) : 1);
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = spark.size * Math.max(.4, remaining);
      ctx.beginPath(); ctx.moveTo(spark.px, spark.py); ctx.lineTo(spark.x, spark.y); ctx.stroke();
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const flash = this.flashes[i]; flash.age += dt;
      if (flash.age >= flash.life) { this.flashes.splice(i, 1); continue; }
      const radius = 13 + flash.age * 2.6;
      const gradient = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
      gradient.addColorStop(0, flash.color + '66'); gradient.addColorStop(1, flash.color + '00');
      ctx.globalAlpha = (1 - flash.age / flash.life) * .6;
      ctx.fillStyle = gradient;
      ctx.fillRect(flash.x - radius, flash.y - radius, radius * 2, radius * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.frameId = requestAnimationFrame(this.tick);
  }
}
