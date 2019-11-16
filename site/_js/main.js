// navigation
const burger = document.getElementById('navigation-button');
const navigation = document.getElementById(burger.getAttribute('aria-controls'));
const burgerActiveClass = 'is-active';
const navigationActiveClass = 'navigation--active';

// open and close the navigation menu on mobile
const openNavigation = () => {
    navigation.classList.add(navigationActiveClass)
    burger.classList.add(burgerActiveClass)
    burger.setAttribute('aria-expanded', true);
}
const closeNavigation = () => {
    navigation.classList.remove(navigationActiveClass)
    burger.classList.remove(burgerActiveClass)
    burger.setAttribute('aria-expanded', false);
}

// keyboard navigation for the menu
const handleKeyboardNavigation = e => {
    // all focusable links in the navigation
    const items = Array.from(navigation.querySelectorAll('.navigation__link, .navigation__subnav-link'));
    // the index of the currently focused link, if any
    const current = items.findIndex(link => link == document.activeElement);
    // this will hold the index of the next item to receive focus
    let next;
    let preventDefault = true;
    switch (e.key) {
        // close the navigation and return early
        case 'Esc':
        case 'Escape':
            burger.focus();
            return closeNavigation();
        // focus the next link
        case 'ArrowDown':
            next = current !== -1 ? current + 1 : 0;
            break;
        // focus the previous link
        case 'ArrowUp':
            next = current !== -1 ? current - 1 : 0;
            break;
        // focus the last item
        case 'End':
        case 'PageDown':
        case 'ArrowRight':
            next = items.length - 1;
            break;
        // focus the previous item
        case 'Home':
        case 'PageUp':
        case 'ArrowLeft':
            next = 0;
            break;
            // let all other keys through
        default:
            preventDefault = false;
            return;
    }
    if (preventDefault) e.preventDefault();
    // loop over when out of bounds
    if (next >= items.length) {
        next = 0;
    }
    if (next < 0) {
        next = items.length - 1;
    }
    // focus the selected "next" item
    items[next].focus();
}

// toggle menu on burger click
burger.addEventListener('click', e => {
    const isActive = JSON.parse(burger.getAttribute('aria-expanded'));
    return isActive ? closeNavigation() : openNavigation();
});

// navigation listeners for keyboard events
navigation.addEventListener('keydown', handleKeyboardNavigation);
burger.addEventListener('keydown', handleKeyboardNavigation);



// highlight current h2
const documentSections = document.querySelectorAll('#content h2');
const observerOptions = {
    // rootMargin: "0% 0% 30% 0%",
    threshold: [0, 1],
};
const sectionObserver = new IntersectionObserver((entries, observer) => {
    console.log(observer);
    const visibleHeadlineIds = entries
        .filter(entry => entry.intersectionRatio >= 1.0)
        .map(entry => entry.target.id);
    console.log(visibleHeadlineIds);
    if (visibleHeadlineIds.length > 0) {
        const visibleHeadlinesSelector = visibleHeadlineIds.map(id => `#${id}`).join(', ');
        const firstVisibleHeadline = document.querySelector(visibleHeadlinesSelector);
        console.log(firstVisibleHeadline);
    }
}, observerOptions);

Array.from(documentSections).forEach(s => sectionObserver.observe(s));
