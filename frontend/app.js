(() => {
  const PALETTE = [
    '#E53935', '#FB8C00', '#43A047', '#00897B', '#1E88E5', '#3949AB',
    '#8E24AA', '#D81B60', '#6D4C41', '#00ACC1', '#F9A825', '#F4511E',
  ];

  const form = document.querySelector('#search-form');
  const input = document.querySelector('#concept-input');
  const submitBtn = document.querySelector('#submit-btn');
  const statusEl = document.querySelector('#status');
  const breadcrumbEl = document.querySelector('#breadcrumb');
  const emptyState = document.querySelector('#empty-state');
  const emptyMain = document.querySelector('#empty-main');
  const emptySub = document.querySelector('#empty-sub');
  const examplesLabel = document.querySelector('#examples-label');
  const viewport = document.querySelector('#viewport');
  const canvas = document.querySelector('#canvas');
  const linesSvg = document.querySelector('#lines');
  const hubEl = document.querySelector('#hub');
  const zones = {
    top: document.querySelector('#zone-top'),
    right: document.querySelector('#zone-right'),
    bottom: document.querySelector('#zone-bottom'),
    left: document.querySelector('#zone-left'),
  };

  // ---------- language ----------
  const UI = {
    zh: {
      placeholder: '输入任意概念，例如：期权、光合作用、Transformer、复利……',
      submit: '生成脑图',
      submitLoading: '生成中…',
      examples: '试试看：',
      emptyMain: '输入一个概念，回车或点击「生成脑图」',
      emptySub: '脑图会围绕核心概念展开专属的知识框架，可以拖拽平移、滚轮缩放；点击分支标题可以深入钻取',
      loading: (c) => `正在为「${c}」梳理知识框架，请稍候…`,
      drillHint: '深入 ↴',
      drillTitle: (t) => `点击深入「${t}」`,
      searchTitle: (t) => `搜索「${t}」了解更多`,
    },
    en: {
      placeholder: 'Enter any concept, e.g. Options, Photosynthesis, Transformer, Compound Interest…',
      submit: 'Generate',
      submitLoading: 'Generating…',
      examples: 'Try:',
      emptyMain: 'Enter a concept and press Enter or click "Generate"',
      emptySub: 'The map builds a framework tailored to the concept — drag to pan, scroll to zoom, click a branch title to drill down',
      loading: (c) => `Thinking through the framework for "${c}"…`,
      drillHint: 'Drill in ↴',
      drillTitle: (t) => `Click to drill into "${t}"`,
      searchTitle: (t) => `Search "${t}" for more`,
    },
  };
  let currentLang = 'zh';

  function t(field) {
    if (field == null) return '';
    if (typeof field === 'string') return field;
    return field[currentLang] || field.zh || field.en || '';
  }

  function applyUiLanguage() {
    const strings = UI[currentLang];
    input.placeholder = strings.placeholder;
    submitBtn.textContent = submitBtn.disabled ? strings.submitLoading : strings.submit;
    examplesLabel.textContent = strings.examples;
    emptyMain.textContent = strings.emptyMain;
    emptySub.textContent = strings.emptySub;
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.textContent = currentLang === 'zh' ? chip.dataset.zh : chip.dataset.en;
    });
  }

  document.querySelectorAll('.lang-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      currentLang = lang;
      document.querySelectorAll('.lang-opt').forEach((b) => b.classList.toggle('active', b === btn));
      applyUiLanguage();
      // re-render current view (if any) in the new language, no re-fetch needed
      if (historyStack.length) {
        const top = historyStack[historyStack.length - 1];
        renderBrainmap(top.data);
      }
      renderBreadcrumb();
    });
  });

  // ---------- status / loading ----------
  function setStatus(text, kind) {
    if (!text) {
      statusEl.className = 'hidden';
      statusEl.textContent = '';
      return;
    }
    statusEl.className = kind || '';
    statusEl.textContent = text;
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? UI[currentLang].submitLoading : UI[currentLang].submit;
  }

  // ---------- navigation history (drill-down breadcrumb) ----------
  // Each entry: { data } — the bilingual title inside `data` is the label source,
  // so breadcrumb text updates automatically when the language toggle changes.
  let historyStack = [];

  function renderBreadcrumb() {
    if (historyStack.length <= 1) {
      breadcrumbEl.className = 'hidden';
      breadcrumbEl.innerHTML = '';
      return;
    }
    breadcrumbEl.className = '';
    breadcrumbEl.innerHTML = '';
    historyStack.forEach((entry, i) => {
      if (i > 0) breadcrumbEl.appendChild(el('span', 'sep', '›'));
      const isCurrent = i === historyStack.length - 1;
      const btn = el('button', 'crumb' + (isCurrent ? ' current' : ''), escapeHtml(t(entry.data.title)));
      btn.type = 'button';
      if (!isCurrent) {
        btn.addEventListener('click', () => {
          historyStack = historyStack.slice(0, i + 1);
          renderBrainmap(historyStack[i].data);
          renderBreadcrumb();
        });
      }
      breadcrumbEl.appendChild(btn);
    });
  }

  // ---------- fetch + generate ----------
  // fresh=true starts a brand-new tree (from the top search bar / example chips).
  // fresh=false is a drill-down from a branch card, appended to the breadcrumb.
  async function generate(concept, context, fresh) {
    setLoading(true);
    setStatus(UI[currentLang].loading(concept), 'loading');
    try {
      const res = await fetch('/api/brainmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, context: context || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || '生成失败，请重试 / Generation failed, please retry');
      }
      if (fresh) {
        historyStack = [{ data }];
      } else {
        historyStack.push({ data });
      }
      renderBrainmap(data);
      renderBreadcrumb();
      setStatus('');
    } catch (err) {
      setStatus(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ---------- rendering ----------
  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function searchUrl(term, rootConcept) {
    const q = rootConcept ? `${rootConcept} ${term}` : term;
    return 'https://www.google.com/search?q=' + encodeURIComponent(q);
  }

  function renderItems(items, color, rootConcept) {
    const list = el('div', 'items');
    (items || []).forEach((item) => {
      const termText = t(item.term);
      const row = el('div', 'item');
      row.style.borderLeftColor = color;
      const termRow = el('div', 'term-row');
      const link = el('a', 'search-link', '🔗');
      link.href = searchUrl(termText, rootConcept);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = UI[currentLang].searchTitle(termText);
      termRow.innerHTML = `<span class="term">${escapeHtml(termText)}</span>`;
      termRow.appendChild(link);
      row.appendChild(termRow);
      const descText = t(item.desc);
      if (descText) row.appendChild(el('span', 'desc', escapeHtml(descText)));
      if (item.children && item.children.length) {
        const sub = renderItems(item.children, color, rootConcept);
        sub.classList.add('children');
        row.appendChild(sub);
      }
      list.appendChild(row);
    });
    return list;
  }

  function renderCard(branch, color, rootConcept, onDrill) {
    const titleText = t(branch.title);
    const card = el('div', 'card');
    card.dataset.color = color;
    const head = el('div', 'card-head');
    head.title = UI[currentLang].drillTitle(titleText);
    const icon = el('div', 'card-icon', escapeHtml(branch.icon || '📌'));
    icon.style.background = color;
    const title = el('div', 'card-title', escapeHtml(titleText));
    title.style.color = color;
    const hint = el('div', 'card-drill-hint', UI[currentLang].drillHint);
    head.appendChild(icon);
    head.appendChild(title);
    head.appendChild(hint);
    head.addEventListener('click', () => onDrill(branch));
    card.appendChild(head);
    card.appendChild(renderItems(branch.items, color, rootConcept));
    return card;
  }

  function renderBrainmap(data) {
    emptyState.classList.add('hidden');
    Object.values(zones).forEach((z) => (z.innerHTML = ''));

    const rootConcept = t(data.title);
    const subtitleText = t(data.subtitle);
    hubEl.innerHTML =
      `<div class="hub-title">${escapeHtml(rootConcept)}</div>` +
      (subtitleText ? `<div class="hub-subtitle">${escapeHtml(subtitleText)}</div>` : '');

    const zoneOrder = ['top', 'right', 'bottom', 'left'];
    const branches = data.branches || [];
    const cardMeta = [];

    branches.forEach((branch, i) => {
      const color = PALETTE[i % PALETTE.length];
      const zoneName = zoneOrder[i % zoneOrder.length];
      const card = renderCard(branch, color, rootConcept, (b) => {
        generate(t(b.title), rootConcept, false);
      });
      zones[zoneName].appendChild(card);
      cardMeta.push({ el: card, zone: zoneName, color });
    });

    requestAnimationFrame(() => {
      drawConnectors(cardMeta);
      fitToViewport();
    });
  }

  function drawConnectors(cardMeta) {
    const prevTransform = canvas.style.transform;
    canvas.style.transform = 'none';

    const canvasRect = canvas.getBoundingClientRect();
    const w = canvasRect.width;
    const h = canvasRect.height;
    linesSvg.setAttribute('width', w);
    linesSvg.setAttribute('height', h);
    linesSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    linesSvg.innerHTML = '';

    const hubRect = hubEl.getBoundingClientRect();
    const hub = {
      x: hubRect.left + hubRect.width / 2 - canvasRect.left,
      y: hubRect.top + hubRect.height / 2 - canvasRect.top,
    };

    cardMeta.forEach(({ el: card, zone, color }) => {
      const r = card.getBoundingClientRect();
      const local = {
        left: r.left - canvasRect.left,
        top: r.top - canvasRect.top,
        width: r.width,
        height: r.height,
      };
      let anchor;
      if (zone === 'top') anchor = { x: local.left + local.width / 2, y: local.top + local.height };
      else if (zone === 'bottom') anchor = { x: local.left + local.width / 2, y: local.top };
      else if (zone === 'left') anchor = { x: local.left + local.width, y: local.top + local.height / 2 };
      else anchor = { x: local.left, y: local.top + local.height / 2 };

      const midX = (hub.x + anchor.x) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${hub.x} ${hub.y} C ${midX} ${hub.y}, ${midX} ${anchor.y}, ${anchor.x} ${anchor.y}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('opacity', '0.55');
      linesSvg.appendChild(path);
    });

    canvas.style.transform = prevTransform;
  }

  // ---------- pan / zoom ----------
  let scale = 1;
  let panX = 0;
  let panY = 0;

  function applyTransform() {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function fitToViewport() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const prevTransform = canvas.style.transform;
    canvas.style.transform = 'none';
    const cw = canvas.scrollWidth;
    const ch = canvas.scrollHeight;
    canvas.style.transform = prevTransform;

    if (!cw || !ch) return;
    scale = Math.min(vw / cw, vh / ch, 1) * 0.94;
    scale = Math.max(scale, 0.15);
    panX = (vw - cw * scale) / 2;
    panY = (vh - ch * scale) / 2;
    applyTransform();
  }

  function zoomBy(factor) {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cx = vw / 2;
    const cy = vh / 2;
    const newScale = Math.min(Math.max(scale * factor, 0.15), 3);
    // keep viewport center fixed while zooming
    panX = cx - ((cx - panX) / scale) * newScale;
    panY = cy - ((cy - panY) / scale) * newScale;
    scale = newScale;
    applyTransform();
  }

  document.querySelector('#zoom-in').addEventListener('click', () => zoomBy(1.2));
  document.querySelector('#zoom-out').addEventListener('click', () => zoomBy(1 / 1.2));
  document.querySelector('#zoom-fit').addEventListener('click', fitToViewport);

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08);
  }, { passive: false });

  let dragging = false;
  let dragStart = { x: 0, y: 0, panX: 0, panY: 0 };
  viewport.addEventListener('mousedown', (e) => {
    dragging = true;
    viewport.classList.add('grabbing');
    dragStart = { x: e.clientX, y: e.clientY, panX, panY };
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panX = dragStart.panX + (e.clientX - dragStart.x);
    panY = dragStart.panY + (e.clientY - dragStart.y);
    applyTransform();
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    viewport.classList.remove('grabbing');
  });

  window.addEventListener('resize', () => {
    if (!emptyState.classList.contains('hidden')) return;
    fitToViewport();
  });

  // ---------- wiring ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const concept = input.value.trim();
    if (!concept) return;
    generate(concept, null, true);
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const concept = currentLang === 'zh' ? chip.dataset.zh : chip.dataset.en;
      input.value = concept;
      generate(concept, null, true);
    });
  });

  applyUiLanguage();
})();
