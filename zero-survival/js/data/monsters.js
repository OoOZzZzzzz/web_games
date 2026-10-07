/**
 * data/monsters.js — 普通怪物 + 精英 模型表（纯数据）
 * 每个怪物：数值 / 外观 / 行为 / 掉落。改数值或外观只动这里。
 * 通过 window.ZS.Data.monsters 暴露。
 */
(function () {
  const monsters = {
    slime: {
      name: '史莱姆',
      unlockLv: 0,
      hp: 30, speed: 58, damage: 8, xp: 8,
      color: '#66bb6a', radius: 14,
      tier: 'normal',
      shape: 'circle',
      desc: '绿色小圆球，基础怪，数量最多',
    },
    crawler: {
      name: '疾行虫',
      unlockLv: 2,
      hp: 25, speed: 120, damage: 6, xp: 10,
      color: '#ef5350', radius: 11,
      tier: 'normal',
      shape: 'ellipse',
      desc: '红色小虫，移速快，血量低，喜欢围堵',
    },
    golem: {
      name: '重甲傀儡',
      unlockLv: 4,
      hp: 80, speed: 46, damage: 15, xp: 18,
      color: '#b0bec5', radius: 20,
      tier: 'normal',
      shape: 'square',
      desc: '灰色方块怪，血厚，移动慢，高威胁',
    },
    elite: {
      name: '暗影巨兽',
      unlockLv: 6,
      hp: 200, speed: 72, damage: 25, xp: 40,
      color: '#ab47bc', radius: 26,
      tier: 'elite',
      shape: 'circle',
      desc: '紫色大怪，精英怪，击杀掉大量经验',
    },
  };

  // 普通怪 id 列表（不含 boss）
  const normalIds = Object.keys(monsters).filter((id) => monsters[id].tier === 'normal');

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.monsters = monsters;
  window.ZS.Data.monsterNormalIds = normalIds;
})();