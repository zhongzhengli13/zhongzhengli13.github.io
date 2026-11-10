
const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'projects', 'news', 'publications', 'awards']

const i18n = {
    zh: {
        'nav-home': '关于',
        'nav-projects': '研究',
        'nav-news': '动态',
        'nav-pubs': '论文',
        'nav-awards': '经历',
        'nav-journal': '随笔',
        'projects-subtitle': '研究项目',
        'news-subtitle': '近期动态',
        'publications-subtitle': '论文',
        'awards-subtitle': '教育与荣誉',
        'skip-content': '跳到正文',
        'affiliation': '硕士研究生 · 山东大学',
        'portrait-caption': '泰山机器人比赛 · 2026',
        'visitor-map': '访客足迹',
        'video-source': '在 B 站打开 ↗',
        'music-kicker': 'LISTENING CORNER',
        'music-title': '一小段音乐时间',
        'music-empty': '在 scripts.js 的 musicTracks 中添加自己的音频链接后，即可开始播放。',
        'content-error': '这部分内容暂时未能加载。',
        'content-retry': '重新加载'
    },
    en: {
        'nav-home': 'About',
        'nav-projects': 'Research',
        'nav-news': 'News',
        'nav-pubs': 'Publications',
        'nav-awards': 'Background',
        'nav-journal': 'Journal',
        'projects-subtitle': 'Research',
        'news-subtitle': 'Recent news',
        'publications-subtitle': 'Publications',
        'awards-subtitle': 'Education & honors',
        'skip-content': 'Skip to content',
        'affiliation': "Master's student · Shandong University",
        'portrait-caption': 'Mount Tai robot competition · 2026',
        'visitor-map': 'Visitor map',
        'video-source': 'Open on Bilibili ↗',
        'music-kicker': 'LISTENING CORNER',
        'music-title': 'A small playlist',
        'music-empty': 'Add your own audio links to musicTracks in scripts.js to start listening.',
        'content-error': 'This content could not be loaded.',
        'content-retry': 'Try again'
    }
}

function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

function saveStorage(key, value) {
    try { localStorage.setItem(key, value); } catch {}
}

let currentLang = readStorage('lang') === 'en' ? 'en' : 'zh';
let contentController = null;
let contentGeneration = 0;
let refreshNavigation = () => {};

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
    document.getElementById('lang-toggle').setAttribute('aria-label', currentLang === 'zh' ? 'Switch to English' : '切换为中文');
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    updateThemeButton();
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

