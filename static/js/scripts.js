
const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'projects', 'news', 'publications', 'awards']

const i18n = {
    zh: {
        'nav-home': '首页',
        'nav-projects': '项目',
        'nav-news': '动态',
        'nav-pubs': '论文',
        'nav-awards': '奖项',
        'projects-subtitle': '<i class="bi bi-robot"></i>&nbsp;项目',
        'news-subtitle': '<i class="bi bi-lightning-fill"></i>&nbsp;动态',
        'publications-subtitle': '<i class="bi bi-file-text-fill"></i>&nbsp;论文',
        'awards-subtitle': '<i class="bi bi-award-fill"></i>&nbsp;奖项',
        'music-kicker': 'LISTENING CORNER',
        'music-title': '一小段音乐时间',
        'music-empty': '在 scripts.js 的 musicTracks 中添加自己的音频链接后，即可开始播放。'
    },
    en: {
        'nav-home': 'HOME',
        'nav-projects': 'PROJECTS',
        'nav-news': 'NEWS',
        'nav-pubs': 'PUBLICATIONS',
        'nav-awards': 'AWARDS',
        'projects-subtitle': '<i class="bi bi-robot"></i>&nbsp;PROJECTS',
        'news-subtitle': '<i class="bi bi-lightning-fill"></i>&nbsp;NEWS',
        'publications-subtitle': '<i class="bi bi-file-text-fill"></i>&nbsp;PUBLICATIONS',
        'awards-subtitle': '<i class="bi bi-award-fill"></i>&nbsp;AWARDS',
        'music-kicker': 'LISTENING CORNER',
        'music-title': 'A small playlist',
        'music-empty': 'Add your own audio links to musicTracks in scripts.js to start listening.'
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
    ['projects-subtitle', 'news-subtitle', 'publications-subtitle', 'awards-subtitle'].forEach(id => {
        const el = document.getElementById(id);
        if (el && strings[id]) el.innerHTML = strings[id];
    });
    document.getElementById('lang-toggle').textContent = currentLang === 'zh' ? 'EN' : '中';
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

// Add only music you own or are licensed to redistribute. Example:
// { title: 'Track title', artist: 'Artist', src: 'static/assets/audio/track.mp3' }
const musicTracks = [
    { title: '我记得', artist: '赵雷', src: 'static/assets/audio/zhao-lei-i-remember.mp3' }
];

function initMusicPlayer() {
    const dock = document.getElementById('mascot-dock');
    const button = dock?.querySelector('[data-dock-music]');
    const player = document.getElementById('music-player');
    const close = player?.querySelector('[data-music-close]');
    const audio = document.getElementById('music-audio');
    const list = document.getElementById('music-track-list');
    const empty = player?.querySelector('.music-empty');
    if (!dock || !button || !player || !close || !audio || !list || !empty) return;

    const setOpen = (isOpen) => {
        player.classList.toggle('is-open', isOpen);
        player.setAttribute('aria-hidden', String(!isOpen));
        button.setAttribute('aria-expanded', String(isOpen));
    };

    musicTracks.forEach((track, index) => {
        const item = document.createElement('button');
        item.className = 'music-track';
        item.type = 'button';
        item.innerHTML = `<i class="bi bi-play-fill"></i><span><strong>${track.title}</strong><small>${track.artist || ''}</small></span>`;
        item.addEventListener('click', () => {
            const sameTrack = audio.src === new URL(track.src, window.location.href).href;
            document.querySelectorAll('.music-track').forEach(el => el.classList.remove('is-playing'));
            if (sameTrack && !audio.paused) {
                audio.pause();
                return;
            }
            if (!sameTrack) audio.src = track.src;
            audio.play().then(() => item.classList.add('is-playing')).catch(() => {});
        });
        list.appendChild(item);
    });
    empty.hidden = musicTracks.length > 0;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(!player.classList.contains('is-open'));
    });
    close.addEventListener('click', () => setOpen(false));
    player.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', () => setOpen(false));
}

function initEmbeddedVideoStops() {
    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-video-stop]');
        if (!button) return;

        const frame = button.closest('.media-frame');
        const video = frame?.querySelector('iframe');
        if (!video) return;

        // Bilibili's external iframe has no stable public pause API. Resetting
        // its document reliably terminates both playback and audio, then
        // restores the original player in its non-autoplay state.
        const source = video.getAttribute('src');
        if (!source) return;
        video.setAttribute('src', 'about:blank');
        requestAnimationFrame(() => video.setAttribute('src', source));
    });
}

function showCvToast() {
    const lang = localStorage.getItem('lang') || 'zh';
    const title = lang === 'en' ? 'CV is being updated' : 'CV 正在更新中';
    const msg = lang === 'en'
        ? 'A refreshed version will be available after the content is finalized.'
        : '我还在整理适合公开展示的版本，完成后会放到这里。';
    const existing = document.querySelector('.cv-toast');
    if (existing) existing.remove();

    const tip = document.createElement('div');
    tip.className = 'cv-toast';
    tip.setAttribute('role', 'status');
    tip.innerHTML = `<strong>${title}</strong><span>${msg}</span>`;
    document.body.appendChild(tip);

    setTimeout(() => {
        tip.classList.add('is-hiding');
        setTimeout(() => tip.remove(), 220);
    }, 2600);
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

function getActiveTheme() {
    const savedTheme = document.documentElement.dataset.theme;
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeButton() {
    const button = document.querySelector('[data-dock-theme]');
    if (!button) return;
    const icon = button.querySelector('i');
    const isDark = getActiveTheme() === 'dark';
    button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    if (icon) {
        icon.className = isDark ? 'bi bi-sun' : 'bi bi-moon-stars';
    }
}

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    updateThemeButton();
}

function initMascotDock() {
    const dock = document.getElementById('mascot-dock');
    if (!dock) return;

    const toggle = dock.querySelector('.mascot-toggle');
    const mascotImage = dock.querySelector('.mascot-toggle img');
    const fallback = dock.querySelector('.mascot-fallback');

    if (mascotImage && fallback) {
        const showFallback = () => {
            mascotImage.hidden = true;
            fallback.hidden = false;
        };
        mascotImage.addEventListener('error', () => {
            showFallback();
        });
        if (mascotImage.complete && mascotImage.naturalWidth === 0) showFallback();
    }

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = dock.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    dock.querySelector('[data-dock-theme]').addEventListener('click', (event) => {
        event.stopPropagation();
        const nextTheme = getActiveTheme() === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    });

    dock.querySelector('[data-dock-top]').addEventListener('click', (event) => {
        event.stopPropagation();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        dock.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('click', () => {
        dock.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        dock.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    });

    updateThemeButton();
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

    document.addEventListener('click', (event) => {
        const cvTrigger = event.target.closest('[data-cv-toast]');
        if (!cvTrigger) return;
        event.preventDefault();
        showCvToast();
    });

    // Navbar scroll background
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    initMascotDock();
    initMusicPlayer();
    initEmbeddedVideoStops();
    loadContent();
});
