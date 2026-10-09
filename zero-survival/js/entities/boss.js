/**
 * entities/boss.js — BOSS 实体类（OOP 封装，继承 Monster）
 * 额外封装 BOSS 专属：skills(技能表) / warnText(登场警告) / abilities(能力)。
 * 通过 window.ZS.Entities.Boss 暴露。
 */
(function () {
  const Monster = window.ZS.Entities.Monster;

  class Boss extends Monster {
    constructor(def, styleTheme) {
      super(def, styleTheme);
      this.skills = def.skills ? def.skills.slice() : [];
      this.warnText = def.warnText || '';
      this.type = def.type || 'boss';
      this.bossId = def.id || def.type || null;
    }

    static fromData(bossId, styleTheme) {
      const def = window.ZS.Data.resolveBoss(bossId);
      def.id = bossId;
      def.type = 'boss';
      return new Boss(def, styleTheme);
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Entities = window.ZS.Entities || {};
  window.ZS.Entities.Boss = Boss;
})();