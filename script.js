// EduHub script — calendar implemented, stream removed, all buttons functional
// - Sidebar toggle
// - Theme toggle (persisted)
// - Sign-in modal (save display name to localStorage and update UI)
// - Upload simulation + persisted example materials
// - Table: preview (with download), delete (revokes blob URLs), filters, sort, search
// - Calendar: month view, navigate months, add/view/delete events (persisted to localStorage)
// - Reliable press feedback for buttons via pointer events

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

  const profileNameEl = document.getElementById('profile-name');
  const profileAvatar = document.getElementById('profile-avatar');
  const heroUsername = document.getElementById('hero-username');
  const statResources = document.getElementById('stat-resources');
  const statProjects = document.getElementById('stat-projects');

  // Calendar elements
  const calendarGrid = document.getElementById('calendar-grid');
  const calendarTitle = document.getElementById('calendar-title');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const openAddEvent = document.getElementById('open-add-event');
  const eventModal = document.getElementById('event-modal');
  const eventBody = document.getElementById('event-body');
  const eventDateLabel = document.getElementById('event-date');
  const eventList = document.getElementById('event-list');
  const eventClose = document.getElementById('event-close');
  const addEventForm = document.getElementById('add-event-form');
  const eventTitleInput = document.getElementById('event-title-input');
  const eventSubjectSelect = document.getElementById('event-subject');

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
    const uploaderInput = document.getElementById('uploader');
    if (uploaderInput) uploaderInput.value = name;
  }
  // Initialize profile from storage
  const storedUser = localStorage.getItem('eduhub-user');
  if (storedUser) updateProfileName(storedUser);

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
  const filesKey = 'eduhub-files-v1';

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
      const raw = localStorage.getItem(filesKey);
      if (raw) files = JSON.parse(raw);
      else seedExamples();
    } catch (e) {
      console.error('Failed to load files, seeding examples', e);
      seedExamples();
    }
    renderStats();
  }
  function saveFiles() {
    try { localStorage.setItem(filesKey, JSON.stringify(files)); } catch(e){ /* ignore */ }
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
    const uploader = document.getElementById('uploader')?.value || (localStorage.getItem('eduhub-user') || 'Anonymous');

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
    statProjects.textContent = files.filter(f => f.name.toLowerCase().includes('project') || f.type === 'application/zip').length;
  }

  // Load persisted files (or seed)
  loadFiles();

  // Initial table render
  renderTable(applyFilters());

  /* --------------------------
     Calendar implementation
     - events stored in localStorage (eduhub-events-v1)
     - month grid with days; click day -> open event modal
     - event modal lists events for day; add / delete events
     -------------------------- */
  const eventsKey = 'eduhub-events-v1';
  let events = []; // { id, dateISO (YYYY-MM-DD), title, subject, createdAt }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(eventsKey);
      if (raw) events = JSON.parse(raw);
      else events = [];
    } catch(e) {
      console.error('Failed to load events', e);
      events = [];
    }
  }
  function saveEvents() {
    try { localStorage.setItem(eventsKey, JSON.stringify(events)); } catch(e){}
  }

  // Calendar state
  let viewDate = new Date(); // current month focus

  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }

  function formatMonthTitle(d) {
    return d.toLocaleString(undefined, {month:'long', year:'numeric'});
  }

  function renderCalendar() {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';

    const first = startOfMonth(viewDate);
    const last = endOfMonth(viewDate);

    const startWeekday = first.getDay(); // 0=Sun
    const daysInMonth = last.getDate();

    calendarTitle.textContent = formatMonthTitle(viewDate);

    // show weekday headings
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    weekdays.forEach(w => {
      const h = document.createElement('div');
      h.className = 'calendar-day';
      h.style.minHeight = '28px';
      h.style.padding = '6px';
      h.style.fontWeight = '700';
      h.textContent = w;
      calendarGrid.appendChild(h);
    });

    // calculate cells before month (previous month's tail)
    const prevTail = startWeekday; // number of preceding days
    const prevMonthLast = new Date(first.getFullYear(), first.getMonth(), 0).getDate();

    const totalCells = 7*6; // 6 weeks displayed
    let dayCounter = 1;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      // calculate actual date for cell
      let cellDate;
      if (i < prevTail) {
        const day = prevMonthLast - prevTail + 1 + i;
        const dt = new Date(first.getFullYear(), first.getMonth()-1, day);
        cell.classList.add('outside');
        cellDate = dt;
      } else if (dayCounter <= daysInMonth) {
        const dt = new Date(first.getFullYear(), first.getMonth(), dayCounter);
        cellDate = dt;
        dayCounter++;
      } else {
        const day = i - prevTail - daysInMonth + 1;
        const dt = new Date(first.getFullYear(), first.getMonth()+1, day);
        cell.classList.add('outside');
        cellDate = dt;
      }

      const iso = cellDate.toISOString().slice(0,10);
      const dayNum = document.createElement('div');
      dayNum.className = 'day-num';
      dayNum.textContent = String(cellDate.getDate());
      cell.appendChild(dayNum);

      // show event pills (up to 2) and count badge
      const dayEvents = events.filter(e => e.dateISO === iso);
      dayEvents.slice(0,2).forEach(ev => {
        const pill = document.createElement('div');
        pill.className = 'event-pill';
        pill.textContent = ev.title.length > 20 ? ev.title.slice(0,18)+'…' : ev.title;
        cell.appendChild(pill);
      });
      if (dayEvents.length > 2) {
        const c = document.createElement('div');
        c.className = 'event-count';
        c.textContent = String(dayEvents.length);
        cell.appendChild(c);
      }

      cell.dataset.date = iso;
      cell.addEventListener('click', () => openEventModal(iso));
      calendarGrid.appendChild(cell);
    }
  }

  // calendar nav
  prevMonthBtn?.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); renderCalendar(); });
  nextMonthBtn?.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); renderCalendar(); });
  openAddEvent?.addEventListener('click', () => {
    // open add for today's date
    const todayISO = (new Date()).toISOString().slice(0,10);
    openEventModal(todayISO);
  });

  // Event modal: open, list events, add new, delete event
  function openEventModal(dateISO) {
    eventModal.setAttribute('aria-hidden','false');
    eventDateLabel.textContent = new Date(dateISO).toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'});
    renderEventList(dateISO);
    // store current open date on modal dataset
    eventModal.dataset.date = dateISO;
    eventTitleInput.value = '';
    eventSubjectSelect.value = '';
    eventTitleInput.focus();
  }

  function renderEventList(dateISO) {
    eventList.innerHTML = '';
    const dayEvents = events.filter(e => e.dateISO === dateISO).sort((a,b)=>a.createdAt - b.createdAt);
    if (!dayEvents.length) {
      eventList.innerHTML = '<div class="small center">No events for this day.</div>';
      return;
    }
    dayEvents.forEach(ev => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '0.5rem';
      row.style.padding = '0.5rem 0';
      row.innerHTML = `<div><div style="font-weight:700">${escapeHtml(ev.title)}</div><div class="small" style="color:var(--muted)">${escapeHtml(ev.subject || '')}</div></div>
        <div style="display:flex;gap:0.4rem;align-items:center">
          <button class="btn btn-ghost edit-event" data-id="${ev.id}">Edit</button>
          <button class="btn btn-danger del-event" data-id="${ev.id}">Delete</button>
        </div>`;
      eventList.appendChild(row);
    });
  }

  addEventForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateISO = eventModal.dataset.date;
    const title = (eventTitleInput.value || '').trim();
    const subject = (eventSubjectSelect.value || '').trim();
    if (!dateISO || !title) return;
    const ev = { id: Date.now() + Math.floor(Math.random()*1000), dateISO, title, subject, createdAt: Date.now() };
    events.push(ev);
    saveEvents();
    renderEventList(dateISO);
    renderCalendar();
    eventTitleInput.value = '';
    eventSubjectSelect.value = '';
  });

  // Event modal actions (delegate edit/delete)
  eventList?.addEventListener('click', (e) => {
    const del = e.target.closest('.del-event');
    if (del) {
      const id = Number(del.dataset.id);
      events = events.filter(ev => ev.id !== id);
      saveEvents();
      const dateISO = eventModal.dataset.date;
      renderEventList(dateISO);
      renderCalendar();
      return;
    }
    const edit = e.target.closest('.edit-event');
    if (edit) {
      const id = Number(edit.dataset.id);
      const ev = events.find(x=>x.id===id);
      if (!ev) return;
      // populate form for quick edit (naive)
      eventTitleInput.value = ev.title;
      eventSubjectSelect.value = ev.subject || '';
      // remove the old event (will be re-added on submit)
      events = events.filter(x=>x.id!==id);
      saveEvents();
      renderEventList(eventModal.dataset.date);
      renderCalendar();
      eventTitleInput.focus();
    }
  });

  eventClose?.addEventListener('click', ()=>{ eventModal.setAttribute('aria-hidden','true'); eventList.innerHTML=''; });
  eventModal?.addEventListener('click', (ev)=>{ if(ev.target===eventModal){ eventModal.setAttribute('aria-hidden','true'); eventList.innerHTML=''; } });

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

  // Load and render events
  loadEvents();
  renderCalendar();

  // Finalize: expose small debug API
  window._eduhub = {
    filesRef: () => files,
    eventsRef: () => events,
    renderCalendar,
    renderTable: () => renderTable(applyFilters())
  };
});
