/* ===== 历史记录 · 飞书云文档式内容时光机（含更改高亮 diff） ===== */
/* 交互对标飞书：右侧抽屉时间轴（当前版本+按天分组）→ 点击版本进入只读预览
   （顶栏横幅：返回文档 | 版本信息 | 编辑记录 i/n 上一步 下一步 | 还原此历史记录），
   「显示更改」开关开启时正文按块高亮：添加=绿、修改=紫、删除=红划线（带编辑者徽章）。
   纯 vanilla，复用 Store 持久化；自初始化，由 editor.js 在事件时调 HistoryTime.open() */
(function () {
  const $ = id => document.getElementById(id);
  const id = parseInt(UI.getParam('id'));
  const doc0 = id ? Store.find(id) : null;
  if (!doc0) return; // 无文档时不初始化（editor.js 会跳转 index.html）

  const VERSION_CAP = 50;     // 单文档最多保留版本数
  const DEBOUNCE_MS = 4000;   // 停止输入后 4s 防抖（“呼吸感”捕获）

  const body = $('edBody');
  const titleInput = $('titleInput');
  let drawer = null, listEl = null, capTimer = null;
  let suppressCapture = false;
  let previewVersion = null;   // 正在预览的版本对象
  let savedCurrent = null;     // 预览前的实时正文/标题（用于「返回文档」）
  let showChanges = true;      // 「显示更改」开关
  let initialized = false;

  /* ---------- 工具 ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function genId() { return 'v' + Date.now() + Math.random().toString(36).slice(2, 6); }
  function textOf(html) { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function firstText(html, n) { const t = textOf(html); return t ? (t.slice(0, n) + (t.length > n ? '…' : '')) : '（空文档）'; }
  function wordCount(html) { return textOf(html).length; }
  const p2 = x => String(x).padStart(2, '0');
  function fmtTime(ts) { const d = new Date(ts); return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function fmtFull(ts) { const d = new Date(ts); return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + fmtTime(ts); }
  function fmtDay(ts) {
    const d = new Date(ts), n = new Date();
    const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(n) - day(d)) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    return d.getFullYear() === n.getFullYear() ? (d.getMonth() + 1) + '月' + d.getDate() + '日' : d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function editorName() { return (Store.find(id).owner) || 'Wang'; }
  // 实时（可写）历史数组，确保 doc.history 已初始化
  function liveHistory() {
    const d = Store.find(id);
    if (!d.history) d.history = [];
    return d.history;
  }

  /* ---------- 呼吸感防抖捕获 ---------- */
  function scheduleCapture() {
    if (suppressCapture || !body || !titleInput) return;
    clearTimeout(capTimer);
    capTimer = setTimeout(capture, DEBOUNCE_MS);
  }
  function capture() {
    if (suppressCapture || !body || !titleInput) return;
    const arr = liveHistory();
    const snap = body.innerHTML;
    const title = (titleInput.value || '').trim() || '未命名文档';
    if (arr[0] && arr[0].content_snapshot === snap && arr[0].title_snapshot === title) return; // 无变化跳过
    arr.unshift({
      version_id: genId(), doc_id: id, content_snapshot: snap,
      title_snapshot: title,
      word_count: wordCount(snap), created_at: Date.now(), summary: firstText(snap, 24)
    });
    if (arr.length > VERSION_CAP) arr.length = VERSION_CAP;
    Store.update(id, { history: arr });
  }
  // 打开抽屉且无快照时，种一条基线（当前态），使时光机非空、可回到“最初”
  function seedBaseline() {
    if (History.snapshots(id).length) return;
    const arr = liveHistory();
    arr.unshift({
      version_id: genId(), doc_id: id, content_snapshot: body.innerHTML,
      title_snapshot: (titleInput && titleInput.value) || Store.find(id).title,
      word_count: wordCount(body.innerHTML), created_at: Date.now() - 1, summary: firstText(body.innerHTML, 24)
    });
    Store.update(id, { history: arr });
  }

  /* ---------- 块级 diff 引擎（上一版 → 该版本） ---------- */
  function parseBlocks(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    const blocks = [];
    Array.from(d.childNodes).forEach(n => {
      if (n.nodeType === 1) blocks.push({ html: n.outerHTML, text: (n.textContent || '').replace(/\s+/g, ' ').trim(), type: (n.dataset && n.dataset.type) || '' });
      else if (n.nodeType === 3 && n.textContent.trim()) blocks.push({ html: esc(n.textContent), text: n.textContent.replace(/\s+/g, ' ').trim(), type: '' });
    });
    if (!blocks.length && (html || '').trim()) blocks.push({ html: html, text: textOf(html), type: '' });
    return blocks;
  }
  // 返回 [{status:'same'|'add'|'del'|'mod', block}]，按新文档顺序（del 携带旧块内容）
  function computeDiff(oldHtml, newHtml) {
    const A = parseBlocks(oldHtml), B = parseBlocks(newHtml);
    if (!A.length && !B.length) return [];
    if (!A.length) return B.map(b => ({ status: 'add', block: b }));
    if (!B.length) return A.map(b => ({ status: 'del', block: b }));
    const m = A.length, n = B.length;
    const eq = (a, b) => a.text === b.text && a.type === b.type;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
      dp[i][j] = eq(A[i], B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ops = []; let i = 0, j = 0;
    while (i < m && j < n) {
      if (eq(A[i], B[j])) { ops.push({ status: 'same', b: j }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ status: 'del', a: i }); i++; }
      else { ops.push({ status: 'add', b: j }); j++; }
    }
    while (i < m) { ops.push({ status: 'del', a: i }); i++; }
    while (j < n) { ops.push({ status: 'add', b: j }); j++; }
    // 连续的 del/add 段按顺序两两配对为「修改」，多出的为「删除/添加」
    const out = [];
    let k = 0;
    while (k < ops.length) {
      if (ops[k].status === 'same') { out.push({ status: 'same', block: B[ops[k].b] }); k++; continue; }
      const dels = [], adds = [];
      while (k < ops.length && ops[k].status !== 'same') {
        if (ops[k].status === 'del') dels.push(A[ops[k].a]); else adds.push(B[ops[k].b]);
        k++;
      }
      const pairs = Math.min(dels.length, adds.length);
      for (let t = 0; t < pairs; t++) out.push({ status: 'mod', block: adds[t] });
      for (let t = pairs; t < dels.length; t++) out.push({ status: 'del', block: dels[t] });
      for (let t = pairs; t < adds.length; t++) out.push({ status: 'add', block: adds[t] });
    }
    return out;
  }
  function renderChangesHtml(changes) {
    const name = esc(editorName());
    return changes.map(c => {
      if (c.status === 'same') return c.block.html;
      const cls = c.status === 'add' ? 'hd-chg-add' : c.status === 'del' ? 'hd-chg-del' : 'hd-chg-mod';
      const label = c.status === 'add' ? '添加' : c.status === 'del' ? '删除' : '修改';
      return `<div class="hd-chg ${cls}"><span class="hd-chip">${name} ${label}</span>${c.block.html}</div>`;
    }).join('');
  }
  // 生成预览正文：开「显示更改」→ diff 高亮；关 → 纯快照
  function buildPreviewHtml(arr, idx) {
    const v = arr[idx];
    if (!showChanges) return v.content_snapshot;
    const older = arr[idx + 1] ? arr[idx + 1].content_snapshot : '';
    return renderChangesHtml(computeDiff(older, v.content_snapshot));
  }

  /* ---------- 抽屉构建 ---------- */
  function build() {
    if (drawer) return;
    drawer = document.createElement('aside');
    drawer.className = 'history-drawer';
    drawer.id = 'historyDrawer';
    drawer.innerHTML = `
      <div class="hd-head">
        <span class="hd-title">历史记录</span>
        <button class="hd-close" id="hdClose" title="关闭">✕</button>
      </div>
      <div class="hd-tabs">
        <button class="hd-tab active" data-tab="content">内容时光机</button>
        <button class="hd-tab" data-tab="actions">操作轨迹</button>
      </div>
      <div class="hd-body">
        <div class="hd-pane" id="hdContentPane"><div class="hd-timeline" id="hdList"></div></div>
        <div class="hd-pane" id="hdActionsPane" style="display:none"><div class="hd-list" id="hdActions"></div></div>
      </div>
      <div class="hd-foot">
        <label class="hd-toggle"><input type="checkbox" id="hdShowChanges" checked><span class="hd-switch"></span><span>显示更改</span></label>
      </div>`;
    document.body.appendChild(drawer);
    listEl = $('hdList');
    // 抽屉内所有点击不冒泡：避免 editor.js 的 document 级 closePops → HistoryTime.close() 把抽屉误关
    drawer.addEventListener('click', e => e.stopPropagation());
    drawer.querySelector('#hdClose').addEventListener('click', close);
    drawer.querySelectorAll('.hd-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
    $('hdShowChanges').addEventListener('change', e => {
      showChanges = e.target.checked;
      if (previewVersion) refreshPreviewBody();
    });
    // 时间轴点击委托：当前版本条目 = 返回文档；其余 = 进入只读预览
    listEl.addEventListener('click', e => {
      const entry = e.target.closest('[data-vid]'); if (!entry) return;
      entry.dataset.vid === 'now' ? exitPreview() : enterPreview(entry.dataset.vid);
    });
    // 点击抽屉/横幅外部、按 Esc 关闭（预览中则先返回最新）
    document.addEventListener('click', e => {
      if (drawer.classList.contains('open') && !e.target.closest('.history-drawer') && !e.target.closest('.hd-banner') && !e.target.closest('[data-m="history"]')) close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) { previewVersion ? exitPreview() : close(); }
    });
  }

  /* ---------- 时间轴（飞书式：当前版本置顶 + 按天分组同栏） ---------- */
  function renderList() {
    if (!listEl) return;
    const arr = History.snapshots(id);
    let html = `<div class="hd-entry hd-now${previewVersion ? '' : ' hd-active'}" data-vid="now" title="当前正在编辑的版本">
      <span class="hd-dot"></span><span class="hd-entry-time">当前版本</span><span class="hd-entry-user">${esc(editorName())}</span></div>`;
    let lastDay = '';
    arr.forEach(v => {
      const day = fmtDay(v.created_at);
      if (day !== lastDay) { html += `<div class="hd-date">${day}</div>`; lastDay = day; }
      const active = previewVersion && previewVersion.version_id === v.version_id;
      html += `<div class="hd-entry${active ? ' hd-active' : ''}" data-vid="${v.version_id}" title="${esc(v.summary || '')}">
        <span class="hd-dot"></span><span class="hd-entry-time">${fmtTime(v.created_at)}</span><span class="hd-entry-user">${esc(editorName())}</span></div>`;
    });
    if (!arr.length) html += '<div class="hd-empty">暂无历史版本</div>';
    listEl.innerHTML = html;
  }
  function renderActions() {
    const list = History.forDoc(id);
    $('hdActions').innerHTML = list.length
      ? list.map(h => `<div class="hd-action-item"><div>${esc(h.user + ' ' + h.action)}</div><div class="h-time">${esc(h.time)}</div></div>`).join('')
      : '<div class="hd-empty">暂无操作记录</div>';
  }
  function switchTab(tab) {
    drawer.querySelectorAll('.hd-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $('hdContentPane').style.display = tab === 'content' ? '' : 'none';
    $('hdActionsPane').style.display = tab === 'actions' ? '' : 'none';
    if (tab === 'actions') renderActions();
  }

  /* ---------- 顶栏历史版本横幅（飞书式，整体覆盖替换顶部工具栏） ---------- */
  function ensureBanner() {
    if ($('hdBanner')) return;
    const b = document.createElement('div');
    b.id = 'hdBanner'; b.className = 'hd-banner';
    b.innerHTML = `
      <div class="hd-banner-left">
        <button class="hd-banner-back" id="hdBack" title="返回文档">← 返回文档</button>
        <span class="hd-banner-info" id="hdBannerInfo"></span>
      </div>
      <div class="hd-banner-right">
        <span class="hd-nav-info" id="hdEditInfo"></span>
        <button class="hd-nav-btn" id="hdPrev">上一步</button>
        <button class="hd-nav-btn" id="hdNext">下一步</button>
        <button class="hd-banner-restore" id="hdRestore">还原此历史记录</button>
      </div>`;
    document.body.appendChild(b);
    // 横幅内点击不冒泡：恢复/返回/导航操作不应被 document 级监听打断
    b.addEventListener('click', e => e.stopPropagation());
    $('hdBack').addEventListener('click', exitPreview);
    $('hdRestore').addEventListener('click', restore);
    $('hdPrev').addEventListener('click', () => navVersion(-1));
    $('hdNext').addEventListener('click', () => navVersion(1));
  }
  function showBanner(v) {
    ensureBanner();
    $('hdBannerInfo').textContent = fmtFull(v.created_at) + ' 的版本 · ' + editorName();
    const arr = History.snapshots(id);
    const i = arr.findIndex(x => x.version_id === v.version_id);
    $('hdEditInfo').textContent = '编辑记录 ' + (i + 1) + '/' + arr.length;
    $('hdPrev').disabled = i <= 0;
    $('hdNext').disabled = i < 0 || i >= arr.length - 1;
    $('hdBanner').classList.add('show');
  }
  function hideBanner() { const b = $('hdBanner'); if (b) b.classList.remove('show'); }
  // 上一步 = 更新（时间更近，i-1）；下一步 = 更早（i+1）
  function navVersion(delta) {
    if (!previewVersion) return;
    const arr = History.snapshots(id);
    const i = arr.findIndex(x => x.version_id === previewVersion.version_id);
    const t = i + delta;
    if (t >= 0 && t < arr.length) enterPreview(arr[t].version_id);
  }

  /* ---------- 进入 / 退出只读预览 ---------- */
  function enterPreview(vid) {
    const arr = History.snapshots(id);
    const idx = arr.findIndex(x => x.version_id === vid);
    if (idx < 0) return;
    const v = arr[idx];
    if (!previewVersion) savedCurrent = { html: body.innerHTML, title: titleInput ? titleInput.value : '' };
    suppressCapture = true;
    previewVersion = v;
    body.innerHTML = buildPreviewHtml(arr, idx);
    body.setAttribute('contenteditable', 'false');
    body.classList.add('hd-readonly');
    if (titleInput) { titleInput.value = v.title_snapshot || ''; titleInput.readOnly = true; }
    showBanner(v);
    renderList();
  }
  // 「显示更改」开关切换时重绘当前预览
  function refreshPreviewBody() {
    if (!previewVersion) return;
    const arr = History.snapshots(id);
    const idx = arr.findIndex(x => x.version_id === previewVersion.version_id);
    if (idx >= 0) body.innerHTML = buildPreviewHtml(arr, idx);
  }
  function exitPreview() {
    if (previewVersion) {
      body.innerHTML = savedCurrent.html;
      body.setAttribute('contenteditable', 'true');
      body.classList.remove('hd-readonly');
      if (titleInput) { titleInput.value = savedCurrent.title; titleInput.readOnly = false; }
      savedCurrent = null;
      previewVersion = null;
      suppressCapture = false;
      hideBanner();
    }
    renderList();
  }

  /* ---------- 还原此历史记录（飞书式确认 + 安全网） ---------- */
  function restore() {
    if (!previewVersion) return;
    const v = previewVersion;
    if (!window.confirm('将文档还原到 ' + fmtFull(v.created_at) + ' 的历史版本？\n当前内容将被覆盖（还原前会自动保存当前内容为新版本）')) return;
    // 安全网：预览前的实时内容（可能含尚未落盘的编辑）存为新版本
    const arr = liveHistory();
    const curHtml = savedCurrent.html;
    if (!arr[0] || arr[0].content_snapshot !== curHtml) {
      arr.unshift({
        version_id: genId(), doc_id: id, content_snapshot: curHtml,
        title_snapshot: savedCurrent.title || Store.find(id).title,
        word_count: wordCount(curHtml), created_at: Date.now(), summary: firstText(curHtml, 24)
      });
      if (arr.length > VERSION_CAP) arr.length = VERSION_CAP;
    }
    // 应用版本内容（含标题，纯快照不带更改高亮）
    body.innerHTML = v.content_snapshot;
    body.setAttribute('contenteditable', 'true');
    body.classList.remove('hd-readonly');
    if (titleInput) titleInput.readOnly = false;
    const t = v.title_snapshot;
    const name = (t || '未命名文档');
    if (titleInput) titleInput.value = t === '未命名文档' ? '' : name;
    const crumb = $('crumbTitle'); if (crumb) crumb.textContent = name;
    document.title = name;
    Store.update(id, { content: v.content_snapshot, title: name });
    History.log(id, '恢复了历史版本');
    previewVersion = null; savedCurrent = null;
    hideBanner(); suppressCapture = false;
    UI.toast('已还原到历史版本');
    renderList();
  }

  /* ---------- 公开 API ---------- */
  function open() {
    build();
    seedBaseline();
    if (previewVersion) exitPreview(); // 飞书行为：打开历史记录总是从最新态开始
    if (!drawer.classList.contains('open')) drawer.classList.add('open');
    renderList();
    switchTab('content');
  }
  // 飞书行为：关闭抽屉不退出预览（顶栏横幅保留，靠「返回文档」/Esc/还原退出）
  function close() {
    if (drawer && drawer.classList.contains('open')) drawer.classList.remove('open');
  }

  // 自动捕获：正文 / 标题输入（脚本位于 body 末尾，DOM 已就绪）。
  // 为避免与 editor.js 的 captureHistory() 重复写入，仅绑定一次；若 editor.js 尚未
  // 派发 sea:editor-ready，则等待该事件后再绑定，确保 DOC_ID / body / titleInput 均已就绪。
  function bindAutoCapture() {
    if (body && titleInput && !body._htBound) {
      body._htBound = true;
      body.addEventListener('input', scheduleCapture);
      titleInput.addEventListener('input', scheduleCapture);
    }
  }
  if (document.readyState === 'complete') bindAutoCapture();
  else document.addEventListener('DOMContentLoaded', bindAutoCapture);
  document.addEventListener('sea:editor-ready', bindAutoCapture);

  window.HistoryTime = { open, close, capture, enterPreview, exitPreview, restore, _diff: computeDiff, _blocks: parseBlocks };
})();