function showCvToast() {
    const lang = currentLang;
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

function closeHoverGalleries() {
    document.querySelectorAll('.hover-gallery').forEach(gallery => {
        gallery.dispatchEvent(new Event('galleryclose'));
    });
}

function initHoverGalleries() {
    document.querySelectorAll('.hover-gallery').forEach(gallery => {
        if (gallery.dataset.bound) return;
        gallery.dataset.bound = '1';

        const trigger = gallery.querySelector('.hover-gallery-trigger');
        const images = JSON.parse(gallery.getAttribute('data-images'));
        const galleryLabel = gallery.dataset.galleryLabel || (currentLang === 'en' ? 'Graduation photos' : '毕业照片');
        let popup = null;
        let hideTimeout = null;
        let pinned = false;

        function closePopup() {
            clearTimeout(hideTimeout);
            pinned = false;
            popup?.classList.remove('visible');
            trigger.setAttribute('aria-expanded', 'false');
        }

        function createPopup() {
            popup = document.createElement('span');
            popup.className = 'hover-gallery-popup';
            popup.id = 'photo-gallery-' + document.querySelectorAll('.hover-gallery-popup').length;
            popup.setAttribute('role', 'group');
            popup.setAttribute('aria-label', galleryLabel);
            trigger.setAttribute('aria-controls', popup.id);
            images.forEach((src, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'gallery-photo';
                const label = `${galleryLabel} ${index + 1}`;
                button.setAttribute('aria-label', label);
                const img = document.createElement('img');
                img.src = src;
                img.alt = label;
                img.loading = 'lazy';
                button.appendChild(img);
                button.addEventListener('click', () => openLightbox(src, label));
                popup.appendChild(button);
            });
            popup.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
            popup.addEventListener('mouseleave', hidePopup);
            gallery.appendChild(popup);
        }

        function showPopup() {
            clearTimeout(hideTimeout);
            if (!popup) createPopup();
            popup.classList.add('visible');
            trigger.setAttribute('aria-expanded', 'true');
            const rect = trigger.getBoundingClientRect();
            const width = popup.offsetWidth;
            const height = popup.offsetHeight;
            popup.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) + 'px';
            const top = rect.bottom + height + 12 <= window.innerHeight ? rect.bottom + 6 : rect.top - height - 6;
            popup.style.top = Math.max(12, top) + 'px';
        }

        function hidePopup() {
            if (pinned) return;
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                const focused = document.activeElement;
                if (!gallery.contains(focused) || !focused.matches(':focus-visible')) closePopup();
            }, 300);
        }

        trigger.addEventListener('mouseenter', () => {
            if (window.matchMedia('(hover: hover)').matches) showPopup();
        });
        trigger.addEventListener('mouseleave', hidePopup);
        trigger.addEventListener('click', event => {
            // Mouse users keep the hover interaction; touch and keyboard can pin it open.
            if (event.detail > 0 && window.matchMedia('(hover: hover)').matches) {
                showPopup();
                return;
            }
            if (pinned) closePopup();
            else { pinned = true; showPopup(); }
        });
        gallery.addEventListener('focusin', showPopup);
        gallery.addEventListener('focusout', hidePopup);
        gallery.addEventListener('galleryclose', closePopup);
        gallery.addEventListener('galleryreposition', () => {
            if (!popup?.classList.contains('visible')) return;
            const rect = trigger.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) closePopup();
            else showPopup();
        });
    });
}

function openLightbox(src, alt) {
    let overlay = document.querySelector('.lightbox-overlay');
    if (!overlay) {
        overlay = document.createElement('dialog');
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = '<button type="button" class="lightbox-close">&times;</button><img>';
        overlay.querySelector('button').addEventListener('click', () => overlay.close());
        overlay.addEventListener('click', event => {
            if (event.target === overlay) overlay.close();
        });
        overlay.addEventListener('close', () => {
            document.body.style.overflow = overlay.dataset.previousOverflow;
        });
        document.body.appendChild(overlay);
    }
    overlay.setAttribute('aria-label', currentLang === 'en' ? 'Photo viewer' : '照片查看器');
    overlay.querySelector('button').setAttribute('aria-label', currentLang === 'en' ? 'Close photo' : '关闭照片');
    overlay.querySelector('img').src = src;
    overlay.querySelector('img').alt = alt;
    if (!overlay.open) {
        overlay.dataset.previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        overlay.showModal();
    }
}

function getActiveTheme() {
    const savedTheme = document.documentElement.dataset.theme;
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeButton() {
    const isDark = getActiveTheme() === 'dark';
    document.querySelectorAll('[data-dock-theme], [data-theme-toggle]').forEach(button => {
        const icon = button.querySelector('i');
        button.setAttribute('aria-label', currentLang === 'zh'
            ? (isDark ? '切换为浅色模式' : '切换为深色模式')
            : (isDark ? 'Switch to light mode' : 'Switch to dark mode'));
        button.setAttribute('aria-pressed', String(isDark));
        if (icon) icon.className = isDark ? 'bi bi-sun' : 'bi bi-moon-stars';
    });
}

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    saveStorage('theme', theme);
    updateThemeButton();
}

function initResearchVideos() {
    const dialog = document.getElementById('research-video-dialog');
    if (!dialog) return;
    const frame = document.getElementById('research-video-frame');
    let previousOverflow = '';
    dialog.querySelector('[data-video-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
        frame.replaceChildren();
        document.body.style.overflow = previousOverflow;
    });
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-research-video]');
        if (!button || dialog.open) return;
        const bvid = button.dataset.researchVideo;
        if (!/^BV[0-9A-Za-z]{10}$/.test(bvid)) return;
        const title = button.dataset.videoTitle;
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&page=1&high_quality=1&danmaku=0&autoplay=0`;
        iframe.title = title;
        iframe.allow = 'encrypted-media; fullscreen';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        document.getElementById('research-video-title').textContent = title;
        document.getElementById('research-video-source').href = `https://www.bilibili.com/video/${bvid}/`;
        frame.replaceChildren(iframe);
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.showModal();
    });
}

