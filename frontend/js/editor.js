// editor.js — prompt editor logic, tabs, token counter, variables

const EditorState = {
  tabs: [
    { id: 0, name: 'Prompt 1', systemPrompt: '', userPrompt: '', technique: 'zero-shot', variables: {}, lastResult: null }
  ],
  activeTab: 0,
  nextTabId: 1,
};

const PLAYGROUND_STORAGE_KEY = 'promptlab.playgroundState';

function getActiveTab() {
  return EditorState.tabs.find(t => t.id === EditorState.activeTab);
}

function saveActiveTabState() {
  const tab = getActiveTab();
  if (!tab) return;
  tab.systemPrompt = document.getElementById('system-prompt').value;
  tab.userPrompt = document.getElementById('user-prompt').value;
  tab.technique = document.querySelector('.technique-btn.active')?.dataset.technique || 'zero-shot';
  persistPlaygroundState();
}

function loadTabState(tab) {
  document.getElementById('system-prompt').value = tab.systemPrompt || '';
  document.getElementById('user-prompt').value = tab.userPrompt || '';
  // Set technique
  document.querySelectorAll('.technique-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.technique === tab.technique);
  });
  updateTokenCounter();
  renderVariablesFromPrompt();
  restoreTabOutput(tab);
}

function renderTabs() {
  const bar = document.getElementById('tabs-bar');
  // Remove old tabs (keep the add button)
  bar.querySelectorAll('.tab').forEach(el => el.remove());
  const addBtn = document.getElementById('tab-add');

  EditorState.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === EditorState.activeTab ? ' active' : '');
    el.dataset.tab = tab.id;
    el.innerHTML = `<span>${tab.name}</span><span class="tab-close" onclick="closeTab(event,${tab.id})">✕</span>`;
    el.addEventListener('click', () => switchTab(tab.id));
    bar.insertBefore(el, addBtn);
  });
}

function switchTab(id) {
  saveActiveTabState();
  EditorState.activeTab = id;
  renderTabs();
  loadTabState(getActiveTab());
  persistPlaygroundState();
}

function addTab() {
  saveActiveTabState();
  const id = EditorState.nextTabId++;
  EditorState.tabs.push({
    id, name: `Prompt ${id + 1}`,
    systemPrompt: '', userPrompt: '', technique: 'zero-shot', variables: {}, lastResult: null
  });
  EditorState.activeTab = id;
  renderTabs();
  loadTabState(getActiveTab());
  persistPlaygroundState();
}

function closeTab(event, id) {
  event.stopPropagation();
  if (EditorState.tabs.length === 1) return; // keep at least one
  EditorState.tabs = EditorState.tabs.filter(t => t.id !== id);
  if (EditorState.activeTab === id) {
    EditorState.activeTab = EditorState.tabs[EditorState.tabs.length - 1].id;
  }
  renderTabs();
  loadTabState(getActiveTab());
  persistPlaygroundState();
}

// Token counter (approximate: 1 token ≈ 4 chars)
function updateTokenCounter() {
  const systemVal = document.getElementById('system-prompt').value || '';
  const userVal = document.getElementById('user-prompt').value || '';
  const combined = systemVal + ' ' + userVal;
  const tokens = Math.max(0, Math.ceil(combined.trim().length / 4));
  const chars = combined.trim().length;
  document.getElementById('token-display').textContent = tokens;
  document.getElementById('char-display').textContent = chars;
}

// Detect {{variable}} placeholders
function renderVariablesFromPrompt() {
  const prompt = document.getElementById('user-prompt').value || '';
  const matches = [...new Set(prompt.match(/\{\{(.+?)\}\}/g) || [])].map(m => m.slice(2, -2).trim());
  const section = document.getElementById('variables-section');
  const card = document.getElementById('variables-card');
  section.innerHTML = '';

  if (matches.length === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  const tab = getActiveTab();
  matches.forEach(varName => {
    const row = document.createElement('div');
    row.className = 'variable-input-row';
    row.innerHTML = `
      <div class="var-name">{{${varName}}}</div>
      <input type="text" class="var-input" data-var="${varName}" placeholder="Enter value…" value="${tab.variables[varName] || ''}" />
    `;
    section.appendChild(row);
  });

  section.querySelectorAll('.var-input').forEach(input => {
    input.addEventListener('input', () => {
      const tab = getActiveTab();
      tab.variables[input.dataset.var] = input.value;
    });
  });
}

function getVariables() {
  const vars = {};
  document.querySelectorAll('.var-input').forEach(input => {
    vars[input.dataset.var] = input.value;
  });
  return vars;
}

function setActiveTabResult(result) {
  const tab = getActiveTab();
  if (!tab) return;
  tab.lastResult = result || null;
  persistPlaygroundState();
}

function restoreTabOutput(tab) {
  const outputBody = document.getElementById('output-body');
  const outputMeta = document.getElementById('output-meta');
  const badge = document.getElementById('output-type-badge');

  if (!tab?.lastResult) {
    outputBody.innerHTML = `<div class="output-empty"><div class="empty-icon">◎</div><div>Run a prompt to see output</div></div>`;
    outputMeta.innerHTML = '';
    if (badge) {
      badge.className = 'parse-badge parse-text';
      badge.textContent = 'text';
    }
    return;
  }

  renderOutput(tab.lastResult);
}

function getPlaygroundPersistedState() {
  return {
    editorState: JSON.parse(JSON.stringify(EditorState)),
    params: {
      temperature: document.getElementById('param-temperature')?.value,
      max_tokens: document.getElementById('param-max-tokens')?.value,
      top_p: document.getElementById('param-top-p')?.value,
      frequency_penalty: document.getElementById('param-freq-penalty')?.value,
      presence_penalty: document.getElementById('param-pres-penalty')?.value,
    },
    parseType: document.getElementById('parse-type')?.value || 'auto',
    activeOutputTab: document.querySelector('.output-tab.active')?.dataset.outputTab || 'raw',
  };
}

function persistPlaygroundState() {
  try {
    sessionStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(getPlaygroundPersistedState()));
  } catch {}
}

