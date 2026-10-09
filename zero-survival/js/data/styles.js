/**
 * data/styles.js — 视觉主题（风格）表（纯数据）
 * 每局开始前随机三选一一个风格，作为本局整体色调。
 * 每个风格：player(角色外观) / enemy(怪物叠加色调) / boss / accent(环境强调色)。
 * 纯视觉，不加机械数值（statMods/passive 字段预留，待用户提供属性时启用）。
 * 通过 window.ZS.Data.styles / styleIds 暴露。
 */
(function () {
  // 默认（当前蓝金外观，保底）
  const defaultStyle = {
    id: 'default', name: '默认', icon: '⚙️', desc: '经典的蓝金战士主题',
    theme: {
      player: { color: '#4fc3f7', stroke: '#b3e5fc', highlight: 'rgba(255,255,255,0.18)', gunColor: '#ffd54f', glow: '#4fc3f7', core: '#e1f5fe' },
      enemy: { tint: '#4fc3f7', glow: '#4fc3f7', eye: '#1a1a24' },
      boss: { color: '#3a3f4b', stroke: '#4fc3f7', glow: '#4fc3f7' },
      accent: { glow: '#4fc3f7', orb: '#ffd54f', hpBar: '#e53935', xpBar: '#42a5f5' },
    },
  };

  const styles = {
    default: defaultStyle,
    ember: {
      id: 'ember', name: '余烬', icon: '🔥', desc: '炽热橙红的火焰主题',
      theme: {
        player: { color: '#ff7043', stroke: '#ffd180', highlight: 'rgba(255,255,255,0.25)', gunColor: '#ffab40', glow: '#ff6d00', core: '#ffe0b2' },
        enemy: { tint: '#ff8a50', glow: '#ff6d00', eye: '#3d0f00' },
        boss: { color: '#4a2318', stroke: '#ff7043', glow: '#ff5722' },
        accent: { glow: '#ff6d00', orb: '#ffb74d', hpBar: '#ff3d00', xpBar: '#ff7043' },
      },
    },
    frost: {
      id: 'frost', name: '霜寒', icon: '❄️', desc: '幽蓝凛冽的寒冰主题',
      theme: {
        player: { color: '#4dd0e1', stroke: '#a5f0ff', highlight: 'rgba(255,255,255,0.25)', gunColor: '#e0f7fa', glow: '#26c6da', core: '#e0f7fa' },
        enemy: { tint: '#4dd0e1', glow: '#26c6da', eye: '#0a2a33' },
        boss: { color: '#123a44', stroke: '#4dd0e1', glow: '#26c6da' },
        accent: { glow: '#26c6da', orb: '#80deea', hpBar: '#00838f', xpBar: '#4dd0e1' },
      },
    },
    storm: {
      id: 'storm', name: '雷暴', icon: '⚡', desc: '青紫交织的雷暴主题',
      theme: {
        player: { color: '#b39ddb', stroke: '#e1bee7', highlight: 'rgba(255,255,255,0.22)', gunColor: '#ffe082', glow: '#7e57c2', core: '#f3e5f5' },
        enemy: { tint: '#b39ddb', glow: '#7e57c2', eye: '#1a0f30' },
        boss: { color: '#2a1a4a', stroke: '#b39ddb', glow: '#9575cd' },
        accent: { glow: '#7e57c2', orb: '#ffe082', hpBar: '#8e24aa', xpBar: '#b39ddb' },
      },
    },
    verdant: {
      id: 'verdant', name: '翠幽', icon: '🌿', desc: '生机翠绿的丛林主题',
      theme: {
        player: { color: '#66bb6a', stroke: '#c8e6c9', highlight: 'rgba(255,255,255,0.22)', gunColor: '#dcedc8', glow: '#43a047', core: '#e8f5e9' },
        enemy: { tint: '#81c784', glow: '#43a047', eye: '#0b260d' },
        boss: { color: '#1b3a20', stroke: '#66bb6a', glow: '#43a047' },
        accent: { glow: '#43a047', orb: '#a5d6a7', hpBar: '#2e7d32', xpBar: '#66bb6a' },
      },
    },
    dusk: {
      id: 'dusk', name: '黄昏', icon: '🌆', desc: '金紫交织的暮光主题',
      theme: {
        player: { color: '#ffca6d', stroke: '#fff1c9', highlight: 'rgba(255,255,255,0.25)', gunColor: '#ff8a80', glow: '#ffb300', core: '#fff8e1' },
        enemy: { tint: '#ffca6d', glow: '#ffb300', eye: '#33220a' },
        boss: { color: '#3a2a1a', stroke: '#ffca6d', glow: '#ff8a65' },
        accent: { glow: '#ffb300', orb: '#ffd180', hpBar: '#d84315', xpBar: '#ffca6d' },
      },
    },
  };

  // 可被随机抽选的风格 id（不含 default 保底）
  const styleIds = ['ember', 'frost', 'storm', 'verdant', 'dusk'];

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.styles = styles;
  window.ZS.Data.styleIds = styleIds;
})();