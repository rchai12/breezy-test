function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// Set to a video URL once the story video exists; until then the button only shows a toast.
const STORY_VIDEO_URL = null;

function playStory() {
  if (STORY_VIDEO_URL) {
    window.open(STORY_VIDEO_URL, '_blank', 'noopener');
    return;
  }
  showToast('📺 Playing: "The Art of Nothing" (3 min)');
}

const newsletter = document.getElementById('newsletterForm');
if (newsletter && window.Breezy && Breezy.formField) {
  const emailInput = document.getElementById('emailInput');
  const emailField = Breezy.formField.attach(emailInput, {
    validate: () => Breezy.validation.email(emailInput.value).error,
    errorEl: document.getElementById('emailInput-error'),
    debounceMs: 1000,
  });
  newsletter.addEventListener('submit', event => {
    event.preventDefault();
    if (!emailField.validateNow()) {
      emailInput.focus();
      return;
    }
    showToast('🎉 Welcome to Breezy! Check your inbox (or just inhale).');
    emailInput.value = '';
    emailField.clear();
  });
}

function toggleFaq(btn) {
  const isOpen = btn.classList.contains('open');
  const list = btn.closest('.faq-list');
  list.querySelectorAll('.faq-q, .faq-a').forEach(el => el.classList.remove('open'));
  if (!isOpen) {
    btn.classList.add('open');
    btn.nextElementSibling.classList.add('open');
  }
}

function setExpanded(btn, open) {
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function toggleMore() {
  const btn = document.querySelector('.more-btn');
  const dd = document.getElementById('moreDropdown');
  btn.classList.toggle('open');
  dd.classList.toggle('open');
  setExpanded(btn, btn.classList.contains('open'));
}

document.addEventListener('click', event => {
  if (!event.target.closest('.more-wrap')) {
    const btn = document.querySelector('.more-btn');
    btn?.classList.remove('open');
    document.getElementById('moreDropdown')?.classList.remove('open');
    setExpanded(btn, false);
  }
});

function toggleMobileMenu() {
  const btn = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('mobileMenu');
  btn.classList.toggle('open');
  menu.classList.toggle('open');
  const open = menu.classList.contains('open');
  document.body.style.overflow = open ? 'hidden' : '';
  setExpanded(btn, open);
}

function closeMobile() {
  const btn = document.getElementById('hamburgerBtn');
  btn.classList.remove('open');
  document.getElementById('mobileMenu').classList.remove('open');
  document.body.style.overflow = '';
  setExpanded(btn, false);
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const menu = document.getElementById('mobileMenu');
  if (menu && menu.classList.contains('open')) {
    closeMobile();
    document.getElementById('hamburgerBtn').focus();
    return;
  }
  const more = document.getElementById('moreDropdown');
  if (more && more.classList.contains('open')) {
    const btn = document.querySelector('.more-btn');
    more.classList.remove('open');
    btn.classList.remove('open');
    setExpanded(btn, false);
    btn.focus();
  }
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', event => {
    event.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
