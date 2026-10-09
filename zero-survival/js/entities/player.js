/**
 * entities/player.js — 玩家实体类（OOP 封装）
 * 封装基础数值 + 外观(appearance) + 子弹皮肤(bulletStyle，预留可选)。
 * applyStyle(theme) 应用风格主题换外观。
 * 通过 window.ZS.Entities.Player 暴露。
 */
(function () {
  const Entity = window.ZS.Entities.Entity;
  const Appearance = window.ZS.Entities.Appearance;
  const PLAYER = window.ZS.Data.player;

  class Player extends Entity {
    constructor(styleTheme) {
      super({ radius: PLAYER.radius });
      // 基础数值（技能加成由系统动态计算）
      this.hp = PLAYER.maxHp;
      this.maxHp = PLAYER.maxHp;
      this.baseMoveSpeed = PLAYER.moveSpeed;
      this.baseFireRate = PLAYER.fireRate;
      this.baseDamage = PLAYER.attackDamage;
      this.moveSpeed = PLAYER.moveSpeed;
      this.attackDamage = PLAYER.attackDamage;
      this.fireRate = PLAYER.fireRate;
      this.invulnTimer = 0;
      this.hurtFlash = 0;
      this.aim = { x: 1, y: 0 };
      // 外观：基础外观 + 风格主题(player)
      this.appearance = Appearance.merge(PLAYER.appearance, (styleTheme && styleTheme.player) || null, {});
      // 子弹皮肤（默认 gold，预留后续可选/换皮肤）
      this.bulletStyle = 'gold';
    }

    // 应用风格主题（换本局外观）
    applyStyle(styleTheme) {
      this.appearance = Appearance.merge(PLAYER.appearance, (styleTheme && styleTheme.player) || null, {});
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Entities = window.ZS.Entities || {};
  window.ZS.Entities.Player = Player;
})();