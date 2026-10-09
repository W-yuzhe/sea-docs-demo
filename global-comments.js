/* ============ 全局评论组件（vanilla，无框架 / 无 CDN） ============
 * 接入 Sea 文档现有 localStorage 数据层 Store，评论存于当前文档的 globalComments 字段
 * （与划词评论 comments 字段互不干扰），刷新 / 跨页面共享均持久化。
 */
(function () {
  'use strict';

  if (typeof Store === 'undefined' || typeof UI === 'undefined') return;

  var CURRENT_USER = { name: 'Wang', color: '#3370ff' };
  var MEMBERS = [
    { name: '张伟', color: '#f2994a' },
    { name: '李娜', color: '#eb5757' },
    { name: '王芳', color: '#27ae60' },
    { name: '陈强', color: '#2d9cdb' },
    { name: '刘洋', color: '#9b51e0' }
  ];

  function uid() { return 'id' + Math.random().toString(36).slice(2, 9); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
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
    var md = (dt.getMonth() + 1) + '月' + dt.getDate() + '日' + p(dt.getHours()) + ':' + p(dt.getMinutes());
    var sameYear = dt.getFullYear() === new Date().getFullYear();
    return sameYear ? md : dt.getFullYear() + '年' + md;
  }
  // 完整时间：用于时间戳的 title，方便浏览时确认精确日期
  function fullTime(ts) {
    var d = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function renderContent(text) {
    var parts = String(text).split(/(@[^\s@，。！？、]+)/g);
    return parts.map(function (p) {
      return p.charAt(0) === '@' ? '<span class="gc-mention">' + esc(p) + '</span>' : esc(p);
    }).join('');
  }
  function avatar(name, color, size) {
    var ch = (name || '?').slice(0, 1);
    return '<div class="gc-avatar" style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';font-size:' + (size * 0.4) + 'px">' + esc(ch) + '</div>';
  }
  function fakePublish(fail) {
    return new Promise(function (res, rej) { setTimeout(function () { fail ? rej(new Error('fail')) : res(); }, 600); });
  }

  /* 图标 */
  var ICON = {
    lockClosed: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    lockOpen: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
    more: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    chevron: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    like: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>',
    comment: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
  };

  /* ============ 组件状态 ============ */
  var DOC_ID = parseInt(UI.getParam('id')) || 0;
  var state = {
    comments: [],
    replyingId: null,
    editingId: null,
    editReply: null,      // { pid, rid }
    openMenu: null,       // comment id（主菜单）
    openMenuR: null,      // reply id（回复菜单）
    expandedResolved: {}, // 已解决评论的展开集合
    lastAddedId: null     // 最近新增的评论 id（用于 0.3s 淡入动画）
  };

  var rootEl, listEl, sectionEl;

  /* ============ Toast ============ */
  var toastTimer = null;
  function showToast(msg, type) {
    var el = document.getElementById('gcToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gcToast';
      el.className = 'gc-toast';
      document.body.appendChild(el);
    }
    el.className = 'gc-toast ' + (type === 'error' ? 'error' : 'success');
    el.innerHTML = '<span>' + (type === 'error' ? '⚠️' : '✓') + '</span><span>' + esc(msg) + '</span>';
    el.style.display = 'flex';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.style.display = 'none'; }, 2000);
  }

  /* ============ 持久化 ============ */
  function loadGC() {
    var d = Store.find(DOC_ID);
    return (d && Array.isArray(d.globalComments)) ? d.globalComments.slice() : [];
  }
  function commit(next) {
    state.comments = next;
    try { Store.update(DOC_ID, { globalComments: next }); } catch (e) {}
    renderList();
  }

  function addComment(text, isPrivate) {
    var c = {
      id: uid(), author: CURRENT_USER, content: text, createdAt: Date.now(),
      isPrivate: isPrivate, isResolved: false, edited: false, replies: []
    };
    state.lastAddedId = c.id;
    commit(state.comments.concat([c]));
  }
  function addReply(pid, text) {
    commit(state.comments.map(function (c) {
      if (c.id !== pid) return c;
      return Object.assign({}, c, { replies: c.replies.concat([{
        id: uid(), author: CURRENT_USER, content: text, createdAt: Date.now(), edited: false
      }]) });
    }));
    showToast('回复成功');
  }
  function toggleResolve(id) {
    var nowResolved = false;
    commit(state.comments.map(function (c) {
      if (c.id !== id) return c;
      nowResolved = !c.isResolved;
      return Object.assign({}, c, { isResolved: nowResolved });
    }));
    if (nowResolved) state.expandedResolved[id] = true;
  }
  function editComment(id, text) {
    commit(state.comments.map(function (c) {
      return c.id === id ? Object.assign({}, c, { content: text, edited: true }) : c;
    }));
  }
  function editReply(pid, rid, text) {
    commit(state.comments.map(function (c) {
      if (c.id !== pid) return c;
      return Object.assign({}, c, { replies: c.replies.map(function (r) {
        return r.id === rid ? Object.assign({}, r, { content: text, edited: true }) : r;
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

  /* 点赞：与局部评论（editor.js likeComment）完全同构 —— likers[] / liked / likes */
  function toggleLike(target) {
    var me = CURRENT_USER.name;
    var likers = (target.likers || (target.liked ? [me] : [])).slice();
    var i = likers.indexOf(me);
    if (i >= 0) likers.splice(i, 1); else likers.push(me);
    return { likers: likers, liked: likers.indexOf(me) >= 0, likes: likers.length };
  }
  function likeComment(id) {
    commit(state.comments.map(function (c) {
      return c.id === id ? Object.assign({}, c, toggleLike(c)) : c;
    }));
  }
  function likeReply(pid, rid) {
    commit(state.comments.map(function (c) {
      if (c.id !== pid) return c;
      return Object.assign({}, c, { replies: c.replies.map(function (r) {
        return r.id === rid ? Object.assign({}, r, toggleLike(r)) : r;
      }) });
    }));
  }
  /* 点赞人列表文案：与局部评论一致（≤2 人列名，>2 人显示「X 等 N 人」） */
  function likesLine(target) {
    var likers = target.likers || (target.liked ? [CURRENT_USER.name] : []);
    var likeCount = target.likes || likers.length || 0;
    if (!likeCount) return '';
    var names = likers.length ? likers : [CURRENT_USER.name];
    var users = names.length <= 2 ? names.join('、') : (names[0] + ' 等 ' + names.length + ' 人');
    return '<div class="gc-likes"><span class="gc-like-ico">👍</span><span class="gc-like-users">' + esc(users) + ' 觉得很赞</span></div>';
  }

  /* ============ 输入框（@提及 / 私有 / 模拟失败） ============ */
  function createComposer(opts) {
    opts = opts || {};
    var box = document.createElement('div');
    box.className = 'gc-composer-box' + (opts.inline ? ' gc-composer-inline' : '');
    box.style.position = 'relative';
    box.innerHTML =
      '<div class="gc-mention-pop" style="display:none"></div>' +
      '<textarea class="gc-textarea" rows="' + (opts.compact ? 2 : 3) + '" placeholder="' + esc(opts.placeholder || '写下你的评论，输入 @ 可提及成员') + '"></textarea>' +
      '<div class="gc-composer-foot">' +
        '<div class="gc-composer-left">' +
          (opts.showPrivate !== false
            ? '<button type="button" class="gc-lock-btn"><span class="gc-lock-ic">' + ICON.lockOpen + '</span><span class="gc-lock-tx">私有</span></button>'
            : '') +
          '<button type="button" class="gc-simfail">模拟失败</button>' +
        '</div>' +
        '<button type="button" class="gc-send-btn" disabled>发送</button>' +
      '</div>';

    var ta = box.querySelector('.gc-textarea');
    var pop = box.querySelector('.gc-mention-pop');
    var sendBtn = box.querySelector('.gc-send-btn');
    var privBtn = box.querySelector('.gc-lock-btn');
    var simBtn = box.querySelector('.gc-simfail');

    var isPrivate = false, simFail = false, sending = false, mention = null;

    function refreshSend() { sendBtn.disabled = !ta.value.trim() || sending; }
    function hideMention() { pop.style.display = 'none'; mention = null; }
    function renderMention() {
      if (!mention) { hideMention(); return; }
      var q = mention.query;
      var list = MEMBERS.filter(function (mm) { return mm.name.indexOf(q) >= 0; });
      if (!list.length) { hideMention(); return; }
      pop.innerHTML = '<div class="gc-pop-title">选择成员</div>' + list.map(function (mm) {
        return '<button type="button" data-name="' + esc(mm.name) + '">' + avatar(mm.name, mm.color, 24) + '<span class="gc-mname">' + esc(mm.name) + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(pop.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () { insertMention(b.getAttribute('data-name')); });
      });
      pop.style.display = 'block';
    }
    function detectMention() {
      var caret = ta.selectionStart;
      var upto = ta.value.slice(0, caret);
      var mm = upto.match(/(?:^|\s)@([^\s@]*)$/);
      if (mm) { mention = { query: mm[1], start: caret - mm[1].length - 1 }; renderMention(); }
      else hideMention();
    }
    function insertMention(name) {
      var caret = ta.selectionStart;
      var s = mention ? mention.start : caret;
      var before = ta.value.slice(0, s);
      var after = ta.value.slice(caret);
      var nv = before + '@' + name + ' ' + after;
      ta.value = nv;
      hideMention();
      requestAnimationFrame(function () {
        ta.focus();
        var pos = nv.length - after.length;
        ta.setSelectionRange(pos, pos);
        refreshSend();
      });
    }
    function submit() {
      var t = ta.value.trim();
      if (!t || sending) return;
      sending = true; sendBtn.disabled = true; sendBtn.textContent = '发送中…'; hideMention();
      fakePublish(simFail).then(function () {
        opts.onSend(t, isPrivate);
        if (opts.toast) opts.toast('评论成功');
        ta.value = ''; isPrivate = false; updatePriv();
        sending = false; sendBtn.textContent = '发送'; refreshSend();
      }).catch(function () {
        showToast('发送失败，请重试', 'error');
        sending = false; sendBtn.textContent = '发送'; refreshSend();
      });
    }
    function updatePriv() {
      if (!privBtn) return;
      privBtn.classList.toggle('active', isPrivate);
      privBtn.querySelector('.gc-lock-ic').innerHTML = isPrivate ? ICON.lockClosed : ICON.lockOpen;
      privBtn.querySelector('.gc-lock-tx').textContent = isPrivate ? '仅特定人员可见' : '私有';
    }

    ta.addEventListener('input', function () { detectMention(); refreshSend(); });
    ta.addEventListener('click', detectMention);
    ta.addEventListener('keyup', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) >= 0) detectMention();
    });
    ta.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    if (privBtn) privBtn.addEventListener('click', function () { isPrivate = !isPrivate; updatePriv(); });
    simBtn.addEventListener('click', function () {
      simFail = !simFail;
      simBtn.classList.toggle('active', simFail);
      simBtn.textContent = simFail ? '✓ 模拟发送失败' : '模拟失败';
    });
    sendBtn.addEventListener('click', submit);

    refreshSend();
    if (privBtn) updatePriv();
    return box;
  }

  /* ============ 卡片渲染 ============ */
  function resolvedBar(c) {
    return '<div class="gc-resolved-bar" data-cid="' + c.id + '" data-act="expand">' +
      ICON.check +
      '<span>已解决 · ' + esc(c.author.name) + '</span>' +
      '<span class="gc-expand">展开 ' + ICON.chevron + '</span>' +
    '</div>';
  }

  function renderReply(pid, r) {
    var isMine = r.author.name === CURRENT_USER.name;
    var editing = state.editReply && state.editReply.rid === r.id;
    var menuOpen = state.openMenuR === r.id;
    var rLikers = r.likers || (r.liked ? [CURRENT_USER.name] : []);
    var rLikeCount = r.likes || rLikers.length || 0;
    var rLiked = !!r.liked;
    var body;
    if (editing) {
      body = '<div class="gc-edit-zone">' +
        '<textarea class="gc-edit-input" id="gcReplyEditInput-' + r.id + '" rows="2">' + esc(r.content) + '</textarea>' +
        '<div class="gc-edit-actions">' +
          '<button class="gc-btn-ghost" data-act="cancel-reply-edit">取消</button>' +
          '<button class="gc-btn-primary" data-act="save-reply-edit">确认</button>' +
        '</div></div>';
    } else {
      // 回复的操作栏：点赞 / 编辑 / 删除（不套嵌回复，故无「回复」）
      var rActions = '<div class="gc-card-actions">' +
        '<button class="gc-act like' + (rLiked ? ' liked' : '') + '" data-act="like" title="点赞">' +
          ICON.like + '<span>点赞</span>' +
          (rLikeCount ? '<span class="gc-like-count">' + rLikeCount + '</span>' : '') +
        '</button>' +
        '<button class="gc-act" data-act="reply-edit" title="编辑">编辑</button>' +
        '<button class="gc-act danger" data-act="delete-reply" title="删除">删除</button>' +
      '</div>';
      body = '<div class="gc-content">' + renderContent(r.content) + '</div>' +
        likesLine(r) + rActions;
    }
    var menu = menuOpen
      ? '<div class="gc-menu-mask" data-act="reply-menu-mask"></div><div class="gc-menu">' +
          '<button data-act="reply-edit">编辑</button>' +
          '<button class="danger" data-act="delete-reply">删除</button>' +
        '</div>'
      : '';
    return '<div class="gc-reply" data-cid="' + pid + '" data-rid="' + r.id + '">' +
      avatar(r.author.name, r.author.color, 26) +
      '<div class="gc-card-body">' +
        '<div class="gc-card-head">' +
          '<span class="gc-name">' + esc(r.author.name) + '</span>' +
          '<span class="gc-time" title="' + fullTime(r.createdAt) + '">' + formatTime(r.createdAt) + '</span>' +
          (r.edited ? '<span class="gc-edited">已编辑</span>' : '') +
          (isMine ? '<button class="gc-more-btn" data-act="reply-menu" title="更多">' + ICON.more + '</button>' : '') +
        '</div>' +
        body +
      '</div>' +
      menu +
    '</div>';
  }

  function renderCard(c) {
    var isMine = c.author.name === CURRENT_USER.name;
    if (c.isResolved && !state.expandedResolved[c.id]) return resolvedBar(c);

    var editing = state.editingId === c.id;
    var replying = state.replyingId === c.id;
    var menuOpen = state.openMenu === c.id;

    // 点赞态（与局部评论同构）
    var gLikers = c.likers || (c.liked ? [CURRENT_USER.name] : []);
    var gLikeCount = c.likes || gLikers.length || 0;
    var gLiked = !!c.liked;

    var head = '<div class="gc-card-head">' +
      '<span class="gc-name">' + esc(c.author.name) + '</span>' +
      (c.isPrivate ? '<span class="gc-badge-private">私有</span>' : '') +
      '<span class="gc-time" title="' + fullTime(c.createdAt) + '">' + formatTime(c.createdAt) + '</span>' +
      (c.edited ? '<span class="gc-edited">已编辑</span>' : '') +
      '<button class="gc-more-btn" data-act="menu" title="更多">' + ICON.more + '</button>' +
    '</div>';

    var body;
    if (editing) {
      body = '<div class="gc-edit-zone">' +
        '<textarea class="gc-edit-input" id="gcEditInput-' + c.id + '" rows="2">' + esc(c.content) + '</textarea>' +
        '<div class="gc-edit-actions">' +
          '<button class="gc-btn-ghost" data-act="cancel-edit">取消</button>' +
          '<button class="gc-btn-primary" data-act="save-edit">确认</button>' +
        '</div></div>';
    } else {
      // 操作栏：点赞 / 回复 / 编辑 / 删除（与右侧局部评论一致）
      var gActions = '<div class="gc-card-actions">' +
        '<button class="gc-act like' + (gLiked ? ' liked' : '') + '" data-act="like" title="点赞">' +
          ICON.like + '<span>点赞</span>' +
          (gLikeCount ? '<span class="gc-like-count">' + gLikeCount + '</span>' : '') +
        '</button>' +
        '<button class="gc-act" data-act="reply" title="回复">回复</button>' +
        '<button class="gc-act" data-act="edit" title="编辑">编辑</button>' +
        '<button class="gc-act danger" data-act="delete" title="删除">删除</button>' +
      '</div>';
      body = '<div class="gc-content">' + renderContent(c.content) + '</div>' +
        likesLine(c) + gActions +
        (replying ? '<div class="gc-reply-box" id="gcReplyBox-' + c.id + '"></div>' : '');
    }

    var repliesHtml = '';
    if (c.replies.length) {
      repliesHtml = '<div class="gc-replies">' + c.replies.map(function (r) { return renderReply(c.id, r); }).join('') + '</div>';
    }

    var menu = menuOpen
      ? '<div class="gc-menu-mask" data-act="menu-mask"></div><div class="gc-menu">' +
          '<button data-act="resolve">' + (c.isResolved ? '取消解决' : '标记为已解决') + '</button>' +
          (isMine ? '<button data-act="edit">编辑</button>' : '') +
          (isMine ? '<button class="danger" data-act="delete">删除</button>' : '') +
        '</div>'
      : '';

    var cls = 'gc-card' + (c.isPrivate ? ' private' : '') + (c.isResolved ? ' resolved' : '') + (c.id === state.lastAddedId ? ' gc-fade-in' : '');
    return '<div class="' + cls + '" data-cid="' + c.id + '">' +
      avatar(c.author.name, c.author.color, 32) +
      '<div class="gc-card-body">' + head + body + repliesHtml + '</div>' +
      menu +
    '</div>';
  }

  function emptyHTML() {
    return '<div class="gc-empty">' +
      '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#d4d7dd" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
        '<path d="M8.5 11h7M8.5 8h7M8.5 14h3.5" stroke="#e3e6ea"/>' +
      '</svg>' +
      '<p>暂无全文评论，快来发表第一条吧</p>' +
    '</div>';
  }

  function renderList() {
    if (!state.comments.length) { listEl.innerHTML = emptyHTML(); updateFab(); return; }
    // 按时间倒序展示（最新发布的评论在最上方）。
    // 只影响渲染顺序，不改变存储顺序：新增评论仍按时间追加落库，渲染时自然出现在顶部。
    var ordered = state.comments.slice().sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    listEl.innerHTML = ordered.map(renderCard).join('');
    ordered.forEach(function (c) {
      if (state.replyingId === c.id) {
        var box = document.getElementById('gcReplyBox-' + c.id);
        if (box) box.appendChild(createComposer({
          inline: true, compact: true, showPrivate: false,
          placeholder: '回复 @' + c.author.name,
          onSend: function (t) { addReply(c.id, t); }
        }));
      }
    });
    updateFab();
  }

  function updateFab() {
    var total = state.comments.reduce(function (n, c) { return n + 1 + c.replies.length; }, 0);
    var badge = document.getElementById('gcBadge');
    var cnt = document.getElementById('gcCount');
    if (cnt) cnt.textContent = '(' + total + ')';
    if (badge) {
      if (total > 0) { badge.style.display = 'flex'; badge.textContent = total; }
      else badge.style.display = 'none';
    }
  }

  function focusTextarea(sel) {
    var el = document.querySelector(sel);
    if (el) { el.focus(); var v = el.value; el.setSelectionRange(v.length, v.length); }
  }

  /* ============ 事件委托 ============ */
  function onListClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) {
      // 点击评论区内的非操作区（输入框、卡片空白）也不应误触关闭其他弹层
      e.stopPropagation();
      return;
    }
    // 评论区操作（点赞/回复/编辑/删除/解决）后不关闭其他弹层，阻止冒泡
    e.stopPropagation();
    var act = btn.getAttribute('data-act');
    var card = btn.closest('[data-cid]');
    var cid = card ? card.getAttribute('data-cid') : null;
    var replyEl = btn.closest('[data-rid]');
    var rid = replyEl ? replyEl.getAttribute('data-rid') : null;

    switch (act) {
      case 'like':
        // 回复内的点赞按钮命中 [data-rid]，主评论则没有 → 自动分流
        if (rid) likeReply(cid, rid); else likeComment(cid);
        break;
      case 'reply':
        state.replyingId = (state.replyingId === cid ? null : cid);   // 再次点击收起
        state.editingId = null; state.editReply = null; state.openMenu = null;
        renderList();
        if (state.replyingId === cid) focusTextarea('#gcReplyBox-' + cid + ' .gc-textarea');
        break;
      case 'edit':
        state.editingId = cid; state.openMenu = null; renderList(); focusTextarea('#gcEditInput-' + cid); break;
      case 'reply-edit':
        state.editReply = { pid: cid, rid: rid }; state.openMenuR = null; renderList(); focusTextarea('#gcReplyEditInput-' + rid); break;
      case 'menu':
        state.openMenu = (state.openMenu === cid ? null : cid); renderList(); break;
      case 'reply-menu':
        state.openMenuR = (state.openMenuR === rid ? null : rid); renderList(); break;
      case 'menu-mask':
        state.openMenu = null; renderList(); break;
      case 'reply-menu-mask':
        state.openMenuR = null; renderList(); break;
      case 'save-edit': {
        var se = card.querySelector('.gc-edit-input'); var t = se ? se.value.trim() : '';
        if (t) editComment(cid, t); state.editingId = null; renderList(); break;
      }
      case 'cancel-edit': state.editingId = null; renderList(); break;
      case 'save-reply-edit': {
        var re = replyEl.querySelector('.gc-edit-input'); var tr = re ? re.value.trim() : '';
        if (tr) editReply(cid, rid, tr); state.editReply = null; renderList(); break;
      }
      case 'cancel-reply-edit': state.editReply = null; renderList(); break;
      case 'save-reply': {
        var rb = document.querySelector('#gcReplyBox-' + cid + ' .gc-textarea');
        var rt = rb ? rb.value.trim() : '';
        if (rt) addReply(cid, rt);
        state.replyingId = null; renderList(); break;
      }
      case 'cancel-reply': state.replyingId = null; renderList(); break;
      case 'resolve':
        toggleResolve(cid); state.openMenu = null; renderList(); break;
      case 'delete':
        if (window.confirm('确定删除此评论？删除后不可恢复')) deleteComment(cid);
        state.openMenu = null; renderList(); break;
      case 'delete-reply':
        if (window.confirm('确定删除此回复？删除后不可恢复')) deleteReply(cid, rid);
        state.openMenuR = null; renderList(); break;
      case 'expand':
        state.expandedResolved[cid] = true; renderList(); break;
    }
  }

  /* ============ 初始化 ============ */
  function init() {
    var root = document.getElementById('gcRoot');
    if (!root || root.dataset.gcReady) {
      try { console.log('[sea] global-comments.init: gcRoot ' + (root ? 'already ready' : 'NOT FOUND')); } catch (e) {}
      return;
    }
    try { console.log('[sea] global-comments.init: starting'); } catch (e) {}
    root.dataset.gcReady = '1';

    state.comments = loadGC();

    root.innerHTML =
      '<button class="gc-fab" id="gcFab" title="跳到全文评论">' +
        ICON.comment +
        '<span>查看全文评论</span>' +
        '<span class="gc-badge" id="gcBadge" style="display:none">0</span>' +
      '</button>' +
      '<section class="gc-section" id="gcSection">' +
        '<div class="gc-section-head"><h2>全文评论 <span class="gc-count" id="gcCount">(0)</span></h2></div>' +
        '<div class="gc-composer-box" id="gcComposer" style="position:relative"></div>' +
        '<div class="gc-list" id="gcList"></div>' +
      '</section>';

    listEl = document.getElementById('gcList');
    sectionEl = document.getElementById('gcSection');

    var composerBox = document.getElementById('gcComposer');
    composerBox.appendChild(createComposer({ onSend: addComment, toast: showToast, placeholder: '写下你的全文评论，输入 @ 可提及成员' }));

    // 找到真正可滚动的祖先容器（这里是 .ed-main；body/.ed-wrap 是 overflow:hidden）
    function scrollContainerOf(el) {
      while (el && el !== document.body) {
        var st = getComputedStyle(el);
        if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
        el = el.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    }
    // 用容器 scrollTo 代替 scrollIntoView：
    // scrollIntoView 在嵌套滚动容器里易被用户滚动打断、且到底部时定位不准，看起来像「卡住」。
    function scrollToEl(el, smooth) {
      if (!el) return;
      var c = scrollContainerOf(el);
      var cRect = c.getBoundingClientRect(), eRect = el.getBoundingClientRect();
      var top = c.scrollTop + (eRect.top - cRect.top) - 12;
      var max = Math.max(0, c.scrollHeight - c.clientHeight);
      if (top > max) top = max;           // 已在底部附近时不再强行越界滚动
      try { c.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'auto' }); }
      catch (e2) { c.scrollTop = top; }   // 老浏览器降级
    }
    // 「查看全文评论」= 从文档开头直接跳到全局评论的第一条卡片
    // （列表按时间倒序，第一条即最新一条）。还没有评论时退回评论区顶部，
    // 让用户看到空状态和输入框。
    function scrollToFirstComment() {
      var first = listEl ? listEl.querySelector('.gc-card') : null;
      if (first) flashEl(first);
      scrollToEl(first || sectionEl, true);
      // PRD 图79：点击「查看全文评论」后，输入框自动获取焦点，光标闪烁
      setTimeout(function () {
        var composerTa = document.querySelector('#gcComposer .gc-textarea');
        if (composerTa) { composerTa.focus(); }
      }, 450);
    }
    // 落点闪烁一下，让用户看清跳到了哪一条
    function flashEl(el) {
      el.classList.remove('gc-flash');
      void el.offsetWidth;                 // 强制重排，便于重复触发动画
      el.classList.add('gc-flash');
      setTimeout(function () { el.classList.remove('gc-flash'); }, 1500);
    }
    document.getElementById('gcFab').addEventListener('click', scrollToFirstComment);

    // 评论区进入视口后淡出悬浮按钮：底部完全交给滚动条操作，
    // 避免按钮挡住最后几条评论、也避免和右侧滚动条抢操作区域。
    if (window.IntersectionObserver && sectionEl) {
      try {
        new IntersectionObserver(function (entries) {
          var fab = document.getElementById('gcFab');
          if (fab) fab.classList.toggle('gc-fab-hidden', !!entries[0].isIntersecting);
        }, { threshold: 0.15 }).observe(sectionEl);
      } catch (e) {}
    }

    listEl.addEventListener('click', onListClick);
    try { console.log('[sea] global-comments.init: done, fab=', !!document.getElementById('gcFab'), 'section=', !!document.getElementById('gcSection')); } catch (e) {}

    window.GlobalComments = {
      // 打开全文评论：平滑滚动到底部评论区 + 输入框自动聚焦（PRD）
      openPanel: function () {
        try { console.log('[sea] GlobalComments.openPanel called'); } catch (e) {}
        if (!sectionEl) return;
        // gcSection 现在位于文档底部，平滑滚动到它并聚焦输入框
        scrollToFirstComment();
        setTimeout(function () {
          var ta = document.querySelector('#gcComposer .gc-textarea');
          if (ta) { ta.focus(); }
        }, 400);
      },
      closePanel: function () {
        // 全文评论是文档底部固定 section，不随面板关闭而隐藏
      },
      togglePanel: function () {
        // 全文评论始终在文档底部，无需 toggle
      },
      add: function (text, isPrivate) {
        if (text && text.trim()) addComment(text.trim(), !!isPrivate);
      },
      getComments: function () { return state.comments.slice(); }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
