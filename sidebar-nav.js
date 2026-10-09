/* ============ 左侧导航侧边栏（仿飞书，vanilla，复用 Store 数据） ============
 * 入口：编辑器左上角汉堡菜单按钮（#menuBtn）
 * 内容：Logo + 搜索框 + 主菜单（主页/云盘/知识库/智能纪要）+ 置顶文档 + 我的文档库（真实文档）+ 底部工具栏
 * 文档名从 Store.all() 动态读取，当前文档高亮
 */
(function () {
  'use strict';

  if (typeof Store === 'undefined' || typeof UI === 'undefined') return;

  var DOC_ID = parseInt(UI.getParam('id')) || 0;
  var drawer = null;
  var searchInput = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /* 文档类型图标（与主页一致） */
  function typeIcon(type) {
    if (type === 'sheet') return '📊';
    if (type === 'slide') return '📽️';
    return '📄';
  }

  var ICONS = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z"/></svg>',
    drive: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.5L10 3H6a2 2 0 00-2 2v15z"/></svg>',
    kb: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    meeting: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="14" height="15" rx="2"/><path d="M16 10l4 3-4 3z"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3l5 5-4.5 1.5-2.5 2.5-.5 5-2.5-2.5-4 4-1-1 4-4L7.5 11l5-.5 2.5-2.5z"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    sort: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    setting: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
  };

  /* 渲染文档列表项 */
  function docItem(d) {
    var isCurrent = d.id === DOC_ID;
    var icon = d.icon && d.icon.value ? d.icon.value : typeIcon(d.type);
    var title = d.title || '未命名文档';
    return '<div class="sn-doc-item' + (isCurrent ? ' current' : '') + '" data-docid="' + d.id + '">' +
      '<span class="sn-doc-icon">' + esc(icon) + '</span>' +
      '<span class="sn-doc-title">' + esc(title) + '</span>' +
      (d.pinned ? '<span class="sn-pin">' + ICONS.pin + '</span>' : '') +
      '</div>';
  }

  function renderDocs(keyword) {
    var docs = Store.all().filter(function (d) { return !d.removed; });
    var pinned = docs.filter(function (d) { return d.pinned; });
    var q = (keyword || '').trim().toLowerCase();

    // 搜索过滤
    if (q) {
      docs = docs.filter(function (d) { return (d.title || '').toLowerCase().indexOf(q) >= 0; });
      pinned = pinned.filter(function (d) { return (d.title || '').toLowerCase().indexOf(q) >= 0; });
    }

    // 置顶文档区
    var pinnedHtml = pinned.length
      ? pinned.map(docItem).join('')
      : '<div class="sn-empty">暂无置顶</div>';

    // 我的文档库（全部文档）
    var docsHtml = docs.length
      ? docs.map(docItem).join('')
      : '<div class="sn-empty">暂无文档</div>';

    drawer.querySelector('#snPinnedList').innerHTML = pinnedHtml;
    drawer.querySelector('#snDocsList').innerHTML = docsHtml;
  }

  function build() {
    drawer = document.getElementById('drawer');
    if (!drawer) return;

    drawer.innerHTML =
      '<div class="sn-header">' +
        '<div class="sn-logo">' +
          '<div class="sn-logo-icon"><svg viewBox="0 0 32 32" fill="none"><path d="M6 8C6 6.89543 6.89543 6 8 6H18L26 14V24C26 25.1046 25.1046 26 24 26H8C6.89543 26 6 25.1046 6 24V8Z" fill="#5b5fc7"/><path d="M18 6L26 14H18V6Z" fill="#8b7ff5"/></svg></div>' +
          '<span class="sn-logo-name">Sea 云文档</span>' +
        '</div>' +
        '<div class="sn-search">' +
          '<span class="sn-search-icon">' + ICONS.search + '</span>' +
          '<input id="snSearch" type="text" placeholder="搜索" autocomplete="off">' +
        '</div>' +
      '</div>' +

      '<nav class="sn-nav">' +
        '<div class="sn-nav-item" data-nav="home">' + ICONS.home + '<span>主页</span></div>' +
        '<div class="sn-nav-item" data-nav="drive">' + ICONS.drive + '<span>云盘</span></div>' +
        '<div class="sn-nav-item" data-nav="kb">' + ICONS.kb + '<span>知识库</span></div>' +
        '<div class="sn-nav-item" data-nav="meeting">' + ICONS.meeting + '<span>智能纪要</span></div>' +
      '</nav>' +

      '<div class="sn-section">' +
        '<div class="sn-section-title"><span class="sn-jump" data-jump="pinned" title="查看置顶文档">置顶文档</span></div>' +
        '<div id="snPinnedList"></div>' +
      '</div>' +

      '<div class="sn-section sn-docs-section">' +
        '<div class="sn-section-title sn-docs-title">' +
          '<span class="sn-jump" data-jump="library" title="查看我的文档库">我的文档库</span>' +
          '<span class="sn-title-actions">' +
            '<button class="sn-title-btn" data-act="new" title="新建">' + ICONS.plus + '</button>' +
            '<button class="sn-title-btn" data-act="sort" title="排序">' + ICONS.sort + '</button>' +
          '</span>' +
        '</div>' +
        '<div id="snDocsList"></div>' +
      '</div>' +

      '<div class="sn-footer">' +
        '<button class="sn-foot-btn" data-foot="nav" title="导航">' + ICONS.kb + '</button>' +
        '<button class="sn-foot-btn" data-foot="shield" title="安全/权限">' + ICONS.shield + '</button>' +
        '<button class="sn-foot-btn" data-foot="trash" title="回收站">' + ICONS.trash + '</button>' +
      '</div>';

    searchInput = drawer.querySelector('#snSearch');
    renderDocs();

    // 搜索
    searchInput.addEventListener('input', function () { renderDocs(searchInput.value); });

    // 事件委托
    drawer.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav) {
        var key = nav.getAttribute('data-nav');
        handleNav(key);
        return;
      }
      var docItemEl = e.target.closest('[data-docid]');
      if (docItemEl) {
        var id = parseInt(docItemEl.getAttribute('data-docid'), 10);
        if (id !== DOC_ID) window.location.href = 'editor.html?id=' + id;
        return;
      }
      var jump = e.target.closest('[data-jump]');
      if (jump) {
        // 「置顶文档」/「我的文档库」→ 跳回主页对应视图
        var jk = jump.getAttribute('data-jump');
        window.location.href = 'index.html?scope=' + jk;
        return;
      }
      var titleBtn = e.target.closest('[data-act]');
      if (titleBtn) {
        var act = titleBtn.getAttribute('data-act');
        if (act === 'new') { window.location.href = 'editor.html'; return; }
        if (act === 'sort') { UI.toast('排序功能'); return; }
      }
      var foot = e.target.closest('[data-foot]');
      if (foot) {
        var fk = foot.getAttribute('data-foot');
        if (fk === 'nav') UI.toast('底部导航');
        else if (fk === 'shield') UI.toast('安全/权限设置');
        else if (fk === 'trash') UI.toast('回收站');
        return;
      }
    });
  }

  function handleNav(key) {
    if (key === 'home') { window.location.href = 'index.html'; return; }
    if (key === 'drive') { UI.toast('云盘功能（演示）'); return; }
    if (key === 'kb') { UI.toast('知识库功能（演示）'); return; }
    if (key === 'meeting') { UI.toast('智能纪要功能（演示）'); return; }
  }

  function toggle() {
    if (!drawer) build();
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      renderDocs();
      if (searchInput) searchInput.value = '';
    }
  }

  /* 暴露给 editor.js */
  window.SidebarNav = {
    toggle: toggle,
    open: function () { if (!drawer) build(); drawer.classList.add('open'); renderDocs(); },
    close: function () { if (drawer) drawer.classList.remove('open'); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
