// comparison.js — side-by-side compare logic

async function runComparison() {
  const btn = document.getElementById('btn-compare-run');
  const progressBar = document.getElementById('compare-progress');

  const promptA = document.getElementById('cmp-prompt-a').value.trim();
  const promptB = document.getElementById('cmp-prompt-b').value.trim();

  if (!promptA || !promptB) {
    showNotification('error', '✗ Both prompts are required');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;
  progressBar.classList.add('indeterminate');

  // Clear previous outputs
  document.getElementById('cmp-output-a').innerHTML = '<div class="output-empty"><div class="empty-icon" style="animation:spin 1s linear infinite">⟳</div><div>Generating…</div></div>';
  document.getElementById('cmp-output-b').innerHTML = '<div class="output-empty"><div class="empty-icon" style="animation:spin 1s linear infinite">⟳</div><div>Generating…</div></div>';
  document.getElementById('cmp-meta-a').innerHTML = '';
  document.getElementById('cmp-meta-b').innerHTML = '';

  try {
    const payload = {
      prompt_a: {
        user_prompt: promptA,
        system_prompt: document.getElementById('cmp-system-a').value,
        technique: document.getElementById('cmp-technique-a').value,
        temperature: parseFloat(document.getElementById('cmp-temp-a').value),
        variables: {},
        max_tokens: 1024,
        top_p: 0.95,
      },
      prompt_b: {
        user_prompt: promptB,
        system_prompt: document.getElementById('cmp-system-b').value,
        technique: document.getElementById('cmp-technique-b').value,
        temperature: parseFloat(document.getElementById('cmp-temp-b').value),
        variables: {},
        max_tokens: 1024,
        top_p: 0.95,
      },
    };

    const data = await API.compare(payload);
    renderCompareOutput('a', data.result_a);
    renderCompareOutput('b', data.result_b);
  } catch (err) {
    document.getElementById('cmp-output-a').textContent = 'Error: ' + err.message;
    document.getElementById('cmp-output-b').textContent = 'Error: ' + err.message;
    showNotification('error', '✗ Compare failed: ' + err.message);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
    progressBar.classList.remove('indeterminate');
  }
}

function renderCompareOutput(side, result) {
  const outputEl = document.getElementById(`cmp-output-${side}`);
  const metaEl = document.getElementById(`cmp-meta-${side}`);

  if (!result) {
    outputEl.innerHTML = `<div class="output-empty"><div class="empty-icon">◎</div><div>No result returned</div></div>`;
    metaEl.innerHTML = '';
    return;
  }

  if (result.error) {
    outputEl.innerHTML = `<div class="output-content" style="color:var(--accent-red);">${escapeHtml(result.error)}</div>`;
    metaEl.innerHTML = `<span style="font-size:10px;color:var(--accent-red);">Request failed</span>`;
    return;
  }

  outputEl.innerHTML = `<div class="output-content">${simpleMarkdown(result.output)}</div>`;
  metaEl.innerHTML = `
    <span style="font-size:10px;color:var(--text-muted);">${result.model} · ⏱ ${result.latency_ms}ms · ${result.output_tokens} tokens</span>
  `;
}

function initComparison() {
  const compareButton = document.getElementById('btn-compare-run');
  if (!compareButton || compareButton.dataset.bound === 'true' || compareButton.getAttribute('onclick')) return;
  compareButton.addEventListener('click', runComparison);
  compareButton.dataset.bound = 'true';
}

window.runCompare = runComparison;
window.runComparison = runComparison;
