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
        const spd = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;
        e.x += (dx / dist) * spd * dt;
        e.y += (dy / dist) * spd * dt;
        if (dist < e.radius + p.radius && p.invulnTimer <= 0) {
          Combat.hurtPlayer(world, e.damage, dx, dy, dist);
        }
      }
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Spawn = Spawn;
})();