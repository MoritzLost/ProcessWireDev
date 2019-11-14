// navigation
const burger = document.getElementById('navigation-button');
const navigation = document.getElementById(burger.getAttribute('aria-controls'));
const burgerActiveClass = 'is-active';
const navigationActiveClass = 'navigation--active';

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

const handleKeyboardNavigation = e => {
    // all focusable links in the navigation
    const items = Array.from(navigation.querySelectorAll('.navigation__link, .navigation__subnav a'));
    // the index of the currently focused link, if any
    const current = items.findIndex(link => link == document.activeElement);
    // this will hold the index of the next item to receive focus
    let next;
    switch (e.key) {
        // close the navigation and return early
        case 'Esc':
        case 'Escape':
            e.preventDefault();
            burger.focus();
            return closeNavigation();
        // focus the next link
        case 'ArrowDown':
            e.preventDefault();
            next = current !== -1 ? current + 1 : 0;
            break;
        // focus the previous link
        case 'ArrowUp':
            e.preventDefault();
            next = current !== -1 ? current - 1 : 0;
            break;
        // focus the last item
        case 'End':
        case 'PageDown':
        case 'ArrowRight':
            e.preventDefault();
            next = items.length - 1;
            break;
        // focus the previous item
        case 'Home':
        case 'PageUp':
        case 'ArrowLeft':
            e.preventDefault();
            next = 0;
            break;
        // let all other keys through
        default:
            return;
    }
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

burger.addEventListener('click', e => {
    const isActive = JSON.parse(burger.getAttribute('aria-expanded'));
    return isActive ? closeNavigation() : openNavigation();
});

navigation.addEventListener('keydown', handleKeyboardNavigation);
burger.addEventListener('keydown', handleKeyboardNavigation);
