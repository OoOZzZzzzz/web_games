/**
 * main.js — 程序入口
 * 页面加载完成后初始化游戏。无构建、纯 script 标签按序加载。
 */
window.addEventListener('DOMContentLoaded', () => {
  window.ZS.Game.init();
  console.log('[零级求生] 就绪，等待玩家开始。');
});