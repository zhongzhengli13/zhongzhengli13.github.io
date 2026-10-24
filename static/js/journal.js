(() => {
    const strings = {
        zh: { skip: '跳到正文', navigation: '随笔导航', asideNote: '研究之外，记下生活。', home: '学术主页', journal: '随笔', write: '写随笔 ↗', footer: '日常有迹，来日可寻。', backHome: '返回主页 ↗', intro: '日记、想法，以及值得留住的片刻。', searchLabel: '搜索随笔', searchPlaceholder: '搜索标题或正文…', filterLabel: '按分类筛选', all: '全部', read: '读这篇随笔 →', empty: '这里还没有匹配的随笔。', reset: '清除筛选', backJournal: '← 全部随笔', toc: '本篇目录', postEnd: '记于此，待续。', photoViewer: '照片查看器', closePhoto: '关闭照片', openPhoto: '放大照片：', theme: '切换深浅色', count: n => `${n} 篇记录` },
        en: { skip: 'Skip to content', navigation: 'Journal navigation', asideNote: 'A little life beyond research.', home: 'Academic home', journal: 'Journal', write: 'Write a note ↗', footer: 'Small moments, kept in words.', backHome: 'Back home ↗', intro: 'Diaries, thoughts, and moments worth keeping.', searchLabel: 'Search journal', searchPlaceholder: 'Search titles or text…', filterLabel: 'Filter by category', all: 'All', read: 'Read this note →', empty: 'No notes match your search.', reset: 'Clear filters', backJournal: '← All notes', toc: 'On this page', postEnd: 'Until the next note.', photoViewer: 'Photo viewer', closePhoto: 'Close photo', openPhoto: 'Enlarge photo: ', theme: 'Toggle light and dark mode', count: n => `${n} ${n === 1 ? 'note' : 'notes'}` }
    };
    const readStorage = key => { try { return localStorage.getItem(key); } catch { return null; } };
    const saveStorage = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
    let lang = readStorage('lang') === 'en' ? 'en' : 'zh';
    const search = document.getElementById('journal-search');
    const cards = [...document.querySelectorAll('[data-journal-entry]')];
    const filters = [...document.querySelectorAll('[data-category][type="button"]')];
    let category = new URL(location.href).searchParams.get('category') || '';
    if (!filters.some(button => button.dataset.category === category)) category = '';

    function filterEntries(writeUrl = false) {
        if (!search) return;
        const query = search.value.trim().normalize('NFKC').toLocaleLowerCase();
        let count = 0;
        for (const card of cards) {
            const text = card.dataset.search.normalize('NFKC').toLocaleLowerCase();
            card.hidden = Boolean((category && card.dataset.category !== category) || (query && !text.includes(query)));
            if (!card.hidden) count++;
        }
        filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
        document.getElementById('journal-results').textContent = strings[lang].count(count);
        document.getElementById('journal-empty').hidden = count > 0;
        document.getElementById('journal-reset').hidden = !query && !category;
        if (writeUrl) {
            const url = new URL(location.href);
            if (search.value) url.searchParams.set('q', search.value); else url.searchParams.delete('q');
            if (category) url.searchParams.set('category', category); else url.searchParams.delete('category');
            history.replaceState(null, '', url);
        }
    }

    function applyLanguage() {
        const dict = strings[lang];
        document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
        document.querySelectorAll('[data-j18n]').forEach(el => { el.textContent = dict[el.dataset.j18n]; });
        document.querySelectorAll('[data-j18n-aria]').forEach(el => el.setAttribute('aria-label', dict[el.dataset.j18nAria]));
        document.querySelectorAll('[data-j18n-placeholder]').forEach(el => el.placeholder = dict[el.dataset.j18nPlaceholder]);
        document.querySelectorAll('.journal-photo-button').forEach(el => el.setAttribute('aria-label', dict.openPhoto + el.querySelector('img').alt));
        const button = document.getElementById('journal-lang');
        button.textContent = lang === 'zh' ? 'EN' : '中';
        button.setAttribute('aria-label', lang === 'zh' ? 'Switch interface to English' : '切换为中文界面');
        document.getElementById('journal-theme').setAttribute('aria-label', dict.theme);
        filterEntries();
    }

    document.getElementById('journal-lang').addEventListener('click', () => {
        lang = lang === 'zh' ? 'en' : 'zh';
        saveStorage('lang', lang);
        applyLanguage();
    });
    document.getElementById('journal-theme').addEventListener('click', () => {
        const current = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        saveStorage('theme', next);
    });

    if (search) {
        document.getElementById('journal-tools').hidden = false;
        search.value = new URL(location.href).searchParams.get('q') || '';
        search.addEventListener('input', () => filterEntries(true));
        filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.category; filterEntries(true); }));
        document.getElementById('journal-reset').addEventListener('click', () => { search.value = ''; category = ''; filterEntries(true); search.focus(); });
        window.addEventListener('pageshow', () => filterEntries());
        document.addEventListener('keydown', event => {
            if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input, textarea, [contenteditable="true"]')) { event.preventDefault(); search.focus(); }
        });
    }

    const prose = document.getElementById('journal-prose');
    if (prose) {
        const headings = [...prose.querySelectorAll('h2, h3')];
        const toc = document.getElementById('journal-toc');
        const tocLinks = new Map();
        headings.forEach((heading, index) => {
            if (!heading.id) heading.id = `heading-${index + 1}`;
            const link = document.createElement('a');
            link.href = `#${encodeURIComponent(heading.id)}`;
            link.textContent = heading.textContent;
            link.dataset.depth = heading.tagName.slice(1);
            toc.querySelector('nav').appendChild(link);
            tocLinks.set(heading, link);
        });
        toc.hidden = !headings.length;
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    tocLinks.forEach(link => link.classList.remove('is-active'));
                    tocLinks.get(entry.target).classList.add('is-active');
                });
            }, { rootMargin: '0px 0px -65% 0px' });
            headings.forEach(heading => observer.observe(heading));
        }
        let scheduled = false;
        const progress = document.getElementById('reading-progress');
        const updateProgress = () => {
            const start = prose.getBoundingClientRect().top + scrollY;
            const length = Math.max(1, prose.offsetHeight - innerHeight);
            progress.style.width = `${Math.max(0, Math.min(100, (scrollY - start) / length * 100))}%`;
            scheduled = false;
        };
        window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } }, { passive: true });
        window.addEventListener('resize', updateProgress);
        updateProgress();

        const dialog = document.getElementById('journal-lightbox');
        let originalOverflow = '';
        dialog.querySelector('button').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
        dialog.addEventListener('close', () => { document.body.style.overflow = originalOverflow; });
        prose.querySelectorAll('img').forEach(img => {
            img.loading = 'lazy';
            img.addEventListener('load', updateProgress);
            if (img.closest('a, button')) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'journal-photo-button';
            img.replaceWith(button);
            button.appendChild(img);
            button.addEventListener('click', () => {
                dialog.querySelector('img').src = img.currentSrc || img.src;
                dialog.querySelector('img').alt = img.alt;
                originalOverflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                dialog.showModal();
            });
        });
        // Kramdown emits math script elements; MathJax 3 expects delimiters.
        prose.querySelectorAll('script[type^="math/tex"]').forEach(element => {
            const display = element.type.includes('mode=display');
            element.replaceWith(document.createTextNode((display ? '\\[' : '\\(') + element.textContent + (display ? '\\]' : '\\)')));
        });
        // Load math support only for articles that contain math delimiters.
        if (/\$|\\\(|\\\[/.test(prose.textContent)) {
            window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] }, startup: { ready: () => { MathJax.startup.defaultReady(); MathJax.startup.promise.then(updateProgress); } } };
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }
    applyLanguage();
})();
