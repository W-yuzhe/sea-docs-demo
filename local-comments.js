/* ============ 局部评论组件（划词评论，vanilla，无框架/无 CDN） ============
 * PRD：选中文字 → 浮动工具条点「评论」→ 右侧滑出评论栏（占 1/5 宽）
 * 面板顶部显示选中原文片段（灰字 #F5F5F5 背景 + 左侧 4px 主题色竖线）→ 多行输入框 → 发送按钮
 * 提交成功后：文档选中文字下方出现气泡标记；右侧列表新增评论卡片
 * 数据存于当前文档的 comments 字段（与全局评论 globalComments 互不干扰），跨刷新持久化
 */
(function () {
  'use strict';

  if (typeof Store === 'undefined' || typeof UI === 'undefined') return;

  // 当前用户：优先从 localStorage 读取（未来登录注册后写入 sea_user），
  // 支持头像图片（avatar 字段，URL/Base64）与用户名自定义；未登录用默认值。
  function loadCurrentUser() {
    try {
      var raw = localStorage.getItem('sea_user');
      if (raw) { var u = JSON.parse(raw); if (u && u.name) return u; }
    } catch (e) {}
    return { name: '王玉喆', color: '#7c5cd6', avatar: '' };
  }
  var CURRENT_USER = loadCurrentUser();
  var MEMBERS = [
    { name: '张伟', color: '#f2994a' },
    { name: '李娜', color: '#eb5757' },
    { name: '王芳', color: '#27ae60' },
    { name: '陈强', color: '#2d9cdb' },
    { name: '刘洋', color: '#9b51e0' }
  ];

  function uid() { return 'lc' + Math.random().toString(36).slice(2, 10); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /* ============ 相对时间格式（PRD 严格规则） ============ */
  function formatTime(ts) {
    var diff = Date.now() - ts;
    var m = 60000, h = 3600000, d = 86400000;
    if (diff < m) return '刚刚';
    if (diff < 2 * m) return '1分钟之前';
    if (diff < h) return Math.floor(diff / m) + '分钟之前';
    if (diff < 2 * h) return '1小时之前';
    if (diff < d) return Math.floor(diff / h) + '小时之前';
    if (diff < 2 * d) return '1天之前';
    var dt = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); };
    var sameYear = dt.getFullYear() === new Date().getFullYear();
    var md = (dt.getMonth() + 1) + '月' + dt.getDate() + '日' + p(dt.getHours()) + ':' + p(dt.getMinutes());
    return sameYear ? md : dt.getFullYear() + '年' + md;
  }
  function fullTime(ts) {
    var d = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ============ 图标 ============ */
  var ICON = {
    bubble: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    like: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>',
    reply: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-6a4 4 0 00-4-4H4"/></svg>',
    edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    del: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>'
  };

  var DOC_ID = parseInt(UI.getParam('id')) || 0;
  var rootEl = null;
  var bodyEl = null;
  var state = {
    comments: [],
    drafting: false,      // 是否处于撰写态（编辑入口已给 anchor）
    draftAnchor: null,    // 当前撰写的锚点
    replyingId: null,
    editingId: null,
    editReply: null,
    activeId: null,       // 当前聚焦/展开的评论 id
    openMenu: null
  };

  /* ============ 持久化 ============ */
  function loadComments() {
    var d = Store.find(DOC_ID);
    return (d && Array.isArray(d.comments)) ? d.comments.slice() : [];
  }
  function commit(next) {
    state.comments = next;
    try { Store.update(DOC_ID, { comments: next }); } catch (e) {}
    renderList();
    syncMarkers();
  }

  /* ============ 评论锚点：基于 DOM 路径 + 文本偏移 ============ */
  // 生成节点的路径（从 bodyEl 到该文本节点）
  function nodePath(el, container) {
    var path = [];
    var n = container;
    while (n && n !== el) {
      var p = n.parentNode;
      if (!p) break;
      var idx = Array.prototype.indexOf.call(p.childNodes, n);
      path.unshift(idx);
      n = p;
    }
    return path;
  }
  function resolveNode(el, path) {
    var n = el;
    for (var i = 0; i < path.length; i++) {
      n = n.childNodes[path[i]];
      if (!n) return null;
    }
    return n;
  }
  function captureAnchorFromSelection() {
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    if (!bodyEl || !bodyEl.contains(r.commonAncestorContainer)) return null;
    var text = sel.toString();
    if (!text || !text.trim()) return null;
    return {
      quote: text.slice(0, 200),
      startPath: nodePath(bodyEl, r.startContainer),
      startOffset: r.startOffset,
      endPath: nodePath(bodyEl, r.endContainer),
      endOffset: r.endOffset,
      lineText: currentLineText(r)
    };
  }
  function currentLineText(range) {
    var n = range.startContainer;
    while (n && n !== bodyEl && !(n.nodeType === 1 && n.classList && n.classList.contains('ed-line'))) n = n.parentNode;
    if (n && n.classList && n.classList.contains('ed-line')) return n.innerText.slice(0, 200);
    return '';
  }
  // 定位锚点对应的文本节点（正文编辑后可能失效 → 返回 null 标 orphan）
  function resolveAnchor(anchor) {
    if (!anchor || !anchor.startPath) return null;
    try {
      var sn = resolveNode(bodyEl, anchor.startPath);
      var en = resolveNode(bodyEl, anchor.endPath);
      if (!sn || !en) return null;
      var r = document.createRange();
      r.setStart(sn, anchor.startOffset);
      r.setEnd(en, anchor.endOffset);
      return r;
    } catch (e) {
      return null;
    }
  }

  /* ============ 数据操作 ============ */
  function addComment(anchor, text) {
    commit(state.comments.concat([{
      id: uid(), author: CURRENT_USER, content: text, createdAt: Date.now(),
      editedAt: null, edited: false, anchor: anchor, replies: [],
      likers: [], liked: false, likes: 0, isResolved: false
    }]));
  }
  function addReply(pid, text) {
    commit(state.comments.map(function (c) {
      if (c.id !== pid) return c;
      return Object.assign({}, c, { replies: c.replies.concat([{
        id: uid(), author: CURRENT_USER, content: text, createdAt: Date.now(), edited: false, likers: [], liked: false, likes: 0
      }]) });
    }));
  }
  function editComment(id, text) {
    commit(state.comments.map(function (c) {
      return c.id === id ? Object.assign({}, c, { content: text, edited: true, editedAt: Date.now() }) : c;
    }));
  }
  function editReply(pid, rid, text) {
    commit(state.comments.map(function (c) {
      if (c.id !== pid) return c;
      return Object.assign({}, c, { replies: c.replies.map(function (r) {
        return r.id === rid ? Object.assign({}, r, { content: text, edited: true, editedAt: Date.now() }) : r;
      }) });
    }));
  }
  function deleteComment(id) { commit(state.comments.filter(function (c) { return c.id !== id; })); }
  function deleteReply(pid, rid) {
    commit(state.comments.map(function (c) {
      if (c.id !== pid) return c;
      return Object.assign({}, c, { replies: c.replies.filter(function (r) { return r.id !== rid; }) });
    }));
  }
  function toggleLike(target) {
    var me = CURRENT_USER.name;
    var likers = (target.likers || []).slice();
    var i = likers.indexOf(me);
    if (i >= 0) likers.splice(i, 1); else likers.push(me);
    return { likers: likers, liked: likers.indexOf(me) >= 0, likes: likers.length };
  }
  function likeComment(id) {
    commit(state.comments.map(function (c) { return c.id === id ? Object.assign({}, c, toggleLike(c)) : c; }));
  }
  function likeReply(pid, rid) {
    commit(state.comments.map(function (c) {
      if (c.id !== pid) return c;
      return Object.assign({}, c, { replies: c.replies.map(function (r) {
        return r.id === rid ? Object.assign({}, r, toggleLike(r)) : r;
      }) });
    }));
  }

  /* ============ 渲染 ============ */
  // 头像：支持图片头像（avatar URL/Base64）优先，无则首字母 + 背景色
  function avatarHtml(user, size) {
    var name = (user && user.name) || '?';
    var color = (user && user.color) || '#7c5cd6';
    var img = user && user.avatar;
    if (img) {
      return '<div class="cp-avatar" style="width:' + size + 'px;height:' + size + 'px;background-image:url(' + esc(img) + ');background-size:cover;background-position:center"></div>';
    }
    return '<div class="cp-avatar" style="background:' + color + ';width:' + size + 'px;height:' + size + 'px;font-size:' + (size * 0.42) + 'px;color:#fff">' + esc(name.slice(0, 1)) + '</div>';
  }
  function likesLine(target) {
    var likes = target.likes || 0;
    if (!likes) return '';
    var names = (target.likers || []).slice(0, 2).join('、');
    var users = (target.likers || []).length > 2 ? names + ' 等 ' + target.likers.length + ' 人' : names;
    return '<div class="cp-likes"><span class="cp-like-ico">👍</span><span class="cp-like-users">' + esc(users) + ' 觉得很赞</span></div>';
  }

  function renderReply(pid, r) {
    var isMine = r.author.name === CURRENT_USER.name;
    var editing = state.editReply && state.editReply.rid === r.id;
    var body;
    if (editing) {
      body = '<div class="cp-edit-wrap"><textarea class="cp-edit-input" data-rid-edit="' + r.id + '" rows="2">' + esc(r.content) + '</textarea>' +
        '<div class="cp-edit-actions"><button class="cp-btn" data-act="cancel-reply-edit">取消</button><button class="cp-btn primary" data-act="save-reply-edit">保存</button></div></div>';
    } else {
      body = '<div class="cp-content">' + esc(r.content) + '</div>' + likesLine(r);
    }
    var actions = isMine ? '<span class="cp-actions-icons">' +
      '<button class="cp-icon like' + (r.liked ? ' liked' : '') + '" data-act="like-reply" title="点赞">' + ICON.like + (r.likes ? '<span class="cp-like-count">' + r.likes + '</span>' : '') + '</button>' +
      '<button class="cp-icon edit" data-act="edit-reply" title="编辑">' + ICON.edit + '</button>' +
      '<button class="cp-icon delete" data-act="delete-reply" title="删除">' + ICON.del + '</button>' +
      '</span>' : '';
    return '<div class="cp-reply" data-rid="' + r.id + '"><div class="cp-main">' +
      avatarHtml(r.author, 24) +
      '<div class="cp-body"><div class="cp-header"><div class="cp-name-time"><span class="cp-name">' + esc(r.author.name) + '</span><span class="cp-time" title="' + fullTime(r.createdAt) + '">' + formatTime(r.createdAt) + '</span>' + (r.edited ? '<span class="cp-edited">已编辑</span>' : '') + '</div>' + actions + '</div>' +
      body + '</div></div></div>';
  }

  function renderCard(c) {
    var isMine = c.author.name === CURRENT_USER.name;
    var editing = state.editingId === c.id;
    var replying = state.replyingId === c.id;
    var isActive = state.activeId === c.id;
    var quote = c.anchor ? c.anchor.quote : '';
    var orphan = !!(c.anchor && !resolveAnchor(c.anchor));
    // 评论框上方显示被选中的文本（划词评论针对特定文本，优先展示选区原文）
    var quotedText = quote ? quote : (c.anchor && c.anchor.lineText) || '';

    var body;
    if (editing) {
      body = '<div class="cp-edit-wrap"><textarea class="cp-edit-input" rows="2">' + esc(c.content) + '</textarea>' +
        '<div class="cp-edit-actions"><button class="cp-btn" data-act="cancel-edit">取消</button><button class="cp-btn primary" data-act="save-edit">保存</button></div></div>';
    } else {
      body = '<div class="cp-content">' + esc(c.content) + '</div>' + likesLine(c);
    }

    var replyHtml = c.replies.length
      ? '<div class="cp-replies">' + c.replies.map(function (r) { return renderReply(c.id, r); }).join('') + '</div>'
      : '';

    var replyBox = replying
      ? '<div class="cp-draft"><div class="cp-reply-input" contenteditable="true" data-reply-box="1" placeholder="回复…"></div>' +
        '<div class="cp-reply-actions"><button class="cp-btn" data-act="cancel-reply">取消</button><button class="cp-btn primary" data-act="submit-reply">回复</button></div></div>'
      : '';

    var actions = '<span class="cp-actions-icons">' +
      '<button class="cp-icon like' + (c.liked ? ' liked' : '') + '" data-act="like" title="点赞">' + ICON.like + (c.likes ? '<span class="cp-like-count">' + c.likes + '</span>' : '') + '</button>' +
      '<button class="cp-icon reply" data-act="reply" title="回复">' + ICON.reply + '</button>' +
      (isMine ? '<button class="cp-icon edit" data-act="edit" title="编辑">' + ICON.edit + '</button>' : '') +
      (isMine ? '<button class="cp-icon delete" data-act="delete" title="删除">' + ICON.del + '</button>' : '') +
      '</span>';

    return '<div class="cp-card' + (isActive ? ' active' : '') + (orphan ? ' orphan' : '') + '" data-cid="' + c.id + '">' +
      // 上部：蓝色短竖线 + 被选中的文本
      (quotedText ? '<div class="cp-loc-row"><span class="cp-loc-accent"></span><span class="cp-loc-text">' + esc(quotedText) + '</span></div>' : '') +
      '<div class="cp-main">' + avatarHtml(c.author, 32) +
      '<div class="cp-body"><div class="cp-header"><div class="cp-name-time"><span class="cp-name">' + esc(c.author.name) + '</span><span class="cp-time" title="' + fullTime(c.editedAt || c.createdAt) + '">' + formatTime(c.editedAt || c.createdAt) + '</span>' + (c.edited ? '<span class="cp-edited">已编辑</span>' : '') + '</div>' + actions + '</div>' +
      body + replyHtml + replyBox + '</div></div></div>';
  }

  function renderComposer() {
    if (!state.drafting) return '';
    var quote = state.draftAnchor ? state.draftAnchor.quote : '';
    return '<div class="lc-composer lc-card">' +
      '<div class="lc-card-topline"></div>' +
      '<div class="lc-card-loc">' +
        '<span class="lc-loc-text">' + esc(quote || '街道口 白沙洲') + '</span>' +
        '<span class="lc-loc-more">⋯</span>' +
      '</div>' +
      '<div class="lc-card-user">' +
        '<span class="lc-card-avatar">玉喆</span>' +
        '<span class="lc-card-name">玉玉喆</span>' +
      '</div>' +
      '<div class="lc-card-input-row">' +
        '<input class="lc-input" id="lcInput" placeholder="输入评论">' +
        '<span class="lc-input-emoji" title="表情">😊</span>' +
        '<button class="lc-send" id="lcSend" disabled>发送</button>' +
      '</div>' +
      '</div>';
  }

  function renderList() {
    if (!rootEl) return;
    var composer = renderComposer();
    var list;
    if (!state.comments.length) {
      list = '<div class="lc-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d7dd" stroke-width="1.4"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg><p>暂无评论</p></div>';
    } else {
      var ordered = state.comments.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
      list = ordered.map(renderCard).join('');
    }
    rootEl.innerHTML = composer + list;
    bindComposer();
  }

  function bindComposer() {
    var input = document.getElementById('lcInput');
    var send = document.getElementById('lcSend');
    if (!input) return;
    function refresh() {
      var len = input.value.length;
      var over = len > 2000;
      input.classList.toggle('lc-over', over);
      var has = input.value.trim().length > 0 && !over;
      if (send) {
        send.disabled = !has;
        send.classList.toggle('lc-ready', has);
      }
    }
    function submit() {
      var text = input.value.trim();
      if (!text) return;
      if (text.length > 2000) { UI.toast('评论内容不能超过2000字'); return; }
      // 模拟发布（可失败）
      fakePublish(false).then(function () {
        var anchor = state.draftAnchor;
        addComment(anchor, text);
        state.drafting = false; state.draftAnchor = null; state.activeId = null;
        renderList();
        UI.toast('评论成功');
      }).catch(function () {
        UI.toast('评论提交失败，请重试');
      });
    }
    input.addEventListener('input', function () {
      // 2000 字上限：超出时阻止继续输入
      if (input.value.length > 2000) input.value = input.value.slice(0, 2000);
      refresh();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) { e.preventDefault(); submit(); }
    });
    if (send) send.addEventListener('click', submit);
    refresh();
    input.focus();
  }

  function fakePublish(fail) {
    return new Promise(function (res, rej) { setTimeout(function () { fail ? rej(new Error('fail')) : res(); }, 400); });
  }

  /* ============ 文档内评论标记（气泡图标） ============ */
  function syncMarkers() {
    // 清理旧 marker
    if (bodyEl) {
      Array.prototype.forEach.call(bodyEl.querySelectorAll('.lc-marker'), function (m) { m.remove(); });
    }
    state.comments.forEach(function (c) {
      if (!c.anchor) return;
      var r = resolveAnchor(c.anchor);
      if (!r) return; // orphan：锚点失效，不显示 marker
      insertMarker(c, r);
    });
  }
  function insertMarker(c, range) {
    var endNode = range.endContainer;
    var marker = document.createElement('span');
    marker.className = 'lc-marker' + (state.activeId === c.id ? ' lc-marker-active' : '');
    marker.setAttribute('data-lcid', c.id);
    marker.title = '查看评论';
    marker.innerHTML = ICON.bubble;
    marker.addEventListener('click', function (e) {
      e.stopPropagation();
      state.activeId = c.id;
      state.drafting = false;
      openPanel();
      renderList();
      syncMarkers();
    });
    // 在选中文字末尾插入标记
    try {
      if (endNode.nodeType === 3) {
        endNode.parentNode.insertBefore(marker, endNode.nextSibling);
      } else {
        endNode.appendChild(marker);
      }
    } catch (e) {}
  }

  /* ============ 面板开合 ============ */
  function openPanel() {
    var panel = document.getElementById('commentPanel');
    if (panel) {
      panel.classList.add('open');
      panel.style.display = 'block';
      document.body.classList.add('comment-panel-open');
    }
  }
  function closePanel() {
    var panel = document.getElementById('commentPanel');
    if (panel) {
      panel.classList.remove('open');
      panel.style.display = 'none';
      document.body.classList.remove('comment-panel-open');
    }
  }

  /* ============ 事件委托 ============ */
  function onListClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) {
      // 点击评论列表内的任意非操作区（如输入框、卡片空白）也不应关闭评论栏
      // （renderList 会替换 innerHTML，导致父节点链断开，document 委托会误判为「点空白」）
      e.stopPropagation();
      return;
    }
    // 评论栏内的点赞/回复/编辑/删除等操作后，绝不关闭评论栏：
    // 阻止事件冒泡到 document 的「点空白关闭」逻辑
    e.stopPropagation();
    var card = btn.closest('[data-cid]');
    var cid = card ? card.getAttribute('data-cid') : null;
    var replyEl = btn.closest('[data-rid]');
    var rid = replyEl ? replyEl.getAttribute('data-rid') : null;
    var act = btn.getAttribute('data-act');

    switch (act) {
      case 'like': likeComment(cid); break;
      case 'like-reply': likeReply(cid, rid); break;
      case 'reply':
        state.replyingId = (state.replyingId === cid ? null : cid);
        state.editingId = null; state.editReply = null;
        renderList(); break;
      case 'edit':
        state.editingId = cid; state.replyingId = null; renderList();
        break;
      case 'edit-reply':
        state.editReply = { pid: cid, rid: rid }; renderList(); break;
      case 'save-edit': {
        var ta = card.querySelector('.cp-edit-input'); var t = ta ? ta.value.trim() : '';
        if (t) editComment(cid, t); state.editingId = null; renderList(); break;
      }
      case 'cancel-edit': state.editingId = null; renderList(); break;
      case 'save-reply-edit': {
        var re = replyEl.querySelector('.cp-edit-input'); var tr = re ? re.value.trim() : '';
        if (tr) editReply(cid, rid, tr); state.editReply = null; renderList(); break;
      }
      case 'cancel-reply-edit': state.editReply = null; renderList(); break;
      case 'submit-reply': {
        var ib = card.querySelector('[data-reply-box]'); var rt = ib ? ib.textContent.trim() : '';
        if (rt) { fakePublish(false).then(function () { addReply(cid, rt); state.replyingId = null; renderList(); UI.toast('回复成功'); }).catch(function () { UI.toast('回复失败，请重试'); }); }
        else state.replyingId = null, renderList();
        break;
      }
      case 'cancel-reply': state.replyingId = null; renderList(); break;
      case 'delete':
        if (window.confirm('确定删除这条评论？')) deleteComment(cid);
        break;
      case 'delete-reply':
        if (window.confirm('确定删除这条回复？')) deleteReply(cid, rid);
        break;
    }
  }

  /* ============ 初始化 ============ */
  function init() {
    rootEl = document.getElementById('localCommentsRoot');
    bodyEl = document.getElementById('edBody');
    if (!rootEl || rootEl.dataset.lcReady) return;
    rootEl.dataset.lcReady = '1';

    state.comments = loadComments();

    rootEl.addEventListener('click', onListClick);

    // 暴露给 editor.js 调用
    window.LocalComments = {
      // 打开撰写模式（传入选中文字的锚点）
      openComposer: function (anchor) {
        state.drafting = true;
        state.draftAnchor = anchor || null;
        state.activeId = null;
        renderList();
        openPanel();
      },
      openPanel: function () { renderList(); openPanel(); },
      closePanel: closePanel,
      togglePanel: function () {
        var panel = document.getElementById('commentPanel');
        var isOpen = panel && panel.classList.contains('open');
        if (isOpen) closePanel(); else openPanel();
      },
      getComments: function () { return state.comments.slice(); }
    };

    renderList();
    syncMarkers();
    // 正文编辑后重建 marker 可能失效，延迟同步一次
    if (bodyEl) {
      bodyEl.addEventListener('input', function () { try { syncMarkers(); } catch (e) {} });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
