const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
const projectCards = Array.from(document.querySelectorAll('.project-card'));

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const activeFilter = button.dataset.filter;

    filterButtons.forEach((chip) => chip.classList.remove('active'));
    button.classList.add('active');

    projectCards.forEach((card) => {
      const categories = card.dataset.category || '';
      const shouldShow = activeFilter === 'all' || categories.includes(activeFilter);
      card.classList.toggle('is-hidden', !shouldShow);
    });
  });
});
