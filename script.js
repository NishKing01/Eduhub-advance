document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;

  // Elements
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
  const downloadLink = document.getElementById('download-link');
  const fileLabelText = document.getElementById('file-label-text');

  const signinModal = document.getElementById('signin-modal');
  const signinForm = document.getElementById('signin-form');
  const signinClose = document.getElementById('signin-close');
  const signinCancel = document.getElementById('signin-cancel');
  const displayNameInput = document.getElementById('displayName');

  const streamModal = document.getElementById('stream-modal');
  const streamBody = document.getElementById('stream-body');
  const streamClose = document.getElementById('stream-close');

  const profileNameEl = document.getElementById('profile-name');
  const profileAvatar = document.getElementById('profile-avatar');
  const heroUsername = document.getElementById('hero-username');
  const statResources = document.getElementById('stat-resources');
  const statProjects = document.getElementById('stat-projects');

  // Press feedback for buttons (pointer events + touch fallback)
  (function attachPressed() {
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

  // Sidebar toggle
  sidebarToggle?.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  });

  // Theme toggle
  const storedTheme = localStorage.getItem('eduhub-theme');
  if (storedTheme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    if (themeToggle) { themeToggle.textContent = '☀️'; themeToggle.setAttribute('aria-pressed','true'); }
  } else {
    if (themeToggle) { themeToggle.textContent = '🌙'; themeToggle.setAttribute('aria-pressed','false'); }
  }
  themeToggle?.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) {
      root.removeAttribute('data-theme');
      localStorage.setItem('eduhub-theme','light');
      themeToggle.textContent = '🌙';
      themeToggle.setAttribute('aria-pressed','false');
    } else {
      root.setAttribute('data-theme','dark');
      localStorage.setItem('eduhub-theme','dark');
      themeToggle.textContent = '☀️';
      themeToggle.setAttribute('aria-pressed','true');
    }
  });

  // Sign-in modal open/close and persistence
  function openSignin() {
    signinModal.setAttribute('aria-hidden','false');
    const stored = localStorage.getItem('eduhub-user');
    displayNameInput.value = stored || profileNameEl.textContent || '';
    displayNameInput.focus();
  }
  function closeSignin() {
    signinModal.setAttribute('aria-hidden','true');
  }
  document.getElementById('open-signin')?.addEventListener('click', (e) => { e.preventDefault(); openSignin(); });
  document.getElementById('open-signin-top')?.addEventListener('click', (e) => { e.preventDefault(); openSignin(); });

  signinClose?.addEventListener('click', closeSignin);
  signinCancel?.addEventListener('click', closeSignin);
  signinForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = displayNameInput.value.trim() || 'Anonymous';
    localStorage.setItem('eduhub-user', name);
    updateProfileName(name);
    closeSignin();
  });

  function updateProfileName(name) {
    profileNameEl.textContent = name;
    profileAvatar.textContent = name[0] ? name[0].toUpperCase() : 'U';
    heroUsername.textContent = name;
    // update uploader default input
    const uploaderInput = document.getElementById('uploader');
    if (uploaderInput) uploaderInput.value = name;
  }

  // Initialize profile from storage
  const storedUser = localStorage.getItem('eduhub-user');
  if (storedUser) updateProfileName(storedUser);

  // Stream modal: sample posts per class
  const sampleStreams = {
    Chemistry: [
      {ts: Date.now()-3600*1000, text: 'New lab protocol uploaded: acid-base titration notes.'},
      {ts: Date.now()-7200*1000, text: 'Reminder: bring goggles to next lab.'}
    ],
    Mathematics: [
      {ts: Date.now()-5400*1000, text: 'Problem set 3 solutions posted.'},
      {ts: Date.now()-20000*1000, text: 'Live workshop on simulations this Friday.'}
    ],
    Physics: [
      {ts: Date.now()-100000, text: 'DAQ tutorial video now available.'},
      {ts: Date.now()-2500000, text: 'Group project templates uploaded.'}
    ]
  };

  function openStream(subject) {
    const posts = sampleStreams[subject] || [{ts:Date.now(), text:'No recent activity.'}];
    streamBody.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'small';
    h.innerHTML = `<strong>${escapeHtml(subject)} — recent activity</strong>`;
    streamBody.appendChild(h);
    posts.forEach(p => {
      const div = document.createElement('div');
      div.className = 'u-mt-md';
      div.innerHTML = `<div class="small" style="color:var(--muted)">${new Date(p.ts).toLocaleString()}</div><div>${escapeHtml(p.text)}</div>`;
      streamBody.appendChild(div);
    });
    streamModal.setAttribute('aria-hidden','false');
  }
  streamClose?.addEventListener('click', ()=>streamModal.setAttribute('aria-hidden','true'));

  // Class card actions: join/open class (filter + scroll)
  document.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subject = btn.dataset.subject;
      const sf = document.getElementById('subjectFilter');
      if (sf) {
        sf.value = subject;
        sf.dispatchEvent(new Event('input'));
      }
      document.getElementById('dashboard')?.scrollIntoView({behavior:'smooth'});
    });
  });
  document.querySelectorAll('.stream-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      openStream(btn.dataset.subject);
    });
  });

  // Utility helpers
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function fmtDate(ts = Date.now()){ return new Date(ts).toLocaleString(); }
  function fileIcon(type, name='') {
    if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return '<i class="fa-regular fa-file-pdf" aria-hidden="true"></i>';
    if (type.includes('zip') || name.toLowerCase().endsWith('.zip')) return '<i class="fa-regular fa-file-zipper" aria-hidden="true"></i>';
    if (type.includes('off') || name.toLowerCase().endsWith('.docx') || name.toLowerCase().endsWith('.doc')) return '<i class="fa-regular fa-file-word" aria-hidden="true"></i>';
    if (type.startsWith('image') || /\.(png|jpe?g|gif|svg)$/i.test(name)) return '<i class="fa-regular fa-file-image" aria-hidden="true"></i>';
    return '<i class="fa-regular fa-file" aria-hidden="true"></i>';
  }

  // In-memory files array + persist in localStorage
  let files = [];
  const storeKey = 'eduhub-files-v1';

  // Seed with example materials if none in storage
  function seedExamples() {
    const examples = [
      { name: 'Titration Lab Guide.pdf', type: 'application/pdf', subject: 'Chemistry', uploader: 'Prof. Ayesha', ts: Date.now() - 86400000*2, size: 234567, blob: 'https://via.placeholder.com/800x600?text=Titration+Guide' },
      { name: 'OrganicChem_Notes.pdf', type: 'application/pdf', subject: 'Chemistry', uploader: 'Lab Team', ts: Date.now() - 86400000*5, size: 102400, blob: 'https://via.placeholder.com/800x600?text=Organic+Notes' },
      { name: 'Simulations_Notebook.ipynb', type: 'application/json', subject: 'Mathematics', uploader: 'Dr. Khan', ts: Date.now() - 86400000*1, size: 76800, blob: '' },
      { name: 'PID_Control_Project.zip', type: 'application/zip', subject: 'Physics', uploader: 'Eng. Rizwan', ts: Date.now() - 86400000*3, size: 345678, blob: '' },
      { name: 'Data_Acquisition_Guide.pdf', type: 'application/pdf', subject: 'Physics', uploader: 'Eng. Rizwan', ts: Date.now() - 86400000*4, size: 210000, blob: 'https://via.placeholder.com/800x600?text=DAQ+Guide' }
    ];
    files = examples;
    saveFiles();
  }

  function loadFiles() {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) files = JSON.parse(raw);
      else seedExamples();
    } catch (e) {
      console.error('Failed to load files, seeding examples', e);
      seedExamples();
    }
    renderStats();
  }
  function saveFiles() {
    try { localStorage.setItem(storeKey, JSON.stringify(files)); } catch(e){ /* ignore */ }
    renderStats();
  }

  // Render and table logic
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
        <td>
          <button class="btn btn-primary download-btn" data-idx="${idx}"><i class="fa-regular fa-download"></i></button>
          <button class="btn btn-danger delete-btn" data-idx="${idx}">Delete</button>
        </td>
      `;
      fileTableBody.appendChild(tr);
    });
  }

  // Apply filters / search / sort
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
      if (q && !(f.name.toLowerCase().includes(q) || (f.subject||'').toLowerCase().includes(q) || (f.uploader||'').toLowerCase().includes(q))) return false;
      return true;
    });

    if (sort === 'new') out.sort((a,b)=>b.ts-a.ts);
    else if (sort === 'old') out.sort((a,b)=>a.ts-b.ts);
    else if (sort === 'name') out.sort((a,b)=>a.name.localeCompare(b.name, undefined, {sensitivity:'base'}));

    return out;
  }

  // Hook up filters/search/sort
  [subjectFilter, typeFilter, sortSelect, searchInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => renderTable(applyFilters()));
  });

  // Upload handling (simulated + create objectURL for preview/download when possible)
  uploadForm?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fileInput = document.getElementById('uploadFile');
    const subject = document.getElementById('subject').value || 'Unspecified';
    const uploader = document.getElementById('uploader').value || (localStorage.getItem('eduhub-user') || 'Anonymous');

    if (!fileInput || !fileInput.files.length) {
      uploadStatus.textContent = 'Choose a file to upload.';
      return;
    }

    const file = fileInput.files[0];
    uploadStatus.textContent = 'Uploading…';
    // simulate upload
    setTimeout(() => {
      const entry = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        subject,
        uploader,
        ts: Date.now(),
        size: file.size,
        blob: URL.createObjectURL(file)
      };
      files.unshift(entry);
      saveFiles();
      renderTable(applyFilters());
      uploadStatus.textContent = `Uploaded ${file.name}`;
      fileInput.value = '';
      if (fileLabelText) fileLabelText.textContent = 'Choose file…';
      setTimeout(()=>uploadStatus.textContent = '', 2500);
    }, 600 + Math.random()*700);
  });

  // Show selected filename
  document.getElementById('uploadFile')?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (fileLabelText) fileLabelText.textContent = f ? f.name : 'Choose file…';
  });

  // Table actions (delegate)
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
      const file = applyFilters()[idx];
      if (!file) return;
      // remove from master files
      const masterIdx = files.findIndex(f => f.ts === file.ts && f.name === file.name && f.uploader === file.uploader);
      if (masterIdx !== -1) {
        // revoke object URL if present
        try { if (files[masterIdx].blob && files[masterIdx].blob.startsWith('blob:')) URL.revokeObjectURL(files[masterIdx].blob); } catch(e){}
        files.splice(masterIdx,1);
        saveFiles();
        renderTable(applyFilters());
      }
      return;
    }
    const dlBtn = ev.target.closest('.download-btn');
    if (dlBtn) {
      const idx = Number(dlBtn.dataset.idx);
      const file = applyFilters()[idx];
      if (!file) return;
      // if blob URL exists, navigate to it (download attr on link in preview modal)
      if (file.blob) {
        const a = document.createElement('a');
        a.href = file.blob;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('No downloadable blob available for this file in demo.');
      }
      return;
    }
  });

  // Preview modal with download link
  function openPreview(file) {
    previewBody.innerHTML = '';
    downloadLink.style.display = 'inline-flex';
    downloadLink.removeAttribute('href');
    downloadLink.removeAttribute('download');

    if (file.blob && (file.type.startsWith('image/') || /\.(png|jpe?g|gif|svg)$/i.test(file.name))) {
      const img = document.createElement('img'); img.src = file.blob; img.alt = file.name; previewBody.appendChild(img);
      downloadLink.href = file.blob; downloadLink.download = file.name;
    } else if ((file.type === 'application/pdf') || file.name.toLowerCase().endsWith('.pdf') || (file.blob && file.blob.startsWith('data:'))) {
      const iframe = document.createElement('iframe'); iframe.src = file.blob || ''; iframe.style.width='100%'; iframe.style.height='70vh'; previewBody.appendChild(iframe);
      if (file.blob) { downloadLink.href = file.blob; downloadLink.download = file.name; }
    } else {
      const p = document.createElement('p'); p.className='small'; p.textContent = `Preview not available for ${file.name}. You can download the file to view it.`;
      previewBody.appendChild(p);
      if (file.blob) { downloadLink.href = file.blob; downloadLink.download = file.name; }
      else downloadLink.style.display = 'none';
    }
    previewModal.setAttribute('aria-hidden','false');
  }

  previewClose?.addEventListener('click', ()=>{ previewModal.setAttribute('aria-hidden','true'); previewBody.innerHTML=''; });
  previewModal?.addEventListener('click', (ev)=>{ if(ev.target===previewModal){ previewModal.setAttribute('aria-hidden','true'); previewBody.innerHTML=''; } });

  // Stream modal close handled above
  streamClose?.addEventListener('click', ()=>streamModal.setAttribute('aria-hidden','true'));

  // Search in topbar: searching classes and files
  searchInput?.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase();
    // Filter files table
    renderTable(applyFilters());
    // highlight classes matching search
    document.querySelectorAll('.class-card').forEach(card => {
      const subject = (card.dataset.subject || '').toLowerCase();
      const title = (card.querySelector('.class-title')?.textContent || '').toLowerCase();
      const match = q && (subject.includes(q) || title.includes(q));
      card.style.boxShadow = match ? '0 8px 30px rgba(26,115,232,0.12)' : '';
    });
  });

  // Control nav anchor behavior (scroll to sections)
  document.querySelectorAll('.control-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.control-link').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      const target = a.dataset.target;
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({behavior:'smooth'});
    });
  });

  // Simple helper to render stats
  function renderStats() {
    statResources.textContent = files.length;
    // projects count is not modeled — keep as 0 or count zip files as projects
    statProjects.textContent = files.filter(f => f.name.toLowerCase().includes('project') || f.type === 'application/zip').length;
  }

  // Load persisted files (or seed)
  loadFiles();

  // Initial table render
  renderTable(applyFilters());

  // Utility: escape HTML already defined

  // Helper exposure for debug (optional)
  window._eduhub = { files, renderTable, applyFilters, openPreview, openStream };
});
