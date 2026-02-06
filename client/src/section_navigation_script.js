
let currentSection = 0;
const sections = document.querySelectorAll('.section');
const sectionTitles = document.querySelectorAll('.section-title');

function showSection(index) {
  sections.forEach((section, i) => {
    section.classList.toggle('active', i === index);
  });
  sectionTitles.forEach((title, i) => {
    title.classList.toggle('active', i === index);
  });
}

function nextSection() {
  currentSection = (currentSection + 1) % sections.length;
  showSection(currentSection);
}

function prevSection() {
  currentSection = (currentSection - 1 + sections.length) % sections.length;
  showSection(currentSection);
}

// Add click handlers for section titles
sectionTitles.forEach((title, index) => {
  title.addEventListener('click', () => {
    currentSection = index;
    showSection(currentSection);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') {
    nextSection();
  } else if (event.key === 'ArrowLeft') {
    prevSection();
  }
});

let touchStartX = 0;

document.addEventListener('touchstart', (event) => {
  touchStartX = event.touches[0].clientX;
});

document.addEventListener('touchmove', (event) => {
  const touchEndX = event.touches[0].clientX;
  if (touchStartX - touchEndX > 250) {
    nextSection();
  } else if (touchEndX - touchStartX > 250) {
    prevSection();
  }
});

