/**
 * entities/appearance.js — 外观合并工具
 * 把「默认外观 + 风格主题覆盖 + 实体自定义」合并并补全所有外观字段，
 * 保证任何外观属性都存在（不丢失）。
 * 外观字段固定：color, stroke, glow, highlight, core, eyes, eyeColor, gunColor(仅玩家)。
 * 通过 window.ZS.Entities.Appearance 暴露。
 */
(function () {
  // 外观字段默认值（兜底，确保无 undefined）
  const DEFAULTS = {
    color: '#ffffff',
    stroke: 'rgba(0,0,0,0.45)',
    glow: null,
    highlight: null,
    core: '#ffffff',
    eyes: true,
    eyeColor: '#1a1a24',
    gunColor: null,      // 仅玩家
  };

  const Appearance = {
    // 合并并补全：base(实体默认外观) + theme(风格主题对应项) + extra(实体自定义)
    merge(baseAppearance, theme, extra) {
      const out = Object.assign({}, DEFAULTS);
      if (baseAppearance) Object.assign(out, baseAppearance);
      if (theme) Object.assign(out, theme);
      if (extra) Object.assign(out, extra);
      return out;
    },
    // 深拷贝外观
    clone(a) {
      return a ? Object.assign({}, a) : Object.assign({}, DEFAULTS);
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Entities = window.ZS.Entities || {};
  window.ZS.Entities.Appearance = Appearance;
})();