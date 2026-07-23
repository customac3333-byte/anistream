const events = Array.from(document.querySelectorAll('.event'));
const dialog = document.getElementById('event-dialog');
const title = document.getElementById('dialog-title');
const body = document.getElementById('dialog-body');
const closeBtn = document.getElementById('close-dialog');

const details = {
  0: {
    title: 'Sputnik',
    body: 'The first artificial satellite activated the space race and proved that orbit was within human reach.'
  },
  1: {
    title: 'Apollo 11',
    body: 'The Moon landing became a defining moment in exploration, engineering, and global imagination.'
  },
  2: {
    title: 'Hubble',
    body: 'Hubble transformed astronomy by revealing galaxies, nebulae, and deep-space detail with precision.'
  },
  3: {
    title: 'Perseverance',
    body: 'Mars Perseverance advanced planetary science by studying ancient environments and collecting samples.'
  }
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

events.forEach((event) => {
  observer.observe(event);
  event.addEventListener('click', () => {
    const index = event.dataset.index;
    title.textContent = details[index].title;
    body.textContent = details[index].body;
    dialog.showModal();
  });
});

closeBtn.addEventListener('click', () => dialog.close());
