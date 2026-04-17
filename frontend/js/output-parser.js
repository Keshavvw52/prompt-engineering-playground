// output-parser.js — render and parse LLM output

let _lastResult = null;

function setLastResult(result) {
  _lastResult = result;
}

function getLastResult() {
  return _lastResult;
}

function switchOutputTab(tabName) {
  if (!_lastResult) return;

  const body = document.getElementById('output-body');

  if (tabName === 'raw') {
    body.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'output-content';
    div.innerText = _lastResult.output;
    body.appendChild(div);

  } else if (tabName === 'parsed') {
    renderParsedOutput(_lastResult.parsed, body);

  } else if (tabName === 'markdown') {
    body.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'output-content';
    div.innerHTML = simpleMarkdown(_lastResult.output);
    body.appendChild(div);
  }
}

function renderParsedOutput(parsed, container) {
  container.innerHTML = '';

  if (!parsed) {
    container.innerHTML = `
      <div class="output-empty">
        <div class="empty-icon">◎</div>
        <div>No parsed output available</div>
      </div>`;
    return;
  }

  if (parsed.type === 'json') {
    const wrapper = document.createElement('div');

    const header = document.createElement('div');
    header.className = 'code-header';

    const label = document.createElement('span');
    label.className = 'code-lang-label';
    label.textContent = 'JSON';

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      copyText(JSON.stringify(parsed.parsed, null, 2));
    });

    header.appendChild(label);
    header.appendChild(btn);

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.innerHTML = syntaxHighlightJson(JSON.stringify(parsed.parsed, null, 2));

    pre.appendChild(code);

    wrapper.appendChild(header);
    wrapper.appendChild(pre);

    container.appendChild(wrapper);
  }

  else if (parsed.type === 'code') {
    parsed.parsed.forEach(b => {
      const wrapper = document.createElement('div');

      const header = document.createElement('div');
      header.className = 'code-header';

      const label = document.createElement('span');
      label.className = 'code-lang-label';
      label.textContent = b.lang;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => copyText(b.code));

      header.appendChild(label);
      header.appendChild(btn);

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.innerText = b.code;

      pre.appendChild(code);

      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      container.appendChild(wrapper);
    });
  }

  else if (parsed.type === 'list') {
    const ul = document.createElement('ul');
    ul.style.paddingLeft = '20px';

    parsed.parsed.forEach(item => {
      const li = document.createElement('li');
      li.style.color = 'var(--text-secondary)';
      li.style.fontSize = '12.5px';
      li.innerText = item;
      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  else {
    const div = document.createElement('div');
    div.className = 'output-content';
    div.innerText = parsed.raw || '';
    container.appendChild(div);
  }
}

function renderOutput(result) {
  setLastResult(result);

  const body = document.getElementById('output-body');
  const meta = document.getElementById('output-meta');
  const badge = document.getElementById('output-type-badge');

  const parsed = result.parsed || {};
  const pType = parsed.type || 'text';

  const typeColors = {
    json: 'parse-json',
    code: 'parse-code',
    list: 'parse-list',
    text: 'parse-text'
  };

  badge.className = `parse-badge ${typeColors[pType] || 'parse-text'}`;
  badge.textContent = pType;

  // META (safe way)
  meta.innerHTML = '';

  const modelChip = document.createElement('div');
  modelChip.className = 'meta-chip';
  modelChip.innerHTML = `<strong>${result.model || '—'}</strong>`;

  const tokenChip = document.createElement('div');
  tokenChip.className = 'meta-chip';
  tokenChip.textContent = `⬡ ${result.input_tokens || 0} in / ${result.output_tokens || 0} out`;

  const timeChip = document.createElement('div');
  timeChip.className = 'meta-chip';
  timeChip.textContent = `⏱ ${result.latency_ms || 0}ms`;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => copyText(result.output));

  meta.appendChild(modelChip);
  meta.appendChild(tokenChip);
  meta.appendChild(timeChip);
  meta.appendChild(copyBtn);

  const activeTab = document.querySelector('.output-tab.active')?.dataset.outputTab || 'raw';
  switchOutputTab(activeTab);
}

function syntaxHighlightJson(json) {
  return escapeHtml(json)
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (-?\d+(\.\d+)?)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
    .replace(/: null/g, ': <span class="json-null">null</span>');
}

function simpleMarkdown(text) {
  let html = escapeHtml(text);

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code}</code></pre>`
  );

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showNotification('success', '✓ Copied'));
}