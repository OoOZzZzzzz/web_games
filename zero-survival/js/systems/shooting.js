/**
 * systems/shooting.js — 自动瞄准 + 普攻发射 + 子弹飞行命中
 * 发射含多重弹扇形；命中触发爆裂弹/雷电链（回调 skills 系统）。
 * 通过 window.ZS.Systems.Shooting 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const SKILL_MAP = window.ZS.Data.SKILL_MAP;
  const System = window.ZS.Core.System;
  const skillCalc = window.ZS.Systems.skillCalc;
  const Combat = window.ZS.Systems.Combat;

  class Shooting extends System {
    constructor() {
      super({ name: 'Shooting' });
    }
    update(world, dt) {
      if (!world.player || world.phase !== 'battle') return;
      this._tryFire(world, dt);
      this._updateBullets(world, dt);
    }

    // 冷却到点自动朝最近敌人开火（含多重弹）
    _tryFire(world, dt) {
      world.fireTimer -= dt;
      if (world.fireTimer > 0) return;
      const p = world.player;
      const target = this._nearest(world);
      let ang;
      if (target) {
        ang = Math.atan2(target.y - p.y, target.x - p.x);
        p.aim.x = Math.cos(ang);
        p.aim.y = Math.sin(ang);
      } else {
        ang = Math.atan2(p.aim.y, p.aim.x);
      }
      this._fire(world, ang);
      // 多重弹：主方向扇形散开
      const extra = skillCalc.val(world, 'multiShot') || 0;
      const spread = SKILL_MAP.multiShot.effect.spread;
      for (let i = 0; i < extra; i++) {
        const off = (i % 2 === 0 ? 1 : -1) * (Math.ceil((i + 1) / 2) * spread);
        this._fire(world, ang + off);
      }
      world.fireTimer = 1 / skillCalc.effFireRate(world);
    }

    // 生成一发子弹（含穿透、暴击上色）+ 枪口闪光
    _fire(world, ang) {
      const { amount, isCrit } = skillCalc.bulletDamage(world);
      const pierce = skillCalc.val(world, 'pierce') || 0;
      world.spawnBullet(world.player.x, world.player.y, ang, {
        damage: amount,
        isCrit,
        pierceLeft: pierce === Infinity ? Infinity : pierce,
      });
      // 枪口闪光
      const p = world.player;
      world.addFx({
        type: 'muzzle',
        x: p.x + Math.cos(ang) * (p.radius + 10),
        y: p.y + Math.sin(ang) * (p.radius + 10),
        r: 9, life: 0.08, max: 0.08,
      });
    }

    // 索敌范围内最近敌人
    _nearest(world) {
      const p = world.player;
      const r2 = CONFIG.attack.reticleRange * CONFIG.attack.reticleRange;
      let best = null, bestD2 = r2;
      for (const e of world.enemies) {
        const dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = e; }
      }
      return best;
    }

    // 子弹飞行 + 命中
    _updateBullets(world, dt) {
      for (let i = world.bullets.length - 1; i >= 0; i--) {
        const b = world.bullets[i];
        b.life -= dt;
        if (b.life <= 0) { world.bullets.splice(i, 1); continue; }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const m = 24;
        if (b.x < -m || b.x > world.width + m || b.y < -m || b.y > world.height + m) {
          world.bullets.splice(i, 1);
          continue;
        }
        let consumed = false;
        for (let j = world.enemies.length - 1; j >= 0; j--) {
          const e = world.enemies[j];
          if (b.hitIds.has(e)) continue;
          const dx = e.x - b.x, dy = e.y - b.y;
          const rr = e.radius + b.radius;
          if (dx * dx + dy * dy < rr * rr) {
            Combat.damageEnemy(world, e, b.damage, b.isCrit);
            window.ZS.Systems.explodeAt(world, b.x, b.y);          // 爆裂弹
            window.ZS.Systems.triggerLightning(world, b.x, b.y, e); // 雷电链
            b.hitIds.add(e);
            if (b.pierceLeft > 0) b.pierceLeft--;
            else { consumed = true; break; }
          }
        }
        if (consumed) world.bullets.splice(i, 1);
      }
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Shooting = Shooting;
})();