/**
 * systems/spawn.js — 怪物系统（刷新节奏 + 类型挑选 + 移动 + 接触伤害）
 * 刷新间隔随等级缩短、同屏上限随等级提升；精英 Lv6 起小概率刷新。
 * 通过 window.ZS.Systems.Spawn 暴露。
 */
(function () {
  const Data = window.ZS.Data;
  const System = window.ZS.Core.System;
  const Combat = window.ZS.Systems.Combat;

  class Spawn extends System {
    constructor() {
      super({ name: 'Spawn' });
    }
    update(world, dt) {
      if (world.phase !== 'battle') return;
      this._updateSpawn(world, dt);
      this._updateEnemies(world, dt);
    }

    // 刷新节奏
    _updateSpawn(world, dt) {
      const lv = world.level;
      const sc = Data.scaling.spawn;
      const interval = Math.max(sc.minInterval, sc.baseInterval - lv * sc.intervalPerLv);
      const maxEnemies = sc.baseMaxEnemies + lv * sc.maxEnemiesPerLv;
      world.spawnTimer -= dt;
      if (world.spawnTimer <= 0) {
        world.spawnTimer = interval;
        if (world.enemies.length < maxEnemies) this._spawnOne(world);
      }
    }

    _spawnOne(world) {
      const typeId = this._pickType(world);
      const scaled = window.ZS.Systems.Scaling.monster(world, typeId);
      world.spawnEnemy(typeId, scaled);
    }

    // 挑选怪物类型：低级怪权重更高，精英 Lv6 起小概率
    _pickType(world) {
      const lv = world.level;
      const normals = Data.monsterNormalIds.filter((id) => Data.monsters[id].unlockLv <= lv);
      if (normals.length === 0) return 'slime';
      const weights = normals.map((id) => 1 / (Data.monsters[id].unlockLv + 1));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let picked = normals[normals.length - 1];
      for (let i = 0; i < normals.length; i++) {
        r -= weights[i];
        if (r <= 0) { picked = normals[i]; break; }
      }
      if (lv >= Data.monsters.elite.unlockLv && Math.random() < Data.scaling.spawn.eliteChanceBase) {
        return 'elite';
      }
      return picked;
    }

    // 怪物向玩家移动 + 接触伤害
    _updateEnemies(world, dt) {
      const p = world.player;
      if (!p) return;
      for (let i = world.enemies.length - 1; i >= 0; i--) {
        const e = world.enemies[i];
        if (e.slowTimer > 0) e.slowTimer -= dt;
        if (e.hitFlash > 0) e.hitFlash -= dt;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        // bouncy（史莱姆）→ 贴地跳跃；其余 → 平滑滑行
        if (e.features && e.features.includes('bouncy')) {
          this._hopEnemy(world, e, p, dt, dx, dy, dist);
        } else {
          const spd = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;
          e.x += (dx / dist) * spd * dt;
          e.y += (dy / dist) * spd * dt;
          // 疾行虫：漂浮移动时拖出少量粒子尾迹（体现"快"）
          if (e.type === 'crawler' && Math.random() < 0.45) {
            world.spawnParticles(e.x - (dx / dist) * e.radius * 1.3, e.y - (dy / dist) * e.radius * 1.3, {
              count: 1, color: 'rgba(239,83,80,0.5)', speed: 8, size: 1.5, gravity: 0, drag: 0.9, life: 0.4, glow: false,
            });
          }
        }
        if (dist < e.radius + p.radius && p.invulnTimer <= 0) {
          Combat.hurtPlayer(world, e.damage, dx, dy, dist);
        }
      }
    }

    // 史莱姆贴地跳跃（丝滑版）：起跳→空中抛物线→落地软压→再跳
    // 水平位移用 sin 缓动（起跳/落地柔和、中途最利落），落地 squash 用 ease-out 弹回，
    // 每跳节奏微随机避免机械。计算 hopH/hopSX/hopSY 供渲染读取。
    _hopEnemy(world, e, p, dt, dx, dy, dist) {
      const hop = e.hop;
      e.hopT += dt;
      if (e.hopT >= (e.hopCycle || hop.cycle)) {
        e.hopT = 0;
        e.hopCycle = hop.cycle * (0.88 + Math.random() * 0.24);  // 每跳微调，自然
      }
      const cycle = e.hopCycle || hop.cycle;
      const ph = Math.min(1, e.hopT / cycle);    // 0..1 一跳
      const airFrac = hop.airFrac;
      const inAir = ph < airFrac;
      const t = inAir ? ph / airFrac : 1;        // 空中进度 0..1
      const h = Math.sin(Math.PI * t);           // 抛物线弧高 0..1
      // 空中水平位移：sin 缓动（ease-in-out），起跳/落地都柔和，中途最利落
      if (inAir) {
        const spd = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;
        const k = Math.sin(Math.PI * t) / airFrac;   // 峰值在弧顶
        e.x += (dx / dist) * spd * k * dt;
        e.y += (dy / dist) * spd * k * dt;
      }
      e.hopH = h;
      // 连续压缩/拉伸：起跳伸、空中挺、下落缓收、落地软压弹回（无硬跳变）
      if (inAir) {
        const rise = Math.cos(Math.PI * t);      // >0 上升 <0 下落
        e.hopSX = 1 - h * 0.16;                  // 空中略收窄（挺拔）
        e.hopSY = 1 + h * 0.4 + (rise > 0 ? h * 0.18 : 0);  // 上升更伸、下落缓收
      } else {
        const rec = (ph - airFrac) / (1 - airFrac);       // 落地恢复进度 0..1
        const easeOut = 1 - (1 - rec) * (1 - rec);        // 先快后慢，丝滑弹回
        const squash = (1 - easeOut) * 0.26;              // 刚落地最扁
        e.hopSX = 1 + squash * 1.05;
        e.hopSY = 1 - squash;
      }
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Spawn = Spawn;
})();