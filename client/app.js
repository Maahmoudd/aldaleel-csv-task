const terminalStatuses = new Set(['completed', 'completed_with_errors', 'failed']);
const statusLabels = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  completed_with_errors: 'Completed with errors',
  failed: 'Failed',
};

const elements = {
  copyId: document.querySelector('#copy-id'),
  dropCopy: document.querySelector('#drop-copy'),
  dropTitle: document.querySelector('#drop-title'),
  dropZone: document.querySelector('#drop-zone'),
  errorCount: document.querySelector('#error-count'),
  errorRows: document.querySelector('#error-rows'),
  errorsSection: document.querySelector('#errors-section'),
  fileInput: document.querySelector('#file-input'),
  form: document.querySelector('#upload-form'),
  formNotice: document.querySelector('#form-notice'),
  historyList: document.querySelector('#history-list'),
  jobFilename: document.querySelector('#job-filename'),
  metricFailed: document.querySelector('#metric-failed'),
  metricSuccess: document.querySelector('#metric-success'),
  metricTotal: document.querySelector('#metric-total'),
  processCaption: document.querySelector('#process-caption'),
  processPercent: document.querySelector('#process-percent'),
  processProgressBar: document.querySelector('#process-progress-bar'),
  refreshHistory: document.querySelector('#refresh-history'),
  resultPanel: document.querySelector('#result-panel'),
  selectedFile: document.querySelector('#selected-file'),
  statusPill: document.querySelector('#status-pill'),
  uploadButton: document.querySelector('#upload-button'),
  uploadPercent: document.querySelector('#upload-percent'),
  uploadProgress: document.querySelector('#upload-progress'),
  uploadProgressBar: document.querySelector('#upload-progress-bar'),
};

let selectedFile;
let pollTimer;

function showNotice(message) {
  elements.formNotice.textContent = message;
  elements.formNotice.hidden = false;
}

function clearNotice() {
  elements.formNotice.hidden = true;
  elements.formNotice.textContent = '';
}

function humanFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setSelectedFile(file) {
  selectedFile = file;
  clearNotice();

  if (!file) {
    elements.fileInput.value = '';
    elements.selectedFile.hidden = true;
    elements.uploadButton.disabled = true;
    elements.dropTitle.textContent = 'Drop a CSV here';
    elements.dropCopy.textContent = 'or select a file from your computer';
    return;
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    setSelectedFile(undefined);
    showNotice('Choose a file with a .csv extension.');
    return;
  }

  elements.selectedFile.textContent = `${file.name} · ${humanFileSize(file.size)}`;
  elements.selectedFile.hidden = false;
  elements.uploadButton.disabled = false;
  elements.dropTitle.textContent = 'File ready to import';
  elements.dropCopy.textContent = 'Select another file to replace it';
}

async function apiRequest(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'The request could not be completed');
  return body;
}

function uploadCsv(file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const data = new FormData();
    data.append('file', file);

    request.open('POST', '/api/imports');
    request.setRequestHeader('Accept', 'application/json');
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      let body;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        reject(new Error('The server returned an unreadable response'));
        return;
      }

      if (request.status < 200 || request.status >= 300) {
        reject(new Error(body.error?.message ?? 'The upload could not be completed'));
        return;
      }
      resolve(body);
    });
    request.addEventListener('error', () => reject(new Error('The upload connection failed')));
    request.send(data);
  });
}

