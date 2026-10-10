/**
 * systems/effects.js — 特效 + 氛围粒子
 * 更新 world.effects（爆炸/闪电/文字/警告）寿命与文字上浮；维护 world.particles。
 * 通过 window.ZS.Systems.Effects 暴露（resize 供 game 在画布缩放时重建粒子）。
 */
(function () {
  const System = window.ZS.Core.System;
  const COLORS = ['#ffd54f', '#ff9800', '#4fc3f7', '#b39ddb', '#ff7043', '#ffeb3b'];

  class Effects extends System {
    constructor() {
      super({ name: 'Effects' });
    }
    update(world, dt) {
      for (let i = world.effects.length - 1; i >= 0; i--) {
        const fx = world.effects[i];
        fx.life -= dt;
        if (fx.type === 'text') fx.y += (fx.vy || 0) * dt;
        if (fx.type === 'stream') fx.flow = (fx.flow || 0) + dt * 2;   // 粒子流相位推进
        if (fx.life <= 0) world.effects.splice(i, 1);
      }
      // 物理特效粒子：重力 + 阻力 + 位置 + 寿命
      for (let i = world.sparks.length - 1; i >= 0; i--) {
        const p = world.sparks[i];
        p.vy += p.gravity * dt;
        p.vx *= p.drag; p.vy *= p.drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) world.sparks.splice(i, 1);
      }
      // 屏幕反馈衰减（震动/顿帧/白闪）
      if (world.shake.dur > 0) {
        world.shake.t += dt;
        if (world.shake.t >= world.shake.dur) world.shake.dur = 0;
      }
      if (world.freeze > 0) world.freeze -= dt;
      if (world.flash > 0) world.flash -= dt * 3;
      this._updateParticles(world, dt);
    }

    _initParticles(world) {
      const area = Math.max(200, world.width * world.height);
      const count = Math.min(110, Math.floor(area / 16000));
      const list = [];
      for (let i = 0; i < count; i++) {
        const big = Math.random() < 0.12;
        list.push({
          x: Math.random() * world.width,
          y: Math.random() * world.height,
          r: big ? 2.2 + Math.random() * 2.4 : 1 + Math.random() * 1.9,
          speed: big ? 8 + Math.random() * 16 : 10 + Math.random() * 26,
          sway: 0.6 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.10 + Math.random() * 0.35,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          glow: Math.random() < 0.5,
        });
      }
      return list;
    }

    _updateParticles(world, dt) {
      if (!world.particles) world.particles = this._initParticles(world);
      const w = world.width, h = world.height;
      for (const p of world.particles) {
        p.y -= p.speed * dt;
        p.phase += dt * 1.7;
        p.x += Math.sin(p.phase) * p.sway * dt * 16;
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;
      }
    }

    // 画布缩放时重建粒子（game 调用）
    resize(world) {
      world.particles = this._initParticles(world);
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Effects = Effects;
})();