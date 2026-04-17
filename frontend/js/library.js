let _savedPrompts = [];
let _activeHistoryEntry = null;

async function loadLibrary() {
  try {
    _savedPrompts = await API.getPrompts();
    renderLibrary(_savedPrompts);
    document.getElementById('library-count').textContent = _savedPrompts.length;
  } catch (err) {
    console.error('Failed to load library:', err);
  }
}

function renderLibrary(prompts) {
  const grid = document.getElementById('library-grid');
  if (!prompts.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-title">No saved prompts</div>
        <div class="empty-state-text">Save prompts from the Playground to find them here.</div>
      </div>`;
    return;
  }

  grid.innerHTML = prompts.map(p => `
    <div class="prompt-card" data-id="${p.id}">
      <div class="prompt-card-name">
        <span>📄</span> ${escapeHtml(p.name)}
      </div>
      <div class="prompt-card-preview">${escapeHtml(p.user_prompt)}</div>
      <div class="prompt-card-meta">
        <span class="tag tag-technique">${p.technique}</span>
        ${p.tags ? p.tags.split(',').map(t => `<span class="tag tag-category">${escapeHtml(t.trim())}</span>`).join('') : ''}
        <span style="margin-left:auto;display:flex;gap:4px;">
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:10px;" onclick="loadSavedPrompt(${p.id})">Load</button>
          <button class="btn btn-danger" style="padding:3px 8px;font-size:10px;" onclick="deleteSavedPrompt(event,${p.id})">✕</button>
        </span>
      </div>
    </div>
  `).join('');
}

function loadSavedPrompt(id) {
  const prompt = _savedPrompts.find(p => p.id === id);
  if (!prompt) return;
  document.getElementById('system-prompt').value = prompt.system_prompt || '';
  document.getElementById('user-prompt').value = prompt.user_prompt || '';
  document.querySelectorAll('.technique-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.technique === prompt.technique);
  });
  setActiveTabResult(null);
  restoreTabOutput(getActiveTab());
  updateTokenCounter();
  renderVariablesFromPrompt();
  navigateTo('playground');
  showNotification('success', `✓ Loaded: ${prompt.name}`);
}

async function deleteSavedPrompt(event, id) {
  event.stopPropagation();
  try {
    await API.deletePrompt(id);
    await loadLibrary();
    showNotification('success', '✓ Prompt deleted');
  } catch (err) {
    showNotification('error', '✗ Delete failed');
  }
}

function openSaveModal() {
  document.getElementById('save-modal').classList.add('open');
  document.getElementById('save-name').focus();
}

function closeSaveModal() {
  document.getElementById('save-modal').classList.remove('open');
}

async function confirmSave() {
  const name = document.getElementById('save-name').value.trim();
  if (!name) {
    showNotification('error', '✗ Name is required');
    return;
  }
  const tab = getActiveTab();
  saveActiveTabState();
  const payload = {
    name,
    system_prompt: document.getElementById('system-prompt').value,
    user_prompt: document.getElementById('user-prompt').value,
    technique: document.querySelector('.technique-btn.active')?.dataset.technique || 'zero-shot',
    tags: document.getElementById('save-tags').value,
  };
  try {
    await API.savePrompt(payload);
    closeSaveModal();
    await loadLibrary();
    document.getElementById('save-name').value = '';
    document.getElementById('save-tags').value = '';
    showNotification('success', '✓ Prompt saved!');
  } catch (err) {
    showNotification('error', '✗ Save failed: ' + err.message);
  }
}


async function loadHistory() {
  try {
    const entries = await API.getHistory();
    renderHistory(entries);
    document.getElementById('history-count').textContent = entries.length;
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

function renderHistory(entries) {
  const tbody = document.getElementById('history-tbody');
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:40px;">No history yet. Run some prompts!</td></tr>`;
    return;
  }
  tbody.innerHTML = entries.map(e => `
    <tr onclick="openHistoryEntry(${e.id})">
      <td style="color:var(--text-muted);">#${e.id}</td>
      <td style="max-width:200px;">${escapeHtml(e.user_prompt.substring(0, 60))}${e.user_prompt.length > 60 ? '…' : ''}</td>
      <td><span class="td-technique">${e.technique}</span></td>
      <td style="color:var(--accent-cyan);">${e.model}</td>
      <td>${e.temperature}</td>
      <td style="color:var(--accent-blue);">${e.input_tokens}</td>
      <td style="color:var(--accent-green);">${e.output_tokens}</td>
      <td style="color:var(--accent-orange);">${e.latency_ms}ms</td>
      <td style="color:var(--text-muted);">${formatDate(e.created_at)}</td>
      <td>
        <button class="btn btn-ghost" style="padding:2px 8px;font-size:10px;" onclick="loadHistoryEntry(event,${e.id})">Load</button>
        <button class="btn btn-danger" style="padding:2px 8px;font-size:10px;" onclick="deleteHistEntry(event,${e.id})">✕</button>
      </td>
    </tr>
  `).join('');
}

