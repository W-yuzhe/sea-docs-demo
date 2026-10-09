/* ===== 历史记录模块（跨页面共享） ===== */
const History = {
  KEY: 'sea_history',
  all() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
  log(docId, action) {
    const h = this.all();
    h.unshift({ docId, action, user: 'Wang', time: Store.now() });
    try { localStorage.setItem(this.KEY, JSON.stringify(h.slice(0, 300))); } catch (e) {}
  },
  forDoc(docId) { return this.all().filter(h => h.docId === docId); },
  // 内容快照读取（快照存于文档对象的 history 数组，由 history-time.js 写入）
  snapshots(docId) { const d = Store.find(docId); return (d && d.history) ? d.history.slice() : []; }
};