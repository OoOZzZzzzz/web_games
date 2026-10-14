/**
 * systems/render.js — 渲染系统（美术主体）
 * 全部画布绘制：背景/网格/粒子/玩家/怪物/子弹/飞刃/经验球/特效/准星。
 * 实体外观读取结构化 appearance，并应用本局风格主题(world.style)。
 * 通过 window.ZS.Systems.Render 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const Data = window.ZS.Data;
  const Input = window.ZS.Input;
  const System = window.ZS.Core.System;

  class Render extends System {
    constructor() {
      super({ name: 'Render' });
    }

    // 当前风格强调色（无则回退默认）
    _accent(world) {
      const th = (world.style && world.style.theme && world.style.theme.accent) || null;
      if (!th) return { glow: '#4fc3f7', orb: '#ffd54f', hpBar: '#e53935', xpBar: '#42a5f5' };
      return th;
    }

    draw(ctx, world) {
      if (!world || world.phase === 'menu') {
        if (world) this._drawAmbient(ctx, world);
        return;
      }
      const w = world.width, h = world.height;
      // 屏幕震动：整体平移战场
      const off = window.ZS.Systems.FX.shakeOffset(world);
      ctx.save();
      ctx.translate(off.x, off.y);
      this._drawBackground(ctx, w, h);
      this._drawGrid(ctx, w, h);
      this._drawParticles(ctx, world, 0.35);
      this._drawOrbs(ctx, world);
      this._drawAura(ctx, world);
      this._drawEnemies(ctx, world);
      this._drawBullets(ctx, world);
      this._drawBlades(ctx, world);
      this._drawEffects(ctx, world);
      this._drawSparks(ctx, world);
      this._drawPlayer(ctx, world);
      this._drawSkillPassives(ctx, world);
      ctx.restore();
      // 光标不随战场震动
      this._drawCursor(ctx, world);
      // 白闪（命中/爆炸瞬间全屏白）
      if (world.flash > 0.02) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, world.flash)})`;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // 物理特效粒子：加色混合(lighter 自带辉光) + 随 life 淡出/缩小（无逐颗 shadowBlur，性能优化）
    _drawSparks(ctx, world) {
      const sp = world.sparks;
      if (!sp || !sp.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of sp) {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.4, p.size * a), 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
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
        ctx.fillStyle = p.color; ctx.globalAlpha = alpha; ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    _drawAura(ctx, world) {
      const v = window.ZS.Systems.skillCalc.val(world, 'flameAura');
      if (!v) return;
      const [, radius] = v;
      const p = world.player;
      const accent = this._accent(world).glow;
      const pulse = 1 + Math.sin(world.elapsed * 5) * 0.03;
      const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.3, p.x, p.y, radius * pulse);
      grad.addColorStop(0, 'rgba(255, 87, 34, 0.16)');
      grad.addColorStop(1, 'rgba(255, 87, 34, 0)');
      ctx.beginPath(); ctx.arc(p.x, p.y, radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = hexA(accent, 0.4); ctx.lineWidth = 2; ctx.stroke();
      // 浮动火焰粒子
      const t = world.elapsed;
      for (let i = 0; i < 7; i++) {
        const a = t * 0.9 + (i / 7) * Math.PI * 2;
        const rr = radius * (0.45 + 0.4 * Math.sin(t * 2 + i));
        const px = p.x + Math.cos(a) * rr;
        const py = p.y + Math.sin(a) * rr;
        ctx.beginPath(); ctx.arc(px, py, 2 + Math.sin(t * 5 + i) * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 140, 50, ${0.4 + 0.3 * Math.sin(t * 5 + i)})`; ctx.fill();
      }
    }

    // 玩家：发光核心 + 双层描边 + 炮管 + 护盾环（外观读取 appearance）
    _drawPlayer(ctx, world) {
      const p = world.player;
      if (!p) return;
      const a = p.appearance || Data.player.appearance;
      const { x, y, radius } = p;
      const t = world.elapsed;

      ctx.save();
      if (p.hurtFlash > 0) ctx.globalAlpha = 0.6;
      // 外辉光
      if (a.glow) { ctx.shadowColor = a.glow; ctx.shadowBlur = 16; }
      // 身体
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = a.color; ctx.fill();
      ctx.shadowBlur = 0;
      // 双层描边
      ctx.lineWidth = 3; ctx.strokeStyle = a.stroke;
      ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(x, y, radius - 2, 0, Math.PI * 2); ctx.stroke();
      // 内部核心
      ctx.beginPath(); ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = a.core; ctx.globalAlpha = (p.hurtFlash > 0 ? 0.5 : 0.85); ctx.fill();
      ctx.globalAlpha = p.hurtFlash > 0 ? 0.6 : 1;
      // 炮管（朝向）
      const ang = Math.atan2(p.aim.y, p.aim.x);
      ctx.strokeStyle = a.gunColor; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * radius * 0.5, y + Math.sin(ang) * radius * 0.5);
      ctx.lineTo(x + Math.cos(ang) * (radius + 8), y + Math.sin(ang) * (radius + 8));
      ctx.stroke();
      ctx.restore();

      // 无敌护盾环（呼吸）
      if (p.invulnTimer > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 30);
        ctx.beginPath(); ctx.arc(x, y, radius + 6 + pulse * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(t * 30)})`;
        ctx.lineWidth = 2; ctx.stroke();
      }
    }

    // 怪物：按 appearance 绘制（含辉光/眼睛/高光/血条主题色）
    _drawEnemies(ctx, world) {
      const p = world.player;
      if (!p) return;
      const accent = this._accent(world);
      for (const e of world.enemies) {
        const a = e.appearance || { color: e.color, eyes: true, eyeColor: '#1a1a24', stroke: 'rgba(0,0,0,0.45)' };
        const col = a.color;
        const isBoss = e.tier === 'boss';
        if (e.hitFlash > 0) ctx.globalAlpha = 0.6;
        if (a.glow) { ctx.shadowColor = a.glow; ctx.shadowBlur = isBoss ? 22 : 12; }

        // 史莱姆：原神风格专属绘制（圆滚滚 + 角冠 + 大眼 + 小脚）
        if (e.type === 'slime') {
          ctx.shadowBlur = 0;
          this._drawSlime(ctx, e, p, world);
          ctx.globalAlpha = 1;
          continue;
        }
        // 疾行虫：半椭圆圆顶 + 波浪底边（随移速波动）+ 漂浮
        if (e.type === 'crawler') {
          ctx.shadowBlur = 0;
          this._drawCrawler(ctx, e, p, world);
          ctx.globalAlpha = 1;
          continue;
        }
        // 重甲傀儡：磨砂玻璃瓶 + 主题色液体（岩浆/冰水等），液体随移动涌动
        if (e.type === 'golem') {
          ctx.shadowBlur = 0;
          this._drawGolem(ctx, e, p, world);
          ctx.globalAlpha = 1;
          continue;
        }

        if (e.shape === 'square') {
          ctx.fillStyle = col;
          ctx.fillRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
          // 内层
          ctx.fillStyle = isBoss ? 'rgba(0,0,0,0.35)' : hexA(col, 0.25);
          ctx.fillRect(e.x - e.radius * 0.6, e.y - e.radius * 0.6, e.radius * 1.2, e.radius * 1.2);
          ctx.strokeStyle = a.stroke || (isBoss ? '#ff5722' : 'rgba(0,0,0,0.45)');
          ctx.lineWidth = isBoss ? 3 : 2;
          ctx.strokeRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
        } else if (e.shape === 'ellipse') {
          ctx.beginPath(); ctx.ellipse(e.x, e.y, e.radius * 1.4, e.radius, 0, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
          // 内部核心
          ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = a.highlight || 'rgba(255,255,255,0.16)'; ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // 眼睛（看向玩家）
        if (a.eyes !== false && e.radius >= 8) {
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          const ex = Math.cos(ang) * e.radius * 0.3;
          const ey = Math.sin(ang) * e.radius * 0.3;
          const er = Math.max(1.5, e.radius * 0.13);
          const pr = Math.max(0.8, er * 0.5);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(e.x + ex - er * 1.2, e.y + ey - er * 0.8, er, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(e.x + ex + er * 1.2, e.y + ey - er * 0.8, er, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = a.eyeColor || '#1a1a24';
          ctx.beginPath(); ctx.arc(e.x + ex - er * 1.2 + Math.cos(ang) * pr, e.y + ey - er * 0.8 + Math.sin(ang) * pr, pr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(e.x + ex + er * 1.2 + Math.cos(ang) * pr, e.y + ey - er * 0.8 + Math.sin(ang) * pr, pr, 0, Math.PI * 2); ctx.fill();
        }

        // 精英/BOSS 血条（主题色）
        if (e.tier === 'elite' || isBoss) {
          const bw = e.radius * 2;
          const pct = Math.max(0, e.hp / e.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw, 5);
          ctx.fillStyle = isBoss ? (accent.hpBar || '#ff5722') : '#ab47bc';
          ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw * pct, 5);
        }
      }
    }

    // 史莱姆：淡色圆润圆丘 + 深色椭圆眼 + 变形弹跳 + 顶部高光，无地面黑影、底边圆角
    _drawSlime(ctx, e, p, world) {
      const r = e.radius;
      const x = e.x, y = e.y;
      const a = e.appearance || {};
      const col = a.color || '#66bb6a';
      // 跳跃状态由移动系统(hopEnemy)计算：hopH 高度0..1 / hopSX/hopSY 压缩拉伸
      const hopH = e.hopH || 0;
      const hopY = hopH * ((e.hop && e.hop.heightMul) || 0.95) * r;  // 离地高度
      const sx = e.hopSX || 1;
      const sy = e.hopSY || 1;
      ctx.save();
      ctx.translate(x, y - hopY);
      ctx.scale(sx, sy);
      ctx.globalAlpha = 1;                       // 不透明（避免半透明在深色底叠出黑圈）

      // 【暂注释】渐变/高光，先隔离是否为它们导致黑圈 —— 身体用纯色
      // const grad = ctx.createRadialGradient(0, -r * 0.5, r * 0.05, 0, -r * 0.15, r);
      // grad.addColorStop(0, lighten(col, 0.8));
      // grad.addColorStop(0.55, lighten(col, 0.25));
      // grad.addColorStop(1, col);
      ctx.fillStyle = col;   // 纯色身体
      // 圆润圆顶 + 圆角底边（半圆末端圆润，非锐利平切）
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r, 0, 0, Math.PI, true);            // 上半圆（圆顶）
      ctx.quadraticCurveTo(-r * 0.97, r * 0.32, -r * 0.55, r * 0.44);  // 左下圆角
      ctx.quadraticCurveTo(0, r * 0.58, r * 0.55, r * 0.44);          // 底部微弧
      ctx.quadraticCurveTo(r * 0.97, r * 0.32, r * 0.97, 0);          // 右下圆角
      ctx.closePath();
      ctx.fill();

      // 【暂注释】顶部高光
      // ctx.fillStyle = 'rgba(255,255,255,0.6)';
      // ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.5, r * 0.28, r * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();

      // 眼睛：读外观属性（数据驱动）→ 比淡肤色更深的同系绿、柔软清晰，不发黑
      const eyeCol = a.eyeColor || shade(col, 0.55);
      ctx.fillStyle = eyeCol;
      ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.26, r * 0.11, r * 0.17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.22, -r * 0.26, r * 0.11, r * 0.17, 0, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
      ctx.globalAlpha = 1;   // 无地面黑影
    }

    // 疾行虫：半椭圆纯色身形（不透明）+ 底边锯齿状圆角齿（随移速起伏）+ 数据驱动豆豆眼
    _drawCrawler(ctx, e, p, world) {
      const r = e.radius;
      const x = e.x, y = e.y;
      const a = e.appearance || {};
      const col = a.color || '#ef5350';
      const t = world.elapsed;
      const rx = r * 0.95, ry = r * 1.3;           // 半椭圆：沿短轴切（底窄、身高，不扁）
      const waveAmp = r * 0.17;                    // 蠕动幅度（明显）
      const waveFreq = 3 + (e.speed || 90) / 45;   // 蠕动快慢
      const phase = t * waveFreq;
      ctx.save();
      ctx.translate(x, y);
      // 身体：上半圆顶（不透明，纯色，同史莱姆）+ 锯齿状圆角齿底边（蠕动）
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI, true);   // 上半圆顶（右→上→左）
      const M = 8;                                      // 齿数
      const toothH = r * 0.3;                           // 齿突出高度
      for (let i = 0; i < M; i++) {
        const xl = -rx + (i / M) * (rx * 2);
        const xr = -rx + ((i + 1) / M) * (rx * 2);
        const cx = (xl + xr) / 2;
        // 底边蠕动：行进波沿身体爬（像虫足蠕动）+ 二次波，更有机
        const h = toothH + waveAmp * Math.sin(i * 1.5 - phase * 1.3) + waveAmp * 0.5 * Math.sin(i * 3.1 + phase * 0.7);
        ctx.quadraticCurveTo(cx, h, xr, 0);
      }
      ctx.closePath();
      ctx.fillStyle = col;   // 纯色全身，不透明
      ctx.fill();
      // 顶部高光（柔和，纯色不透明，仅提亮）
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.ellipse(-rx * 0.28, -ry * 0.5, rx * 0.28, ry * 0.14, -0.35, 0, Math.PI * 2); ctx.fill();
      // 眼睛：读外观属性（数据驱动），比肤色深一档，椭圆豆豆眼，和史莱姆一致
      const eyeCol = a.eyeColor || shade(col, 0.55);
      ctx.fillStyle = eyeCol;
      ctx.beginPath(); ctx.ellipse(-r * 0.22, -ry * 0.32, r * 0.11, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.22, -ry * 0.32, r * 0.11, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 重甲傀儡：玻璃外壳 + 内部水（岩浆），两个独立对象（各自属性）
    _drawGolem(ctx, e, p, world) {
      const r = e.radius;
      const x = e.x, y = e.y;
      const a = e.appearance || {};
      const tint = a.tint || a.color || '#ff8a50';
      const shell = a.color || '#cfd8dc';
      const t = world.elapsed;
      const hw = r;
      const wall = r * 0.3;
      const ihw = hw - wall;
      const dt = Math.min(0.05, Math.max(0.001, t - (e._lastT || t)));
      e._lastT = t;
      // 懒初始化两个独立对象（水 + 玻璃外壳）
      if (!e.liquid) e.liquid = new window.ZS.Entities.Liquid(tint, ihw);
      if (!e.shell) e.shell = new window.ZS.Entities.GlassShell(shell, hw, wall);
      const liquid = e.liquid;
      const shellObj = e.shell;
      // 容器加速度 → 水被带动（惯性，力反向，让水晃动）
      const vx = e.x - (e._px || e.x);
      const vy = e.y - (e._py || e.y);
      const accX = vx - (e._vx || 0);
      const accY = vy - (e._vy || 0);
      e._vx = vx; e._vy = vy; e._px = e.x; e._py = e.y;
      const forceX = -accX * 0.12;
      const forceY = -accY * 0.12;
      // 受击：水被冲击力冲起（FLIP，涌向内壁顶部再受重力落下）+ 外壳开裂 / 掉渣
      if (e.hp < (e._hp || e.hp)) {
        const dmg = (e._hp || e.hp) - e.hp;        // 本次受到的伤害
        const imp = shellObj.onHit(x, y, world);   // 返回击点（局部坐标）
        liquid.hit(imp.x, imp.y, ihw * (3 + dmg * 1.3));   // 晃动幅度随伤害增强
      }
      e._hp = e.hp;
      // 水更新（FLIP 粒子：重力 + 晃动 + 不可压缩斥力 + 壁碰）
      liquid.update(dt, forceX, forceY);
      // 绘制顺序：水 → 玻璃外壳 → 蜘蛛网裂纹（只在壁上，不遮水）
      const crack = Math.max(0, Math.min(1, 1 - e.hp / (e.maxHp || 1)));
      liquid.draw(ctx, x, y);
      shellObj.drawBody(ctx, x, y, hw, tint);
      shellObj.drawCracks(ctx, x, y, hw, crack, dt);
    }

    _drawBullets(ctx, world) {
      const skin = window.ZS.Data.resolveBulletStyle('gold'); // 兜底
      for (const b of world.bullets) {
        const sk = b.skin || skin;
        const ang = Math.atan2(b.vy, b.vx);
        const stre = (b.streak || 1) * b.radius;
        // 穿透余像：长光尾（半透明）
        if (b.streak > 1.5) {
          ctx.beginPath();
          ctx.moveTo(b.x - Math.cos(ang) * stre, b.y - Math.sin(ang) * stre);
          ctx.lineTo(b.x - Math.cos(ang) * (stre + 14), b.y - Math.sin(ang) * (stre + 14));
          ctx.strokeStyle = b.color; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (sk.glow) { ctx.shadowColor = sk.glow; ctx.shadowBlur = 10; }
        // 彗星状弹体：拖尾线 + 亮核（尾长随 streak）
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(ang) * b.radius, b.y + Math.sin(ang) * b.radius);
        ctx.lineTo(b.x - Math.cos(ang) * stre, b.y - Math.sin(ang) * stre);
        ctx.strokeStyle = b.color; ctx.lineWidth = b.radius; ctx.lineCap = 'round';
        ctx.stroke();
        ctx.shadowBlur = 0;
        // 亮核
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9; ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    _drawBlades(ctx, world) {
      for (const b of world.blades) {
        // 旋转光迹（尾迹点）
        ctx.beginPath(); ctx.arc(b.x - Math.cos(b.ang) * 7, b.y - Math.sin(b.ang) * 7, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,213,79,0.5)'; ctx.fill();
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.ang);
        ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(11, 0); ctx.lineTo(-6, -6); ctx.lineTo(-2, 0); ctx.lineTo(-6, 6); ctx.closePath();
        ctx.fillStyle = '#e8edf4'; ctx.fill();
        ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // 经验球：主题色 + 辉光 + 高光
    _drawOrbs(ctx, world) {
      const accent = this._accent(world);
      const col = accent.orb || CONFIG.orb.color;
      const t = world.elapsed;
      for (const o of world.orbs) {
        const pulse = 1 + Math.sin(t * 6 + o.x * 0.1) * 0.12;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.beginPath(); ctx.arc(o.x - o.r * 0.2, o.y - o.r * 0.25, o.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.orb.colorInner; ctx.fill();
      }
    }

    // 特效：由 FX 系统统一绘制（新增特效类型请注册到 systems/fx.js）
    _drawEffects(ctx, world) {
      window.ZS.Systems.FX.draw(ctx, world);
      return; // 旧内联分支已迁移至 systems/fx.js（以下为遗留，不执行）
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
          const boss = Data.bosses[Object.keys(Data.bosses)[0]];
          ctx.fillText(boss.warnText || '⚠ BOSS 降临！', w / 2, h / 2);
        } else if (fx.type === 'muzzle') {
          // 枪口闪光：快速扩张的圆环
          const a = Math.max(0, fx.life / fx.max);
          ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 - a * 0.6), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 224, 130, ${a * 0.8})`; ctx.fill();
        } else if (fx.type === 'burst') {
          // 死亡/出生粒子爆散
          const a = Math.max(0, fx.life / fx.max);
          for (let i = 0; i < fx.count; i++) {
            const seg = i / fx.count;
            const dist = seg * fx.speed * fx.life;
            const ang = fx.baseAng + seg * Math.PI * 2;
            ctx.beginPath(); ctx.arc(fx.x + Math.cos(ang) * dist, fx.y + Math.sin(ang) * dist, 2.2 * a + 0.5, 0, Math.PI * 2);
            ctx.fillStyle = fx.color; ctx.globalAlpha = a; ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (fx.type === 'shockwave') {
          // BOSS 登场冲击波
          const a = Math.max(0, fx.life / fx.max);
          ctx.beginPath(); ctx.arc(w / 2, h / 2, (1 - a) * fx.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 87, 34, ${a})`; ctx.lineWidth = 3 + (1 - a) * 6; ctx.stroke();
        } else if (fx.type === 'stream') {
          // 粒子流（如汲取回血）：源→目标流动
          const a = Math.max(0, fx.life / fx.max);
          const flow = fx.flow || 0;
          for (let i = 0; i < fx.count; i++) {
            const t = ((i / fx.count) + flow) % 1;
            const px = fx.x1 + (fx.x2 - fx.x1) * t;
            const py = fx.y1 + (fx.y2 - fx.y1) * t;
            ctx.beginPath(); ctx.arc(px, py, 2.2 * a + 0.6, 0, Math.PI * 2);
            ctx.fillStyle = fx.color; ctx.globalAlpha = a; ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (fx.type === 'spark') {
          // 火花爆散（爆裂/雷链/暴击）
          const a = Math.max(0, fx.life / fx.max);
          const spread = (1 - a) * fx.speed;
          for (let i = 0; i < fx.count; i++) {
            const ang = fx.baseAng + (i / fx.count) * Math.PI * 2 + (i % 2) * 0.5;
            ctx.beginPath(); ctx.arc(fx.x + Math.cos(ang) * spread, fx.y + Math.sin(ang) * spread, 2.2 * a + 0.4, 0, Math.PI * 2);
            ctx.fillStyle = fx.color; ctx.globalAlpha = a; ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (fx.type === 'ring') {
          // 脉动扩散环（选技/回血）
          const a = Math.max(0, fx.life / fx.max);
          ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 - a) + 4, 0, Math.PI * 2);
          ctx.strokeStyle = fx.color; ctx.globalAlpha = a; ctx.lineWidth = 2 + (1 - a) * 3; ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (fx.type === 'streak') {
          // 直线光迹（穿透余像）
          const a = Math.max(0, fx.life / fx.max);
          ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2);
          ctx.strokeStyle = fx.color; ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // 技能被动视觉：由 VisualSystem 按类别+属性调度（新增特效类别请注册到 visuals/）
    _drawSkillPassives(ctx, world) {
      window.ZS.Systems.VisualSystem.draw(ctx, world);
      return; // 旧内联分支已迁移至 visual-system.js + visuals/（以下为遗留，不执行）
      const p = world.player;
      if (!p) return;
      const lv = (id) => world.skills[id] || 0;
      const { x, y, radius } = p;
      const t = world.elapsed;
      const SKILL_MAP = window.ZS.Data.SKILL_MAP;

      // 减伤护甲：旋转护盾弧段
      if (lv('armor') > 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = 'rgba(180,205,220,0.95)';
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.shadowColor = '#b0bec5'; ctx.shadowBlur = 6;
        for (let i = 0; i < 3; i++) {
          const a0 = t * 0.9 + (i * Math.PI * 2) / 3;
          ctx.beginPath(); ctx.arc(0, 0, radius + 9, a0, a0 + 0.9); ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.restore();
      }
      // 攻击强化：力量红光环（辉光）
      if (lv('attackBoost') > 0) {
        const a = 0.3 + 0.2 * Math.sin(t * 4);
        ctx.save();
        ctx.shadowColor = '#ff5722'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,80,40,${a})`; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
      }
      // 迅捷：常驻环绕速度线
      if (lv('haste') > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(79,195,247,0.75)';
        ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const ang = t * 1.2 + (i * Math.PI * 2) / 3;
          const bx = x + Math.cos(ang) * (radius + 13);
          const by = y + Math.sin(ang) * (radius + 13);
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.cos(ang) * 10, by - Math.sin(ang) * 10); ctx.stroke();
        }
        ctx.restore();
      }
      // 暴击：玩家核心金色闪烁
      if (lv('crit') > 0) {
        ctx.beginPath(); ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,213,79,${0.5 + 0.4 * Math.sin(t * 8)})`; ctx.fill();
      }
      // 每个已拥有技能：一个环绕光点（明显提示技能已附着）
      const owned = Object.keys(world.skills);
      if (owned.length) {
        const r = radius + 16;
        owned.forEach((id, i) => {
          const sk = SKILL_MAP[id];
          const col = (sk && sk.visual && sk.visual.color) || '#ffd54f';
          const ang = t * 0.7 + (i / owned.length) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 3, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fill();
          ctx.globalAlpha = 1;
        });
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

  // 颜色转 rgba（支持 #rrggbb）
  function hexA(hex, alpha) {
    if (!hex) return 'rgba(255,255,255,' + alpha + ')';
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const num = parseInt(n, 16);
    if (isNaN(num)) return 'rgba(255,255,255,' + alpha + ')';
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
  }

  // 颜色明度调整：lighten 变亮(f>1)，shade 变暗(f<1)，用于史莱姆立体渐变
  function lighten(hex, f) {
    const s = String(hex || '').replace('#', '');
    const n = parseInt(s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s, 16);
    if (isNaN(n)) return '#fff';
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${g},${b})`;
  }
  function shade(hex, f) {
    const s = String(hex || '').replace('#', '');
    const n = parseInt(s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s, 16);
    if (isNaN(n)) return '#555';
    const r = Math.round(((n >> 16) & 255) * f);
    const g = Math.round(((n >> 8) & 255) * f);
    const b = Math.round((n & 255) * f);
    return `rgb(${r},${g},${b})`;
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Render = Render;
})();