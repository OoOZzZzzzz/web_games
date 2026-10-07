/**
 * systems/render.js — 渲染系统
 * 全部画布绘制：背景/网格/粒子/玩家/怪物/子弹/飞刃/经验球/特效/准星光标。
 * 按 world.phase 区分菜单氛围 vs 战斗场景。
 * 通过 window.ZS.Systems.Render 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const Data = window.ZS.Data;
  const Input = window.ZS.Input;
  const System = window.ZS.Core.System;
  const skillCalc = window.ZS.Systems.skillCalc;

  class Render extends System {
    constructor() {
      super({ name: 'Render' });
    }
    draw(ctx, world) {
      if (!world || world.phase === 'menu') {
        if (world) this._drawAmbient(ctx, world);
        return;
      }
      const w = world.width, h = world.height;
      this._drawBackground(ctx, w, h);
      this._drawGrid(ctx, w, h);
      this._drawParticles(ctx, world, 0.35);
      this._drawOrbs(ctx, world);
      this._drawAura(ctx, world);
      this._drawEnemies(ctx, world);
      this._drawBullets(ctx, world);
      this._drawBlades(ctx, world);
      this._drawEffects(ctx, world);
      this._drawPlayer(ctx, world);
      this._drawCursor(ctx, world);
    }

    _drawAmbient(ctx, world) {
      this._drawBackground(ctx, world.width, world.height);
      this._drawGrid(ctx, world.width, world.height);
      this._drawParticles(ctx, world, 1);
    }

    // 背景：中心暖辉光 → 四周深色径向渐变
    _drawBackground(ctx, w, h) {
      const cx = w / 2, cy = h / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.72);
      grad.addColorStop(0, '#182033');
      grad.addColorStop(0.55, '#121828');
      grad.addColorStop(1, '#0a0e16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 网格线 + 辉光交点
    _drawGrid(ctx, w, h) {
      const g = CONFIG.canvas.gridSize;
      const off = CONFIG.canvas.gridOffset;
      ctx.strokeStyle = CONFIG.canvas.gridColor;
      ctx.lineWidth = 1;
      for (let x = off; x < w; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = off; y < h; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255, 170, 60, 0.15)';
      ctx.shadowColor = 'rgba(255, 152, 0, 0.8)';
      ctx.shadowBlur = 6;
      for (let x = off; x < w; x += g * 2) {
        for (let y = off; y < h; y += g * 2) {
          ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    }

    _drawParticles(ctx, world, alphaMul) {
      const ps = world.particles;
      if (!ps) return;
      const t = world.elapsed;
      for (const p of ps) {
        const twinkle = 0.55 + 0.45 * Math.sin(p.phase * 3 + t * 2);
        const alpha = p.alpha * alphaMul * twinkle;
        if (alpha <= 0.015) continue;
        if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    _drawAura(ctx, world) {
      const v = skillCalc.val(world, 'flameAura');
      if (!v) return;
      const [, radius] = v;
      const p = world.player;
      const pulse = 1 + Math.sin(world.elapsed * 5) * 0.03;
      const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.3, p.x, p.y, radius * pulse);
      grad.addColorStop(0, 'rgba(255, 87, 34, 0.16)');
      grad.addColorStop(1, 'rgba(255, 87, 34, 0)');
      ctx.beginPath(); ctx.arc(p.x, p.y, radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = 'rgba(255, 120, 40, 0.35)';
      ctx.lineWidth = 2; ctx.stroke();
    }

    _drawPlayer(ctx, world) {
      const p = world.player;
      if (!p) return;
      const { x, y, radius } = p;
      ctx.save();
      if (p.hurtFlash > 0) ctx.globalAlpha = 0.6;
      // 身体
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = Data.player.color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = Data.player.stroke; ctx.stroke();
      // 内圈高光
      ctx.beginPath(); ctx.arc(x - radius * 0.2, y - radius * 0.25, radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = Data.player.highlight; ctx.fill();
      // 朝向炮管
      const ang = Math.atan2(p.aim.y, p.aim.x);
      ctx.strokeStyle = Data.player.gunColor; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * radius * 0.4, y + Math.sin(ang) * radius * 0.4);
      ctx.lineTo(x + Math.cos(ang) * (radius + 8), y + Math.sin(ang) * (radius + 8));
      ctx.stroke();
      ctx.restore();
      // 无敌闪烁
      if (p.invulnTimer > 0) {
        ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(world.elapsed * 30)})`;
        ctx.lineWidth = 2; ctx.stroke();
      }
    }

    _drawEnemies(ctx, world) {
      const p = world.player;
      if (!p) return;
      for (const e of world.enemies) {
        if (e.hitFlash > 0) ctx.globalAlpha = 0.65;
        if (e.shape === 'square') {
          ctx.fillStyle = e.color;
          ctx.fillRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
          ctx.strokeStyle = e.tier === 'boss' ? '#ff5722' : 'rgba(0,0,0,0.45)';
          ctx.lineWidth = e.tier === 'boss' ? 3 : 2;
          ctx.strokeRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
        } else if (e.shape === 'ellipse') {
          ctx.beginPath(); ctx.ellipse(e.x, e.y, e.radius * 1.4, e.radius, 0, 0, Math.PI * 2);
          ctx.fillStyle = e.color; ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fillStyle = e.color; ctx.fill();
          ctx.beginPath(); ctx.arc(e.x - e.radius * 0.25, e.y - e.radius * 0.3, e.radius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
        }
        ctx.globalAlpha = 1;
        // 眼睛
        if (e.radius >= 8) {
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          const ex = Math.cos(ang) * e.radius * 0.3;
          const ey = Math.sin(ang) * e.radius * 0.3;
          const er = Math.max(1.5, e.radius * 0.13);
          const pr = Math.max(0.8, er * 0.5);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(e.x + ex - er * 1.2, e.y + ey - er * 0.8, er, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(e.x + ex + er * 1.2, e.y + ey - er * 0.8, er, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1a1a24';
          ctx.beginPath(); ctx.arc(e.x + ex - er * 1.2 + Math.cos(ang) * pr, e.y + ey - er * 0.8 + Math.sin(ang) * pr, pr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(e.x + ex + er * 1.2 + Math.cos(ang) * pr, e.y + ey - er * 0.8 + Math.sin(ang) * pr, pr, 0, Math.PI * 2); ctx.fill();
        }
        // 精英/BOSS 血条
        if (e.tier === 'elite' || e.tier === 'boss') {
          const bw = e.radius * 2;
          const pct = Math.max(0, e.hp / e.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(e.x - bw / 2, e.y - e.radius - 10, bw, 5);
          ctx.fillStyle = e.tier === 'boss' ? '#ff5722' : '#ab47bc';
          ctx.fillRect(e.x - bw / 2, e.y - e.radius - 10, bw * pct, 5);
        }
      }
    }

    _drawBullets(ctx, world) {
      for (const b of world.bullets) {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color; ctx.fill();
        ctx.beginPath(); ctx.arc(b.x - b.vx * 0.014, b.y - b.vy * 0.014, b.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fill();
      }
    }

    _drawBlades(ctx, world) {
      for (const b of world.blades) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.ang);
        ctx.beginPath();
        ctx.moveTo(11, 0); ctx.lineTo(-6, -6); ctx.lineTo(-2, 0); ctx.lineTo(-6, 6); ctx.closePath();
        ctx.fillStyle = '#e8edf4'; ctx.fill();
        ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
      }
    }

    _drawOrbs(ctx, world) {
      const t = world.elapsed;
      for (const o of world.orbs) {
        const pulse = 1 + Math.sin(t * 6 + o.x * 0.1) * 0.12;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.orb.color; ctx.fill();
        ctx.beginPath(); ctx.arc(o.x - o.r * 0.2, o.y - o.r * 0.25, o.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.orb.colorInner; ctx.fill();
      }
    }

    _drawEffects(ctx, world) {
      const w = world.width, h = world.height;
      for (const fx of world.effects) {
        if (fx.type === 'explosion') {
          const a = Math.max(0, fx.life / 0.35);
          ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1.3 - a * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 152, 0, ${a * 0.45})`; ctx.fill();
          ctx.strokeStyle = `rgba(255, 87, 34, ${a})`; ctx.lineWidth = 3; ctx.stroke();
        } else if (fx.type === 'lightning') {
          ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1);
          const mx = (fx.x1 + fx.x2) / 2 + (Math.random() - 0.5) * 22;
          const my = (fx.y1 + fx.y2) / 2 + (Math.random() - 0.5) * 22;
          ctx.lineTo(mx, my); ctx.lineTo(fx.x2, fx.y2);
          ctx.strokeStyle = `rgba(255, 255, 120, ${Math.max(0, fx.life / 0.22)})`;
          ctx.lineWidth = 3; ctx.stroke();
        } else if (fx.type === 'text') {
          ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = fx.color; ctx.globalAlpha = Math.min(1, fx.life);
          ctx.fillText(fx.str, fx.x, fx.y); ctx.globalAlpha = 1;
        } else if (fx.type === 'warning') {
          const a = Math.min(1, fx.life); ctx.textAlign = 'center';
          ctx.font = 'bold 60px sans-serif'; ctx.fillStyle = `rgba(255, 87, 34, ${a * 0.5})`;
          ctx.fillText('⚠', w / 2, h / 2 - 60);
          ctx.font = 'bold 34px sans-serif'; ctx.fillStyle = `rgba(255, 50, 40, ${a})`;
          ctx.fillText(Data.bosses[Object.keys(Data.bosses)[0]].warnText, w / 2, h / 2);
        }
      }
    }

    // 自定义金色准星光标
    _drawCursor(ctx, world) {
      const mouse = Input.mouse;
      if (!mouse.active) return;
      const { x, y } = mouse;
      const pulse = 1 + Math.sin(world.elapsed * 5) * 0.06;
      const r = 11 * pulse;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.9)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(255, 152, 0, 0.9)';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      const L = 5;
      ctx.beginPath();
      ctx.moveTo(x, y - L); ctx.lineTo(x, y - 3);
      ctx.moveTo(x, y + 3); ctx.lineTo(x, y + L);
      ctx.moveTo(x - L, y); ctx.lineTo(x - 3, y);
      ctx.moveTo(x + 3, y); ctx.lineTo(x + L, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 213, 79, 1)';
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Render = Render;
})();