function restorePlaygroundState() {
  try {
    const raw = sessionStorage.getItem(PLAYGROUND_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    if (saved.editorState?.tabs?.length) {
      EditorState.tabs = saved.editorState.tabs;
      EditorState.activeTab = saved.editorState.activeTab ?? 0;
      EditorState.nextTabId = saved.editorState.nextTabId ?? (Math.max(...saved.editorState.tabs.map(t => t.id), 0) + 1);
    }

    renderTabs();
    loadTabState(getActiveTab());

    if (saved.params) {
      const paramMap = {
        temperature: 'param-temperature',
        max_tokens: 'param-max-tokens',
        top_p: 'param-top-p',
        frequency_penalty: 'param-freq-penalty',
        presence_penalty: 'param-pres-penalty',
      };
      Object.entries(paramMap).forEach(([key, elementId]) => {
        const el = document.getElementById(elementId);
        if (el && saved.params[key] != null) el.value = saved.params[key];
      });
      Object.values(paramMap).forEach(id => document.getElementById(id)?.dispatchEvent(new Event('input')));
    }

    if (saved.parseType) {
      document.getElementById('parse-type').value = saved.parseType;
    }

    if (saved.activeOutputTab) {
      document.querySelectorAll('.output-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.outputTab === saved.activeOutputTab);
      });
      switchOutputTab(saved.activeOutputTab);
    }
  } catch {}
}

// Params slider binding
function initSliders() {
  const sliders = [
    { id: 'param-temperature', valId: 'val-temperature', decimals: 2, min: 0, max: 2 },
    { id: 'param-max-tokens', valId: 'val-max-tokens', decimals: 0, min: 64, max: 4096 },
    { id: 'param-top-p', valId: 'val-top-p', decimals: 2, min: 0, max: 1 },
    { id: 'param-freq-penalty', valId: 'val-freq-penalty', decimals: 2, min: -2, max: 2 },
    { id: 'param-pres-penalty', valId: 'val-pres-penalty', decimals: 2, min: -2, max: 2 },
  ];
  sliders.forEach(({ id, valId, decimals, min, max }) => {
    const slider = document.getElementById(id);
    const display = document.getElementById(valId);
    const updateProgress = () => {
      const pct = ((slider.value - min) / (max - min)) * 100;
      slider.style.setProperty('--progress', pct + '%');
      display.textContent = parseFloat(slider.value).toFixed(decimals);
      persistPlaygroundState();
    };
    slider.addEventListener('input', updateProgress);
    updateProgress();
  });
}

function getParams() {
  return {
    temperature: parseFloat(document.getElementById('param-temperature').value),
    max_tokens: parseInt(document.getElementById('param-max-tokens').value),
    top_p: parseFloat(document.getElementById('param-top-p').value),
    frequency_penalty: parseFloat(document.getElementById('param-freq-penalty').value),
    presence_penalty: parseFloat(document.getElementById('param-pres-penalty').value),
  };
}

function applyPreset(preset) {
  const presets = {
    precise:  { temperature: 0.2, max_tokens: 1024, top_p: 0.9, frequency_penalty: 0, presence_penalty: 0 },
    balanced: { temperature: 0.7, max_tokens: 1024, top_p: 0.95, frequency_penalty: 0, presence_penalty: 0 },
    creative: { temperature: 1.2, max_tokens: 2048, top_p: 1.0, frequency_penalty: 0.3, presence_penalty: 0.3 },
    code:     { temperature: 0.3, max_tokens: 2048, top_p: 0.9, frequency_penalty: 0, presence_penalty: 0 },
  };
  const p = presets[preset];
  if (!p) return;
  document.getElementById('param-temperature').value = p.temperature;
  document.getElementById('param-max-tokens').value = p.max_tokens;
  document.getElementById('param-top-p').value = p.top_p;
  document.getElementById('param-freq-penalty').value = p.frequency_penalty;
  document.getElementById('param-pres-penalty').value = p.presence_penalty;
  // Trigger input events to update displays
  ['param-temperature','param-max-tokens','param-top-p','param-freq-penalty','param-pres-penalty']
    .forEach(id => document.getElementById(id).dispatchEvent(new Event('input')));
  showNotification('success', `✓ Preset applied: ${preset}`);
}

function initEditor() {
  document.getElementById('tab-add').addEventListener('click', addTab);

  document.getElementById('user-prompt').addEventListener('input', () => {
    updateTokenCounter();
    renderVariablesFromPrompt();
    saveActiveTabState();
  });
  document.getElementById('system-prompt').addEventListener('input', () => {
    updateTokenCounter();
    saveActiveTabState();
  });

  document.getElementById('btn-detect-vars').addEventListener('click', renderVariablesFromPrompt);
  document.getElementById('parse-type').addEventListener('change', persistPlaygroundState);
  document.getElementById('btn-clear-system').addEventListener('click', () => {
    document.getElementById('system-prompt').value = '';
    saveActiveTabState();
  });

  // Technique buttons
  document.querySelectorAll('.technique-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.technique-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveActiveTabState();
    });
  });

  // Output tabs
  document.querySelectorAll('.output-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchOutputTab(tab.dataset.outputTab);
      persistPlaygroundState();
    });
  });

  initSliders();
  renderTabs();
  restorePlaygroundState();
}
