/**
 * data/bulletStyles.js — 子弹皮肤表（纯数据，独立于视觉主题）
 * 多套可选皮肤，解耦于风格主题，便于后续加更多皮肤/换皮肤。
 * 每套：color / glow / radius / trail / critColor。
 * resolveBulletStyle(id) 返回皮肤对象（未知 id 回退 gold）。
 * 通过 window.ZS.Data.bulletStyles / resolveBulletStyle 暴露。
 */
(function () {
  const bulletStyles = {
    gold: {
      id: 'gold',
      color: '#ffd54f',        // 弹体主色
      glow: '#ffb300',         // 辉光色
      radius: 4,               // 弹体半径
      trail: 'rgba(255,255,255,0.65)', // 拖尾色
      critColor: '#ff7043',    // 暴击时弹体色
    },
    energy: {
      id: 'energy',
      color: '#64ffda',
      glow: '#00e5ff',
      radius: 4,
      trail: 'rgba(180,255,240,0.6)',
      critColor: '#ff7043',
    },
    flame: {
      id: 'flame',
      color: '#ff8a65',
      glow: '#ff5722',
      radius: 5,
      trail: 'rgba(255,170,80,0.6)',
      critColor: '#ffd180',
    },
    frost: {
      id: 'frost',
      color: '#80deea',
      glow: '#26c6da',
      radius: 4,
      trail: 'rgba(200,240,255,0.6)',
      critColor: '#b3e5fc',
    },
    void: {
      id: 'void',
      color: '#ce93d8',
      glow: '#ab47bc',
      radius: 5,
      trail: 'rgba(240,200,255,0.6)',
      critColor: '#ffd180',
    },
  };

  function resolveBulletStyle(id) {
    return bulletStyles[id] || bulletStyles.gold;
  }

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.bulletStyles = bulletStyles;
  window.ZS.Data.resolveBulletStyle = resolveBulletStyle;
})();