function openHistoryEntry(id) {
  const entries = document.querySelectorAll('#history-tbody tr');
  // We store cached data during render - refetch from API
  API.getHistory().then(all => {
    const e = all.find(x => x.id === id);
    if (!e) return;
    _activeHistoryEntry = e;
    const modal = document.getElementById('history-modal');
    document.getElementById('history-modal-title').textContent = `#${e.id} · ${e.technique} · ${e.model}`;
    document.getElementById('history-modal-body').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label>System Prompt</label>
          <pre>${escapeHtml(e.system_prompt || '(none)')}</pre>
        </div>
        <div>
          <label>User Prompt</label>
          <pre>${escapeHtml(e.user_prompt)}</pre>
        </div>
        <div>
          <label>Output</label>
          <pre>${escapeHtml(e.output)}</pre>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <div class="meta-chip">Temp: <strong>${e.temperature}</strong></div>
          <div class="meta-chip">Max tokens: <strong>${e.max_tokens}</strong></div>
          <div class="meta-chip">In: <strong>${e.input_tokens}</strong></div>
          <div class="meta-chip">Out: <strong>${e.output_tokens}</strong></div>
          <div class="meta-chip">Latency: <strong>${e.latency_ms}ms</strong></div>
        </div>
      </div>
    `;
    modal.classList.add('open');
  });
}

function closeHistoryModal() {
  document.getElementById('history-modal').classList.remove('open');
}

function loadHistoryEntry(event, id) {
  event.stopPropagation();
  API.getHistory().then(all => {
    const e = all.find(x => x.id === id);
    if (!e) return;
    document.getElementById('system-prompt').value = e.system_prompt || '';
    document.getElementById('user-prompt').value = e.user_prompt || '';
    document.querySelectorAll('.technique-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.technique === e.technique);
    });
    document.getElementById('param-temperature').value = e.temperature;
    document.getElementById('param-max-tokens').value = e.max_tokens;
    ['param-temperature','param-max-tokens','param-top-p'].forEach(id => {
      document.getElementById(id).dispatchEvent(new Event('input'));
    });
    setActiveTabResult(null);
    restoreTabOutput(getActiveTab());
    updateTokenCounter();
    navigateTo('playground');
    showNotification('success', `✓ Loaded history entry #${e.id}`);
  });
}

async function deleteHistEntry(event, id) {
  event.stopPropagation();
  try {
    await API.deleteHistoryEntry(id);
    await loadHistory();
    showNotification('success', '✓ Entry deleted');
  } catch (err) {
    showNotification('error', '✗ Delete failed');
  }
}

// ===== HELPERS =====

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function initLibrary() {
  document.getElementById('btn-save-open').addEventListener('click', openSaveModal);
  document.getElementById('btn-confirm-save').addEventListener('click', confirmSave);
  document.getElementById('btn-load-history').addEventListener('click', () => {
    if (_activeHistoryEntry) {
      loadHistoryEntry({ stopPropagation: () => {} }, _activeHistoryEntry.id);
      closeHistoryModal();
    }
  });

  document.getElementById('btn-clear-history').addEventListener('click', async () => {
    if (!confirm('Clear all history?')) return;
    const entries = await API.getHistory();
    await Promise.all(entries.map(e => API.deleteHistoryEntry(e.id)));
    await loadHistory();
    showNotification('success', '✓ History cleared');
  });

  document.getElementById('library-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = _savedPrompts.filter(p =>
      p.name.toLowerCase().includes(q) || p.user_prompt.toLowerCase().includes(q)
    );
    renderLibrary(filtered);
  });

  // Close modals on overlay click
  document.getElementById('save-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSaveModal();
  });
  document.getElementById('history-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeHistoryModal();
  });
}
