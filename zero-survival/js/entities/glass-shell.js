/**
 * entities/glass-shell.js — 玻璃外壳对象：磨砂瓶身 + 蜘蛛网裂纹（只在外壳壁上）+ 掉渣
 * 外壳是独立对象，有自己的属性（hits/裂纹/破碎），与内部的水分离。
 * 通过 window.ZS.Entities.GlassShell 暴露。
 */
(function () {
  function hexA(hex, a) {
    const s = String(hex || '').replace('#', '');
    const full = s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s;
    const n = parseInt(full, 16);
    if (isNaN(n)) return `rgba(255,255,255,${a})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function lighten(hex, f) {
    const s = String(hex || '').replace('#', '');
    const full = s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s;
    const n = parseInt(full, 16);
    if (isNaN(n)) return '#ffffff';
    const mix = (c) => Math.round((255 - c) * f + c);
    return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  }

  class GlassShell {
    constructor(baseColor, hw, wall) {
      this.base = baseColor;   // 磨砂玻璃基色
      this.hw = hw;            // 外半宽
      this.wall = wall;        // 壁厚
      this.ihw = hw - wall;    // 内半宽（水区边界）
      this.hits = 0;           // 受击次数
      this.imp = [];           // 击点蜘蛛网裂纹
    }
    // 受击：外壳开裂（多点多枝树状发散）+ 第 2 下起掉玻璃渣
    onHit(x, y, world) {
      this.hits++;
      const hw = this.hw;
      // 每次受击生成 1-2 个击点（避免太密）
      const nImp = 1 + ((Math.random() * 2) | 0);
      let ret = { x: 0, y: 0 };
      for (let ip = 0; ip < nImp; ip++) {
        const eg = hw * 0.85;
        const edge = (Math.random() * 4) | 0;
        let ix, iy;
        if (edge === 0) { ix = (Math.random() * 2 - 1) * hw * 0.5; iy = -eg; }
        else if (edge === 1) { ix = (Math.random() * 2 - 1) * hw * 0.5; iy = eg; }
        else if (edge === 2) { ix = -eg; iy = (Math.random() * 2 - 1) * hw * 0.5; }
        else { ix = eg; iy = (Math.random() * 2 - 1) * hw * 0.5; }
        // 树状发散：多枝，每枝末端再分叉成更多小枝（多级树状）
        const lines = [];
        const main = 3 + ((Math.random() * 3) | 0);
        for (let m = 0; m < main; m++) {
          const a0 = (m / main) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          this._grow(lines, ix, iy, a0, hw * (0.5 + Math.random() * 0.5), 2);
        }
        this.imp.push({ x: ix, y: iy, growth: 0.1, maxLen: hw * (0.6 + Math.random() * 0.4), lines });
        ret = { x: ix, y: iy };
        // 第 2 下起：玻璃渣真实脱落（外壳属性）
        if (this.hits >= 2) {
          world.spawnParticles(x + ix, y + iy, {
            count: 5 + ((Math.random() * 4) | 0),
            colors: ['#dfe8f2', '#c3cfdf', '#f0f5fb', '#ffffff'],
            speed: 120, speedVar: 80, size: 1.7, sizeVar: 1.6,
            gravity: 320, drag: 0.95, life: 0.7, glow: false,
          });
        }
      }
      return ret;   // 返回击点（局部坐标），供内部水受击冲起
    }
    // 树状生长：一条枝（带轻微抖动），末端向两侧分叉成 2 条更短的枝（发散，不重叠）
    _grow(lines, x0, y0, ang, len, depth) {
      const pts = [[x0, y0]];
      let cx = x0, cy = y0, a = ang;
      const segs = 4;
      for (let s = 0; s < segs; s++) {
        a += (Math.random() - 0.5) * 0.35;   // 轻微抖动（纤细真实）
        const d = len / segs;
        cx += Math.cos(a) * d;
        cy += Math.sin(a) * d;
        pts.push([cx, cy]);
      }
      lines.push(pts);
      if (depth > 0) {
        // 分叉：向主方向两侧发散（不交叉重叠）
        const spread = 0.5 + Math.random() * 0.5;
        this._grow(lines, cx, cy, a + spread, len * 0.55, depth - 1);
        this._grow(lines, cx, cy, a - spread, len * 0.55, depth - 1);
      }
    }
    // 绘制玻璃瓶身（磨砂 80%，散射内部水光，壁厚 + 反光）
    drawBody(ctx, x, y, hw, tint) {
      const ihw = this.ihw;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - hw, y - hw, hw * 2, hw * 2, hw * 0.12);
      else ctx.rect(x - hw, y - hw, hw * 2, hw * 2);
      const glass = ctx.createLinearGradient(0, y - hw, 0, y + hw);
      glass.addColorStop(0, hexA(lighten(this.base, 0.2), 0.5));
      glass.addColorStop(0.5, hexA(lighten(tint, 0.35), 0.32));
      glass.addColorStop(1, hexA(tint, 0.5));
      ctx.fillStyle = glass;
      ctx.fill();
      // 内壁（壁厚）
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - ihw, y - ihw, ihw * 2, ihw * 2, ihw * 0.1);
      else ctx.rect(x - ihw, y - ihw, ihw * 2, ihw * 2);
      ctx.strokeStyle = hexA(lighten(this.base, 0.4), 0.35);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 外框
      ctx.strokeStyle = hexA(lighten(this.base, 0.5), 0.8);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // 顶部反光条
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x - hw * 0.8, y - hw * 0.82, hw * 1.6, hw * 0.14);
    }
    // 绘制裂纹（多枝树状，clip 到瓶身内，深色明显）
    drawCracks(ctx, x, y, hw, crack, dt) {
      if (!this.imp.length || crack <= 0.02) return;
      ctx.save();
      // 裁剪到整块玻璃内
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - hw, y - hw, hw * 2, hw * 2, hw * 0.12);
      else ctx.rect(x - hw, y - hw, hw * 2, hw * 2);
      ctx.clip();
      ctx.strokeStyle = hexA('#7a8ca9', 0.5 * crack);   // 细淡灰，真实不挡
      ctx.lineWidth = 0.8 + crack * 0.6;            // 纤细发丝裂痕
      for (const imp of this.imp) {
        imp.growth = Math.min(1, imp.growth + dt * 1.6);
        const g = imp.growth;
        // 树状多枝：每枝按 growth 从击点向外延长
        for (const pts of imp.lines) {
          ctx.beginPath();
          ctx.moveTo(x + imp.x, y + imp.y);
          for (let p = 1; p < pts.length; p++) {
            const fx2 = (pts[p][0] - imp.x) / imp.maxLen;
            const fy2 = (pts[p][1] - imp.y) / imp.maxLen;
            ctx.lineTo(x + imp.x + fx2 * imp.maxLen * g, y + imp.y + fy2 * imp.maxLen * g);
          }
          ctx.stroke();
        }
        // 高光刻痕（细亮，凹槽感）
        ctx.strokeStyle = hexA('#f4f8ff', 0.3 * crack);
        ctx.lineWidth = 0.5;
        for (const pts of imp.lines) {
          ctx.beginPath();
          ctx.moveTo(x + imp.x + 0.6, y + imp.y + 0.6);
          for (let p = 1; p < pts.length; p++) {
            const fx2 = (pts[p][0] - imp.x) / imp.maxLen;
            const fy2 = (pts[p][1] - imp.y) / imp.maxLen;
            ctx.lineTo(x + imp.x + fx2 * imp.maxLen * g + 0.6, y + imp.y + fy2 * imp.maxLen * g + 0.6);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Entities = window.ZS.Entities || {};
  window.ZS.Entities.GlassShell = GlassShell;
})();