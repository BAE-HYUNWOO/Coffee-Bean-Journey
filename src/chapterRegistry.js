// src/chapterRegistry.js
import * as chapter4 from './chapters/chapter4_consumption/index.js';

export const chapters = {
    4: { init: chapter4.init, update: chapter4.update, destroy: chapter4.destroy }
    // 其他章节以后添加，例如：
    // 1: { init: chapter1.init, update: chapter1.update, destroy: chapter1.destroy },
    // 2: { init: chapter2.init, update: chapter2.update, destroy: chapter2.destroy },
    // 3: { init: chapter3.init, update: chapter3.update, destroy: chapter3.destroy },
    // 5: { init: chapter5.init, update: chapter5.update, destroy: chapter5.destroy },
};