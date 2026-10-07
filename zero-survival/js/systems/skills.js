/**
 * systems/skills.js — 技能数值计算 + 召唤物更新
 * skillCalc：各技能效果换算（攻速/移速/减伤/暴击/伤害/生命强化/飞刃），供 shooting/combat 复用。
 * Summon：召唤物系统（追踪飞刃、火焰光环）。雷电链触发函数 triggerLightning。
 * 通过 window.ZS.Systems.{skillCalc, Summon} 暴露。
 */
(function () {
  const SKILL_MAP = window.ZS.Data.SKILL_MAP;
  const PLAYER = window.ZS.Data.player;
  const System = window.ZS.Core.System;

  // ---- 技能数值计算 ----
  const skillCalc = {
    lv(world, id) { return world.skills[id] || 0; },
    val(world, id) {
      const lv = world.skills[id];
      if (!lv) return undefined;
      return SKILL_MAP[id].values[lv - 1];
    },
    // 有效攻击速度（急速射击）
    effFireRate(world) {
      const p = world.player;
      return p.baseFireRate * (1 + (this.val(world, 'rapidFire') || 0));
    },
    // 有效移动速度（迅捷）
    effMoveSpeed(world) {
      const p = world.player;
      return p.baseMoveSpeed * (1 + (this.val(world, 'haste') || 0));
    },
    // 减伤系数（1=无减伤）
    armorMult(world) { return 1 - (this.val(world, 'armor') || 0); },
    // 全攻击伤害倍率（攻击强化）
    dmgMult(world) { return 1 + (this.val(world, 'attackBoost') || 0); },
    // 暴击：返回 [是否暴击, 倍率]
    rollCrit(world) {
      const v = this.val(world, 'crit');
      if (!v) return [false, 1];
      const [ch, cd] = v;
      const is = Math.random() < ch;
      return [is, is ? 1 + cd : 1];
    },
    // 子弹单发伤害（含攻击强化 + 暴击）
    bulletDamage(world) {
      const base = world.player.baseDamage;
      const [is, m] = this.rollCrit(world);
      return { amount: base * this.dmgMult(world) * m, isCrit: is };
    },
    // 追踪飞刃单次伤害
    bladeDamage(world) {
      const v = this.val(world, 'blade');
      const base = SKILL_MAP.blade.baseDamage * (1 + (v ? v[1] : 0));
      return base * this.dmgMult(world);
    },
    // 生命强化：重算最大生命并补足差值
    applyVitality(world) {
      const p = world.player;
      const v = this.val(world, 'vitality') || 0;
      const nm = PLAYER.maxHp + v;
      if (nm > p.maxHp) p.hp += (nm - p.maxHp);
      p.maxHp = nm;
    },
    // 重排追踪飞刃数量（根据 blade 等级）
    rebuildBlades(world) {
      const v = this.val(world, 'blade');
      const count = v ? v[0] : 0;
      world.blades.length = 0;
      for (let i = 0; i < count; i++) {
        world.spawnBlade((Math.PI * 2 * i) / Math.max(1, count));
      }
    },
  };

  // ---- 追踪飞刃 + 火焰光环 系统 ----
  class Summon extends System {
    constructor() {
      super({ name: 'Summon' });
    }
    update(world, dt) {
      if (!world.player || world.phase !== 'battle') return;
      this._updateBlades(world, dt);
      this._updateAura(world, dt);
    }
    // 飞刃绕玩家旋转，攻击刃附近的敌人
    _updateBlades(world, dt) {
      const blades = world.blades;
      if (blades.length === 0) return;
      const p = world.player;
      const eff = SKILL_MAP.blade.effect;
      const orbitR = eff.orbitRadius;
      for (let i = blades.length - 1; i >= 0; i--) {
        const b = blades[i];
        b.ang += dt * 4.0;
        const bx = p.x + Math.cos(b.ang) * orbitR;
        const by = p.y + Math.sin(b.ang) * orbitR;
        b.x = bx; b.y = by;
        b.cd -= dt;
        if (b.cd > 0) continue;
        // 找刃范围内的最近敌人
        const r2 = eff.attackRange * eff.attackRange;
        let best = null, bestD2 = r2;
        for (const e of world.enemies) {
          const dx = e.x - bx, dy = e.y - by, d2 = dx * dx + dy * dy;
          if (d2 < bestD2) { bestD2 = d2; best = e; }
        }
        if (best) {
          window.ZS.Systems.Combat.damageEnemy(world, best, skillCalc.bladeDamage(world));
          b.cd = eff.cooldown;
          world.addText(bx, by, '✦', '#ffd54f');
        }
      }
    }
    // 火焰光环：持续灼烧环内敌人
    _updateAura(world, dt) {
      const v = skillCalc.val(world, 'flameAura');
      if (!v) return;
      const [dps, radius] = v;
      const p = world.player;
      const rr = radius * radius;
      for (const e of world.enemies) {
        const dx = e.x - p.x, dy = e.y - p.y;
        if (dx * dx + dy * dy < rr) {
          window.ZS.Systems.Combat.damageEnemy(world, e, dps * dt);
        }
      }
    }
  }

  // ---- 爆裂弹：命中点 AoE 爆炸（额外伤害 + 减速） ----
  function explodeAt(world, x, y) {
    const v = skillCalc.val(world, 'explosive');
    if (!v) return;
    const [bonus, radiusMul, slow] = v;
    const eff = SKILL_MAP.explosive.effect;
    const radius = eff.baseRadius * radiusMul;
    const rr = radius * radius;
    const dmg = world.player.baseDamage * skillCalc.dmgMult(world) * bonus;
    for (const e of world.enemies) {
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy < rr) {
        window.ZS.Systems.Combat.damageEnemy(world, e, dmg);
        if (slow > 0) e.slowTimer = Math.max(e.slowTimer, slow);
      }
    }
    world.addFx({ type: 'explosion', x, y, r: radius, life: 0.35 });
  }

  // ---- 雷电链：普攻命中概率触发连锁闪电 ----
  function triggerLightning(world, fromX, fromY, hitEnemy) {
    const v = skillCalc.val(world, 'chainLightning');
    if (!v) return;
    const [chance, chainCount, dmgBonus, stun] = v;
    if (Math.random() >= chance) return;
    const eff = SKILL_MAP.chainLightning.effect;
    const base = SKILL_MAP.chainLightning.baseDamage * (1 + dmgBonus) * skillCalc.dmgMult(world);
    // 从被命中敌人起链到最近敌人
    const targets = [hitEnemy];
    let prev = hitEnemy;
    for (let k = 0; k < chainCount; k++) {
      let best = null, bestD2 = eff.chainRange * eff.chainRange;
      for (const e of world.enemies) {
        if (targets.includes(e)) continue;
        const dx = e.x - prev.x, dy = e.y - prev.y, d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = e; }
      }
      if (!best) break;
      targets.push(best);
      prev = best;
    }
    // 绘制链段
    let px = fromX, py = fromY;
    for (const e of targets) {
      world.addFx({ type: 'lightning', x1: px, y1: py, x2: e.x, y2: e.y, life: 0.22 });
      px = e.x; py = e.y;
    }
    // 从第二个起造成伤害（第一个由子弹打中）
    for (let k = 1; k < targets.length; k++) {
      const e = targets[k];
      const dmg = base * Math.max(0.4, 1 - (k - 1) * 0.2);
      window.ZS.Systems.Combat.damageEnemy(world, e, dmg);
      if (stun > 0) e.slowTimer = Math.max(e.slowTimer, stun);
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.skillCalc = skillCalc;
  window.ZS.Systems.Summon = Summon;
  window.ZS.Systems.explodeAt = explodeAt;
  window.ZS.Systems.triggerLightning = triggerLightning;
})();