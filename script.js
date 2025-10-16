// EduHub small site script
// - Theme toggle (persisted)
// - Mobile menu (checkbox handled by CSS)
// - Upload simulation + client-side rendering of uploaded table
// - Filters, preview modal, delete

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const uploadForm = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');
  const fileTableBody = document.querySelector('#fileTable tbody');
  const subjectFilter = document.getElementById('subjectFilter');
  const typeFilter = document.getElementById('typeFilter');
  const sortSelect = document.getElementById('sort');
  const searchInput = document.getElementById('site-search');
  const previewModal = document.getElementById('preview-modal');
  const previewBody = document.getElementById('preview-body');
  const previewClose = document.getElementById('preview-close');

  // Initialize theme
  const stored = localStorage.getItem('eduhub-theme');
  if (stored === 'dark') {
    root.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
    themeToggle.setAttribute('aria-pressed', 'true');
  } else {
    themeToggle.textContent = '🌙';
    themeToggle.setAttribute('aria-pressed', 'false');
  }

  themeToggle.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) {
      root.removeAttribute('data-theme');
      localStorage.setItem('eduhub-theme', 'light');
      themeToggle.textContent = '🌙';
      themeToggle.setAttribute('aria-pressed', 'false');
    } else {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('eduhub-theme', 'dark');
      themeToggle.textContent = '☀️';
      themeToggle.setAttribute('aria-pressed', 'true');
    }
  });

  // In-memory "uploaded files" store (replace with real backend)
  const files = [];

  // Helpers
  function fmtDate(ts = Date.now()) {
    return new Date(ts).toLocaleString();
  }
  function fileIcon(type, name = '') {
    if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return '<i class="fa-regular fa-file-pdf" aria-hidden="true"></i>';
    if (type.includes('zip') || name.toLowerCase().endsWith('.zip')) return '<i class="fa-regular fa-file-zipper" aria-hidden="true"></i>';
    if (type.includes('off') || name.toLowerCase().endsWith('.docx') || name.toLowerCase().endsWith('.doc')) return '<i class="fa-regular fa-file-word" aria-hidden="true"></i>';
    return '<i class="fa-regular fa-file" aria-hidden="true"></i>';
  }

  function renderTable(list) {
    fileTableBody.innerHTML = '';
    if (!list.length) {
      fileTableBody.innerHTML = '<tr><td colspan="7" class="small center">No uploaded materials yet.</td></tr>';
      return;
    }
    list.forEach((f, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fileIcon(f.type, f.name)}</td>
        <td>${escapeHtml(f.name)}</td>
        <td>${escapeHtml(f.subject)}</td>
        <td>${escapeHtml(f.uploader)}</td>
        <td>${fmtDate(f.ts)}</td>
        <td><button class="btn btn-ghost preview-btn" data-idx="${idx}">Preview</button></td>
        <td><button class="btn btn-danger delete-btn" data-idx="${idx}">Delete</button></td>
      `;
      fileTableBody.appendChild(tr);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Upload handling (simulated)
  uploadForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fileInput = document.getElementById('uploadFile');
    const subject = document.getElementById('subject').value;
    const uploader = document.getElementById('uploader').value || 'Anonymous';

    if (!fileInput.files.length) {
      uploadStatus.textContent = 'Please choose a file to upload.';
      return;
    }

    const file = fileInput.files[0];
    uploadStatus.textContent = 'Uploading…';
    uploadStatus.classList.remove('small');

    // simulate upload delay
    setTimeout(() => {
      const entry = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        subject: subject || 'Unspecified',
        uploader,
        ts: Date.now(),
        size: file.size,
        blob: URL.createObjectURL(file) // for preview demo (revoke eventually)
      };
      files.unshift(entry);
      uploadStatus.textContent = `Uploaded ${file.name}`;
      renderTable(applyFilters());
      // clear file input
      fileInput.value = '';
      setTimeout(() => uploadStatus.textContent = '', 3000);
    }, 700 + Math.random() * 800);
  });

  // Filters + search + sort
  function applyFilters() {
    const s = subjectFilter?.value || 'all';
    const t = typeFilter?.value || 'all';
    const q = (searchInput?.value || '').toLowerCase().trim();
    const sort = sortSelect?.value || 'new';

    let out = files.filter(f => {
      if (s !== 'all' && f.subject !== s) return false;
      if (t !== 'all') {
        if (t === 'pdf' && !f.name.toLowerCase().endsWith('.pdf')) return false;
        if (t === 'docx' && !(/\.(docx|doc)$/i).test(f.name)) return false;
        if (t === 'zip' && !f.name.toLowerCase().endsWith('.zip')) return false;
      }
      if (q && !(f.name.toLowerCase().includes(q) || (f.subject||'').toLowerCase().includes(q))) return false;
      return true;
    });

    out.sort((a,b) => sort === 'new' ? b.ts - a.ts : a.ts - b.ts);
    return out;
  }

  [subjectFilter, typeFilter, sortSelect, searchInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      renderTable(applyFilters());
    });
  });

  // Delegate preview & delete from table body
  fileTableBody.addEventListener('click', (ev) => {
    const previewBtn = ev.target.closest('.preview-btn');
    if (previewBtn) {
      const idx = Number(previewBtn.dataset.idx);
      const file = applyFilters()[idx];
      if (file) openPreview(file);
      return;
    }
    const delBtn = ev.target.closest('.delete-btn');
    if (delBtn) {
      const idx = Number(delBtn.dataset.idx);
      const fileList = applyFilters();
      const file = fileList[idx];
      if (!file) return;
      // remove from master files array
      const masterIdx = files.findIndex(f => f.ts === file.ts && f.name === file.name);
      if (masterIdx !== -1) files.splice(masterIdx, 1);
      renderTable(applyFilters());
      return;
    }
  });

  // Preview modal
  function openPreview(file) {
    previewBody.innerHTML = '';
    // Attempt to show preview inline for common types
    if (file.type.includes('image') || /\.(png|jpe?g|gif|svg)$/i.test(file.name)) {
      const img = document.createElement('img');
      img.src = file.blob;
      img.alt = file.name;
      previewBody.appendChild(img);
    } else if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
      const iframe = document.createElement('iframe');
      iframe.src = file.blob;
      iframe.style.width = '100%';
      iframe.style.height = '70vh';
      previewBody.appendChild(iframe);
    } else {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = `Preview not available for ${file.name}. Download to view.`;
      previewBody.appendChild(p);
    }
    previewModal.setAttribute('aria-hidden', 'false');
  }

  previewClose?.addEventListener('click', () => {
    previewModal.setAttribute('aria-hidden', 'true');
    previewBody.innerHTML = '';
  });

  previewModal?.addEventListener('click', (ev) => {
    if (ev.target === previewModal) {
      previewModal.setAttribute('aria-hidden', 'true');
      previewBody.innerHTML = '';
    }
  });

  // Initial render
  renderTable(files);
});
