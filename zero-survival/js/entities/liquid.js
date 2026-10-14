/**
 * entities/liquid.js — 水（岩浆）对象：FLIP 粒子流体
 * 水 = 一堆粒子（总量守恒），受击时部分粒子被冲上内壁顶部、受重力自然落下。
 * 粒子间靠不可压缩斥力维持"水"的形态，空间哈希加速邻居查找。
 * 通过 window.ZS.Entities.Liquid 暴露。
 */
(function () {
  function hexA(hex, a) {
    const s = String(hex || '').replace('#', '');
    const full = s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s;
    const n = parseInt(full, 16);
    if (isNaN(n)) return `rgba(255,255,255,${a})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  class Liquid {
    constructor(color, ihw, eq = 0.55) {
      this.color = color;
      this.box = ihw;         // 内盒半宽（水区，正方）
      this.G = 460;           // 重力
      this.parts = [];
      // 初始化：底部 ~eq 高度内随机撒粒子（总量守恒，固定数量）
      const n = 160;
      const topY = -this.box * (eq * 2 - 1);   // 液面 y（+下 -上）
      for (let i = 0; i < n; i++) {
        const px = (Math.random() * 2 - 1) * this.box * 0.92;
        const py = topY + Math.random() * (this.box - topY);
        this.parts.push({ x: px, y: py, vx: 0, vy: 0 });
      }
      this.hash = new Map();
    }
    // 受击：冲击点附近的粒子被冲起（向上涌向顶部）+ 向两侧溅开
    hit(ix, iy, power) {
      const R = this.box * 0.8;
      for (const p of this.parts) {
        const dx = p.x - ix, dy = p.y - iy;
        const d = Math.hypot(dx, dy);
        if (d < R) {
          const f = 1 - d / R;
          p.vy -= power * f * 1.6;            // 上涌
          if (d > 0.001) {
            p.vx += (dx / d) * power * f * 0.8;   // 向两侧溅开
          } else {
            p.vx += (Math.random() - 0.5) * power;
          }
        }
      }
    }
    // 网格重建（空间哈希）
    _buildHash() {
      this.hash.clear();
      const r = this.box / 6;
      for (const p of this.parts) {
        const cx = Math.floor(p.x / r), cy = Math.floor(p.y / r);
        const key = cx + '_' + cy;
        const cell = this.hash.get(key);
        if (cell) cell.push(p);
        else this.hash.set(key, [p]);
      }
    }
    // 取某粒子的邻居（3x3 邻域）
    _neighbors(p) {
      const r = this.box / 6;
      const out = [];
      const cx = Math.floor(p.x / r), cy = Math.floor(p.y / r);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const cell = this.hash.get((cx + dx) + '_' + (cy + dy));
        if (cell) for (let i = 0; i < cell.length; i++) { const q = cell[i]; if (q !== p) out.push(q); }
      }
      return out;
    }
    // 更新：重力 + 外力求和(晃动) + 壁碰撞 + 不可压缩斥力
    update(dt, forceX, forceY) {
      const b = this.box;
      // 1. 重力 + 外力
      for (const p of this.parts) {
        p.vy += this.G * dt + forceY * dt;
        p.vx += forceX * dt;
      }
      // 2. 移动 + 壁碰撞
      for (const p of this.parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -b) { p.x = -b; p.vx = Math.abs(p.vx) * 0.35; }
        else if (p.x > b) { p.x = b; p.vx = -Math.abs(p.vx) * 0.35; }
        if (p.y > b) { p.y = b; p.vy = -Math.abs(p.vy) * 0.35; }
        else if (p.y < -b) { p.y = -b; p.vy = Math.abs(p.vy) * 0.35; }
      }
      // 3. 不可压缩：邻居太近 → 推挤分开（维持水密度）
      this._buildHash();
      const rest2 = (this.box / 7.2) * (this.box / 7.2) * 1.35;   // 粒子更密（水更细）
      const steps = 2;
      for (let s = 0; s < steps; s++) {
        for (const p of this.parts) {
          const nb = this._neighbors(p);
          for (let k = 0; k < nb.length; k++) {
            const q = nb[k];
            let dx = p.x - q.x, dy = p.y - q.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < rest2 && d2 > 0.0001) {
              const d = Math.sqrt(d2);
              const push = ((rest2 - d2) / (d * rest2)) * 0.5;
              dx /= d; dy /= d;
              p.x += dx * push; p.y += dy * push;
              q.x -= dx * push; q.y -= dy * push;
            }
          }
        }
      }
    }
    // 绘制：粒子叠加成发光水体 + 顶部亮水面
    draw(ctx, x, y) {
      const b = this.box;
      const rad = b / 21;   // 更细的粒子，接近水，无颗粒感
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // 先画一个底部"水体"衬底（让整体像一汪水）
      ctx.beginPath();
      ctx.moveTo(x - b, y + b);
      ctx.lineTo(x - b, y + b - b * 0.2);
      ctx.lineTo(x + b, y + b - b * 0.2);
      ctx.lineTo(x + b, y + b);
      ctx.closePath();
      ctx.fillStyle = hexA(this.color, 0.35);
      ctx.fill();
      // 粒子
      for (const p of this.parts) {
        ctx.beginPath();
        ctx.arc(x + p.x, y + p.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = hexA(this.color, 0.8);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Entities = window.ZS.Entities || {};
  window.ZS.Entities.Liquid = Liquid;
})();