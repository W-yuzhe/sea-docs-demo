/* ============ 下载为 / 导出 组件（vanilla，无框架 / 无 CDN） ============
 * 入口：editor.html 右上角“···”更多菜单的“下载为”项（由 editor.js 调用 Download.open(doc)）。
 * 权限：Download.canDownload(doc) 决定菜单项是否置灰。
 * 面板：按文档类型列出支持的导出格式；文档类型额外提供“同时下载评论内容”复选框（Markdown 隐藏）。
 * 导出：全部在浏览器本地生成，不依赖任何外部库 / CDN，复用 Store 持久化的评论数据。
 */
(function () {
  'use strict';

  if (typeof Store === 'undefined' || typeof UI === 'undefined') return;

  var CURRENT_USER = { name: 'Wang' };
  var DOC_ID = parseInt(UI.getParam('id')) || 0;

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function xmlAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m];
    });
  }
  function safe(name) {
    return String(name || '未命名文档').replace(/[\\/:*?"<>|]/g, '_').trim() || '未命名文档';
  }
  function fmtTime(ts) {
    var diff = Date.now() - ts;
    var m = 60000, h = 3600000, d = 86400000;
    if (diff < m) return '刚刚';
    if (diff < h) return Math.floor(diff / m) + '分钟前';
    if (diff < d) return Math.floor(diff / h) + '小时前';
    var dt = new Date(ts);
    var sameYear = dt.getFullYear() === new Date().getFullYear();
    return sameYear ? (dt.getMonth() + 1) + '月' + dt.getDate() + '日'
      : dt.getFullYear() + '年' + (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
  }
  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function bodyEl() { return document.getElementById('edBody'); }

  /* ---------- 权限 ---------- */
  function canDownload(doc) {
    if (!doc) return false;
    if (UI.getParam('lockdl')) return false;        // 演示：企业管理员“默认禁止下载”策略
    if (doc.downloadLocked) return false;            // 持久化的后台禁止策略
    if (doc.owner === CURRENT_USER.name) return true; // 文档所有者始终可管理
    return !!doc.allowDownload;                     // 可阅读/可编辑用户是否被授予下载
  }

  /* ---------- 格式矩阵（按文档类型） ---------- */
  var TYPE_LABEL = { doc: '文档', sheet: '表格', slide: '幻灯片', mindnote: '思维笔记', base: '多维表格', file: '文件' };
  var FORMATS = {
    doc: [
      { key: 'word', name: 'Word', note: '适合二次编辑（.doc）', ic: 'DOC', color: '#2b579a', ext: 'doc' },
      { key: 'pdf', name: 'PDF', note: '固定排版，便于分享', ic: 'PDF', color: '#e03c31', ext: 'pdf' },
      { key: 'md', name: 'Markdown', note: '纯文本标记语言', ic: 'MD', color: '#3a3f4a', ext: 'md', noComments: true }
    ],
    sheet: [
      { key: 'excel', name: 'Excel', note: '整个文件下载', ic: 'XLS', color: '#217446', ext: 'xls' },
      { key: 'csv', name: 'CSV', note: '当前工作表', ic: 'CSV', color: '#1f9d8b', ext: 'csv' },
      { key: 'png', name: 'PNG', note: '当前工作表快照', ic: 'PNG', color: '#7b54d6', ext: 'png' }
    ],
    slide: [
      { key: 'pdf', name: 'PDF', note: '固定排版', ic: 'PDF', color: '#e03c31', ext: 'pdf' },
      { key: 'ppt', name: 'PPT', note: '可编辑幻灯片（含备注）', ic: 'PPT', color: '#d24726', ext: 'ppt', notes: true }
    ],
    mindnote: [
      { key: 'freemind', name: 'FreeMind', note: '思维导图源文件（.mm）', ic: 'MM', color: '#f2994a', ext: 'mm' },
      { key: 'png', name: 'PNG', note: '思维导图快照', ic: 'PNG', color: '#7b54d6', ext: 'png' }
    ],
    base: [
      { key: 'excel', name: 'Excel', note: '全部数据表', ic: 'XLS', color: '#217446', ext: 'xls' },
      { key: 'csv', name: 'CSV', note: '当前数据表 / 视图', ic: 'CSV', color: '#1f9d8b', ext: 'csv' },
      { key: 'base', name: 'Base', note: '多维表格原生格式', ic: 'BASE', color: '#5b6ef5', ext: 'base' }
    ],
    file: [
      { key: 'original', name: '原格式下载', note: '以原始上传格式导出', ic: '源', color: '#8a8f99', ext: '' }
    ]
  };

  /* ---------- 评论收集 ---------- */
  function normC(c) {
    return {
      author: c.author || { name: c.userName || '匿名' },
      content: c.content || c.text || '',
      createdAt: c.createdAt || Date.now(),
      isPrivate: !!c.isPrivate,
      edited: !!c.edited,
      replies: (c.replies || []).map(function (r) {
        return { author: r.author || { name: r.userName || '匿名' }, content: r.content || r.text || '', createdAt: r.createdAt || Date.now() };
      })
    };
  }
  function gatherComments(doc) {
    var out = [];
    (doc.globalComments || []).forEach(function (c) { out.push(normC(c)); });
    (doc.comments || []).forEach(function (c) { out.push(normC(c)); });
    return out;
  }
  function commentsToMarkdown(doc) {
    var list = gatherComments(doc);
    if (!list.length) return '## 评论\n\n（暂无评论）\n';
    var s = '## 评论\n\n';
    list.forEach(function (c) {
      s += '- **' + c.author.name + '**：' + c.content + '（' + fmtTime(c.createdAt) + '）' + (c.isPrivate ? ' _[私有]_' : '') + '\n';
      c.replies.forEach(function (r) { s += '  - ' + r.author.name + '：' + r.content + '（' + fmtTime(r.createdAt) + '）\n'; });
    });
    return s;
  }
  function commentsToHtml(doc, heading) {
    var list = gatherComments(doc);
    var h = '<h2 class="cm-head">' + (heading || '评论') + '</h2>';
    if (!list.length) return h + '<p class="cm-empty">（暂无评论）</p>';
    h += '<div class="cm-list">';
    list.forEach(function (c) {
      h += '<div class="cm-item"><b>' + esc(c.author.name) + '</b>：' + esc(c.content) +
        ' <span class="cm-time">' + fmtTime(c.createdAt) + '</span>' +
        (c.isPrivate ? ' <span class="cm-priv">私有</span>' : '') +
        (c.edited ? ' <span class="cm-edited">已编辑</span>' : '') + '</div>';
      c.replies.forEach(function (r) {
        h += '<div class="cm-reply">↳ ' + esc(r.author.name) + '：' + esc(r.content) +
          ' <span class="cm-time">' + fmtTime(r.createdAt) + '</span></div>';
      });
    });
    return h + '</div>';
  }

  /* ---------- HTML → Markdown ---------- */
  function inlineMd(node) {
    var s = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { s += n.textContent; return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName.toLowerCase(), txt;
      if (t === 'br') { s += '\n'; }
      else if (t === 'b' || t === 'strong') { s += '**' + inlineMd(n) + '**'; }
      else if (t === 'i' || t === 'em') { s += '*' + inlineMd(n) + '*'; }
      else if (t === 'code') { s += '`' + n.textContent + '`'; }
      else if (t === 'a') { s += '[' + inlineMd(n) + '](' + (n.getAttribute('href') || '') + ')'; }
      else if (t === 'img') { s += '![' + esc(n.getAttribute('alt') || '') + '](' + (n.getAttribute('src') || '') + ')'; }
      else { s += inlineMd(n); }
    });
    return s;
  }
  function blockMd(node) {
    var out = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { var t = n.textContent.trim(); if (t) out += t + '\n\n'; return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName.toLowerCase();
      if (t === 'h1') out += '# ' + inlineMd(n) + '\n\n';
      else if (t === 'h2') out += '## ' + inlineMd(n) + '\n\n';
      else if (t === 'h3') out += '### ' + inlineMd(n) + '\n\n';
      else if (t === 'blockquote') out += '> ' + inlineMd(n).replace(/\n/g, '\n> ') + '\n\n';
      else if (t === 'pre') out += '```\n' + n.textContent + '\n```\n\n';
      else if (t === 'hr') out += '---\n\n';
      else if (t === 'ul' || t === 'ol') {
        var items = n.querySelectorAll(':scope > li');
        items.forEach(function (li, i) { out += (t === 'ol' ? (i + 1) + '. ' : '- ') + inlineMd(li).trim() + '\n'; });
        out += '\n';
      }
      else if (t === 'li') { out += '- ' + inlineMd(n).trim() + '\n'; }
      else if (t === 'p' || t === 'div') { out += inlineMd(n).trim() + '\n\n'; }
      else { out += inlineMd(n); }
    });
    return out;
  }
  function htmlToMarkdown(el) {
    if (!el) return '';
    return blockMd(el).replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ---------- 下载触发 ---------- */
  function triggerDownload(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }
  function downloadBlob(content, filename, mime) {
    triggerDownload(new Blob([content], { type: (mime || 'application/octet-stream') + ';charset=utf-8' }), filename);
  }
  function downloadViaPrint(html, title, css) {
    var w = window.open('', '_blank');
    if (!w) { UI.toast('浏览器拦截了弹窗，请允许后重试', 'error'); return; }
    w.document.open();
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) +
      '</title><style>' + (css || PRINT_CSS) + '</style></head><body>' + html + '</body></html>');
    w.document.close(); w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 400);
  }

  var PRINT_CSS = 'body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2329;line-height:1.8;max-width:760px;margin:24px auto;padding:0 16px;}' +
    '.doc-title{font-size:26px;margin-bottom:18px}.cm-head{margin-top:28px;font-size:18px;border-top:1px solid #eee;padding-top:14px}' +
    '.cm-item{margin:6px 0}.cm-reply{margin:2px 0 2px 18px;color:#555}.cm-time{color:#aaa;font-size:12px;margin-left:6px}' +
    '.cm-priv{color:#888;font-size:11px;background:#f0f0f2;border-radius:4px;padding:0 5px}.cm-edited{color:#ccc;font-size:11px}';
  var PPT_CSS = '@page{size:landscape}.deck{font-family:sans-serif}.slide{width:90vw;height:50.6vw;max-width:960px;max-height:540px;margin:0 auto 24px;border:1px solid #e3e5ea;border-radius:12px;padding:40px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;page-break-after:always;}' +
    '.slide-in{font-size:22px;line-height:1.6}.notes-slide{background:#fafbff}.cm-head{font-size:18px;border-top:1px solid #eee;padding-top:12px;margin-top:18px}' +
    '.cm-item{margin:6px 0}.cm-time{color:#aaa;font-size:12px;margin-left:6px}.cm-priv{font-size:11px;background:#f0f0f2;border-radius:4px;padding:0 5px}';

  /* ---------- 各格式生成 ---------- */
  function genWord(doc, withComments) {
    var html = '<h1>' + esc(doc.title || '未命名文档') + '</h1>' + (bodyEl() ? bodyEl().innerHTML : '');
    if (withComments) html += commentsToHtml(doc);
    var docHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' + html + '</body></html>';
    downloadBlob(docHtml, safe(doc.title) + '.doc', 'application/msword');
  }
  function genPDF(doc, withComments) {
    var html = '<h1 class="doc-title">' + esc(doc.title || '未命名文档') + '</h1>' + (bodyEl() ? bodyEl().innerHTML : '');
    if (withComments) html += commentsToHtml(doc);
    downloadViaPrint(html, doc.title || '未命名文档', PRINT_CSS);
  }
  function genMarkdown(doc, withComments) {
    var md = '# ' + (doc.title || '未命名文档') + '\n\n' + htmlToMarkdown(bodyEl()) + '\n';
    if (withComments) md += '\n' + commentsToMarkdown(doc);
    downloadBlob(md, safe(doc.title) + '.md', 'text/markdown');
  }
  function genCSV(doc) {
    var text = bodyEl() ? (bodyEl().innerText || '') : '';
    var lines = text.split(/\r?\n/).map(function (l) { return csvCell(l.trim()); }).filter(function (l) { return l !== '""' && l !== ''; });
    downloadBlob(lines.join('\n'), safe(doc.title) + '.csv', 'text/csv');
  }
  function genExcel(doc) {
    var cell = bodyEl() ? bodyEl().innerHTML : '';
    var xls = '<html xmlns:o="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table><tr><td>' + cell + '</td></tr></table></body></html>';
    downloadBlob(xls, safe(doc.title) + '.xls', 'application/vnd.ms-excel');
  }
  function genFreeMind(doc) {
    var el = bodyEl(), nodes = '';
    if (el) el.childNodes.forEach(function (n) {
      if (n.nodeType !== 1) return;
      var txt = (n.textContent || '').trim();
      if (txt) nodes += '<node TEXT="' + xmlAttr(txt.slice(0, 80)) + '"/>';
    });
    if (!nodes) nodes = '<node TEXT="（空文档）"/>';
    var mm = '<map version="1.0.0"><node TEXT="' + xmlAttr(doc.title || '未命名文档') + '">' + nodes + '</node></map>';
    downloadBlob(mm, safe(doc.title) + '.mm', 'application/xml');
  }
  function genPNG(doc) {
    var el = bodyEl();
    if (!el) return;
    htmlToPng(el.innerHTML, safe(doc.title) + '.png');
  }
  function genPPT(doc) {
    var el = bodyEl(), slides = '';
    if (el) el.childNodes.forEach(function (n) {
      if (n.nodeType !== 1) return;
      slides += '<section class="slide"><div class="slide-in">' + n.innerHTML + '</div></section>';
    });
    if (!slides) slides = '<section class="slide"><div class="slide-in">（空文档）</div></section>';
    var deck = '<div class="deck">' + slides + '<section class="slide notes-slide"><h2>备注</h2>' + commentsToHtml(doc, '幻灯片备注') + '</section></div>';
    downloadViaPrint(deck, doc.title || '未命名文档', PPT_CSS);
  }
  function genBase(doc) {
    downloadBlob(JSON.stringify(doc, null, 2), safe(doc.title) + '.base', 'application/json');
  }
  function genOriginal(doc) {
    UI.toast('演示环境暂无以原格式上传的文件', 'error');
  }

  function generate(doc, f, withComments) {
    switch (f.key) {
      case 'word': genWord(doc, withComments); break;
      case 'pdf': genPDF(doc, withComments); break;
      case 'md': genMarkdown(doc, withComments); break;
      case 'csv': genCSV(doc); break;
      case 'excel': genExcel(doc); break;
      case 'freemind': genFreeMind(doc); break;
      case 'png': genPNG(doc); break;
      case 'ppt': genPPT(doc); break;
      case 'base': genBase(doc); break;
      case 'original': genOriginal(doc); break;
      default: UI.toast('暂不支持该格式', 'error');
    }
  }

  /* ---------- PNG（SVG foreignObject → canvas） ---------- */
  function htmlToPng(srcHtml, filename) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-99999px;top:0;width:794px;padding:32px;background:#fff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.8;color:#1f2329;';
    wrap.innerHTML = srcHtml;
    document.body.appendChild(wrap);
    var h = Math.max(wrap.scrollHeight, 200);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="794" height="' + h + '">' +
      '<foreignObject x="0" y="0" width="794" height="' + h + '">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif;font-size:14px;line-height:1.8;color:#1f2329;padding:32px;box-sizing:border-box;">' + srcHtml + '</div>' +
      '</foreignObject></svg>';
    var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      try {
        var scale = 2, canvas = document.createElement('canvas');
        canvas.width = 794 * scale; canvas.height = h * scale;
        var ctx = canvas.getContext('2d');
        ctx.scale(scale, scale); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 794, h); ctx.drawImage(img, 0, 0);
        canvas.toBlob(function (b) { if (b) triggerDownload(b, filename); else UI.toast('PNG 生成失败', 'error'); });
      } catch (e) { UI.toast('PNG 生成失败', 'error'); }
      document.body.removeChild(wrap); URL.revokeObjectURL(url);
    };
    img.onerror = function () { document.body.removeChild(wrap); URL.revokeObjectURL(url); UI.toast('PNG 生成失败', 'error'); };
    img.src = url;
  }

  /* ---------- 面板 ---------- */
  var panelState = { selectedKey: null, withComments: false };

  function open(doc) {
    if (!canDownload(doc)) { UI.toast('当前无下载权限', 'error'); return; }
    var type = doc.type || 'doc';
    var view = UI.getParam('view');
    var formats = (FORMATS[type] || FORMATS.doc).slice();
    if (type === 'mindnote' && view !== 'mindmap') formats = formats.filter(function (f) { return f.key !== 'png'; });

    panelState.selectedKey = formats[0].key;
    panelState.withComments = false;

    var fmtHtml = formats.map(function (f, i) {
      return '<div class="dl-fmt' + (i === 0 ? ' active' : '') + '" data-key="' + f.key + '">' +
        '<span class="dl-fmt-ic" style="background:' + f.color + '">' + f.ic + '</span>' +
        '<span class="dl-fmt-main"><span class="dl-fmt-name">' + f.name + '</span>' +
        (f.note ? '<span class="dl-fmt-note">' + f.note + '</span>' : '') + '</span>' +
        '<span class="dl-fmt-check"></span></div>';
    }).join('');

    var mask = document.createElement('div');
    mask.className = 'dl-mask';
    mask.id = 'dlMask';
    mask.innerHTML =
      '<div class="dl-panel" role="dialog" aria-modal="true" aria-label="下载为">' +
        '<div class="dl-head"><h3>下载为</h3>' +
          '<button class="dl-close" id="dlClose" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="dl-body">' +
          '<div class="dl-doc-meta">当前文档：<b>' + esc(doc.title || '未命名文档') + '</b> · ' + (TYPE_LABEL[type] || '文档') + '</div>' +
          '<div class="dl-section-label">选择导出格式</div>' +
          '<div class="dl-formats" id="dlFormats">' + fmtHtml + '</div>' +
          '<div class="dl-options">' +
            '<div class="dl-check-row" id="dlCommentsRow"><span class="dl-check-box"></span><span class="dl-check-label">同时下载评论内容</span></div>' +
            '<div class="dl-hint hidden" id="dlHint"></div>' +
          '</div>' +
        '</div>' +
        '<div class="dl-foot">' +
          '<button class="dl-btn-cancel" id="dlCancel">取消</button>' +
          '<button class="dl-btn-go" id="dlGo">下载</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);

    var fmtEls = mask.querySelectorAll('.dl-fmt');
    var commentsRow = mask.querySelector('#dlCommentsRow');
    var hint = mask.querySelector('#dlHint');

    function refreshOptions() {
      var f = formats.filter(function (x) { return x.key === panelState.selectedKey; })[0] || formats[0];
      if (type === 'doc') {
        commentsRow.classList.remove('hidden');
        if (f.noComments) { commentsRow.classList.add('hidden'); panelState.withComments = false; commentsRow.classList.remove('on'); }
      } else {
        commentsRow.classList.add('hidden'); panelState.withComments = false; commentsRow.classList.remove('on');
      }
      if (type === 'slide' && f.key === 'ppt') { hint.classList.remove('hidden'); hint.textContent = '备注将随幻灯片一并导出，无需额外勾选'; }
      else hint.classList.add('hidden');
    }

    fmtEls.forEach(function (el) {
      el.addEventListener('click', function () {
        panelState.selectedKey = el.getAttribute('data-key');
        fmtEls.forEach(function (x) { x.classList.toggle('active', x === el); });
        refreshOptions();
      });
    });
    commentsRow.addEventListener('click', function () {
      if (commentsRow.classList.contains('hidden')) return;
      panelState.withComments = !panelState.withComments;
      commentsRow.classList.toggle('on', panelState.withComments);
    });
    function close() { if (mask.parentNode) mask.parentNode.removeChild(mask); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.querySelector('#dlClose').addEventListener('click', close);
    mask.querySelector('#dlCancel').addEventListener('click', close);
    mask.querySelector('#dlGo').addEventListener('click', function () {
      var f = formats.filter(function (x) { return x.key === panelState.selectedKey; })[0] || formats[0];
      var withC = (type === 'doc' && !f.noComments && panelState.withComments);
      generate(doc, f, withC);
      if (window.History && History.log) History.log(DOC_ID, '下载为 ' + (f.ext || '源文件'));
      UI.toast('已生成 ' + (doc.title || '未命名文档') + '.' + (f.ext || ''));
      close();
    });
    document.addEventListener('keydown', onKey);
  }

  window.Download = { open: open, canDownload: canDownload };
})();
