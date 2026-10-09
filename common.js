/* ========== 数据层：localStorage 跨页面共享 ========== */
const Store = {
  KEY: 'sea_docs',
  _mem: null,
  seed: [
    { id:1, title:'文档一', type:'doc', location:'默认知识库', owner:'Wang', created:'2026-09-01 10:30', lastVisit:'2026-09-04 09:15', modified:'2026-09-03 16:20', pinned:false, favorite:false },
    { id:2, title:'项目计划文档详细说明版本', type:'doc', location:'项目管理', owner:'Wang', created:'2026-08-20 14:00', lastVisit:'2026-09-03 11:30', modified:'2026-09-02 09:45', pinned:false, favorite:true },
    { id:3, title:'Q3季度报告', type:'sheet', location:'财务报表', owner:'Wang', created:'2026-07-15 09:00', lastVisit:'2026-09-02 15:00', modified:'2026-09-01 10:30', pinned:true, favorite:false },
    { id:4, title:'产品需求文档', type:'doc', location:'产品文档', owner:'Wang', created:'2025-05-15 12:13', lastVisit:'2026-08-28 10:00', modified:'2026-08-25 14:20', pinned:false, favorite:false },
    { id:5, title:'演示文稿模板', type:'slide', location:'模板库', owner:'Wang', created:'2026-06-10 08:30', lastVisit:'2026-08-20 09:00', modified:'2026-08-18 11:00', pinned:false, favorite:true }
  ],
  load() {
    if (this._mem) return this._mem.slice();
    try { const r = localStorage.getItem(this.KEY); if (r) { this._mem = JSON.parse(r); return this._mem.slice(); } } catch(e) {}
    this._mem = this.seed.slice(); this.save(this._mem); return this._mem.slice();
  },
  save(docs) { this._mem = docs.slice(); try { localStorage.setItem(this.KEY, JSON.stringify(docs)); } catch(e) {} },
  all() { return this.load(); },
  find(id) { return this.load().find(d => d.id === id); },
  now() { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; },
  add(doc) {
    const docs = this.load();
    doc.id = docs.length ? Math.max(...docs.map(d => d.id)) + 1 : 1;
    const t = this.now();
    Object.assign(doc, { created: t, lastVisit: t, modified: t, pinned: false, favorite: false, cover: null, icon: { type: 'emoji', value: '😊' } });
    docs.unshift(doc); this.save(docs); return doc;
  },
  update(id, patch) { const docs = this.load(); const d = docs.find(x => x.id === id); if (d) { Object.assign(d, patch, { modified: this.now() }); this.save(docs); } return d; },
  touch(id) { const docs = this.load(); const d = docs.find(x => x.id === id); if (d) { d.lastVisit = this.now(); this.save(docs); } },
  remove(id) { this.save(this.load().filter(d => d.id !== id)); },
  toggle(id, field) { const docs = this.load(); const d = docs.find(x => x.id === id); if (d) { d[field] = !d[field]; this.save(docs); } return d; }
};