function initMascotDock() {
    const dock = document.getElementById('mascot-dock');
    if (!dock) return;

    const toggle = dock.querySelector('.mascot-toggle');
    const mascotImage = dock.querySelector('.mascot-toggle img');
    const fallback = dock.querySelector('.mascot-fallback');

    if (mascotImage && fallback) {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const idleSource = mascotImage.dataset.petIdle;
        const actions = ['waving', 'waiting', 'running', 'running-right', 'running-left', 'jumping', 'review', 'failed'];
        let hovered = false;
        let focused = false;
        let failed = false;
        let currentAction = 'idle';
        let previousAction = null;
        let nextActionTimer = null;
        let finishActionTimer = null;

        const updatePet = () => {
            if (failed) return;
            const source = reducedMotion.matches ? mascotImage.dataset.petStill
                : idleSource.replace(/idle\.webp$/, currentAction + '.webp');
            if (mascotImage.getAttribute('src') !== source) mascotImage.src = source;
        };
        const clearTimers = () => {
            clearTimeout(nextActionTimer);
            clearTimeout(finishActionTimer);
        };
        const scheduleAction = () => {
            clearTimeout(nextActionTimer);
            if (failed || reducedMotion.matches || document.hidden || hovered || focused) return;
            nextActionTimer = setTimeout(() => {
                if (dock.classList.contains('is-open')) {
                    scheduleAction();
                    return;
                }
                const choices = actions.filter(action => action !== previousAction);
                currentAction = choices[Math.floor(Math.random() * choices.length)];
                previousAction = currentAction;
                updatePet();
                finishActionTimer = setTimeout(() => {
                    currentAction = 'idle';
                    updatePet();
                    scheduleAction();
                }, 2500 + Math.random() * 1500);
            }, 8000 + Math.random() * 8000);
        };
        const resetPet = () => {
            clearTimers();
            currentAction = hovered || focused ? 'waving' : 'idle';
            updatePet();
            scheduleAction();
        };
        dock.addEventListener('mouseenter', () => { hovered = true; resetPet(); });
        dock.addEventListener('mouseleave', () => { hovered = false; resetPet(); });
        dock.addEventListener('focusin', () => { focused = true; resetPet(); });
        dock.addEventListener('focusout', event => {
            focused = dock.contains(event.relatedTarget);
            resetPet();
        });
        reducedMotion.addEventListener('change', resetPet);
        document.addEventListener('visibilitychange', resetPet);
        const showFallback = () => {
            failed = true;
            clearTimers();
            mascotImage.hidden = true;
            fallback.hidden = false;
        };
        mascotImage.addEventListener('error', showFallback);
        if (mascotImage.complete && mascotImage.naturalWidth === 0) showFallback();
        resetPet();
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
    contentController?.abort();
    contentController = new AbortController();
    const signal = contentController.signal;
    const generation = ++contentGeneration;
    const directory = getDir();
    const strings = i18n[currentLang];
    const isCurrent = () => generation === contentGeneration;
    const fetchText = async filename => {
        const response = await fetch(directory + filename, { signal, cache: 'no-cache' });
        if (!response.ok) throw new Error(`Unable to load ${filename}: HTTP ${response.status}`);
        return response.text();
    };
    closeHoverGalleries();
    applyI18n();

    fetchText(config_file)
        .then(text => {
            if (!isCurrent()) return;
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                const target = document.getElementById(key);
                if (!target) return;
                let val = yml[key];
                if (val === 'COPYRIGHT_PLACEHOLDER') {
                    const year = new Date().getFullYear();
                    val = `&copy; Zhongzheng Li 2022-${year}. All Rights Reserved.`;
                }
                target.innerHTML = val ?? '';
            })
        })
        .catch(error => { if (isCurrent() && error.name !== 'AbortError') console.error(error); });

    marked.use({ mangle: false, headerIds: false })
    section_names.forEach(name => {
        const target = document.getElementById(name + '-md');
        target.setAttribute('aria-busy', 'true');
        fetchText(name + '.md')
            .then(markdown => {
                if (!isCurrent()) return;
                const html = marked.parse(markdown);
                window.MathJax?.typesetClear?.([target]);
                target.innerHTML = html;
                target.setAttribute('aria-busy', 'false');
                // Load MathJax only if math content is detected
                if (/\$|\\\(|\\\[/.test(markdown) && typeof loadMathJax === 'function') {
                    loadMathJax(target);
                }
                initHoverGalleries();
                refreshNavigation();
            })
            .catch(error => {
                if (!isCurrent() || error.name === 'AbortError') return;
                console.error(error);
                window.MathJax?.typesetClear?.([target]);
                const message = document.createElement('p');
                message.textContent = strings['content-error'];
                const retry = document.createElement('button');
                retry.type = 'button';
                retry.className = 'btn btn-outline-primary';
                retry.textContent = strings['content-retry'];
                retry.addEventListener('click', loadContent);
                target.replaceChildren(message, retry);
                target.setAttribute('aria-busy', 'false');
                refreshNavigation();
            });
    })
}


window.addEventListener('DOMContentLoaded', event => {

    // Track the section under the header, including short sections at page end.
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        const sections = [...mainNav.querySelectorAll('.nav-link[href^="#"]')]
            .map(link => ({ link, section: document.getElementById(link.hash.slice(1)) }))
            .filter(item => item.section);
        refreshNavigation = () => {
            let active = sections[0];
            const ready = section_names.every(name => document.getElementById(name + '-md').getAttribute('aria-busy') === 'false');
            if (ready) {
                const cutoff = mainNav.offsetHeight + 96;
                sections.forEach(item => { if (item.section.getBoundingClientRect().top <= cutoff) active = item; });
                if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) active = sections[sections.length - 1];
            }
            sections.forEach(item => {
                item.link.classList.toggle('active', item === active);
                if (item === active) item.link.setAttribute('aria-current', 'location');
                else item.link.removeAttribute('aria-current');
            });
        };
        let scheduled = false;
        window.addEventListener('scroll', () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => { refreshNavigation(); scheduled = false; });
        }, { passive: true });
        window.addEventListener('resize', refreshNavigation);
        refreshNavigation();
    }

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none' && document.getElementById('navbarResponsive').classList.contains('show')) {
                navbarToggler.click();
            }
        });
    });

    // Language toggle
    document.getElementById('lang-toggle').addEventListener('click', () => {
        const videoDialog = document.getElementById('research-video-dialog');
        if (videoDialog?.open) videoDialog.close();
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        saveStorage('lang', currentLang);
        loadContent();
    });

    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
        setTheme(getActiveTheme() === 'dark' ? 'light' : 'dark');
    });

    document.addEventListener('click', (event) => {
        const photo = event.target.closest('[data-profile-photo]');
        if (photo && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            openLightbox(photo.href, photo.querySelector('img').alt);
            return;
        }
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

    document.addEventListener('click', event => {
        if (!event.target.closest('.hover-gallery, .lightbox-overlay')) closeHoverGalleries();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !document.querySelector('.lightbox-overlay[open]')) {
            const gallery = document.activeElement.closest('.hover-gallery');
            gallery?.querySelector('.hover-gallery-trigger').focus();
            closeHoverGalleries();
        }
    });
    window.addEventListener('resize', closeHoverGalleries);
    window.addEventListener('scroll', () => {
        document.querySelectorAll('.hover-gallery').forEach(gallery => {
            gallery.dispatchEvent(new Event('galleryreposition'));
        });
    });

    initMascotDock();
    initMusicPlayer();
    initResearchVideos();
    loadContent();
});
