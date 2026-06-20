
const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'news', 'publications', 'awards']

const i18n = {
    zh: {
        'nav-home': '首页',
        'nav-news': '动态',
        'nav-pubs': '论文',
        'nav-awards': '奖项',
        'news-subtitle': '<i class="bi bi-lightning-fill"></i>&nbsp;动态',
        'publications-subtitle': '<i class="bi bi-file-text-fill"></i>&nbsp;论文',
        'awards-subtitle': '<i class="bi bi-award-fill"></i>&nbsp;奖项'
    },
    en: {
        'nav-home': 'HOME',
        'nav-news': 'NEWS',
        'nav-pubs': 'PUBLICATIONS',
        'nav-awards': 'AWARDS',
        'news-subtitle': '<i class="bi bi-lightning-fill"></i>&nbsp;NEWS',
        'publications-subtitle': '<i class="bi bi-file-text-fill"></i>&nbsp;PUBLICATIONS',
        'awards-subtitle': '<i class="bi bi-award-fill"></i>&nbsp;AWARDS'
    }
}

let currentLang = localStorage.getItem('lang') || 'zh';

function getDir() {
    return currentLang === 'en' ? content_dir + 'en/' : content_dir;
}

function applyI18n() {
    const strings = i18n[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (strings[key]) el.textContent = strings[key];
    });
    ['news-subtitle', 'publications-subtitle', 'awards-subtitle'].forEach(id => {
        const el = document.getElementById(id);
        if (el && strings[id]) el.innerHTML = strings[id];
    });
    document.getElementById('lang-toggle').textContent = currentLang === 'zh' ? 'EN' : '中';
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

function showCvToast(el) {
    const lang = localStorage.getItem('lang') || 'zh';
    const msg = lang === 'en' ? 'CV is being updated~' : '正在更新中~';
    const existing = el.parentNode.querySelector('.cv-inline-toast');
    if (existing) existing.remove();
    const tip = document.createElement('span');
    tip.className = 'cv-inline-toast';
    tip.textContent = msg;
    el.parentNode.insertBefore(tip, el.nextSibling);
    setTimeout(() => tip.remove(), 2000);
}

function initHoverGalleries() {
    document.querySelectorAll('.hover-gallery').forEach(gallery => {
        if (gallery.dataset.bound) return;
        gallery.dataset.bound = '1';

        const trigger = gallery.querySelector('.hover-gallery-trigger');
        const images = JSON.parse(gallery.getAttribute('data-images'));
        let popup = null;
        let hideTimeout = null;

        function createPopup() {
            popup = document.createElement('div');
            popup.className = 'hover-gallery-popup';
            images.forEach(src => {
                const img = document.createElement('img');
                img.src = src;
                img.loading = 'lazy';
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openLightbox(src);
                });
                popup.appendChild(img);
            });
            popup.addEventListener('mouseenter', () => {
                clearTimeout(hideTimeout);
            });
            popup.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => {
                    if (popup) popup.classList.remove('visible');
                }, 300);
            });
            document.body.appendChild(popup);
        }

        function showPopup() {
            clearTimeout(hideTimeout);
            if (!popup) createPopup();
            const rect = trigger.getBoundingClientRect();
            popup.style.position = 'fixed';
            popup.style.top = (rect.bottom + 6) + 'px';
            popup.style.left = rect.left + 'px';
            popup.classList.add('visible');
        }

        function hidePopup() {
            hideTimeout = setTimeout(() => {
                if (popup) popup.classList.remove('visible');
            }, 400);
        }

        trigger.addEventListener('mouseenter', showPopup);
        trigger.addEventListener('mouseleave', hidePopup);
    });
}

function openLightbox(src) {
    let overlay = document.querySelector('.lightbox-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = '<span class="lightbox-close">&times;</span><img>';
        overlay.addEventListener('click', () => overlay.classList.remove('active'));
        document.body.appendChild(overlay);
    }
    overlay.querySelector('img').src = src;
    overlay.classList.add('active');
}

function loadContent() {
    // Yaml
    fetch(getDir() + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    let val = yml[key];
                    if (val === 'COPYRIGHT_PLACEHOLDER') {
                        const year = new Date().getFullYear();
                        val = `&copy; Zhongzheng Li 2022-${year}. All Rights Reserved.`;
                    }
                    document.getElementById(key).innerHTML = val;
                } catch {
                    console.log("Unknown id and value: " + key + "," + yml[key].toString())
                }
            })
        })
        .catch(error => console.log(error));

    // Marked
    marked.use({ mangle: false, headerIds: false })
    section_names.forEach((name, idx) => {
        fetch(getDir() + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                document.getElementById(name + '-md').innerHTML = html;
                // Load MathJax only if math content is detected
                if (/[$$]/.test(markdown) && typeof loadMathJax === 'function') {
                    loadMathJax();
                }
                initHoverGalleries();
            })
            .catch(error => console.log(error));
    })

    applyI18n();
}


window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

    // Language toggle
    document.getElementById('lang-toggle').addEventListener('click', () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('lang', currentLang);
        loadContent();
    });

    loadContent();
});