function formatDate(value) {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function renderErrors(errors = []) {
  elements.errorRows.replaceChildren();
  elements.errorsSection.hidden = errors.length === 0;
  elements.errorCount.textContent = `${errors.length} ${errors.length === 1 ? 'issue' : 'issues'}`;

  for (const error of errors) {
    const row = document.createElement('tr');
    for (const value of [error.row, error.field, error.reason]) {
      const cell = document.createElement('td');
      cell.textContent = String(value);
      row.append(cell);
    }
    elements.errorRows.append(row);
  }
}

function renderImport(importJob) {
  const progress = Number(importJob.progressPercentage ?? 0);
  const status = importJob.status ?? 'pending';

  elements.resultPanel.hidden = false;
  elements.jobFilename.textContent = importJob.filename;
  elements.copyId.textContent = importJob.id;
  elements.copyId.dataset.id = importJob.id;
  elements.statusPill.textContent = statusLabels[status] ?? status;
  elements.statusPill.className = `status-pill ${status.replaceAll('_', '-')}`;
  elements.processPercent.textContent = `${progress}%`;
  elements.processProgressBar.value = progress;
  elements.metricTotal.textContent = importJob.totalRecords ?? 0;
  elements.metricSuccess.textContent = importJob.successfulRecords ?? 0;
  elements.metricFailed.textContent = importJob.failedRecords ?? 0;

  if (terminalStatuses.has(status)) {
    elements.processCaption.textContent = `Finished ${formatDate(importJob.completedAt)}`;
  } else if (status === 'processing') {
    elements.processCaption.textContent = `${importJob.processedRecords} of ${importJob.totalRecords} rows processed`;
  } else {
    elements.processCaption.textContent = 'Queued and waiting for processing to start…';
  }

  renderErrors(importJob.errors);
}

async function pollImport(importId) {
  clearTimeout(pollTimer);
  try {
    const { data } = await apiRequest(`/api/imports/${importId}`);
    renderImport(data);
    if (terminalStatuses.has(data.status)) {
      await loadHistory();
      return;
    }
    pollTimer = window.setTimeout(() => void pollImport(importId), 800);
  } catch (error) {
    showNotice(error.message);
  }
}

function createHistoryItem(importJob) {
  const button = document.createElement('button');
  const heading = document.createElement('div');
  const filename = document.createElement('strong');
  const status = document.createElement('small');
  const details = document.createElement('p');

  button.type = 'button';
  button.className = 'history-item';
  filename.textContent = importJob.filename;
  status.textContent = statusLabels[importJob.status] ?? importJob.status;
  details.textContent = `${importJob.successfulRecords}/${importJob.totalRecords} imported · ${formatDate(importJob.uploadedAt)}`;
  heading.append(filename, status);
  button.append(heading, details);
  button.addEventListener('click', async () => {
    try {
      const { data } = await apiRequest(`/api/imports/${importJob.id}`);
      renderImport(data);
      elements.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!terminalStatuses.has(data.status)) void pollImport(data.id);
    } catch (error) {
      showNotice(error.message);
    }
  });
  return button;
}

async function loadHistory() {
  elements.refreshHistory.disabled = true;
  try {
    const { data } = await apiRequest('/api/imports?page=1&limit=8');
    elements.historyList.replaceChildren();
    if (data.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No imports yet. Your first completed upload will appear here.';
      elements.historyList.append(empty);
      return;
    }
    elements.historyList.append(...data.map(createHistoryItem));
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = error.message;
    elements.historyList.replaceChildren(message);
  } finally {
    elements.refreshHistory.disabled = false;
  }
}

elements.fileInput.addEventListener('change', () => setSelectedFile(elements.fileInput.files[0]));

for (const eventName of ['dragenter', 'dragover']) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('is-dragging');
  });
}

for (const eventName of ['dragleave', 'drop']) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('is-dragging');
  });
}

elements.dropZone.addEventListener('drop', (event) => setSelectedFile(event.dataTransfer.files[0]));
elements.refreshHistory.addEventListener('click', () => void loadHistory());
elements.copyId.addEventListener('click', async () => {
  const importId = elements.copyId.dataset.id;
  if (!importId) return;
  try {
    await navigator.clipboard.writeText(importId);
    elements.copyId.textContent = 'Copied to clipboard';
  } catch {
    elements.copyId.textContent = importId;
    return;
  }
  window.setTimeout(() => {
    elements.copyId.textContent = importId;
  }, 1200);
});

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedFile) return;

  clearNotice();
  clearTimeout(pollTimer);
  elements.uploadButton.disabled = true;
  elements.uploadButton.textContent = 'Uploading…';
  elements.uploadProgress.hidden = false;

  try {
    const response = await uploadCsv(selectedFile, (progress) => {
      elements.uploadPercent.textContent = `${progress}%`;
      elements.uploadProgressBar.value = progress;
    });
    elements.uploadPercent.textContent = '100%';
    elements.uploadProgressBar.value = 100;
    renderImport(response.data);
    setSelectedFile(undefined);
    void pollImport(response.data.id);
  } catch (error) {
    showNotice(error.message);
  } finally {
    elements.uploadButton.textContent = 'Start import';
    elements.uploadButton.disabled = !selectedFile;
    window.setTimeout(() => {
      elements.uploadProgress.hidden = true;
      elements.uploadProgressBar.value = 0;
      elements.uploadPercent.textContent = '0%';
    }, 700);
  }
});

void loadHistory();
