/**
 * systems/combat.js — 伤害结算 + 击杀 + 玩家受击
 * damageEnemy：对怪物造成伤害（含暴击提示），血尽调用 killEnemy。
 * killEnemy：击杀数+1、掉经验球、生命汲取回血、播音、发 KILL 事件。
 * hurtPlayer：玩家受击（减伤/无敌/击退/红闪/音效），血尽触发死亡。
 * 通过 window.ZS.Systems.Combat 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;
  const Sfx = window.ZS.Sfx;
  const bus = window.ZS.Events.bus;
  const EV = window.ZS.Events.EV;
  const skillCalc = window.ZS.Systems.skillCalc;

  const Combat = {
    // 对怪物造成伤害
    damageEnemy(world, e, dmg, isCrit = false) {
      e.hp -= dmg;
      e.hitFlash = 0.08;
      if (isCrit) world.addText(e.x, e.y, '暴击', '#ff7043');
      if (e.hp <= 0) this.killEnemy(world, e);
    },

    // 击杀怪物
    killEnemy(world, e) {
      const idx = world.enemies.indexOf(e);
      if (idx < 0) return;
      world.enemies.splice(idx, 1);
      world.kills++;
      Sfx.kill();
      world.spawnOrb(e.x, e.y, e.xp);
      // 生命汲取：击杀回血
      const ls = skillCalc.val(world, 'lifesteal');
      if (ls) {
        const p = world.player;
        p.hp = Math.min(p.maxHp, p.hp + ls);
      }
      bus.emit(EV.KILL, e);
    },

    // 玩家受击（减伤护甲 → 扣血 → 无敌/击退/红闪）
    hurtPlayer(world, amount, dx, dy, dist) {
      const p = world.player;
      const dmg = amount * skillCalc.armorMult(world);
      p.hp -= dmg;
      p.invulnTimer = CONFIG.player.invulnTime;
      p.hurtFlash = CONFIG.hit.flashTime;
      Sfx.hurt();
      bus.emit(EV.HURT, dmg);
      // 击退
      const kb = CONFIG.hit.knockback;
      p.x += (dx / dist) * kb;
      p.y += (dy / dist) * kb;
      const m = p.radius;
      p.x = Math.max(m, Math.min(world.width - m, p.x));
      p.y = Math.max(m, Math.min(world.height - m, p.y));
      if (p.hp <= 0) {
        p.hp = 0;
        window.ZS.Systems.Death.onDeath(world);
      }
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Combat = Combat;
})();