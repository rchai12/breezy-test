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

function handleSignup() {
  const email = document.getElementById('emailInput').value;
  if (email && email.includes('@')) {
    showToast('🎉 Welcome to Breezy! Check your inbox (or just inhale).');
    document.getElementById('emailInput').value = '';
  } else {
    showToast('⚠️ Please enter a valid email. We need it for... air reasons.');
  }
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

// MORE dropdown
function toggleMore() {
  const btn = document.querySelector('.more-btn');
  const dd = document.getElementById('moreDropdown');
  btn.classList.toggle('open');
  dd.classList.toggle('open');
}
// Close MORE on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.more-wrap')) {
    document.querySelector('.more-btn')?.classList.remove('open');
    document.getElementById('moreDropdown')?.classList.remove('open');
  }
});

// Mobile menu
function toggleMobileMenu() {
  const btn = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('mobileMenu');
  btn.classList.toggle('open');
  menu.classList.toggle('open');
  document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}
function closeMobile() {
  document.getElementById('hamburgerBtn').classList.remove('open');
  document.getElementById('mobileMenu').classList.remove('open');
  document.body.style.overflow = '';
}

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
