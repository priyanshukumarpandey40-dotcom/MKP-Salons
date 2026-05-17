const urlInput = document.getElementById('urlInput');
const questionInput = document.getElementById('questionInput');
const ingestBtn = document.getElementById('ingestBtn');
const askBtn = document.getElementById('askBtn');
const ingestStatus = document.getElementById('ingestStatus');
const messages = document.getElementById('messages');

function appendMessage(label, text) {
  messages.textContent += `${label}: ${text}\n\n`;
}

ingestBtn.addEventListener('click', async () => {
  ingestStatus.textContent = 'Ingesting...';

  const response = await fetch('/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: urlInput.value })
  });

  const data = await response.json();

  if (!response.ok) {
    ingestStatus.textContent = `Error: ${data.error}`;
    return;
  }

  ingestStatus.textContent = `Done: ${data.knowledgeSummary.title}`;
});

askBtn.addEventListener('click', async () => {
  const question = questionInput.value;
  appendMessage('You', question);

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: urlInput.value, question })
  });

  const data = await response.json();

  if (!response.ok) {
    appendMessage('Bot', `Error: ${data.error}`);
    return;
  }

  appendMessage('Bot', data.answer);
});
