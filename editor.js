/* ===== editor.js：编辑器页所有逻辑，今后编辑器新功能只改本文件 ===== */
(function () {
  'use strict';

  if (typeof Store === 'undefined' || typeof UI === 'undefined') return;

  var DOC_ID = parseInt(UI.getParam('id')) || 0;
  var DOC = Store.find(DOC_ID);
  var bodyEl = document.getElementById('edBody');
  var titleInput = document.getElementById('titleInput');
  var crumbTitle = document.getElementById('crumbTitle');
  var crumbIcon = document.getElementById('crumbIcon');
  var crumbSub = document.getElementById('crumbSub');
  var pinBtn = document.getElementById('pinBtn');
  var moreBtn = document.getElementById('moreBtn');
  var searchBtn = document.getElementById('searchBtn');
  var bellBtn = document.getElementById('bellBtn');
  var homeBtn = document.getElementById('homeBtn');
  var menuBtn = document.getElementById('menuBtn');
  var drawer = document.getElementById('drawer');
  var avatarBtn = document.getElementById('avatarBtn');
  var avatarMenu = document.getElementById('avatarMenu');
  var morePop = document.getElementById('morePop');
  var searchPop = document.getElementById('searchPop');
  var notifPop = document.getElementById('notifPop');
  var historyPop = document.getElementById('historyPop');
  var titleZone = document.getElementById('titleZone');
  var addIconBtn = document.getElementById('addIconBtn');
  var addCoverBtn = document.getElementById('addCoverBtn');
  var titleIcon = document.getElementById('titleIcon');
  var findBar = document.getElementById('findBar');
  var findInput = document.getElementById('findInput');
  var replaceInput = document.getElementById('replaceInput');
  var findCount = document.getElementById('findCount');
  var findPrev = document.getElementById('findPrev');
  var findNext = document.getElementById('findNext');
  var replaceAll = document.getElementById('replaceAll');
  var replaceOne = document.getElementById('replaceOne');
  var findClose = document.getElementById('findClose');
  var outlinePanel = document.getElementById('outlinePanel');
  var outlineBurger = document.getElementById('outlineBurger');
  var opBody = document.getElementById('opBody');
  var coverModal = document.getElementById('coverModal');
  var cvBody = document.getElementById('cvBody');
  var cvClose = document.getElementById('cvClose');
  var edCover = document.getElementById('edCover');
  var edCoverImg = document.getElementById('edCoverImg');
  var edCoverEditBtn = document.getElementById('edCoverEditBtn');
  var edCoverMenu = document.getElementById('edCoverMenu');
  var rowTypeHandle = document.getElementById('rowTypeHandle');
  var rowMenu = document.getElementById('rowMenu');
  var typePop = document.getElementById('typePop');
  var colorPop = document.getElementById('colorPop');
  var rmTypeBtn = document.getElementById('rmTypeBtn');
  var rmColorBtn = document.getElementById('rmColorBtn');
  var sbBar = document.getElementById('selBar');
  var sbTitleBtn = document.getElementById('sbTitleBtn');
  var sbAlignBtn = document.getElementById('sbAlignBtn');
  var sbLinkBtn = document.getElementById('sbLinkBtn');
  var sbCommentBtn = document.getElementById('sbCommentBtn');
  var sbColorBtn = document.getElementById('sbColorBtn');
  var linkPop = document.getElementById('linkPop');
  var linkInput = document.getElementById('linkInput');
  var linkErr = document.getElementById('linkErr');
  var linkCancel = document.getElementById('linkCancel');
  var linkOk = document.getElementById('linkOk');
  var linkHoverBar = document.getElementById('linkHoverBar');
  var linkEdit = document.getElementById('linkEdit');
  var linkEditText = document.getElementById('linkEditText');
  var linkEditUrl = document.getElementById('linkEditUrl');
  var linkEditErr = document.getElementById('linkEditErr');
  var linkEditCancel = document.getElementById('linkEditCancel');
  var linkEditOk = document.getElementById('linkEditOk');
  var alignPop = document.getElementById('alignPop');
  var cpExpand = document.getElementById('cpExpand');
  var cpBody = document.getElementById('cpBody');
  var cpFont = document.getElementById('cpFont');
  var cpBg = document.getElementById('cpBg');
  var cpReset = document.getElementById('cpReset');
  var commentPanel = document.getElementById('commentPanel');
  var commentBtn = document.getElementById('commentBtn');
  var scrollToggle = document.getElementById('scrollToggle');
  var likeBtn = document.getElementById('likeBtn');
  var gcRoot = document.getElementById('gcRoot');
  var renamePop = document.getElementById('renamePop');
  var rnInput = document.getElementById('rnInput');
  var rnIcon = document.getElementById('rnIcon');
  var rnSearchWrap = document.getElementById('rnSearchWrap');
  var rnSearch = document.getElementById('rnSearch');
  var rnClear = document.getElementById('rnClear');
  var rnBody = document.getElementById('rnBody');
  var rnCats = document.getElementById('rnCats');
  var rnRandom = document.getElementById('rnRandom');
  var rnTabEmoji = document.getElementById('rnTabEmoji');
  var rnTabIcon = document.getElementById('rnTabIcon');
  var rnRemove = document.getElementById('rnRemove');
  var toast = document.getElementById('toast');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function uid(prefix) { return (prefix || 'id') + Math.random().toString(36).slice(2, 9); }
  function now() { return Store.now(); }
  function fmtTime(ts) {
    var d = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function textOf(html) {
    var d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function firstText(html, n) {
    var t = textOf(html); return t ? t.slice(0, n) + (t.length > n ? '…' : '') : '（空文档）';
  }
  function wordCount(html) { return (document.createElement('div').textContent || '').replace(/\s+/g, ' ').length; }
  function saveDoc() {
    if (!DOC_ID || !DOC) return false;
    var title = titleInput.value.trim() || '未命名文档';
    var content = bodyEl.innerHTML;
    var changed = title !== DOC.title || content !== DOC.content;
    if (!changed) return false;
    Store.update(DOC_ID, { title: title, content: content });
    History.log(DOC_ID, '修改了文档');
    return true;
  }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  var scheduleSave = debounce(saveDoc, 800);
  function captureHistory() {
    if (!DOC_ID || !DOC) return;
    var content = bodyEl.innerHTML;
    var title = titleInput.value.trim() || '未命名文档';
    var history = DOC.history || [];
    if (!history.length || history[0].content_snapshot !== content || history[0].title_snapshot !== title) {
      history.unshift({
        version_id: uid('v'), content_snapshot: content, title_snapshot: title,
        word_count: wordCount(content), created_at: Date.now(), summary: firstText(content, 24)
      });
      if (history.length > 50) history.length = 50;
      Store.update(DOC_ID, { history: history });
    }
  }
  function openPop(el) {
    if (!el) return;
    closePops();
    el.classList.add('open');
    el.style.display = 'block';
  }
  function closePops() {
    [morePop, searchPop, notifPop, historyPop, commentPanel, renamePop, coverModal, edCoverMenu, linkPop, linkEdit, alignPop, typePop, colorPop, rowMenu].forEach(function (el) {
      if (el) { el.classList.remove('open'); el.style.display = 'none'; }
    });
    if (avatarMenu) avatarMenu.classList.remove('open');
    // 查找替换栏（findBar）也需一并关闭（含高亮清理）
    if (findBar && (findBar.style.display !== 'none')) {
      closeSearch();
    }
    if (drawer && drawer.classList.contains('open')) drawer.classList.remove('open');
  }
  /* 点空白关闭：关闭所有「编辑器内」的弹层。首页/全局评论/下载面板各有自己的遮罩，不受此影响。 */
  function togglePop(el) {
    if (!el) return;
    if (el.classList.contains('open')) { closePops(); return; }
    openPop(el);
  }
  function renderMore(doc) {
    if (!morePop) return;
    var canDownload = typeof Download !== 'undefined' && Download.canDownload(doc);
    var items = [
      ['find', '查找和替换', UI.icons.search],
      ['pin', '添加到置顶', UI.icons.pin],
      ['fav', '收藏', doc.favorite ? UI.icons.starOn : UI.icons.starOff],
      ['download', '下载为', '↓'],
      ['history', '历史记录', '⏱'],
      ['delete', '删除', '✕', 'danger']
    ];
    morePop.innerHTML = items.map(function (i) {
      var cls = 'more-item';
      if (i[0] === 'download' && !canDownload) cls += ' disabled';
      if (i[3]) cls += ' ' + i[3];
      return '<div class="' + cls + '" data-m="' + i[0] + '"><span class="mi mi-svg">' + i[2] + '</span><span>' + i[1] + '</span></div>';
    }).join('');
  }
  function closeDrawer() {
    if (drawer && drawer.classList.contains('open')) drawer.classList.remove('open');
  }
  function showHistory() {
    if (!DOC || !DOC.history || !DOC.history.length) return;
    renderMore(DOC);
    var menu = morePop.querySelector('[data-m="history"]');
    if (menu) { menu.addEventListener('click', function () { HistoryTime.open(); }); }
  }
  function openHistory() {
    // history-time.js 在 editor.js 之后加载，HistoryTime 可能尚未就绪 → 轮询等待
    function tryOpen() {
      if (typeof HistoryTime !== 'undefined' && HistoryTime.open) {
        HistoryTime.open();
      } else {
        setTimeout(tryOpen, 50);
      }
    }
    tryOpen();
  }
  function renderOutline() {
    if (!opBody) return;
    var lines = bodyEl.querySelectorAll('.ed-line[data-type]');
    var heads = [];
    lines.forEach(function (line) {
      var type = line.getAttribute('data-type');
      if (type === 'h1' || type === 'h2' || type === 'h3') heads.push({ type: type, text: textOf(line.innerHTML) });
    });
    opBody.innerHTML = heads.length ? heads.map(function (h, i) {
      return '<div class="outline-item ' + h.type + '" data-i="' + i + '"><span>' + esc(h.text) + '</span></div>';
    }).join('') : '<div class="outline-empty">暂无标题</div>';
  }
  function updateOutline() {
    renderOutline();
    if (typeof syncOutlineBurger === 'function') syncOutlineBurger();
    if (outlinePanel && outlinePanel.classList.contains('open')) openPop(outlinePanel);
  }
  function setLineType(type) {
    var sel = window.getSelection();
    if (!sel.rangeCount || !sel.anchorNode) return;
    var node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
    var line = node.closest('.ed-line');
    if (!line) return;
    line.setAttribute('data-type', type);
    line.classList.remove('line-h1', 'line-h2', 'line-h3', 'line-body');
    line.classList.add(type === 'body' ? 'line-body' : 'line-' + type);
    captureHistory(); scheduleSave();
  }
  function removeLine() {
    var sel = window.getSelection();
    if (!sel.rangeCount || !sel.anchorNode) return;
    var node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
    var line = node.closest('.ed-line');
    if (!line) return;
    var parent = line.parentNode;
    if (parent) parent.removeChild(line);
    captureHistory(); scheduleSave();
  }
  var lineAtSelection = function () {
    var sel = window.getSelection();
    if (!sel.rangeCount || !sel.anchorNode) return null;
    var node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
    return node && node.closest ? node.closest('.ed-line') : null;
  };
  var currentLine = null; // 行级 H+ 入口悬停的行（renderColors / selBar 共用）
  function toggleRowMenu() {
    var open = rowMenu.classList.contains('open');
    closePops();
    if (!open && rowMenu) openPop(rowMenu);
  }
  /* ============ 标题/正文二级浮层（正文 / H1 / H2 / H3）============
     从行操作菜单的「标题/正文」进入。
     定位贴 **rowMenu 的右侧**（不是菜单里那个按钮）——按钮本身在菜单左上角，
     贴它会让浮层跑到视口左上角、盖住面包屑。
     点 typePop 内部时 setLineTypeAtLine() 用 currentLine 定位，不依赖光标 ——
     点菜单时光标已不在正文里，用 getSelection() 会取不到行。 */
  /* 目标行：打开浮层的那一刻锁定。
     ⚠️ 悬浮工具条的 T 按钮走的是这里，而 currentLine 是「hover 某行时缓存的」——
        用户先划选文字再点 T，此时 currentLine 可能是别的行甚至已被清空，
        导致点一级/二级标题改不到想要的行、或干脆没反应。 */
  var typeTargetLine = null;
  function placeTypePop(anchorEl) {
    if (!typePop) return;
    typePop.style.right = 'auto'; typePop.style.bottom = 'auto';
    var w = typePop.offsetWidth, h = typePop.offsetHeight;
    if (!w || !h) return;
    // 定位基准优先级：传入的锚点（一般是 rowMenu）→ 该行 → 视口左上
    var base = null;
    // 优先级：显式锚点（rowMenu）> 打开时锁定的目标行 > hover 缓存行
    if (anchorEl && anchorEl.getBoundingClientRect && anchorEl !== typeTargetLine) {
      var ab = anchorEl.getBoundingClientRect();
      if (ab && ab.width) base = ab;
    }
    if (!base && typeTargetLine) base = typeTargetLine.getBoundingClientRect();
    if ((!base || !base.width) && currentLine) base = currentLine.getBoundingClientRect();
    if (!base) { typePop.style.left = '8px'; typePop.style.top = '64px'; return; }
    var left = base.right + 6;
    if (left + w > window.innerWidth - 8) left = base.left - w - 6;   // 右侧放不下 → 翻到左侧
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var top = base.top;
    if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
    typePop.style.left = left + 'px';
    typePop.style.top = top + 'px';
  }

  function toggleTypePop() {
    var open = typePop.classList.contains('open');
    closePops();
    if (!open && typePop) {
      // 优先用选区所在行，其次用 hover 缓存行
      var target = null;
      try {
        var sel = window.getSelection();
        if (sel && sel.rangeCount && sel.anchorNode) {
          var n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
          var l = n && n.closest ? n.closest('.ed-line') : null;
          if (l && bodyEl.contains(l)) target = l;
        }
      } catch (er) { }
      if (!target && currentLine && bodyEl.contains(currentLine)) target = currentLine;
      typeTargetLine = target;
      openPop(typePop);
      placeTypePop(typeTargetLine);
    }
  }
  function toggleColorPop() {
    var open = colorPop.classList.contains('open');
    closePops();
    if (!open && colorPop) openPop(colorPop);
  }
  /* 取「当前操作的目标行」。
     ⚠️ 这个函数曾被 setColor / setBg / resetColor 调用但**从未定义**，
        导致行级颜色功能一进静默报错、什么都不做。补上并加 currentLine 回退：
        点色板时鼠标已不在正文里，getSelection() 常取不到行。 */
  function lineAtSelection() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount && sel.anchorNode) {
      var n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
      var line = n && n.closest ? n.closest('.ed-line') : null;
      if (line && bodyEl.contains(line)) return line;
    }
    if (currentLine && bodyEl.contains(currentLine)) return currentLine;
    return null;
  }
  function setColor(color) {
    var line = lineAtSelection(); if (!line) return;
    line.style.color = color; captureHistory(); scheduleSave(); closePops();
  }
  function setBg(color) {
    var line = lineAtSelection(); if (!line) return;
    line.style.background = color; captureHistory(); scheduleSave(); closePops();
  }
  function resetColor() {
    var line = lineAtSelection(); if (!line) return;
    line.style.color = ''; line.style.background = ''; captureHistory(); scheduleSave(); closePops();
  }
  function renderColors() {
    if (!cpFont || !cpBg) return;
    var colors = ['#1f2329', '#5b5fc7', '#e05360', '#3ecf8e', '#f5a623', '#7b86f2', '#00a3a3', '#ffffff'];
    cpFont.innerHTML = colors.map(function (c) { return '<button class="color-dot" data-c="' + c + '" style="background:' + c + '"></button>'; }).join('');
    cpBg.innerHTML = colors.map(function (c) { return '<button class="color-dot bg" data-c="' + c + '" style="background:' + c + '"></button>'; }).join('');
  }
  function showSelBar() {
    var sel = window.getSelection();
    if (!sel.rangeCount || !sel.toString()) { sbBar.style.display = 'none'; return; }
    sbBar.style.display = 'flex';
    var r = sel.getRangeAt(0);
    var rect = r.getBoundingClientRect();
    sbBar.style.left = rect.left + rect.width / 2 - sbBar.offsetWidth / 2 + 'px';
    sbBar.style.top = Math.max(0, rect.top - 46) + 'px';
  }
  function hideSelBar() {
    var sel = window.getSelection();
    if (!sel.rangeCount || !sel.toString()) sbBar.style.display = 'none';
  }
  /* execCommand 命令名映射：HTML 的 data-sb 值 ≠ document.execCommand 的命令名。
     尤其删除线：按钮标 data-sb="strike"，但 execCommand 只认 'strikeThrough'，
     直接透传会让删除线静默失效（execCommand 对未知命令不报错、什么都不做）。 */
  var EXEC_CMD_MAP = { strike: 'strikeThrough' };
  function execFormat(cmd) {
    var real = EXEC_CMD_MAP[cmd] || cmd;
    // 点工具条会丢失选区，先把选区存下来，用完再恢复 —— 否则 execCommand 无处施力
    var sel = window.getSelection();
    var saved = (sel && sel.rangeCount) ? sel.getRangeAt(0) : null;
    if (saved) {
      var sel2 = window.getSelection();
      sel2.removeAllRanges();
      sel2.addRange(saved);
    }
    var ok = false;
    try { ok = document.execCommand(real, false, null); } catch (er) { ok = false; }
    captureHistory(); scheduleSave();
    if (saved) { try { window.getSelection().removeAllRanges(); window.getSelection().addRange(saved); } catch (er) { } }
    showSelBar();
    return ok;
  }
  function openLinkPop() {
    var sel = window.getSelection();
    if (!sel.toString()) { UI.toast('请先选择要添加链接的文字'); return; }
    linkPop.classList.add('open'); linkPop.style.display = 'block';
    linkInput.value = ''; linkErr.style.display = 'none'; linkOk.disabled = true;
  }
  function validUrl(v) { return /^https?:\/\/\S+$/i.test(v.trim()); }
  function closeLinkPop() { linkPop.classList.remove('open'); linkPop.style.display = 'none'; }
  function confirmLink() {
    if (!validUrl(linkInput.value)) { linkErr.style.display = 'block'; return; }
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    document.execCommand('createLink', false, linkInput.value.trim());
    captureHistory(); scheduleSave(); closeLinkPop(); UI.toast('链接已添加');
  }
  function openLinkEdit() {
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var a = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
    a = a.closest ? a.closest('a') : a;
    if (!a) return;
    linkEditText.value = a.textContent; linkEditUrl.value = a.getAttribute('href') || '';
    linkEditErr.style.display = 'none';
    linkEdit.classList.add('open'); linkEdit.style.display = 'block';
  }
  function closeLinkEdit() { linkEdit.classList.remove('open'); linkEdit.style.display = 'none'; }
  function confirmLinkEdit() {
    if (!validUrl(linkEditUrl.value)) { linkEditErr.style.display = 'block'; return; }
    var a = linkEdit.querySelector('a'); if (a) { a.setAttribute('href', linkEditUrl.value.trim()); }
    var sel = window.getSelection();
    if (sel.rangeCount && sel.anchorNode) sel.getRangeAt(0).surroundContents(linkEditText.value);
    captureHistory(); scheduleSave(); closeLinkEdit(); UI.toast('链接已更新');
  }
  function showLinkHoverBar() {
    var sel = window.getSelection();
    if (!sel.rangeCount || !sel.toString()) { linkHoverBar.style.display = 'none'; return; }
    var a = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
    a = a.closest ? a.closest('a') : a;
    if (!a) { linkHoverBar.style.display = 'none'; return; }
    linkHoverBar.style.display = 'flex';
  }
  function openAlignPop() {
    var open = alignPop.classList.contains('open');
    closePops();
    if (!open && alignPop) openPop(alignPop);
  }
  function alignText(align) {
    document.execCommand('justify' + align);
    captureHistory(); scheduleSave(); closePops();
  }
  function openCover() {
    coverModal.classList.add('open'); coverModal.style.display = 'flex';
    switchCoverTab('lib');
  }
  var coverTab = 'lib';  // 'lib' | 'upload'
  // 切换封面弹窗 tab（官方图库 / 本地上传）
  function switchCoverTab(tab) {
    if (!coverModal) return;
    coverTab = tab;
    var tabs = coverModal.querySelectorAll('[data-tab]');
    Array.prototype.forEach.call(tabs, function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    if (tab === 'lib') renderCoverLibrary();
    else renderCoverUpload();
  }
  function renderCoverLibrary() {
    if (!cvBody) return;
    var curId = DOC.cover ? DOC.cover.id : null;
    cvBody.innerHTML = '<div class="cv-grid">' + COVERS.map(function (c) {
      return '<div class="cv-grid-item' + (curId === c.id ? ' selected' : '') + '" data-cv="' + c.id + '" title="' + esc(c.name) + '">' + c.svg + '</div>';
    }).join('') + '</div>';
  }
  // 本地上传页面：文件选择 + 预览 + 校验
  function renderCoverUpload() {
    if (!cvBody) return;
    cvBody.innerHTML =
      '<div class="cv-upload">' +
        '<div class="cv-upload-box" id="cvUploadBox" title="点击选择图片">' +
          '<span>点击选择本地图片<br>支持 JPG / PNG / GIF</span>' +
        '</div>' +
        '<div class="cv-upload-preview" id="cvUploadPreview" style="display:none"></div>' +
        '<button class="cv-upload-btn" id="cvUploadConfirm" style="display:none">确认使用</button>' +
        '<div class="cv-upload-tips">提示：图片过大或格式不支持时会提示错误并阻止上传；上传失败将回退到原封面。</div>' +
        '<input type="file" id="cvUploadFile" accept="image/*" hidden>' +
      '</div>';
    var box = document.getElementById('cvUploadBox');
    var fileInput = document.getElementById('cvUploadFile');
    var preview = document.getElementById('cvUploadPreview');
    var confirmBtn = document.getElementById('cvUploadConfirm');
    box.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      handleCoverUploadFile(fileInput.files[0]);
    });
    if (confirmBtn) confirmBtn.addEventListener('click', function () { confirmCoverUpload(); });
  }
  // 处理本地上传文件：前置校验（格式/大小）
  var pendingCoverDataUrl = null;
  function handleCoverUploadFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      UI.toast('仅支持图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      UI.toast('图片过大，请选择 5MB 以内的图片');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      pendingCoverDataUrl = reader.result;
      var preview = document.getElementById('cvUploadPreview');
      var confirmBtn = document.getElementById('cvUploadConfirm');
      if (preview) {
        preview.style.display = 'block';
        preview.innerHTML = '<img src="' + reader.result + '" style="max-width:100%;max-height:240px;border-radius:8px">';
      }
      if (confirmBtn) confirmBtn.style.display = 'block';
    };
    reader.onerror = function () {
      UI.toast('图片读取失败，请重试');
    };
    reader.readAsDataURL(file);
  }
  // 确认使用本地上传封面
  function confirmCoverUpload() {
    if (!pendingCoverDataUrl) { UI.toast('请先选择图片'); return; }
    var svg = '<img src="' + pendingCoverDataUrl + '" style="width:100%;height:100%;object-fit:cover">';
    edCover.style.display = 'block'; edCoverImg.innerHTML = svg;
    if (addCoverBtn) addCoverBtn.style.display = 'none';
    Store.update(DOC_ID, { cover: { id: 'upload_' + Date.now(), name: '本地上传', svg: svg } });
    closePops(); UI.toast('封面已上传');
    pendingCoverDataUrl = null;
  }
  // 设置封面：占位 + 隐藏「添加封面」按钮
  function applyCover(cover) {
    edCover.style.display = 'block'; edCoverImg.innerHTML = cover.svg;
    if (addCoverBtn) addCoverBtn.style.display = 'none';  // 已有封面 → 隐藏添加封面入口
    Store.update(DOC_ID, { cover: { id: cover.id, name: cover.name, svg: cover.svg } });
    closePops();
  }
  // 随机封面（PRD：点击「添加封面」随机设置一张）
  function setRandomCover() {
    var pool = COVERS.filter(function (c) { return !(DOC.cover && DOC.cover.id === c.id); }) || COVERS;
    var c = pool[Math.floor(Math.random() * pool.length)] || COVERS[0];
    if (!c) return;
    applyCover(c);
    UI.toast('已随机设置封面');
  }
  function pickCover(id) {
    var c = COVERS.find(function (x) { return x.id === id; });
    if (!c) return;
    applyCover(c);
    UI.toast('封面已添加');
  }
  function removeCover() {
    edCover.style.display = 'none'; edCoverImg.innerHTML = '';
    if (addCoverBtn) addCoverBtn.style.display = '';  // 还原为无封面 → 恢复「添加封面」按钮
    Store.update(DOC_ID, { cover: null }); UI.toast('封面已移除');
  }
  function renderCoverMenu() { edCoverMenu.style.display = 'block'; }
  function hideCoverMenu() { edCoverMenu.style.display = 'none'; }
  function openRename(anchorEl) {
    rnInput.value = DOC.title || ''; rnIcon.innerHTML = DOC.icon ? esc(DOC.icon.value) : '';
    switchIconTab('emoji');
    renamePop.classList.add('open'); renamePop.style.display = 'block';
    placeRename(anchorEl);
  }
  /* 定位重命名/图标弹层：贴着触发按钮下方展开，并做视口边界收敛。
     ⚠️ 必须显式设 top/left —— .ed-pop 只有 position:fixed，没有默认坐标，
        不设就停在文档流原位（在视口外），表现为「点了没反应」。 */
  function placeRename(anchorEl) {
    if (!renamePop) return;
    var el = anchorEl || rnIcon || addIconBtn || crumbTitle;
    if (!el || !el.getBoundingClientRect) return;
    renamePop._anchor = el;                      // 供 resize 重定位
    var r = el.getBoundingClientRect();
    renamePop.style.right = 'auto';
    renamePop.style.bottom = 'auto';
    var w = renamePop.offsetWidth, h = renamePop.offsetHeight;
    if (!w || !h) return;                       // 未布局完时下次调用再算
    var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) {     // 下方放不下 → 翻到上方
      top = Math.max(8, r.top - h - 6);
    }
    renamePop.style.left = left + 'px';
    renamePop.style.top = top + 'px';
  }
  function closeRename() { renamePop.classList.remove('open'); renamePop.style.display = 'none'; }
  function saveRename() {
    var title = rnInput.value.trim() || '未命名文档';
    Store.update(DOC_ID, { title: title });
    titleInput.value = title; crumbTitle.textContent = title; document.title = title;
    closeRename(); UI.toast('已重命名');
  }
  var iconTab = 'emoji';
  function switchIconTab(tab) {
    iconTab = tab;
    rnTabEmoji.classList.toggle('active', tab === 'emoji'); rnTabIcon.classList.toggle('active', tab === 'icon');
    if (tab === 'emoji') { rnSearchWrap.style.display = 'none'; rnCats.style.display = 'block'; rnSearch.value = ''; }
    else { rnSearchWrap.style.display = 'block'; rnCats.style.display = 'block'; }
    renderIconList(tab);
  }
  function selectIcon(type, value) {
    Store.update(DOC_ID, { icon: { type: type, value: value } });
    titleIcon.innerHTML = esc(value); crumbIcon.innerHTML = esc(value);
    closeRename(); UI.toast('图标已更新');
  }
  function removeIcon() {
    Store.update(DOC_ID, { icon: null }); titleIcon.innerHTML = ''; crumbIcon.innerHTML = '';
    closeRename(); UI.toast('图标已移除');
  }
  var EMOJI_CATS = [
    { name: '表情', list: ['😊','🚀','📌','💡','📝','🌟','📚','🧠','🔥','🎯','❤️','⭐','✅','⚡','🎉','📊','🔍','💼','🛠️','📅'] },
    { name: '自然', list: ['🌱','🌲','🌻','🌙','☀️','⛅','🌧️','❄️','🌈','🍀'] },
    { name: '食物', list: ['🍎','🍕','🍔','☕','🍰','🍩','🍪','🥗','🍜','🍣'] },
    { name: '动物', list: ['🐱','🐶','🐼','🦊','🐯','🐨','🐸','🐧','🦁','🐰'] }
  ];
  var ICONS_LIB = [
    { name: '文档', list: ['📄','📋','📑','🗂️','📰','📜','✉️','📨','📩','📝'] },
    { name: '数据', list: ['📊','📈','📉','💹','💰','💵','💴','💶','💷','💳'] },
    { name: '媒体', list: ['🎵','🎬','📷','📹','🎨','🎭','🎮','🎲','🎯','🎺'] },
    { name: '符号', list: ['✔️','❌','❓','❗','⚠️','🔔','🔕','🔒','🔓','🔑'] }
  ];
  function renderEmojiList(catIdx) {
    var cat = EMOJI_CATS[catIdx] || EMOJI_CATS[0];
    rnBody.innerHTML = '<div class="rn-cat-title">' + esc(cat.name) + '</div>' +
      cat.list.map(function (x) { return '<button class="icon-item" data-icon="' + esc(x) + '" data-type="emoji">' + esc(x) + '</button>'; }).join('');
  }
  function renderIconListSearch(q) {
    q = (q || '').trim().toLowerCase();
    var pool = [];
    if (!q) { EMOJI_CATS.forEach(function (c) { pool = pool.concat(c.list); }); }
    else { pool = EMOJI_CATS[0].list.concat(ICONS_LIB[0].list); }
    var hit = q ? pool.filter(function (e) { return String(e).toLowerCase().indexOf(q) >= 0; }) : pool;
    rnBody.innerHTML = hit.length
      ? hit.map(function (x) { return '<button class="icon-item" data-icon="' + esc(x) + '" data-type="emoji">' + esc(x) + '</button>'; }).join('')
      : '<div class="rn-empty">没有匹配的图标</div>';
  }
  function renderIconCats(target) {
    var lib = target === 'icon' ? ICONS_LIB : EMOJI_CATS;
    // 骰子图标由 CSS 伪元素绘制（.rn-random::before），这里不要塞 emoji 字符，否则会盖住骰子
    rnCats.innerHTML = '<div class="rn-random" id="rnRandom" title="随机"></div>' +
      lib.map(function (c, i) { return '<button class="rn-cat' + (i === 0 ? ' active' : '') + '" data-cat="' + (target === 'icon' ? ('i' + i) : i) + '">' + esc(c.name) + '</button>'; }).join('');
  }
  function renderIconList(target) {
    target = target || 'emoji';
    if (target === 'icon') renderIconCats('icon');
    else renderIconCats('emoji');
    renderEmojiList(0);
  }
  function openSearch() {
    searchPop.classList.add('open'); searchPop.style.display = 'block';
    if (findBar) {
      findBar.style.display = 'block'; findBar.classList.add('open');
      // 默认回到「查找」模式（隐藏替换专属元素），与 HTML 中 find tab 默认 active 一致
      findBar.classList.add('mode-find');
      Array.prototype.forEach.call(findBar.querySelectorAll('[data-fbtab]'), function (t) {
        t.classList.toggle('active', t.getAttribute('data-fbtab') === 'find');
      });
    }
    if (findInput) findInput.focus();
  }
  function closeSearch() {
    if (findHL) { try { CSS.highlights.delete(findHL); } catch (e) {} findHL = null; }
    document.body.classList.remove('find-active');
    if (findBar) {
      findBar.style.display = 'none'; findBar.classList.remove('open');
      findBar.classList.remove('mode-find');
    }
    if (searchPop) { searchPop.classList.remove('open'); searchPop.style.display = 'none'; }
  }
  function bodyText() { return bodyEl ? bodyEl.innerText : ''; }
  var findHL = null, findCurIdx = 0;
  function highlightMatches(query) {
    if (findHL) { try { CSS.highlights.delete(findHL); } catch (e) {} findHL = null; }
    findCurIdx = 0;
    if (!bodyEl || !query) { findCount.textContent = '0 / 0'; return []; }
    var q = query, ranges = [], lower = q.toLowerCase();
    var walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var t = node.nodeValue, p = 0;
      var lt = lower;
      while ((p = t.toLowerCase().indexOf(lt, p)) >= 0) {
        try {
          var r = document.createRange();
          r.setStart(node, p);
          r.setEnd(node, p + q.length);
          ranges.push(r);
        } catch (e) {}
        p += q.length;
      }
    }
    if (ranges.length && window.CSS && CSS.highlights) {
      try {
        findHL = new Highlight(...ranges);
        CSS.highlights.set('find-hl', findHL);
      } catch (e) { findHL = null; }
    }
    findCount.textContent = ranges.length ? '1 / ' + ranges.length : '0 / 0';
    return ranges;
  }
  function selectFind(delta) {
    var q = findInput.value;
    var ranges = highlightMatches(q);
    if (!ranges.length) { document.body.classList.remove('find-active'); return; }
    findCurIdx = ((findCurIdx + delta) + ranges.length) % ranges.length;
    if (findCurIdx < 0) findCurIdx += ranges.length;
    var r = ranges[findCurIdx];
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    document.body.classList.add('find-active');
    findCount.textContent = (findCurIdx + 1) + ' / ' + ranges.length;
    try { r.startContainer.parentNode.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
  }
  function replaceOneText() {
    var q = findInput.value; var r = replaceInput.value;
    if (!q) return;
    var sel = window.getSelection();
    if (sel.rangeCount && sel.toString()) { document.execCommand('insertText', false, r); }
    else if (bodyEl) {
      var text = bodyEl.innerText; var p = text.indexOf(q);
      if (p >= 0) {
        var range = document.createRange(); range.setStart(bodyEl, p); range.setEnd(bodyEl, p + q.length);
        var sel2 = window.getSelection(); sel2.removeAllRanges(); sel2.addRange(range);
        document.execCommand('insertText', false, r);
      }
    }
    captureHistory(); scheduleSave();
  }
  function replaceAllText() {
    var q = findInput.value; var r = replaceInput.value; if (!q || !bodyEl) return;
    var text = bodyEl.innerText;
    bodyEl.innerHTML = esc(text.split(q).join(r));
    captureHistory(); scheduleSave(); UI.toast('已替换全部');
  }
  function openNotif() {
    // 定位到 bellBtn 下方（贴近按钮左下角）
    var btn = document.getElementById('bellBtn');
    if (btn) {
      var r = btn.getBoundingClientRect();
      notifPop.style.top = (r.bottom + 6) + 'px';
      notifPop.style.left = Math.max(8, r.right - 320) + 'px';
      notifPop.style.right = 'auto';
    }
    notifPop.classList.add('open'); notifPop.style.display = 'block';
  }
  function closeNotif() { notifPop.classList.remove('open'); notifPop.style.display = 'none'; }
  function toggleOutline() {
    if (!outlinePanel) return;
    var open = outlinePanel.classList.contains('open');
    closePops();
    if (!open) openPop(outlinePanel);
  }
  function scrollOutline(i) {
    var heads = bodyEl.querySelectorAll('.ed-line[data-type="h1"], .ed-line[data-type="h2"], .ed-line[data-type="h3"]');
    var line = heads[i]; if (!line) return;
    line.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function togglePin() {
    var next = !DOC.pinned; Store.toggle(DOC_ID, 'pinned');
    pinBtn.classList.toggle('pinned', next);
    UI.toast(next ? '已添加到置顶' : '已取消置顶');
  }
  function toggleFavorite() {
    var next = !DOC.favorite; Store.toggle(DOC_ID, 'favorite');
    renderMore(DOC);
    UI.toast(next ? '已收藏' : '已取消收藏');
  }
  function openDownload() {
    if (typeof Download === 'undefined' || !Download.canDownload(DOC)) { UI.toast('当前文档禁止下载'); return; }
    Download.open(DOC);
  }
  function deleteDoc() {
    if (window.confirm('确定删除这篇文档？')) {
      Store.remove(DOC_ID); history.replaceState({}, '', 'index.html');
    }
  }
  function openCommentPanel() {
    // 优先走局部评论面板（PRD 主形态）
    if (typeof LocalComments !== 'undefined' && LocalComments.openPanel) {
      LocalComments.openPanel();
    } else if (typeof GlobalComments !== 'undefined' && GlobalComments.openPanel) {
      GlobalComments.openPanel();
    } else {
      commentPanel.classList.add('open'); commentPanel.style.display = 'block';
    }
  }
  function closeCommentPanel() {
    if (typeof LocalComments !== 'undefined' && LocalComments.closePanel) {
      LocalComments.closePanel();
    } else if (typeof GlobalComments !== 'undefined' && GlobalComments.closePanel) {
      GlobalComments.closePanel();
    } else {
      commentPanel.classList.remove('open'); commentPanel.style.display = 'none';
    }
  }
  function toggleScrollToggle() {
    var main = document.querySelector('.ed-main');
    if (!main) return;
    var goingTop = !scrollToggle.classList.contains('active');
    main.scrollTo({ top: goingTop ? 0 : main.scrollHeight, behavior: 'smooth' });
    scrollToggle.classList.toggle('active', goingTop);
    UI.toast(goingTop ? '滚到顶部' : '滚到底部');
  }
  /* ============ 点赞交互：烟花 + 「有一人点赞」高亮提示 ============ */
  function handleLike() {
    if (!likeBtn) return;
    // 已点赞 → 仅提示，不重复触发
    if (likeBtn.classList.contains('liked')) {
      showLikeToast();
      return;
    }
    likeBtn.classList.add('liked');
    // 按钮弹跳动画
    likeBtn.classList.remove('like-pop');
    void likeBtn.offsetWidth;
    likeBtn.classList.add('like-pop');
    fireConfetti(likeBtn);
    showLikeToast();
    // 存储点赞态（跨刷新保留）
    try { Store.update(DOC_ID, { liked: true }); } catch (e) {}
  }
  // 「有一人点赞」高亮提示 toast
  var likeToastTimer = null;
  function showLikeToast() {
    var el = document.getElementById('likeToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'likeToast';
      el.className = 'like-toast';
      document.body.appendChild(el);
    }
    el.textContent = '有 1 人觉得很赞';
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(likeToastTimer);
    likeToastTimer = setTimeout(function () { el.classList.remove('show'); }, 2000);
  }
  /* ============ 用户头像下拉菜单 ============ */
  function toggleAvatarMenu() {
    if (!avatarMenu) return;
    var open = avatarMenu.classList.contains('open');
    closePops();
    if (!open) avatarMenu.classList.add('open');
  }
  function handleAvatarAction(key) {
    closePops();
    if (key === 'logout') {
      if (window.confirm('确定退出登录？')) window.location.href = 'index.html';
      return;
    }
    var map = {
      appearance: '外观设置（演示）',
      language: '语言设置（演示）',
      switch: '切换账号（演示）',
      admin: '后台管理（演示）',
      settings: '设置（演示）',
      help: '帮助中心（演示）'
    };
    UI.toast(map[key] || '功能（演示）');
  }
  // 烟花（Canvas 粒子爆发）
  function fireConfetti(anchor) {
    try {
      var canvas = document.createElement('canvas');
      canvas.className = 'like-confetti';
      document.body.appendChild(canvas);
      var dpr = window.devicePixelRatio || 1;
      var W = window.innerWidth, H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      var r = anchor.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#a55eea', '#ff6b81', '#feca57', '#48dbfb'];
      var parts = [];
      for (var i = 0; i < 80; i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 2 + Math.random() * 6;
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 3,
          life: 1, decay: 0.015 + Math.random() * 0.02,
          size: 2 + Math.random() * 3,
          color: colors[(Math.random() * colors.length) | 0]
        });
      }
      var gravity = 0.12;
      function tick() {
        ctx.clearRect(0, 0, W, H);
        var alive = false;
        for (var j = 0; j < parts.length; j++) {
          var p = parts[j];
          if (p.life <= 0) continue;
          alive = true;
          p.vy += gravity;
          p.x += p.vx; p.y += p.vy;
          p.life -= p.decay;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        if (alive) requestAnimationFrame(tick);
        else { canvas.remove(); }
      }
      requestAnimationFrame(tick);
    } catch (e) {}
  }
  function bindEvents() {
    // 左上角汉堡菜单 → 打开/关闭侧边栏导航
    if (menuBtn) menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (typeof SidebarNav !== 'undefined' && SidebarNav.toggle) {
        SidebarNav.toggle();
      } else {
        drawer.classList.toggle('open');
      }
    });
    // 主页按钮 → 跳转回主页
    if (homeBtn) homeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      window.location.href = 'index.html';
    });
    // 用户头像 → 打开/关闭下拉菜单
    if (avatarBtn) avatarBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleAvatarMenu();
    });
    if (avatarMenu) avatarMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      var item = e.target.closest('[data-am]');
      if (!item) return;
      var key = item.getAttribute('data-am');
      handleAvatarAction(key);
    });
    moreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      // 二次点击同一按钮 → toggle 关闭
      if (morePop.classList.contains('open') && morePop.style.display === 'block') {
        closePops();
        return;
      }
      closePops(); renderMore(DOC);
      // 定位到 moreBtn 下方（贴近按钮右下角），避免跑到视口偏远位置用户看不到
      var r = moreBtn.getBoundingClientRect();
      morePop.style.top = (r.bottom + 6) + 'px';
      morePop.style.left = Math.max(8, r.right - 190) + 'px';
      morePop.style.right = 'auto';
      morePop.classList.add('open'); morePop.style.display = 'block';
    });
    morePop.addEventListener('click', function (e) {
      var item = e.target.closest('[data-m]'); if (!item) return;
      closePops();
      var action = item.getAttribute('data-m');
      if (action === 'find') openSearch();
      else if (action === 'pin') togglePin();
      else if (action === 'fav') toggleFavorite();
      else if (action === 'download') openDownload();
      else if (action === 'history') openHistory();
      else if (action === 'delete') deleteDoc();
    });
    crumbTitle.addEventListener('click', function (e) { e.stopPropagation(); openRename(crumbTitle); });
    // 「最近修改」也作为历史记录入口（点击进入内容时光机）
    crumbSub.addEventListener('click', function (e) {
      e.stopPropagation();
      openHistory();
    });
    titleInput.addEventListener('input', function () { crumbTitle.textContent = titleInput.value || '未命名文档'; scheduleSave(); });
    pinBtn.addEventListener('click', togglePin);
    addIconBtn.addEventListener('click', function (e) { e.stopPropagation(); openRename(addIconBtn); });
    // 点击「添加封面」→ 随机设置一张封面（PRD 3.9）
    addCoverBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setRandomCover();
    });
    cvClose.addEventListener('click', function () { coverModal.classList.remove('open'); coverModal.style.display = 'none'; });
    // 封面弹窗 tab 切换（官方图库 / 本地上传）
    coverModal.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) { switchCoverTab(tab.getAttribute('data-tab')); }
    });
    cvBody.addEventListener('click', function (e) {
      var item = e.target.closest('[data-cv]'); if (item) pickCover(item.getAttribute('data-cv'));
    });
    // 点击「编辑封面」→ 弹出操作菜单（选择图片 / 删除封面），阻止冒泡避免被 closePops 立刻关掉
    edCoverEditBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (edCoverMenu.style.display === 'block') hideCoverMenu();
      else renderCoverMenu();
    });
    // 封面操作菜单：「选择图片」→ 打开图库弹窗；「删除封面」→ 移除封面
    edCoverMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      var item = e.target.closest('[data-cv]');
      if (!item) return;
      var act = item.getAttribute('data-cv');
      hideCoverMenu();
      if (act === 'remove') removeCover();
      else openCover();
    });
    // 委托式点空白处关闭：点弹层/菜单/触发器之外的任何区域 → 关闭所有弹层。
    //
    // 实现约定（改代码前必读）：
    // 1) 本处理器在 document 上，任何未 stopPropagation 的点击都会冒泡到这里 → 弹层会被当场关掉，
    //    表现为「点了没反应」。所以「点击后要打开弹层」的按钮，handler 内必须 e.stopPropagation()。
    // 2) POP_PANELS / POP_TRIGGERS 两个列表必须与实际弹层、触发器保持同步。
    //    新增弹层时：容器加 class 或 id 到 POP_PANELS；触发器加 stopPropagation + id 到 POP_TRIGGERS。
    // POP_PANELS：所有「弹层 / 需要保持交互」的容器。命中任一 → 不关闭。
    // ⚠️ 不要笼统豁免大面积容器：
    //    - .gc-root 是文档底部整块全局评论区（覆盖半屏）
    //    - .gc-composer-box 是评论区输入区（含大量留白）
    //    整块豁免都会导致「点在空白处关不掉弹层」。只豁免真正需要交互的元素。
    var POP_PANELS = [
      '.ed-pop', '.comment-panel', '.lt-pop', '.find-bar', '.row-menu', '.row-type-handle',
      '.cover-modal', '.outline-panel', '.avatar-menu', '.sel-bar',
      '.gc-card', '.gc-btn-primary', '.gc-btn-ghost', '.gc-more-btn', '.gc-like-ico',
      '.gc-textarea', '.gc-lock-btn', '.gc-mention-pop', '.gc-menu', '.gc-menu-mask', '.gc-fab',
      '#edBody', '#titleInput', '#drawer', '#historyDrawer', '#hd-banner'
    ];
    var POP_TRIGGERS = [
      '#commentBtn', '#moreBtn', '#searchBtn', '#bellBtn', '#cpExpand', '#avatarBtn',
      '#menuBtn', '#homeBtn', '#addIconBtn', '#addCoverBtn', '#edCoverEditBtn',
      '#crumbTitle', '#crumbSub', '#pinBtn', '#titleIcon',
      '#sbCommentBtn', '#sbTitleBtn', '#sbAlignBtn', '#sbLinkBtn', '#sbColorBtn',
      '#rmTypeBtn', '#rmColorBtn', '#cvClose', '#outlineBurger', '#opToggle', '#scrollToggle'
    ];
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      for (var i = 0; i < POP_PANELS.length; i++) {
        if (t.closest(POP_PANELS[i])) return;
      }
      for (var j = 0; j < POP_TRIGGERS.length; j++) {
        if (t.closest(POP_TRIGGERS[j])) return;
      }
      closePops();
    });
    bodyEl.addEventListener('input', function () { scheduleSave(); captureHistory(); renderOutline(); });
    bodyEl.addEventListener('keyup', showSelBar);
    bodyEl.addEventListener('mouseup', showSelBar);
    bodyEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.shiftKey) { document.execCommand('insertLineBreak'); scheduleSave(); }
    });
    rmTypeBtn.addEventListener('click', toggleTypePop);
    rmColorBtn.addEventListener('click', toggleColorPop);
    // 注意：#typePop 的 click 在下方「标题/正文二级浮层」小节里统一绑定
    // （那里会用打开浮层时锁定的目标行 setLineTypeAtLine()）。
    // 这里不要重复绑 —— 老版靠 getSelection() 找行，点浮层时鼠标已不在正文里，必然取不到。
    colorPop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      if (e.target.closest('[data-role="bg"]')) setBg(b.getAttribute('data-c')); else setColor(b.getAttribute('data-c'));
    });
    cpReset.addEventListener('click', resetColor);
    sbTitleBtn.addEventListener('click', toggleTypePop);
    sbAlignBtn.addEventListener('click', openAlignPop);
    document.querySelectorAll('[data-sb="bold"], [data-sb="strike"], [data-sb="underline"], [data-sb="italic"]').forEach(function (b) {
      b.addEventListener('click', function () { execFormat(b.getAttribute('data-sb')); });
    });
    // 注意：#sbLinkBtn / #sbCommentBtn 的 click 在下方各自的 V2 小节里单独绑定
    // （那里会先保存选区、带 stopPropagation）。这里不要重复绑，
    // 否则先跑的老 handler 会在选区被保存前就开面板，导致后续逻辑拿不到选区。
    // 注意：#sbColorBtn 的 click 在下方「颜色 scope」小节里单独绑定
    // （那里要先抓取选区存进 savedColorRange，再开浮层）。
    // 这里绝对不要重复绑 toggleColorPop —— 两个 handler 都会执行，
    // 先跑的那个会在选区被保存前就开关浮层，导致 applySelectionColor 拿不到 savedColorRange。
    linkCancel.addEventListener('click', closeLinkPop);
    linkOk.addEventListener('click', confirmLink);
    linkInput.addEventListener('input', function () { linkErr.style.display = 'none'; linkOk.disabled = !validUrl(linkInput.value); });
    linkHoverBar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lh]'); if (!b) return;
      if (b.getAttribute('data-lh') === 'edit') openLinkEdit(); else {
        var a = b.closest('a'); if (a) { document.execCommand('unlink'); captureHistory(); scheduleSave(); }
      }
    });
    linkEditCancel.addEventListener('click', closeLinkEdit);
    linkEditOk.addEventListener('click', confirmLinkEdit);
    alignPop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-align]'); if (b) alignText(b.getAttribute('data-align'));
    });
    searchBtn.addEventListener('click', openSearch);
    findClose.addEventListener('click', closeSearch);
    // 查找 / 替换 Tab 切换：查找模式隐藏「替换为」输入框和「替换/全部替换」按钮
    findBar.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-fbtab]'); if (!tab) return;
      var mode = tab.getAttribute('data-fbtab'); // 'find' | 'replace'
      Array.prototype.forEach.call(findBar.querySelectorAll('[data-fbtab]'), function (t) {
        t.classList.toggle('active', t === tab);
      });
      findBar.classList.toggle('mode-find', mode === 'find');
      if (mode === 'find') {
        // 切到查找模式时，聚焦查找框并刷新高亮
        if (findInput) findInput.focus();
      } else {
        if (replaceInput) replaceInput.focus();
      }
    });
    findInput.addEventListener('input', function () { highlightMatches(findInput.value); });
    findNext.addEventListener('click', function () { selectFind(1); });
    findPrev.addEventListener('click', function () { selectFind(-1); });
    replaceOne.addEventListener('click', replaceOneText);
    replaceAll.addEventListener('click', replaceAllText);
    // 注意：#outlineBurger 的 click 在下方「大纲面板切换」小节里用 toggleOutlinePanel 绑定，
    // 这里不要重复绑 —— 两个 handler 都会跑，等于「打开后立刻又关闭」，表现为点了没反应。
    opBody.addEventListener('click', function (e) {
      var item = e.target.closest('[data-i]'); if (item) scrollOutline(Number(item.getAttribute('data-i')));
    });
    rnTabEmoji.addEventListener('click', function () { switchIconTab('emoji'); });
    rnTabIcon.addEventListener('click', function () { switchIconTab('icon'); });
    rnClear.addEventListener('click', function () { rnSearch.value = ''; renderIconList(iconTab); });
    rnSearch.addEventListener('input', function () {
      var q = rnSearch.value;
      if (q) renderIconListSearch(q);
      else renderIconList(iconTab);
    });
    rnCats.addEventListener('click', function (e) {
      var c = e.target.closest('[data-cat]'); if (!c) return;
      Array.prototype.forEach.call(rnCats.querySelectorAll('.rn-cat'), function (x) { x.classList.remove('active'); });
      c.classList.add('active');
      var k = c.getAttribute('data-cat');
      var lib = iconTab === 'icon' ? ICONS_LIB : EMOJI_CATS;
      var idx = k.charAt(0) === 'i' ? parseInt(k.slice(1), 10) : parseInt(k, 10);
      var cat = lib[idx] || lib[0];
      rnBody.innerHTML = '<div class="rn-cat-title">' + esc(cat.name) + '</div>' +
        cat.list.map(function (x) { return '<button class="icon-item" data-icon="' + esc(x) + '" data-type="' + iconTab + '">' + esc(x) + '</button>'; }).join('');
    });
    rnRandom.addEventListener('click', function () {
      var pool = iconTab === 'icon' ? ICONS_LIB : EMOJI_CATS;
      var cat = pool[Math.floor(Math.random() * pool.length)];
      rnBody.innerHTML = '<div class="rn-cat-title">' + esc(cat.name) + '</div>' +
        cat.list.map(function (x) { return '<button class="icon-item" data-icon="' + esc(x) + '" data-type="' + iconTab + '">' + esc(x) + '</button>'; }).join('');
    });
    rnBody.addEventListener('click', function (e) {
      var b = e.target.closest('[data-icon]'); if (!b) return;
      var t = b.getAttribute('data-type') || iconTab;
      selectIcon(t, b.getAttribute('data-icon'));
    });
    rnRemove.addEventListener('click', removeIcon);
    rnInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveRename(); });
    commentBtn.addEventListener('click', function (e) {
      e.stopPropagation(); // 阻止冒泡到 document 的「点空白关闭」逻辑，否则面板会立刻被关
      try { console.log('[sea] commentBtn clicked, hasLC=', typeof LocalComments !== 'undefined'); } catch (e) {}
      // 局部评论入口：有选中文字则进入撰写模式（带引用），否则打开评论列表
      pendingAnchor = (typeof captureAnchorFromSelection === 'function') ? captureAnchorFromSelection() : null;
      if (typeof LocalComments !== 'undefined' && LocalComments.openComposer) {
        if (pendingAnchor) {
          LocalComments.openComposer(pendingAnchor);
        } else {
          LocalComments.openPanel();
        }
      } else {
        openCommentPanel();
        UI.toast('局部评论组件未加载，已打开面板');
      }
    });
    // 展开图标（>>）现承担关闭功能（已删除原 X 关闭按钮）
    cpExpand.addEventListener('click', function (e) {
      e.stopPropagation();
      closeCommentPanel();
    });
    scrollToggle.addEventListener('click', toggleScrollToggle);
    if (likeBtn) likeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      handleLike();
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); if (typeof HistoryTime !== 'undefined' && HistoryTime.capture) HistoryTime.capture(); }
      if (e.key === 'Escape') closePops();
    });
    // 视口尺寸变化时，重定位仍在展开的弹层（否则 resize 后会停在旧坐标/跑出视口）
    window.addEventListener('resize', function () {
      if (renamePop && renamePop.classList.contains('open')) placeRename(renamePop._anchor);
    });
  }

  function setupRestoreFeatures() {
    // ============ 行级 H+ 入口 + rowMenu 弹出 ============
    var rowHandleTimer = null;
    function showRowHandle(line) {
      if (!line || !rowTypeHandle) return;
      currentLine = line;
      var r = line.getBoundingClientRect();
      var w = rowTypeHandle.offsetWidth || 36;
      rowTypeHandle.style.left = Math.max(4, r.left - w - 6) + 'px';
      rowTypeHandle.style.top = (r.top + r.height / 2 - 12) + 'px';
      rowTypeHandle.style.display = 'flex';
      clearTimeout(rowHandleTimer);
    }
    function hideRowHandle() {
      clearTimeout(rowHandleTimer);
      rowHandleTimer = setTimeout(function () {
        if (rowTypeHandle && !rowTypeHandle.matches(':hover') && !(rowMenu && rowMenu.matches(':hover'))) {
          rowTypeHandle.style.display = 'none';
        }
      }, 120);
    }
    /* 行操作菜单位置：贴在该行左侧（放不下则翻到右侧），并做视口边界收敛 */
    function placeRowMenu() {
      if (!rowMenu) return;
      var w = rowMenu.offsetWidth, h = rowMenu.offsetHeight;
      if (!w || !h) return;                      // 未布局完，下次调用再算
      var r = currentLine.getBoundingClientRect();
      var left = r.left - w - 6;
      if (left < 4) left = Math.min(r.right + 6, window.innerWidth - w - 8);
      var top = r.top + r.height / 2 - h / 2;
      top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
      rowMenu.style.left = left + 'px';
      rowMenu.style.top = top + 'px';
    }
    /* 打开行操作菜单。
       ⚠️ 必须先 closePops() 再置为可见 —— 原来的写法是「先 open 再 closePops()」，
       closePops() 会把 rowMenu.style.display 置为 none，把自己刚打开的菜单又关掉了。 */
    function openRowMenu() {
      if (!currentLine || !rowMenu) return;
      closePops();
      rowMenu.classList.add('open');
      rowMenu.style.display = 'flex';
      placeRowMenu();
    }
    function closeRowMenu() { if (rowMenu) { rowMenu.classList.remove('open'); rowMenu.style.display = 'none'; } }

    document.addEventListener('mousemove', function (e) {
      if (!bodyEl) return;
      var t = e.target;
      if (rowTypeHandle && rowTypeHandle.contains(t)) return;
      if (rowMenu && rowMenu.contains(t)) return;
      var line = t && t.closest ? t.closest('.ed-line') : null;
      if (line && bodyEl.contains(line)) showRowHandle(line);
      else hideRowHandle();
    });
    if (rowTypeHandle) rowTypeHandle.addEventListener('click', function (e) { e.stopPropagation(); openRowMenu(); });
    if (rowMenu) rowMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      var btn = e.target.closest('[data-rm]'); if (!btn) return;
      var action = btn.getAttribute('data-rm');
      // 「标题/正文」→ 弹出标题级别二级浮层（正文 / H1 / H2 / H3）
      // 注意顺序：先定位（此时 rowMenu 还在，openTypePop 内部会 closePops 再显示 typePop）
      if (action === 'type') { typeTargetLine = currentLine; openTypePop(rowMenu); }
      else if (action === 'cut') { try { document.execCommand('cut'); } catch (er) {} closeRowMenu(); }
      else if (action === 'copy') { try { document.execCommand('copy'); } catch (er) {} closeRowMenu(); }
      else if (action === 'del') { removeLine(); closeRowMenu(); }
    });

    // ============ 浮层拖动 (typePop/colorPop) ============
    function makeDraggable(pop, handle) {
      if (!pop || !handle) return;
      var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, pid = -1;
      handle.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        if (e.target.closest('button,input,textarea,select,a,.cp-swatch,.cp-reset,.tp-btn')) return;
        dragging = true; pid = e.pointerId;
        var r = pop.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        try { handle.setPointerCapture(pid); } catch (er) {}
        pop.classList.add('lt-dragging');
        pop.style.animation = 'none';
      });
      document.addEventListener('pointermove', function (e) {
        if (!dragging || e.pointerId !== pid) return;
        var nx = ox + (e.clientX - sx);
        var ny = oy + (e.clientY - sy);
        nx = Math.max(4, Math.min(nx, window.innerWidth - pop.offsetWidth - 4));
        ny = Math.max(8, Math.min(ny, window.innerHeight - pop.offsetHeight - 8));
        pop.style.left = nx + 'px';
        pop.style.top = ny + 'px';
        pop._dragged = true;
      });
      function endDrag(e) {
        if (!dragging || e.pointerId !== pid) return;
        dragging = false;
        try { handle.releasePointerCapture(pid); } catch (er) {}
        pop.classList.remove('lt-dragging');
      }
      document.addEventListener('pointerup', endDrag);
      document.addEventListener('pointercancel', endDrag);
      handle.addEventListener('dblclick', function () {
        pop.style.left = ''; pop.style.top = ''; pop._dragged = false;
      });
    }
    if (typePop) makeDraggable(typePop, document.getElementById('typePopDrag'));
    if (colorPop) makeDraggable(colorPop, document.getElementById('colorPopDrag'));

    function openTypePop(anchorEl) {
      if (!typePop) return;
      // 1) 先显示出来量得到尺寸（隐藏元素 offsetWidth 为 0，无法定位）
      closePops();
      typePop.classList.add('open');
      typePop.style.display = 'block';
      // 2) 再定位：此时 rowMenu 已被 closePops 关掉，placeTypePop 会退回用 currentLine
      placeTypePop(anchorEl);
      typePop._anchor = anchorEl || null;
    }
    /* 对 currentLine 设置行类型；无 currentLine 时回退到光标所在行 */
    function setLineTypeAtLine(type) {
      // 优先级：打开浮层时锁定的行 > hover 缓存行 > 光标所在行
      var line = null;
      if (typeTargetLine && bodyEl.contains(typeTargetLine)) line = typeTargetLine;
      if (!line && currentLine && bodyEl.contains(currentLine)) line = currentLine;
      if (!line) {
        var sel = window.getSelection();
        if (sel && sel.rangeCount && sel.anchorNode) {
          var n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
          line = n && n.closest ? n.closest('.ed-line') : null;
          if (line && !bodyEl.contains(line)) line = null;
        }
      }
      if (!line) {
        if (typeof UI !== 'undefined' && UI.toast) UI.toast('请先把光标放到要设置标题的段落上');
        return false;
      }
      line.setAttribute('data-type', type);
      line.classList.remove('line-h1', 'line-h2', 'line-h3', 'line-body');
      line.classList.add(type === 'body' ? 'line-body' : 'line-' + type);
      captureHistory(); scheduleSave(); renderOutline();
      return true;
    }
    if (typePop) typePop.addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('[data-type]'); if (!b) return;
      if (setLineTypeAtLine(b.getAttribute('data-type'))) { closePops(); currentLine = null; typeTargetLine = null; }
    });

    // ============ selBar 完整版：active 态同步、按钮点不丢选区 ============
    function currentSelObj() {
      var sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) return null;
      var r = sel.getRangeAt(0);
      if (!bodyEl.contains(r.commonAncestorContainer)) return null;
      return { sel: sel, range: r, text: sel.toString() };
    }
    function currentSelLineEl() {
      var s = currentSelObj(); if (!s) return null;
      var n = s.range.startContainer;
      while (n && n !== bodyEl && !(n.nodeType === 1 && n.classList && n.classList.contains('ed-line'))) n = n.parentNode;
      return (n && n.classList && n.classList.contains('ed-line')) ? n : null;
    }
    function refreshSelBarState() {
      if (!sbBar) return;
      var s = currentSelObj();
      if (!s) { sbBar.style.display = 'none'; return; }
      var selLine = currentSelLineEl() || currentLine;
      var isH = selLine && /h[1-3]/.test(selLine.getAttribute('data-type') || '');
      if (sbTitleBtn) sbTitleBtn.classList.toggle('active', isH);
      if (sbAlignBtn) {
        var ta = selLine ? (selLine.style.textAlign || '') : '';
        sbAlignBtn.classList.toggle('active', ta === 'center' || ta === 'right');
      }
      if (sbColorBtn) sbColorBtn.classList.toggle('active', selLine && !!(selLine.style.color || selLine.style.backgroundColor));
      try {
        ['bold', 'italic', 'underline', 'strike'].forEach(function (k) {
          var btn = sbBar.querySelector('[data-sb="' + k + '"]');
          if (!btn) return;
          var active = document.queryCommandState(k === 'strike' ? 'strikeThrough' : k);
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      } catch (er) {}
    }
    function showSelBarV2() {
      var s = currentSelObj(); if (!s) { if (sbBar) sbBar.style.display = 'none'; return; }
      var r = s.range.getBoundingClientRect();
      var top = r.top - 46;
      if (top < 8) top = r.bottom + 8;
      if (sbBar) {
        sbBar.style.display = 'flex';
        sbBar.style.left = Math.max(4, r.left + r.width / 2 - sbBar.offsetWidth / 2) + 'px';
        sbBar.style.top = top + 'px';
      }
      refreshSelBarState();
    }
    function hideSelBarV2() {
      var s = currentSelObj();
      if (!s && sbBar) sbBar.style.display = 'none';
    }
    // 覆盖 showSelBar / hideSelBar：调用完整版
    showSelBar = showSelBarV2;
    hideSelBar = hideSelBarV2;
    // selectionchange 全局监听（throttle 用 rAF）
    var rafScheduled = false;
    document.addEventListener('selectionchange', function () {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(function () { rafScheduled = false; refreshSelBarState(); });
    });
    // 滚动时隐藏 selBar
    window.addEventListener('scroll', function () {
      if (sbBar && sbBar.style.display !== 'none') sbBar.style.display = 'none';
    }, { passive: true });

    // ============ 链接完整功能 ============
    var savedLinkRange = null, linkSubmitting = false, linkInputTimer = null;
    function saveSelRange() {
      var sel = window.getSelection();
      if (sel.rangeCount && !sel.isCollapsed) savedLinkRange = sel.getRangeAt(0).cloneRange();
    }
    function restoreSelRange() {
      if (!savedLinkRange) return;
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedLinkRange);
    }
    function normalizeUrl(v) {
      if (!v) return { ok: false, msg: '请输入有效网址' };
      var s = String(v).trim();
      if (s.length > 2048) return { ok: false, msg: '网址过长' };
      if (/[\s<>"'\\]/.test(s)) return { ok: false, msg: '网址含非法字符' };
      if (/^#/.test(s)) return { ok: true, url: s };
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
        // 已带协议
      } else if (/^[a-z][a-z0-9+.-]*:(?!\/\/)/i.test(s)) {
        return { ok: false, msg: '仅支持 http(s) 协议' };
      } else {
        s = 'https://' + s;
      }
      try {
        var u = new URL(s);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, msg: '请输入有效网址' };
        if (u.host.length > 253) return { ok: false, msg: '网址过长' };
        if (/[^\x00-\x7f]/.test(u.hostname)) return { ok: false, msg: '不支持中文域名' };
        if (u.username || u.href.indexOf('@', u.protocol.length + 3) >= 0) return { ok: false, msg: '请输入有效网址' };
        return { ok: true, url: u.href };
      } catch (e) {
        return { ok: false, msg: '请输入有效网址' };
      }
    }
    function setLinkPopupState(state) {
      ['lp-typing', 'lp-error', 'lp-ready', 'lp-loading'].forEach(function (c) { linkPop.classList.remove(c); });
      if (state) linkPop.classList.add('lp-' + state);
    }
    // 替换 openLinkPop 为带 saved range 的版本
    function openLinkPopV2() {
      var s = currentSelObj(); if (!s) { UI.toast('请先选择要添加链接的文字'); return; }
      saveSelRange();
      // 已处于链接 → 进编辑面板
      var a = s.range.startContainer.parentNode;
      while (a && a !== bodyEl && a.tagName !== 'A') a = a.parentNode;
      if (a && a.tagName === 'A') {
        linkEditText.value = a.textContent;
        linkEditUrl.value = a.getAttribute('href') || '';
        var r = normalizeUrl(linkEditUrl.value);
        if (!r.ok) { linkEdit.classList.add('lp-error'); linkEditErr.textContent = r.msg; linkEditErr.style.display = 'block'; }
        linkEdit.classList.add('open'); linkEdit.style.display = 'block';
        setTimeout(function () { linkEditUrl.focus(); linkEditUrl.select(); }, 0);
        return;
      }
      linkInput.value = ''; linkErr.style.display = 'none'; linkOk.disabled = true;
      setLinkPopupState('');
      linkPop.classList.add('open'); linkPop.style.display = 'block';
      setTimeout(function () { linkInput.focus(); }, 0);
    }
    // 替换 confirmLink：四态校验 + loading
    function confirmLinkV2() {
      if (linkSubmitting) return;
      var r = normalizeUrl(linkInput.value);
      if (!r.ok) { linkErr.textContent = r.msg; linkErr.style.display = 'block'; setLinkPopupState('error'); return; }
      linkSubmitting = true; setLinkPopupState('loading'); linkOk.disabled = true; linkOk.setAttribute('aria-busy', 'true');
      try {
        restoreSelRange();
        document.execCommand('createLink', false, r.url);
        // 找到新 a → 加 target/rel/强制蓝色内联样式
        var sel = window.getSelection();
        if (sel.rangeCount && sel.anchorNode) {
          var n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
          var a = n.closest && n.closest('a');
          if (a) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.style.color = '#1677FF';
            a.removeAttribute('color');
            a.querySelectorAll('font').forEach(function (f) { f.removeAttribute('color'); f.removeAttribute('style'); });
          }
        }
        try { window.getSelection().removeAllRanges(); } catch (er) {}
        UI.toast('链接已添加');
        captureHistory(); scheduleSave();
        closeLinkPop();
      } catch (e) {
        UI.toast('链接创建失败');
      } finally {
        linkSubmitting = false; setLinkPopupState(''); linkOk.disabled = true; linkOk.removeAttribute('aria-busy');
      }
    }
    // 替换 confirmLinkEdit
    function confirmLinkEditV2() {
      var r = normalizeUrl(linkEditUrl.value);
      if (!r.ok) { linkEditErr.textContent = r.msg; linkEditErr.style.display = 'block'; linkEditUrl.parentNode.classList.add('lp-error'); return; }
      // 找 a
      var a = linkEdit.querySelector('a');
      if (a) {
        a.setAttribute('href', r.url);
        a.style.color = '#1677FF';
        if (linkEditText.value !== a.textContent) a.textContent = linkEditText.value;
      }
      captureHistory(); scheduleSave(); closeLinkEdit(); UI.toast('链接已更新');
    }
    // hover bar
    function showLinkHoverBarV2() {
      var s = currentSelObj(); if (!s) { if (linkHoverBar) linkHoverBar.style.display = 'none'; return; }
      var n = s.range.startContainer;
      while (n && n !== bodyEl && n.nodeType !== 1) n = n.parentNode;
      var a = n && n.closest ? n.closest('a') : null;
      if (!a) { if (linkHoverBar) linkHoverBar.style.display = 'none'; return; }
      var r = a.getBoundingClientRect();
      if (linkHoverBar) {
        linkHoverBar.style.display = 'flex';
        linkHoverBar.style.left = (r.left + r.width / 2 - linkHoverBar.offsetWidth / 2) + 'px';
        linkHoverBar.style.top = (r.top - 30) + 'px';
      }
    }
    // 替换 openLinkEdit
    function openLinkEditV2() {
      var s = currentSelObj(); if (!s) return;
      var n = s.range.startContainer;
      while (n && n !== bodyEl && n.nodeType !== 1) n = n.parentNode;
      var a = n && n.closest ? n.closest('a') : null;
      if (!a) return;
      linkEditText.value = a.textContent;
      linkEditUrl.value = a.getAttribute('href') || '';
      linkEditErr.style.display = 'none';
      linkEditUrl.parentNode.classList.remove('lp-error');
      linkEdit.classList.add('open'); linkEdit.style.display = 'block';
      setTimeout(function () { linkEditUrl.focus(); linkEditUrl.select(); }, 0);
    }
    // 替换 removeLine 的 link 移除
    if (linkHoverBar) {
      linkHoverBar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-lh]'); if (!b) return;
        if (b.getAttribute('data-lh') === 'edit') openLinkEditV2();
        else { try { document.execCommand('unlink'); } catch (er) {} captureHistory(); scheduleSave(); UI.toast('链接已移除'); }
      });
    }
    if (linkInput) {
      linkInput.addEventListener('input', function () {
        clearTimeout(linkInputTimer);
        setLinkPopupState(linkInput.value ? 'typing' : '');
        linkErr.style.display = 'none';
        linkOk.disabled = true;
        linkInputTimer = setTimeout(function () {
          var r = normalizeUrl(linkInput.value);
          if (!linkInput.value) { setLinkPopupState(''); }
          else if (r.ok) { setLinkPopupState('ready'); linkOk.disabled = false; }
          else { setLinkPopupState('error'); linkOk.disabled = true; linkErr.textContent = r.msg; }
        }, 300);
      });
      linkInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); confirmLinkV2(); }
        else if (e.key === 'Escape') { closeLinkPop(); }
      });
    }
    if (linkEditUrl) {
      linkEditUrl.addEventListener('input', function () {
        linkEditErr.style.display = 'none';
        linkEditUrl.parentNode.classList.remove('lp-error');
      });
    }
    if (linkEditCancel) linkEditCancel.addEventListener('click', closeLinkEdit);
    if (linkEditOk) linkEditOk.addEventListener('click', confirmLinkEditV2);
    if (linkCancel) linkCancel.addEventListener('click', closeLinkPop);
    if (linkOk) linkOk.addEventListener('click', confirmLinkV2);
    if (sbLinkBtn) sbLinkBtn.addEventListener('click', function (e) { e.stopPropagation(); openLinkPopV2(); });
    // 监听 mouseover/mouseout 实现 hover bar
    var hoverBarTimer = null;
    bodyEl.addEventListener('mouseover', function (e) {
      var n = e.target; if (!n || n.nodeType !== 1) return;
      var a = n.closest ? n.closest('a') : null;
      if (!a) return;
      clearTimeout(hoverBarTimer);
      hoverBarTimer = setTimeout(showLinkHoverBarV2, 300);
    });
    bodyEl.addEventListener('mouseout', function () {
      clearTimeout(hoverBarTimer);
      hoverBarTimer = setTimeout(function () { if (linkHoverBar) linkHoverBar.style.display = 'none'; }, 300);
    });
    if (linkHoverBar) {
      linkHoverBar.addEventListener('mouseenter', function () { clearTimeout(hoverBarTimer); });
      linkHoverBar.addEventListener('mouseleave', function () { if (linkHoverBar) linkHoverBar.style.display = 'none'; });
    }
    // Ctrl/Cmd+K 唤起链接
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !linkInput.matches(':focus') && !linkEditUrl.matches(':focus')) {
        e.preventDefault(); openLinkPopV2();
      }
    });
    // 点击链接：新标签打开
    bodyEl.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      if (e.shiftKey) window.location.href = a.href;
      else { var w = window.open(a.href, '_blank'); if (!w) UI.toast('请允许弹出窗口'); }
    });
    // Focus Trap
    function focusables(c) { return Array.prototype.slice.call(c.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(function (e) { return e.offsetWidth > 0 || e.offsetHeight > 0; }); }
    function trapFocus(c, e) {
      if (e.key !== 'Tab') return;
      var f = focusables(c); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (linkPop) linkPop.addEventListener('keydown', function (e) {
      if (e.target !== linkInput) trapFocus(linkPop, e);
    });
    if (linkEdit) linkEdit.addEventListener('keydown', function (e) {
      if (e.target !== linkEditText && e.target !== linkEditUrl) trapFocus(linkEdit, e);
    });

    // ============ 颜色 scope + 5×3 栅格 + 恢复默认 ============
    var colorScope = 'line', savedColorRange = null;
    /* 选区着色。
       ⚠️ 两个坑（都实测踩过）：
       1) `hiliteColor` 在已有嵌套标签（<b><i><u><strike><font>）内部会**静默失效** ——
          execCommand 不报错、返回 false、什么都不做。必须检查返回值并回退。
       2) 背景色用 `hiliteColor`（Chromium 内部映射到 backColor）；回退用 `backColor`，
          两者都不行时手动包 <span style="background-color">。 */
    function applySelectionColor(role, val) {
      if (!savedColorRange) return false;
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedColorRange);
      var cmds = role === 'bg' ? ['hiliteColor', 'backColor'] : ['foreColor'];
      // ⚠️ execCommand 对「无效目标」会**返回 true 但什么都不做**（实测：hiliteColor 落在
      //    <b><i><u><strike><font> 嵌套里就是这样）。所以不能只看返回值，
      //    必须比对操作前后的 innerHTML 有没有真的变，没变就换下一个方案。
      var before = bodyEl.innerHTML;
      var done = false;
      for (var i = 0; i < cmds.length && !done; i++) {
        try {
          document.execCommand(cmds[i], false, val);
        } catch (er) { }
        if (bodyEl.innerHTML !== before) done = true;
        else {
          // 复原，避免多次尝试叠加出垃圾节点
          try { sel.removeAllRanges(); sel.addRange(savedColorRange); } catch (e2) { }
        }
      }
      if (!done && role === 'bg') {
        // 终极回退：手动包一层 span
        try {
          sel.removeAllRanges(); sel.addRange(savedColorRange);
          var r = sel.getRangeAt(0);
          var span = document.createElement('span');
          span.style.backgroundColor = val;
          try { span.appendChild(r.extractContents()); r.insertNode(span); }
          catch (e2) { r.insertNode(span); }
          sel.removeAllRanges();
          var nr = document.createRange();
          nr.selectNodeContents(span);
          sel.addRange(nr);
          done = true;
        } catch (er) { }
      }
      captureHistory(); scheduleSave(); closePops();
      return done;
    }
    function clearSelectionColor() {
      if (!savedColorRange) return;
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedColorRange);
      ['foreColor', 'hiliteColor', 'backColor'].forEach(function (c) {
        try { document.execCommand(c, false, c === 'foreColor' ? 'inherit' : 'transparent'); } catch (e) { }
      });
      // 清除残留的空 span/font，以及带透明背景的包装
      try {
        var frag = sel.getRangeAt(0).cloneContents();
        var tmp = document.createElement('div'); tmp.appendChild(frag);
        tmp.querySelectorAll('span,font').forEach(function (n) {
          var bg = n.style.backgroundColor || n.style.background;
          var hasBg = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
          if (hasBg) {
            // 背景已被置空 → 拆掉这层包装，还原纯文本
            var t0 = document.createTextNode(n.textContent); n.parentNode.replaceChild(t0, n);
          } else if (!n.style.color) {
            var t = document.createTextNode(n.textContent); n.parentNode.replaceChild(t, n);
          }
        });
      } catch (e) { }
      captureHistory(); scheduleSave(); closePops();
    }
    // 重写 renderColors：8 字体色 + 5×3 背景色栅格
    function renderColorsV2() {
      if (!cpFont || !cpBg) return;
      var fontColors = [
        { v: '#1f2329', n: '默认' },
        { v: '#5b5fc7', n: '蓝紫' },
        { v: '#e05360', n: '红色' },
        { v: '#3ecf8e', n: '绿色' },
        { v: '#f5a623', n: '橙色' },
        { v: '#7b86f2', n: '紫色' },
        { v: '#00a3a3', n: '青色' },
        { v: '#ffffff', n: '白色' }
      ];
      cpFont.innerHTML = fontColors.map(function (c) {
        return '<button class="cp-swatch" data-val="' + c.v + '" data-role="font" style="background:' + c.v + '"><span class="cp-letter" style="color:' + (c.v === '#ffffff' ? '#333' : '#fff') + '">A</span></button>';
      }).join('');
      var bgColors = ['transparent', '#f7f7fb', '#eef4ff', '#ffe6e6', '#e6f7e6', '#fff7e6', '#f3e6ff', '#e6f7f7'];
      cpBg.innerHTML = bgColors.map(function (c) {
        var bg = c === 'transparent' ? '#ffffff' : c;
        var inner = c === 'transparent' ? '<svg width="14" height="14" viewBox="0 0 24 24"><line x1="2" y1="22" x2="22" y2="2" stroke="#999" stroke-width="2"/></svg>' : '';
        return '<button class="cp-swatch bg' + (c === 'transparent' ? ' cp-transparent' : '') + '" data-val="' + c + '" data-role="bg" style="background:' + bg + '">' + inner + '</button>';
      }).join('');
      // 添加 cpReset 已有
    }
    renderColors = renderColorsV2;
    if (cpFont) cpFont.addEventListener('click', function (e) {
      var b = e.target.closest('[data-val]'); if (!b) return;
      if (colorScope === 'selection') applySelectionColor('font', b.getAttribute('data-val'));
      else setColor(b.getAttribute('data-val'));
    });
    if (cpBg) cpBg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-val]'); if (!b) return;
      if (colorScope === 'selection') applySelectionColor('bg', b.getAttribute('data-val'));
      else setBg(b.getAttribute('data-val'));
    });
    // 工具条颜色入口：scope = selection
    if (sbColorBtn) sbColorBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var s = currentSelObj();
      if (s) { colorScope = 'selection'; savedColorRange = s.range.cloneRange(); }
      else colorScope = 'line';
      toggleColorPop();
    });
    if (cpReset) cpReset.addEventListener('click', function () {
      if (colorScope === 'selection') clearSelectionColor();
      else resetColor();
    });

    // ============ 目录层级渲染 ============
    function renderOutlineV2() {
      if (!opBody) return;
      var lines = bodyEl.querySelectorAll('.ed-line[data-type]');
      var heads = [];
      lines.forEach(function (line, i) {
        var type = line.getAttribute('data-type');
        if (type === 'h1' || type === 'h2' || type === 'h3') {
          heads.push({ type: type, text: textOf(line.innerHTML), idx: heads.length });
        }
      });
      opBody.innerHTML = heads.length ? heads.map(function (h) {
        var indent = h.type === 'h1' ? 0 : h.type === 'h2' ? 16 : 28;
        var cls = h.type === 'h1' ? 'outline-h1' : h.type === 'h2' ? 'outline-h2' : 'outline-h3';
      if (typeof syncOutlineBurger === 'function') syncOutlineBurger();
        return '<div class="outline-item ' + cls + '" data-i="' + h.idx + '" style="padding-left:' + (indent + 12) + 'px">' + esc(h.text) + '</div>';
      }).join('') : '<div class="outline-empty">暂无标题</div>';
    }
    renderOutline = renderOutlineV2;
    if (opBody) opBody.addEventListener('click', function (e) {
      var item = e.target.closest('[data-i]'); if (!item) return;
      var i = Number(item.getAttribute('data-i'));
      var heads = bodyEl.querySelectorAll('.ed-line[data-type="h1"], .ed-line[data-type="h2"], .ed-line[data-type="h3"]');
      var line = heads[i]; if (!line) return;
      var main = document.querySelector('.ed-main');
      if (main) {
        var lr = line.getBoundingClientRect(), cr = main.getBoundingClientRect();
        main.scrollTo({ top: main.scrollTop + (lr.top - cr.top) - 24, behavior: 'smooth' });
      }
    });
    // outlinePanel 切换
    var outlinePanelTimer = null;
    function toggleOutlinePanel() {
      if (!outlinePanel) return;
      var open = outlinePanel.classList.contains('open');
      if (open) { outlinePanel.classList.remove('open'); outlinePanel.style.display = 'none'; }
      else { outlinePanel.classList.add('open'); outlinePanel.style.display = 'flex'; }
    }
    // 有标题时才让「目录」入口可用（否则点了是空面板）
    function syncOutlineBurger() {
      if (!outlineBurger) return;
      var hasHeads = bodyEl && bodyEl.querySelector('.ed-line[data-type="h1"], .ed-line[data-type="h2"], .ed-line[data-type="h3"]');
      outlineBurger.style.display = hasHeads ? 'flex' : 'none';
      outlineBurger.title = hasHeads ? '目录' : '目录（本文暂无标题）';
    }
    if (outlineBurger) outlineBurger.addEventListener('click', toggleOutlinePanel);
    // renderOutline 已被替换为 renderOutlineV2

    // ============ 划词评论（commentPop 在右侧面板里撰写） ============
    // 这里走 GlobalComments，但提供「选中文本 → 打开面板 + 记录锚点 → 写入时关联」的最小链路。
    // pendingAnchor 与 captureAnchorFromSelection 已在 IIFE 顶层声明（供 commentBtn click 使用），
    // 这里覆盖 captureAnchorFromSelection 给出完整实现（依赖 currentSelObj / currentSelLineEl）。
    captureAnchorFromSelection = function () {
      if (typeof currentSelObj !== 'function') return null;
      var s = currentSelObj(); if (!s) return null;
      var line = (typeof currentSelLineEl === 'function' ? currentSelLineEl() : null) || currentLine;
      return {
        quote: s.text ? s.text.slice(0, 200) : '',
        docId: DOC_ID,
        lineText: line ? textOf(line.innerHTML) : '',
        createdAt: Date.now()
      };
    };
    if (sbCommentBtn) sbCommentBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      // 唤起局部评论：选中文字 → 打开右侧评论面板（撰写模式，展示选中原文）
      pendingAnchor = captureAnchorFromSelection();
      if (typeof LocalComments !== 'undefined' && LocalComments.openComposer) {
        LocalComments.openComposer(pendingAnchor);
      } else {
        openCommentPanel();
      }
    });
    // commentBtn 的 click 绑定已在 bindEvents() 第 736 行注册，
    // 这里不再重复绑定，否则一次点击会触发两次 → openCommentPanel / togglePanel 互相抵消。
    // 暴露 pendingAnchor 给 global-comments 读
    window.__seaPendingAnchor = function () { return pendingAnchor; pendingAnchor = null; };
  }

  // pendingAnchor 与 captureAnchorFromSelection 必须在 IIFE 顶层声明，
  // 否则 commentBtn click（位于 bindEvents 内）引用时会抛 ReferenceError。
  // 这里先声明，setupRestoreFeatures() 内部会给 captureAnchorFromSelection 赋值。
  var pendingAnchor = null;
  var captureAnchorFromSelection = function () { return null; };

  function renderDoc() {
    // setupRestoreFeatures 只做绑定与兜底，即使失败也不能拖垮整个启动流程
    try { setupRestoreFeatures(); } catch (e) { console.error('[setupRestoreFeatures] 失败：', e); }
    if (!DOC) {
      var next = Store.add({ title: '未命名文档', type: 'doc' });
      DOC_ID = next.id;   // 关键：同步 DOC_ID，否则后续 Store.update(DOC_ID, …) 全部落空（封面/标题都存不上）
      // history.replaceState 只是美化地址栏，属于可选动作。
      // 预览面板的沙箱 iframe 里会抛 SecurityError；绝不能让它中断 renderDoc，
      // 否则 bindEvents() 不执行 → 按钮 CSS 可见却"点不动"。
      try { history.replaceState({}, '', 'editor.html?id=' + next.id); } catch (e) {}
      DOC = Store.find(next.id) || next;
    }
    titleInput.value = DOC.title || '未命名文档';
    crumbTitle.textContent = DOC.title || '未命名文档';
    titleIcon.innerHTML = DOC.icon ? esc(DOC.icon.value) : '';
    crumbIcon.innerHTML = DOC.icon ? esc(DOC.icon.value) : '';
    pinBtn.classList.toggle('pinned', !!DOC.pinned);
    // 恢复点赞态
    if (likeBtn) likeBtn.classList.toggle('liked', !!DOC.liked);
    bodyEl.innerHTML = DOC.content || '<div class="ed-line" data-type="body">欢迎输入</div>';
    if (DOC.cover && DOC.cover.svg) {
      edCover.style.display = 'block'; edCoverImg.innerHTML = DOC.cover.svg;
      if (addCoverBtn) addCoverBtn.style.display = 'none';  // 已有封面 → 隐藏添加封面按钮
    } else {
      edCover.style.display = 'none'; edCoverImg.innerHTML = '';
      if (addCoverBtn) addCoverBtn.style.display = '';      // 无封面 → 清空内联样式，交回 hover 显示
    }
    if (addIconBtn) addIconBtn.style.display = '';          // 「添加图标」始终由热区 hover 控制
    document.title = DOC.title || '未命名文档';
    // 以下均为「锦上添花」的渲染，任何一步失败都不应阻断事件绑定
    try { renderMore(DOC); } catch (e) { console.error('[renderMore]', e); }
    try { renderColors(); } catch (e) { console.error('[renderColors]', e); }
    try { renderIconList('emoji'); } catch (e) { console.error('[renderIconList]', e); }
    bindEvents();
    try { updateOutline(); } catch (e) { console.error('[updateOutline]', e); }
    document.dispatchEvent(new CustomEvent('sea:editor-ready', { detail: { id: DOC_ID } }));
  }

  renderDoc();
})();