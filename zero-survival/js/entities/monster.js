/**
 * entities/monster.js — 怪物实体类（OOP 封装）
 * 封装 类型/等级/数值(stats)/外观(appearance)/特性(features)/能力(abilities)。
 * 构造时用「解析后的怪物定义(def=resolveMonster)」实例化，外观全字段物化，属性不丢失。
 * applyTheme(theme) 应用风格主题(enemy 色调)换外观。
 * 通过 window.ZS.Entities.Monster 暴露。
 */
(function () {
  const Entity = window.ZS.Entities.Entity;
  const Appearance = window.ZS.Entities.Appearance;

  class Monster extends Entity {
    constructor(def, styleTheme) {
      super({ radius: def.radius });
      this.type = def.type || null;
      this.tier = def.tier;
      this.shape = def.shape;
      this.name = def.name;
      this.desc = def.desc || '';
      // 数值（stats 为模型基础值，运行时 hp/damage/speed 由 scaling 填充覆盖）
      this.stats = Object.assign({}, def.stats);
      this.features = def.features ? def.features.slice() : [];
      this.abilities = def.abilities ? def.abilities.slice() : [];
      this.onDeath = def.onDeath || null;
      // 外观：基础外观 + 风格主题(enemy)
      this.appearance = Appearance.merge(def.appearance, (styleTheme && styleTheme.enemy) || null, {});
      // 运行时数值（由 scaling 填充）
      this.hp = def.stats.hp;
      this.maxHp = def.stats.hp;
      this.damage = def.stats.damage;
      this.speed = def.stats.speed;
      this.xp = def.stats.xp;
    }

    // 由 typeId 解析并实例化
    static fromData(typeId, styleTheme) {
      const def = window.ZS.Data.resolveMonster(typeId);
      def.type = typeId;
      return new Monster(def, styleTheme);
    }

    // 应用风格主题（换外观）
    applyTheme(styleTheme) {
      this.appearance = Appearance.merge(
        window.ZS.Data.resolveMonster(this.type).appearance,
        (styleTheme && styleTheme.enemy) || null,
        {}
      );
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Entities = window.ZS.Entities || {};
  window.ZS.Entities.Monster = Monster;
})();