/* ========== 封面图库（所有 SVG 用 cv{i}g 前缀避免 id 冲突） ========== */
const COVERS = [
  { id:'c0', name:'黑底兰花', svg:`<svg viewBox="0 0 760 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="cv0g" cx="50%" cy="55%" r="65%"><stop offset="0%" stop-color="#3a3f48"/><stop offset="100%" stop-color="#0a0a0e"/></radialGradient></defs><rect width="760" height="180" fill="url(#cv0g)"/><g transform="translate(380,90)" opacity=".95"><ellipse cx="0" cy="-32" rx="24" ry="46" fill="#fff"/><ellipse cx="0" cy="-32" rx="24" ry="46" fill="#fff" transform="rotate(72)"/><ellipse cx="0" cy="-32" rx="24" ry="46" fill="#fff" transform="rotate(144)"/><ellipse cx="0" cy="-32" rx="24" ry="46" fill="#fff" transform="rotate(216)"/><ellipse cx="0" cy="-32" rx="24" ry="46" fill="#fff" transform="rotate(288)"/><circle r="11" fill="#ff9b6e"/></g></svg>` },
  { id:'c1', name:'蓝色山峰', svg:`<svg viewBox="0 0 760 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cv1g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5b8ce8"/><stop offset="100%" stop-color="#1a3a8e"/></linearGradient></defs><rect width="760" height="180" fill="url(#cv1g)"/><polygon points="0,180 200,90 340,140 500,60 760,180" fill="#fff" opacity=".85"/><polygon points="0,180 280,130 460,170 760,110 760,180" fill="#fff" opacity=".6"/></svg>` },
  { id:'c2', name:'紫色光晕', svg:`<svg viewBox="0 0 760 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="cv2g" cx="30%" cy="40%" r="60%"><stop offset="0%" stop-color="#a06cff"/><stop offset="100%" stop-color="#2a1450"/></radialGradient></defs><rect width="760" height="180" fill="url(#cv2g)"/><circle cx="220" cy="80" r="46" fill="#fff" opacity=".4"/><circle cx="240" cy="80" r="56" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/></svg>` },
  { id:'c3', name:'青色波浪', svg:`<svg viewBox="0 0 760 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cv3g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3dd2c2"/><stop offset="100%" stop-color="#1a5e8c"/></linearGradient></defs><rect width="760" height="180" fill="url(#cv3g)"/><path d="M0,120 Q190,80 380,120 T760,120 L760,180 L0,180 Z" fill="#fff" opacity=".4"/><path d="M0,140 Q190,110 380,140 T760,140 L760,180 L0,180 Z" fill="#fff" opacity=".5"/></svg>` },
  { id:'c4', name:'橙色日落', svg:`<svg viewBox="0 0 760 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cv4g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffb46a"/><stop offset="100%" stop-color="#e85a4b"/></linearGradient></defs><rect width="760" height="180" fill="url(#cv4g)"/><circle cx="380" cy="100" r="36" fill="#fff" opacity=".6"/><line x1="0" y1="160" x2="760" y2="160" stroke="#fff" stroke-width="2" opacity=".4"/></svg>` },
  { id:'c5', name:'粉色樱花', svg:`<svg viewBox="0 0 760 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cv5g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd5e5"/><stop offset="100%" stop-color="#ff8fc0"/></linearGradient></defs><rect width="760" height="180" fill="url(#cv5g)"/><g opacity=".7"><circle cx="120" cy="50" r="14" fill="#ff7fa8"/><circle cx="240" cy="120" r="18" fill="#ff6aa0"/><circle cx="420" cy="60" r="16" fill="#ff7fa8"/><circle cx="600" cy="100" r="20" fill="#ff6aa0"/><circle cx="680" cy="40" r="14" fill="#ff7fa8"/></g></svg>` },
  { id:'c6', name:'森林绿叶', svg:`<svg viewBox="0 0 760 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cv6g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a4e36b"/><stop offset="100%" stop-color="#2d7240"/></linearGradient></defs><rect width="760" height="180" fill="url(#cv6g)"/><path d="M0,150 Q380,80 760,150 L760,180 L0,180 Z" fill="#1d4a26" opacity=".5"/><path d="M120,90 Q160,60 200,90 Q160,120 120,90 Z" fill="#fff" opacity=".4"/></svg>` },
  { id:'c7', name:'科技抽象', svg:`<svg viewBox="0 0 760 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cv7g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#101626"/><stop offset="100%" stop-color="#243056"/></linearGradient></defs><rect width="760" height="180" fill="url(#cv7g)"/><g stroke="#5b8ce8" stroke-width="1.5" fill="none" opacity=".6"><circle cx="200" cy="100" r="20"/><circle cx="380" cy="60" r="26"/><circle cx="540" cy="110" r="18"/></g><line x1="200" y1="100" x2="380" y2="60" stroke="#5b8ce8" stroke-width="1" opacity=".6"/><line x1="380" y1="60" x2="540" y2="110" stroke="#5b8ce8" stroke-width="1" opacity=".6"/></svg>` }
];

/* ========== 工具组件 ========== */
const UI = {
  toast(msg, opts) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'toast'; t.className = 'toast';
      // 无障碍：toast 作为状态播报区，屏幕阅读器朗读提示文案（PRD 11.3）
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    clearTimeout(t._timer);
    clearTimeout(t._showTimer);
    t.classList.remove('show');
    const delay = (opts && opts.delay) || 0;
    const dur = (opts && opts.duration) || 2000;
    if (delay > 0) t._showTimer = setTimeout(() => t.classList.add('show'), delay);
    else t.classList.add('show');
    t._timer = setTimeout(() => t.classList.remove('show'), delay + dur);
  },
  formatDisplayTime(ts) {
    const d = new Date(ts.replace(/-/g, '/')), n = new Date(), p = x => String(x).padStart(2, '0');
    const md = `${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    return (n.getFullYear() - d.getFullYear() >= 1) ? `${d.getFullYear()}-${md}` : md;
  },
  getParam(name) { return new URLSearchParams(location.search).get(name); },
  docIcon(type) {
    const map = { sheet: '📊', slide: '📽️', doc: '' };
    const cls = type === 'sheet' ? 'type-sheet' : type === 'slide' ? 'type-slide' : 'type-doc';
    return `<div class="doc-icon ${cls}">${map[type] || ''}</div>`;
  },
  icons: {
    menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    help: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    apps: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z"/></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3l5 5-4.5 1.5-2.5 2.5-.5 5-2.5-2.5-4 4-1-1 4-4L7.5 11l5-.5 2.5-2.5z"/></svg>',
    folder: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
    edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    like: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>',
    comment: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    more: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    filter: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    rows: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>',
    tableView: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    gridView: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    starOn: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f5b50a" stroke="#f5b50a" stroke-width="1.2" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    starOff: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a0a8" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
  }
};