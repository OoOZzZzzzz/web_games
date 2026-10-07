/**
 * systems/player.js — 玩家系统
 * 键盘/WASD 优先，其次鼠标跟随移动；更新无敌/红闪计时；边界限制。
 * 通过 window.ZS.Systems.Player 暴露。
 */
(function () {
  const Input = window.ZS.Input;
  const skillCalc = window.ZS.Systems.skillCalc;
  const System = window.ZS.Core.System;

  const DEAD_ZONE = 14; // 鼠标跟随死区

  class Player extends System {
    constructor() {
      super({ name: 'Player' });
    }
    update(world, dt) {
      const p = world.player;
      if (!p) return;
      // 计时
      if (p.invulnTimer > 0) p.invulnTimer -= dt;
      if (p.hurtFlash > 0) p.hurtFlash -= dt;

      // 移动：键盘优先
      const speed = skillCalc.effMoveSpeed(world);
      const axis = Input.moveAxis();
      if (axis.dx !== 0 || axis.dy !== 0) {
        const len = Math.hypot(axis.dx, axis.dy);
        const dx = axis.dx / len, dy = axis.dy / len;
        p.x += dx * speed * dt;
        p.y += dy * speed * dt;
        p.aim.x = dx;
        p.aim.y = dy;
      } else if (Input.mouse.active) {
        // 鼠标跟随：朝光标移动
        const mx = Input.mouse.x - p.x;
        const my = Input.mouse.y - p.y;
        const dist = Math.hypot(mx, my);
        if (dist > DEAD_ZONE) {
          const nx = mx / dist, ny = my / dist;
          p.x += nx * speed * dt;
          p.y += ny * speed * dt;
          p.aim.x = nx;
          p.aim.y = ny;
        }
      }

      // 边界
      const m = p.radius;
      p.x = Math.max(m, Math.min(world.width - m, p.x));
      p.y = Math.max(m, Math.min(world.height - m, p.y));
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Player = Player;
})();