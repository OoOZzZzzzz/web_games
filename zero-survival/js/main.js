/**
 * main.js — 程序入口
 * 零级求生：技能狂潮
 *
 * 页面加载完成后：创建 Game 实例 → 初始化 UI → 显示开始界面。
 * 首次交互点击「开始游戏」后弹出新手说明，确认后进入战斗。
 */
window.addEventListener('DOMContentLoaded', () => {
  // 1. 创建游戏主逻辑（同时自渲染）
  const game = new Game();

  // 2. 初始化界面（按钮、HUD、画布尺寸）
  UI.init();

  // 3. 展示开始界面
  UI.showStart();

  console.log('[零级求生] 游戏就绪，等待玩家开始。');
});