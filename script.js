
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;

  // UI elements
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
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
  const fileLabelText = document.getElementById('file-label-text');

  // Sidebar toggle (collapse / expand)
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('collapsed');
      sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  // Theme initialization & toggle (persist)
  const stored = localStorage.getItem('eduhub-theme');
  if (stored === 'dark') {
    root.setAttribute('data-theme', 'dark');
    if (themeToggle) { themeToggle.textContent = '☀️'; themeToggle.setAttribute('aria-pressed','true'); }
  } else {
    if (themeToggle) { themeToggle.textContent = '🌙'; themeToggle.setAttribute('aria-pressed','false'); }
  }
  themeToggle?.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) { root.removeAttribute('data-theme'); localStorage.setItem('eduhub-theme','light'); themeToggle.textContent = '🌙'; themeToggle.setAttribute('aria-pressed','false'); }
    else { root.setAttribute('data-theme','dark'); localStorage.setItem('eduhub-theme','dark'); themeToggle.textContent = '☀️'; themeToggle.setAttribute('aria-pressed','true'); }
  });

  // Add reliable pressed state for buttons (pointer events + fallback)
  (function attachPressedHandlers() {
    const pressables = document.querySelectorAll('.btn');
    pressables.forEach(el => {
      el.addEventListener('pointerdown', onStart, {passive:true});
      el.addEventListener('pointerup', onEnd);
      el.addEventListener('pointerleave', onEnd);
      el.addEventListener('pointercancel', onEnd);
      el.addEventListener('touchstart', onStart, {passive:true});
      el.addEventListener('touchend', onEnd);
      el.addEventListener('touchcancel', onEnd);
    });
    function onStart(e){ e.currentTarget.classList.add('pressed'); }
    function onEnd(e){ e.currentTarget.classList.remove('pressed'); }
  })();

  // In-memory files array for demo
  const files = [];

  // Helpers
  function fmtDate(ts = Date.now()){ return new Date(ts).toLocaleString(); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function fileIcon(type, name = '') {
    if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return '<i class="fa-regular fa-file-pdf" aria-hidden="true"></i>';
    if (type.includes('zip') || name.toLowerCase().endsWith('.zip')) return '<i class="fa-regular fa-file-zipper" aria-hidden="true"></i>';
    if (type.includes('off') || name.toLowerCase().endsWith('.docx') || name.toLowerCase().endsWith('.doc')) return '<i class="fa-regular fa-file-word" aria-hidden="true"></i>';
    if (type.startsWith('image') || /\.(png|jpe?g|gif|svg)$/i.test(name)) return '<i class="fa-regular fa-file-image" aria-hidden="true"></i>';
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

  // Upload form (simulated)
  uploadForm?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fileInput = document.getElementById('uploadFile');
    const subject = document.getElementById('subject').value;
    const uploader = document.getElementById('uploader').value || 'Anonymous';

    if (!fileInput || !fileInput.files.length) {
      uploadStatus.textContent = 'Choose a file to upload.';
      return;
    }
    const file = fileInput.files[0];
    uploadStatus.textContent = 'Uploading…';

    setTimeout(() => {
      const entry = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        subject: subject || 'Unspecified',
        uploader,
        ts: Date.now(),
        size: file.size,
        blob: URL.createObjectURL(file)
      };
      files.unshift(entry);
      uploadStatus.textContent = `Uploaded ${file.name}`;
      renderTable(applyFilters());
      fileInput.value = '';
      if (fileLabelText) fileLabelText.textContent = 'Choose file…';
      setTimeout(()=>uploadStatus.textContent = '', 2500);
    }, 600 + Math.random() * 700);
  });

  // Show selected filename
  const realFileInput = document.getElementById('uploadFile');
  realFileInput?.addEventListener('change', () => {
    const f = realFileInput.files[0];
    if (fileLabelText) fileLabelText.textContent = f ? f.name : 'Choose file…';
  });

  // Filters/search/sort
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

    if (sort === 'new') out.sort((a,b)=>b.ts-a.ts);
    else if (sort === 'old') out.sort((a,b)=>a.ts-b.ts);
    else if (sort === 'name') out.sort((a,b)=>a.name.localeCompare(b.name, undefined, {sensitivity:'base'}));

    return out;
  }

  [subjectFilter, typeFilter, sortSelect, searchInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => renderTable(applyFilters()));
  });

  // Table actions: preview & delete
  fileTableBody?.addEventListener('click', (ev) => {
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
      const masterIdx = files.findIndex(f => f.ts === file.ts && f.name === file.name);
      if (masterIdx !== -1) files.splice(masterIdx, 1);
      renderTable(applyFilters());
      return;
    }
  });

  function openPreview(file) {
    previewBody.innerHTML = '';
    if (file.type.includes('image') || /\.(png|jpe?g|gif|svg)$/i.test(file.name)) {
      const img = document.createElement('img'); img.src = file.blob; img.alt = file.name; previewBody.appendChild(img);
    } else if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
      const iframe = document.createElement('iframe'); iframe.src = file.blob; iframe.style.width='100%'; iframe.style.height='70vh'; previewBody.appendChild(iframe);
    } else {
      const p = document.createElement('p'); p.className='small'; p.textContent = `Preview not available for ${file.name}. Download to view.`; previewBody.appendChild(p);
    }
    previewModal?.setAttribute('aria-hidden','false');
  }

  previewClose?.addEventListener('click', () => { previewModal?.setAttribute('aria-hidden','true'); previewBody.innerHTML = ''; });
  previewModal?.addEventListener('click', (ev) => { if (ev.target === previewModal) { previewModal.setAttribute('aria-hidden','true'); previewBody.innerHTML = ''; } });

  // Class card actions: open class -> filter dashboard by subject
  document.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subject = btn.dataset.subject;
      // set filter and scroll to dashboard
      const sf = document.getElementById('subjectFilter');
      if (sf) { sf.value = subject; sf.dispatchEvent(new Event('input')); }
      const el = document.getElementById('dashboard');
      if (el) el.scrollIntoView({behavior:'smooth'});
    });
  });

  // Initial render (no files)
  renderTable(files);
});
