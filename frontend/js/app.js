
function navigateTo(page) {
  console.log("APP INITIALIZED");
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });
  if (page === 'library') loadLibrary();
  if (page === 'history') loadHistory();
}


  async function runPrompt(event) {
    console.log("RUN START");
  if (event) event.preventDefault();   
  const btn = document.getElementById('btn-run');
  const progressBar = document.getElementById('progress-bar');

  const userPrompt = document.getElementById('user-prompt').value.trim();
  if (!userPrompt) {
    showNotification('error', 'User prompt is required');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;
  progressBar.classList.add('indeterminate');
  document.getElementById('prompt-card').classList.add('generating');

  try {
    const params = getParams();
    const variables = getVariables();
    const technique = document.querySelector('.technique-btn.active')?.dataset.technique || 'zero-shot';
    const parseType = document.getElementById('parse-type').value;

    const payload = {
      user_prompt: userPrompt,
      system_prompt: document.getElementById('system-prompt').value,
      technique,
      variables,
      parse_output_type: parseType,
      ...params,
    };

    const result = await API.generate(payload);
    setActiveTabResult(result);
    renderOutput(result);
    await loadHistory(); 
  } catch (err) {
    showNotification('error', '✗ ' + err.message);
    setActiveTabResult(null);
    document.getElementById('output-body').innerHTML = `
      <div style="color:var(--accent-red);padding:10px;font-size:12px;">
        <strong>Error:</strong> ${escapeHtml(err.message)}
      </div>`;
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
    progressBar.classList.remove('indeterminate');
    document.getElementById('prompt-card').classList.remove('generating');
  }
}


let notifTimeout;
function showNotification(type, message) {
  const notif = document.getElementById('notification');
  document.getElementById('notif-text').textContent = message;
  document.getElementById('notif-icon').textContent = type === 'success' ? '✓' : '✗';
  notif.className = `notification ${type} show`;
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => notif.classList.remove('show'), 3000);
}


async function checkHealth() {
  console.log("RUN START");
  const dot = document.getElementById('api-status-dot');
  const text = document.getElementById('api-status-text');
  try {
    const res = await API.health();
    dot.className = 'status-dot';
    text.textContent = `${res.provider} · online`;
  } catch {
    dot.className = 'status-dot error';
    text.textContent = 'Backend offline';
  }
}


document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // Editor
  initEditor();

  // Run button
  document.getElementById('btn-run').addEventListener('click', (e) =>  runPrompt(e));
  document.getElementById('btn-clear').addEventListener('click', () => {
    document.getElementById('system-prompt').value = '';
    document.getElementById('user-prompt').value = '';
    document.getElementById('variables-card').style.display = 'none';
    setActiveTabResult(null);
    saveActiveTabState();
    document.getElementById('output-body').innerHTML = `<div class="output-empty"><div class="empty-icon">◎</div><div>Run a prompt to see output</div></div>`;
    document.getElementById('output-meta').innerHTML = '';
    updateTokenCounter();
    persistPlaygroundState();
  });

  // Also run on Ctrl+Enter in textarea
  document.getElementById('user-prompt').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runPrompt();
  });

  // Library & compare & history
  initLibrary();
  initComparison();

   // Default page: home
  navigateTo('home');
  
  // Health check
  checkHealth();
  setInterval(checkHealth, 30000);
});
