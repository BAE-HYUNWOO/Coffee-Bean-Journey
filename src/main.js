// src/main.js
import * as d3 from 'd3';
import { chapters } from './chapterRegistry.js';

function init() {
    const scroller = scrollama();
    const sections = document.querySelectorAll('.chapter');

    scroller
        .setup({
            step: '.chapter',
            offset: 0.5,
            debug: false
        })
        .onStepEnter(({ element, index }) => {
            const chapterId = element.getAttribute('data-chapter');
            if (chapters[chapterId] && chapters[chapterId].init) {
                chapters[chapterId].init(`chart${chapterId}`);
            }
        })
        .onStepExit(({ element, index }) => {
            const chapterId = element.getAttribute('data-chapter');
            if (chapters[chapterId] && chapters[chapterId].destroy) {
                chapters[chapterId].destroy();
            }
        });

    window.addEventListener('resize', () => scroller.resize());
}

init();