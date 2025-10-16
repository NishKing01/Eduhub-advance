// Small JS: theme toggle, mobile nav fix (checkbox handling), enroll button demo, progress simulation

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const root = document.documentElement;

  // Init theme from localStorage
  const stored = localStorage.getItem('eduhub-theme');
  if (stored === 'dark') {
    root.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
    themeToggle.setAttribute('aria-pressed','true');
  }

  themeToggle.addEventListener('click', () => {
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

  // Progressive demo: enroll buttons simulate progress
  const enrollButtons = document.querySelectorAll('.enroll-btn');
  const demoProgress = document.getElementById('demo-progress');

  enrollButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = btn.dataset.title || 'course';
      btn.textContent = 'Enrolled ✓';
      btn.disabled = true;
      btn.classList.add('btn-strong');
      // simulate progress increase
      let pct = parseInt(demoProgress.style.width,10) || 0;
      const interval = setInterval(() => {
        pct = Math.min(100, pct + Math.floor(Math.random()*8) + 4);
        demoProgress.style.width = pct + '%';
        if (pct >= 100) clearInterval(interval);
      }, 400);
    });
  });

  // Search filter: basic client-side filtering by title
  const search = document.getElementById('site-search');
  const grid = document.getElementById('course-grid');
  if (search && grid) {
    search.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.course-card').forEach(card => {
        const title = card.dataset.title.toLowerCase();
        if (!q || title.includes(q)) card.style.display = '';
        else card.style.display = 'none';
      });
    });
  }

  // Basic select filters
  const levelSelect = document.getElementById('level');
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      const val = levelSelect.value;
      document.querySelectorAll('.course-card').forEach(card => {
        if (!val || card.dataset.level === val) card.style.display = '';
        else card.style.display = 'none';
      });
    });
  }

});
