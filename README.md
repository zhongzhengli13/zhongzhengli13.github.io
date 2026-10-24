

# A simple Github Pages template for academic personal website.

## 随笔

随笔页面位于 `/journal/`，每篇文章保存在 `_journal/` 中，使用 Jekyll 自动生成列表和阅读页。在线编辑入口为 `/admin/`，通过 Cloudflare Workers 接入 GitHub 登录，并支持 Decap 体验模式和本地编辑。详见 [随笔写作说明](docs/journal-writing.md)。

## Preview

I replaced this with mine.🙃

![image-20251010074727093](https://lzz-1340752507.cos.ap-shanghai.myqcloud.com/lzz/image-20251010074727093.png)


## Introduction

This is an academic personal website template based on [bootstrap](https://github.com/StartBootstrap/startbootstrap-new-age).

The template is designed to integrate Markdown files as content input.  There's no need to compile the webpage before deployment.  Upon loading, the Markdown files are automatically parsed and embedded into the page.

This template supports LaTeX formula input. You can use `$...$` and `\(...\)` as delimiters for inline-math, or use `$$...$$` and `\[...\]` as delimiters for display-math. Macros such as `\ref{...}`, `\eqref{...}`, and `\begin{equation}...\end{equation}` are also supported. See [MathJax](https://docs.mathjax.org/en/latest/index.html) for more details.

:milky_way: Demo: https://senli1073.github.io/   --->very nice!!!


## Getting Start
### 1. Fork this repository
The repository name should be `<username>.github.io`, which will also be your website's URL.


### 2. Edit page content

(1) Go to the folder where you want to store your project, and clone the new repository:
```
git clone https://github.com/<username>/<username>.github.io.git
```
The directory structure is as follows:

```.
.
├── contents
└── static
    ├── assets
    │   └── img
    ├── css
    └── js
```

(2) Modify the content of each section, which corresponds to `contents/*.md`.

(3) Adjust the title, copyright information, and other text of the website in `contents/config.yml`

(4) Replace background image and photo with new ones for your web pages in `static/assets/img/`

(5) Push it: 
```
git commit -am 'init'
git push
```


### 3. Enjoy

Fire up a browser and go to `https://<username>.github.io`



## License

Copyright Sen Li, 2023. Licensed under an MIT license. You can copy and mess with this template.
