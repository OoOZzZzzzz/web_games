/**
 * systems/fx.js — 特效系统（FX）
 * 集中管理所有画布特效：注册表(renderers) + 工厂(add) + 统一绘制(draw)。
 * 新增特效类型 = FX.register(type, renderer)，无需改其它系统。
 * 通过 window.ZS.Systems.FX 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const Data = window.ZS.Data;

  // 十六进制 + alpha → rgba
  function hexA(hex, a) {
    const s = String(hex || '').replace('#', '');
    const full = s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s;
    const n = parseInt(full, 16);
    if (isNaN(n)) return `rgba(255,255,255,${a})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  const renderers = {};

  const FX = {
    hexA,
    register(type, renderer) { renderers[type] = renderer; return this; },
    // 创建特效（补默认 life/max）
    add(world, type, data) {
      const fx = Object.assign({ type }, data);
      if (fx.life === undefined) fx.life = 0.5;
      if (fx.max === undefined) fx.max = fx.life;
      world.addFx(fx);
      return fx;
    },
    // 统一绘制所有特效
    draw(ctx, world) {
      const t = world.elapsed;
      const w = world.width, h = world.height;
      for (const fx of world.effects) {
        // 兜底：max 未设时等于 life，避免 life/max = NaN
        if (fx.max == null) fx.max = fx.life || 0.5;
        const fn = renderers[fx.type];
        if (fn) fn(ctx, fx, world, t, w, h);
      }
    },

    // ===================== 屏幕反馈 / 粒子工厂（Juice） =====================

    // 屏幕震动（短、衰减、幅度小）
    shake(world, dur = 0.15, mag = 4) {
      world.shake.t = 0;
      world.shake.dur = dur;
      world.shake.mag = mag;
    },
    // 顿帧（命中瞬间极短停顿）
    freeze(world, s = 0.06) { if (world.freeze < s) world.freeze = s; },
    // 白闪（全屏瞬时白，0..1）
    flash(world, amt = 0.5) { if (world.flash < amt) world.flash = amt; },

    // 物理粒子群（封装 world.spawnParticles）
    burst(world, x, y, opts) { world.spawnParticles(x, y, opts); },

    // 当前震动偏移量（render 用）：衰减的随机偏移
    shakeOffset(world) {
      const s = world.shake;
      if (s.dur <= 0) return { x: 0, y: 0 };
      const k = 1 - (s.t / s.dur);
      if (k <= 0) { s.dur = 0; return { x: 0, y: 0 }; }
      return {
        x: (Math.random() - 0.5) * 2 * s.mag * k,
        y: (Math.random() - 0.5) * 2 * s.mag * k,
      };
    },
  };

  // ===================== 注册各特效渲染器 =====================

  // 浮动文字（暴击/技能名）
  FX.register('text', (ctx, fx) => {
    ctx.font = `bold ${fx.size || 15}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = fx.color; ctx.shadowBlur = 6;
    ctx.fillStyle = fx.color; ctx.globalAlpha = Math.min(1, fx.life * 1.2);
    ctx.fillText(fx.str, fx.x, fx.y);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  });

  // 爆炸：3D 立体火球（体积光晕 + 分层明暗 + 高光 rim + 冲击环）。物理余烬/烟在触发处生成
  FX.register('explosion', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);       // 1 → 0
    const ease = 1 - Math.pow(1 - a, 3);           // ease-out 快速扩张后缓退
    const r = fx.r || 70;
    const x = fx.x, y = fx.y;
    const radius = r * (0.4 + ease * 0.7);         // 火球半径
    const fad = a;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. 体积光晕（外圈透亮）
    const halo = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 1.6);
    halo.addColorStop(0, hexA('#ffb300', 0.35 * fad));
    halo.addColorStop(1, hexA('#ff4500', 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, radius * 1.6, 0, Math.PI * 2); ctx.fill();

    // 2. 立体火球：顶部白热 → 中焰 → 暗红边（径向渐变，光源偏左上 → 3D 体积）
    const body = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.28, radius * 0.08, x, y, radius);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.22, '#fff3c4');
    body.addColorStop(0.5, '#ff9d2e');
    body.addColorStop(0.78, '#ff5722');
    body.addColorStop(1, '#6e1a0c');
    ctx.globalAlpha = fad;
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();

    // 3. 高光 rim（球体边缘亮环 → 立体感）
    ctx.globalAlpha = fad * 0.75;
    ctx.strokeStyle = hexA('#ffd180', 1);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, radius * 0.98, 0, Math.PI * 2); ctx.stroke();

    // 4. 冲击环（扩张 + 淡出）
    ctx.globalAlpha = fad;
    ctx.strokeStyle = hexA('#ff7043', 0.8);
    ctx.lineWidth = 1.5 + (1 - a) * 2;
    ctx.beginPath(); ctx.arc(x, y, radius * (1.25 + (1 - a) * 0.4), 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;
  });

  // 闪电：多段锯齿电弧 + 双层辉光 + 末端电火花
  FX.register('lightning', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const dx = fx.x2 - fx.x1, dy = fx.y2 - fx.y1;
    const dist = Math.hypot(dx, dy) || 1;
    const seg = Math.max(4, Math.floor(dist / 26));
    // 锯齿电弧路径
    const bolt = (w, blur, color) => {
      ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.shadowColor = '#ffe082'; ctx.shadowBlur = blur;
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1);
      for (let i = 1; i < seg; i++) {
        const t = i / seg;
        ctx.lineTo(fx.x1 + dx * t + (Math.random() - 0.5) * 20, fx.y1 + dy * t + (Math.random() - 0.5) * 20);
      }
      ctx.lineTo(fx.x2, fx.y2);
      ctx.stroke();
    };
    bolt(5, 16, hexA('#fff', a * 0.4));          // 外层辉光
    bolt(2, 6, hexA('#fff8e0', a));              // 亮核
    ctx.shadowBlur = 0;
    // 末端电火花
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < 4; i++) {
      const ang = base + (Math.random() - 0.5) * 1.8;
      ctx.beginPath(); ctx.arc(fx.x2 + Math.cos(ang) * 6, fx.y2 + Math.sin(ang) * 6, 1.7 * a + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = hexA('#ffe082', a); ctx.fill();
    }
  });

  // 枪口闪光：亮核 + 沿枪口的十字光芒
  FX.register('muzzle', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const ang = fx.ang || 0;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 - a * 0.6), 0, Math.PI * 2);
    ctx.fillStyle = hexA('#ffe082', a * 0.9); ctx.fill();
    ctx.save();
    ctx.translate(fx.x, fx.y); ctx.rotate(ang);
    ctx.strokeStyle = hexA('#fff', a * 0.8); ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-fx.r * 1.6, 0); ctx.lineTo(fx.r * 1.6, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -fx.r * 0.6); ctx.lineTo(0, fx.r * 0.6); ctx.stroke();
    ctx.restore();
  });

  // 粒子爆散：减速 + 辉光 + 曳尾（死亡/暴击/出生/回血）
  FX.register('burst', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const ease = 1 - Math.pow(1 - a, 2.4);   // ease-out 减速
    const N = fx.count || 12;
    const rot = fx.rot || 0;
    ctx.save();
    ctx.shadowColor = fx.color; ctx.shadowBlur = 8;
    for (let i = 0; i < N; i++) {
      const seg = i / N;
      const ang = (fx.baseAng || 0) + seg * Math.PI * 2 + rot;
      const dist = seg * fx.speed * ease;
      const px = fx.x + Math.cos(ang) * dist;
      const py = fx.y + Math.sin(ang) * dist;
      ctx.beginPath(); ctx.arc(px - Math.cos(ang) * 4, py - Math.sin(ang) * 4, 1.2 * a, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a * 0.4); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, (2.6 + seg * 1.4) * a + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a); ctx.fill();
    }
    ctx.restore();
  });

  // BOSS 登场冲击波
  FX.register('shockwave', (ctx, fx, world, t, w, h) => {
    const a = Math.max(0, fx.life / fx.max);
    ctx.beginPath(); ctx.arc(w / 2, h / 2, (1 - a) * fx.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,87,34,${a})`;
    ctx.lineWidth = 3 + (1 - a) * 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, (1 - a) * fx.r * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,180,60,${a * 0.7})`; ctx.lineWidth = 2; ctx.stroke();
  });

  // BOSS 警告横幅
  FX.register('warning', (ctx, fx, world, t, w, h) => {
    const a = Math.min(1, fx.life);
    const boss = Data.bosses[Object.keys(Data.bosses)[0]];
    ctx.textAlign = 'center';
    ctx.font = 'bold 60px sans-serif';
    ctx.shadowColor = '#ff5722'; ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255,87,34,${a * 0.6})`;
    ctx.fillText('⚠', w / 2, h / 2 - 60);
    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = `rgba(255,50,40,${a})`;
    ctx.fillText(boss.warnText || '⚠ BOSS 降临！', w / 2, h / 2);
    ctx.shadowBlur = 0;
  });

  // 粒子流（汲取回血）：辉光粒子 + 头尾拖影，源→目标流动
  FX.register('stream', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const flow = fx.flow || 0;
    const N = fx.count || 10;
    ctx.save();
    ctx.shadowColor = fx.color; ctx.shadowBlur = 8;
    for (let i = 0; i < N; i++) {
      const t = ((i / N) + flow) % 1;
      const px = fx.x1 + (fx.x2 - fx.x1) * t;
      const py = fx.y1 + (fx.y2 - fx.y1) * t;
      // 头尾拖影
      ctx.beginPath(); ctx.arc(px - 5, py - 5, 1.4 * a, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a * 0.4); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 2.4 * a + 0.7, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a); ctx.fill();
    }
    ctx.restore();
  });

  // 火花爆散：减速 + 辉光（暴击/多重弹/雷电）
  FX.register('spark', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    const ease = 1 - Math.pow(1 - a, 2);
    const N = fx.count || 8;
    ctx.save();
    ctx.shadowColor = fx.color; ctx.shadowBlur = 6;
    for (let i = 0; i < N; i++) {
      const ang = (fx.baseAng || 0) + (i / N) * Math.PI * 2 + (i % 2) * 0.5;
      const dist = (1 - ease) * fx.speed;
      const px = fx.x + Math.cos(ang) * dist;
      const py = fx.y + Math.sin(ang) * dist;
      ctx.beginPath(); ctx.arc(px, py, 2.3 * a + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fx.color, a); ctx.fill();
    }
    ctx.restore();
  });

  // 脉动扩散环（选技/回血）
  FX.register('ring', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 - a) + 4, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(fx.color, a); ctx.globalAlpha = a;
    ctx.lineWidth = 2 + (1 - a) * 3; ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // 直线光迹（穿透余像）
  FX.register('streak', (ctx, fx) => {
    const a = Math.max(0, fx.life / fx.max);
    ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2);
    ctx.strokeStyle = hexA(fx.color, a); ctx.globalAlpha = a;
    ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  });

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.FX = FX;
})();