/**
 * data/uiMenu.js — 主菜单配置表（纯数据，驱动菜单/面板内容）
 * 所有菜单项、模式、场景、开发者面板标签都从这里声明，改动界面不改 JS 逻辑。
 * 通过 window.ZS.Data.uiMenu 暴露。
 */
(function () {
  const uiMenu = {
    version: 'v0.6.0',
    tagline: 'Rogue-Like · Vampire Survivors',

    // 主菜单底部面板项（除「开始游戏」主按钮外）
    menu: [
      { id: 'mode',     icon: '🎯', label: '模式' },
      { id: 'scene',    icon: '🌌', label: '场景' },
      { id: 'settings', icon: '⚙️', label: '设置' },
      { id: 'dev',      icon: '🧪', label: '开发者' },
    ],

    // 模式选择（为后续玩法预留；locked=true 暂不可选）
    modes: [
      { id: 'standard', name: '标准模式', desc: '经典生存：击杀、升级、构筑流派。', tag: '推荐', locked: false },
      { id: 'endless',  name: '无尽模式', desc: '难度无限攀升，挑战你的极限。',   tag: '预告', locked: true },
      { id: 'sprint',   name: '竞速模式', desc: '限时挑战，谁活到最后？',         tag: '预告', locked: true },
    ],

    // 场景选择：每个场景对应一个风格主题(styles 表)，用于开局环境
    // themeId 为空表示「随机」；引用 styles.js 里的真实 id
    scenes: [
      { id: 'random',  name: '随机幻境', desc: '每局随机一处环境。', themeId: null },
      { id: 'ember',   name: '余烬原野', desc: '暖金流火，麦浪翻涌。', themeId: 'ember' },
      { id: 'frost',   name: '寒霜冻原', desc: '冷冽蓝光，冰晶四散。', themeId: 'frost' },
      { id: 'storm',   name: '风暴暗域', desc: '青蓝电涌，罡风呼啸。', themeId: 'storm' },
      { id: 'verdant', name: '翠绿之境', desc: '生机盎然，藤蔓丛生。', themeId: 'verdant' },
      { id: 'dusk',    name: '暮色黄昏', desc: '暖紫暮光，静谧朦胧。', themeId: 'dusk' },
    ],

    // 开发者面板标签（4 类独立预览）
    devTabs: [
      { id: 'theme',   name: '主题色预览' },
      { id: 'battle',  name: '战斗预览' },
      { id: 'monster', name: '怪物预览' },
      { id: 'skill',   name: '技能预览' },
    ],
  };

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.uiMenu = uiMenu;
})();