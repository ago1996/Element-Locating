// ==UserScript==
// @name         智能元素定位
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  智能生成 CSS 和 XPath 选择器，支持单点定位和列表泛化，新增 LCA 暴力泛化策略、后置过滤机制、防错位高亮、选项卡 UI、单点定位唯一性校验、XPath 智能截断、一键生成爬虫代码、网络嗅探雷达、移动端完美适配、DOM 层级面包屑导航、实时数据预览、AI 智能分析和胶囊挂件 UI
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 🛑 修复：防止在 iframe 中运行，导致页面出现多个悬浮球
    if (window.self !== window.top) {
        return;
    }

    // ==================== 网络嗅探雷达 (Network Sniffer) ====================
    // 全局存储拦截到的媒体 URL
    window.sniffedMediaUrls = window.sniffedMediaUrls || [];

    // 匹配规则：媒体后缀或特征词
    const mediaPatterns = [
        /\.m3u8(\?|$)/i,
        /\.mp4(\?|$)/i,
        /\.flv(\?|$)/i,
        /\.ts(\?|$)/i,
        /\.mpd(\?|$)/i,
        /playurl/i,
        /video\/api/i,
        /get_play_info/i,
        /videoplayurl/i,
        /getvideo/i,
        /play\.json/i,
        /playinfo/i
    ];

    function isMediaUrl(url) {
        return mediaPatterns.some(pattern => pattern.test(url));
    }

    function getMediaType(url) {
        if (/\.m3u8/i.test(url)) return 'M3U8';
        if (/\.mp4/i.test(url)) return 'MP4';
        if (/\.flv/i.test(url)) return 'FLV';
        if (/\.ts/i.test(url)) return 'TS';
        if (/\.mpd/i.test(url)) return 'MPD';
        if (/playurl|video\/api|get_play_info|playinfo/i.test(url)) return 'API';
        return 'Unknown';
    }

    function addSniffedUrl(url, type) {
        // 去重检查
        if (window.sniffedMediaUrls.some(item => item.url === url)) {
            return;
        }

        const item = {
            url: url,
            type: type,
            timestamp: new Date().toLocaleTimeString(),
            mediaType: getMediaType(url)
        };

        window.sniffedMediaUrls.push(item);
        console.log(`🔍 [网络嗅探] 拦截到 ${type} 请求:`, url);

        // 触发 UI 更新（如果面板打开且在嗅探雷达 Tab）
        if (window.refreshSnifferTab) {
            window.refreshSnifferTab();
        }
    }

    // Hook XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._interceptedUrl = url;
        return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        if (this._interceptedUrl && isMediaUrl(this._interceptedUrl)) {
            addSniffedUrl(this._interceptedUrl, 'XHR');
        }
        return originalXHRSend.apply(this, args);
    };

    // Hook Fetch
    const originalFetch = window.fetch;
    window.fetch = function(url, ...args) {
        const urlString = typeof url === 'string' ? url : (url.url || url.toString());
        if (urlString && isMediaUrl(urlString)) {
            addSniffedUrl(urlString, 'Fetch');
        }
        return originalFetch.apply(this, [url, ...args]);
    };

    console.log('🔍 网络嗅探雷达已启动 (Hook XHR & Fetch)');

    // ==================== 等待 DOM 加载完成后再初始化 UI ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }

    function initUI() {

    // 🛑 修复：防止重复注入 DOM
    if (document.getElementById('ultimate-selector-host')) {
        return;
    }

    // ==================== CSS 选择器生成器 ====================
    const defaultOptions = {
        root: document,
        threshold: 5,
        seedMinLength: 1,
        className: (name) => {
            return !isRandomClassName(name) && !isUtilityClassName(name);
        },
        tagName: (name) => true,
    };

    function isRandomClassName(name) {
        const patterns = [
            /^[a-z]+-[a-z0-9]{3,}$/i,
            /^[a-z]-[a-z]-[a-z]-\d+$/i,
            /^_[a-z0-9]{5,}$/i,
            /^[a-z]{1,3}\d{3,}$/i,
        ];
        return patterns.some(pattern => pattern.test(name));
    }

    function isUtilityClassName(name) {
        const utilityPatterns = [
            /^(m|p|w|h|text|bg|flex|grid|border|rounded|shadow)-/,
            /^(active|hover|focus|disabled|visited):/,
            // BEM 动态修饰符（如 .bili-video-card__image--hover）
            /--(hover|active|focus|visited|disabled|selected|playing|paused|loading|loaded)$/,
            // 状态类前缀（如 .is-active, .has-error, .was-visible）
            /^(is|has|was)-/,
        ];
        return utilityPatterns.some(pattern => pattern.test(name));
    }

    function isValidId(id) {
        if (/^[a-z0-9]{8,}$/i.test(id)) return false;
        const genericIds = ['root', 'app', 'main', 'content', 'wrapper', 'container'];
        return !genericIds.includes(id.toLowerCase());
    }

    function escapeSelector(str) {
        return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    }

    function generateSeeds(element, options) {
        const seeds = [];
        if (element.id && isValidId(element.id)) {
            seeds.push(`#${escapeSelector(element.id)}`);
        }
        if (element.classList.length > 0) {
            const validClasses = Array.from(element.classList).filter(cls => options.className?.(cls) ?? true);
            validClasses.forEach(cls => seeds.push(`.${escapeSelector(cls)}`));
        }
        const semanticAttrs = ['name', 'data-testid', 'data-test', 'aria-label', 'title', 'type', 'role'];
        semanticAttrs.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value) seeds.push(`[${attr}="${escapeSelector(value)}"]`);
        });
        if (element.tagName.toLowerCase() === 'a') {
            const href = element.getAttribute('href');
            if (href && !href.startsWith('javascript:')) {
                seeds.push(`[href="${escapeSelector(href)}"]`);
            }
        }
        const tagName = element.tagName.toLowerCase();
        if (options.tagName?.(tagName) ?? true) {
            seeds.push(tagName);
        }
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element) + 1;
            seeds.push(`:nth-child(${index})`);
        }
        return seeds;
    }

    function calculatePenalty(selector) {
        let penalty = 0;
        const idCount = (selector.match(/#/g) || []).length;
        const classCount = (selector.match(/\./g) || []).length;
        const attrCount = (selector.match(/\[/g) || []).length;
        const tagCount = (selector.match(/^[a-z]+|>[a-z]+| [a-z]+/gi) || []).length;
        const nthCount = (selector.match(/:nth-child/g) || []).length;
        penalty += idCount * 2;
        penalty += attrCount * 5;
        penalty += classCount * 10;
        penalty += tagCount * 30;
        penalty += nthCount * 1000;
        penalty += selector.length * 0.5;
        if (/active|hover|focus|selected|disabled/i.test(selector)) {
            penalty += 5000;
        }
        return penalty;
    }

    function isUnique(selector, target, root) {
        try {
            const elements = root.querySelectorAll(selector);
            return elements.length === 1 && elements[0] === target;
        } catch (e) {
            return false;
        }
    }

    function generateSelector(input, options) {
        const opts = { ...defaultOptions, ...options };
        const candidates = [];
        let currentPaths = generateSeeds(input, opts);
        for (const seed of currentPaths) {
            if (isUnique(seed, input, opts.root)) {
                candidates.push({ path: seed, penalty: calculatePenalty(seed) });
            }
        }
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.penalty - b.penalty);
            return candidates[0].path;
        }
        let currentElement = input;
        let level = 0;
        while (currentElement.parentElement && level < opts.threshold) {
            currentElement = currentElement.parentElement;
            level++;
            const parentSeeds = generateSeeds(currentElement, opts);
            const newPaths = [];
            for (const parentSeed of parentSeeds) {
                for (const currentPath of currentPaths) {
                    const descendantSelector = `${parentSeed} ${currentPath}`;
                    newPaths.push(descendantSelector);
                    if (isUnique(descendantSelector, input, opts.root)) {
                        candidates.push({ path: descendantSelector, penalty: calculatePenalty(descendantSelector) });
                    }
                    const childSelector = `${parentSeed}>${currentPath}`;
                    newPaths.push(childSelector);
                    if (isUnique(childSelector, input, opts.root)) {
                        candidates.push({ path: childSelector, penalty: calculatePenalty(childSelector) });
                    }
                }
            }
            currentPaths = newPaths;
            if (candidates.length >= 10) break;
        }
        if (candidates.length === 0) {
            const path = [];
            let current = input;
            while (current && current !== opts.root) {
                const parent = current.parentElement;
                if (!parent) break;
                const siblings = Array.from(parent.children);
                const index = siblings.indexOf(current) + 1;
                const tag = current.tagName.toLowerCase();
                path.unshift(`${tag}:nth-child(${index})`);
                current = parent;
            }
            return path.join('>');
        }
        candidates.sort((a, b) => a.penalty - b.penalty);
        return candidates[0].path;
    }

    // ==================== 混合选择器引擎 ====================
    class HybridSelectorEngine {
        constructor(options) {
            this.options = { root: document, preferCSS: true, enableTextXPath: true, enableListGeneralization: true, ...options };
        }

        // 获取元素的直接文本内容（避免 textContent 陷阱）
        getDirectText(element) {
            let text = '';
            // 优先使用 innerText（更接近用户可见文本）
            if (element.innerText) {
                text = element.innerText.trim();
            } else {
                // 降级方案：只获取直接子文本节点
                for (const node of element.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        text += node.textContent;
                    }
                }
                text = text.trim();
            }

            // 严格限制文本长度，避免容器元素的巨型文本
            const maxLength = 30;
            if (text.length > maxLength) {
                // 如果文本过长，可能是容器元素，截取前面部分
                text = text.substring(0, maxLength);
            }

            // 检查是否包含过多子元素（容器元素特征）
            const childElementCount = element.children.length;
            if (childElementCount > 3) {
                // 容器元素，文本匹配不可靠，返回空
                return '';
            }

            return text;
        }

        /**
         * 唯一性校验：验证选择器是否在页面上唯一定位到目标元素
         * @param {string} selector - 选择器字符串
         * @param {string} type - 选择器类型 ('css' 或 'xpath')
         * @param {Element} target - 目标元素
         * @returns {boolean} - 是否唯一
         */
        isUniqueSelector(selector, type, target) {
            try {
                if (type === 'css') {
                    const elements = document.querySelectorAll(selector);
                    return elements.length === 1 && elements[0] === target;
                } else if (type === 'xpath') {
                    const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    return result.snapshotLength === 1 && result.snapshotItem(0) === target;
                }
            } catch (e) {
                return false;
            }
            return false;
        }

        getBestSelector(element) {
            const cssResult = this.generateCSS(element);
            const xpathResult = this.generateXPath(element);

            // 一票否决制：对不唯一的选择器施加极大惩罚
            if (!this.isUniqueSelector(cssResult.selector, 'css', element)) {
                cssResult.score += 10000;
                cssResult.reason += ' ⚠️ 非唯一';
            }
            if (!this.isUniqueSelector(xpathResult.selector, 'xpath', element)) {
                xpathResult.score += 10000;
                xpathResult.reason += ' ⚠️ 非唯一';
            }

            return cssResult.score <= xpathResult.score ? { css: cssResult, xpath: xpathResult, best: { ...cssResult, type: 'css' } } : { css: cssResult, xpath: xpathResult, best: { ...xpathResult, type: 'xpath' } };
        }

        generateCSS(element) {
            try {
                const selector = generateSelector(element, { root: this.options.root });

                // 验证唯一性（CSS生成器内部已经保证唯一性，但这里再次确认）
                const elements = document.querySelectorAll(selector);
                if (elements.length !== 1 || elements[0] !== element) {
                    // 如果不唯一，返回极高的score
                    return { type: 'css', selector, score: 10000, reason: '生成的选择器不唯一' };
                }

                const score = this.calculateCSSScore(selector);
                return { type: 'css', selector, score, reason: selector.includes('#') ? '基于 ID 定位' : selector.includes('[') ? '基于属性定位' : '基于 Class/标签定位' };
            } catch (error) {
                return { type: 'css', selector: '', score: 10000, reason: '生成失败' };
            }
        }

        generateXPath(element) {
            // 使用优化后的文本提取逻辑
            const text = this.getDirectText(element);
            const tagName = element.tagName.toLowerCase();

            // 策略1: 基于文本定位（使用 normalize-space 处理空格和换行符）
            if (text && text.length > 0 && text.length <= 30 && !text.includes("'")) {
                // 使用 normalize-space() 来处理首尾空格和换行符
                const xpath = `//${tagName}[contains(normalize-space(.), '${text}')]`;
                try {
                    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    // 验证唯一性
                    if (result.snapshotLength === 1 && result.snapshotItem(0) === element) {
                        return { type: 'xpath', selector: xpath, score: 5, reason: '基于文本定位' };
                    }
                } catch (e) {
                    // 文本匹配失败，继续尝试其他策略
                }
            }

            // 策略2: 基于 ID 定位
            if (element.id && isValidId(element.id)) {
                const xpath = `//*[@id='${element.id}']`;
                return { type: 'xpath', selector: xpath, score: 3, reason: '基于 ID 定位' };
            }

            // 策略3: 基于 data-testid 定位
            const testid = element.getAttribute('data-testid');
            if (testid) {
                const xpath = `//${tagName}[@data-testid='${testid}']`;
                try {
                    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    if (result.snapshotLength === 1 && result.snapshotItem(0) === element) {
                        return { type: 'xpath', selector: xpath, score: 8, reason: '基于 data-testid 定位' };
                    }
                } catch (e) {
                    // 继续尝试其他策略
                }
            }

            // 策略4: 基于其他语义化属性定位
            const semanticAttrs = ['name', 'data-test', 'aria-label', 'title', 'role'];
            for (const attr of semanticAttrs) {
                const value = element.getAttribute(attr);
                if (value) {
                    const xpath = `//${tagName}[@${attr}='${value}']`;
                    try {
                        const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                        if (result.snapshotLength === 1 && result.snapshotItem(0) === element) {
                            return { type: 'xpath', selector: xpath, score: 10, reason: `基于 ${attr} 属性定位` };
                        }
                    } catch (e) {
                        // 继续尝试下一个属性
                    }
                }
            }

            // 策略5: 兜底方案 - 生成完整的层级 XPath（绝不返回泛滥的 //tagName）
            const preciseXPath = this.generatePreciseXPath(element);
            return { type: 'xpath', selector: preciseXPath, score: 80, reason: '基于完整路径定位' };
        }

        calculateCSSScore(selector) {
            let score = 0;
            if (selector.includes('#')) score += 2;
            score += (selector.match(/\[/g) || []).length * 5;
            score += (selector.match(/\./g) || []).length * 10;
            score += (selector.match(/[a-z]+/gi) || []).length * 15;
            score += (selector.match(/:nth-child/g) || []).length * 50;
            score += selector.length * 0.3;
            return score;
        }
    }

    // ==================== 终极选择器引擎 ====================
    class UltimateSelectorEngine extends HybridSelectorEngine {
        // 提取元素的主要标识性 Class（过滤状态类和工具类）
        extractMainClass(element) {
            if (!element.classList || element.classList.length === 0) {
                return null;
            }

            // 过滤掉状态类和工具类
            const validClasses = Array.from(element.classList).filter(cls => {
                // 排除状态类
                if (/^(is|has|was)-/.test(cls)) return false;
                if (/--(hover|active|focus|visited|disabled|selected|playing|paused|loading|loaded)$/.test(cls)) return false;
                // 排除工具类
                if (/^(m|p|w|h|text|bg|flex|grid|border|rounded|shadow)-/.test(cls)) return false;
                return true;
            });

            if (validClasses.length === 0) return null;

            // 选择最长的 Class（通常最具标识性）
            return validClasses.reduce((longest, current) =>
                current.length > longest.length ? current : longest
            );
        }

        // 寻找 LCA (最近公共祖先) 容器
        findLCAContainer(element, minSimilarCount = 15) {
            const tagName = element.tagName.toLowerCase();
            let current = element.parentElement;
            let level = 0;
            const maxLevel = 5;

            while (current && level < maxLevel) {
                // 统计当前容器内有多少个相同 tagName 的后代元素
                const similarElements = current.querySelectorAll(tagName);

                if (similarElements.length >= minSimilarCount) {
                    // 找到了包含足够多同类元素的容器
                    return {
                        container: current,
                        count: similarElements.length,
                        level: level
                    };
                }

                current = current.parentElement;
                level++;
            }

            return null;
        }

        // Level 3: LCA 暴力泛化策略
        getLCAGeneralization(element) {
            const tagName = element.tagName.toLowerCase();
            const mainClass = this.extractMainClass(element);

            // 寻找 LCA 容器
            const lcaInfo = this.findLCAContainer(element);

            if (!lcaInfo) {
                return null;
            }

            // 生成 LCA 容器的选择器
            let containerSelector;
            try {
                containerSelector = generateSelector(lcaInfo.container, { root: document });
            } catch (e) {
                // 如果生成失败，使用简单的 tagName
                containerSelector = lcaInfo.container.tagName.toLowerCase();
            }

            // 构建宽松的后代选择器
            let lcaSelector;
            if (mainClass) {
                // 优先方案：容器 + tagName + 主要Class
                lcaSelector = `${containerSelector} ${tagName}.${mainClass}`;

                // 验证这个选择器是否有效
                try {
                    const testElements = document.querySelectorAll(lcaSelector);
                    if (testElements.length === 0) {
                        // 如果没有匹配，降级为只用 tagName
                        lcaSelector = `${containerSelector} ${tagName}`;
                    }
                } catch (e) {
                    lcaSelector = `${containerSelector} ${tagName}`;
                }
            } else {
                // 降级方案：容器 + tagName
                lcaSelector = `${containerSelector} ${tagName}`;
            }

            // 执行查询
            let lcaElements = [];
            try {
                lcaElements = Array.from(document.querySelectorAll(lcaSelector));
            } catch (e) {
                return null;
            }

            // 验证原始元素是否在结果中
            if (!lcaElements.includes(element)) {
                return null;
            }

            return {
                type: 'css',
                selector: lcaSelector,
                count: lcaElements.length,
                score: lcaElements.length > 1 ? 5 : 100,
                reason: `LCA 暴力泛化选中 ${lcaElements.length} 个元素 (容器层级: ${lcaInfo.level})`,
                elements: lcaElements
            };
        }

        /**
         * 后置过滤：剔除不相似的候选元素
         * @param {Element[]} candidates - 候选元素数组
         * @param {Element} target - 目标元素
         * @returns {Element[]} - 过滤后的元素数组
         *
         * 过滤规则：
         * 1. Tag 一致性：剔除与目标元素 tagName 不同的元素
         * 2. DOM 深度校验：剔除深度差值绝对值 > 1 的元素
         *    - 原理：同一列表的元素通常在 DOM 树中处于相同或相近的深度
         *    - 例如：左侧排行榜（深度 8）和右侧最新更新（深度 12）会被区分开
         * 3. 视觉区域校验：剔除不可见的元素（offsetParent === null）
         */
        filterSimilarElements(candidates, target) {
            if (!candidates || candidates.length === 0) return [];

            // 计算目标元素的 DOM 深度（到 document.body 的层级数）
            const getDepth = (element) => {
                let depth = 0;
                let current = element;
                while (current && current !== document.body && current !== document.documentElement) {
                    depth++;
                    current = current.parentElement;
                }
                return depth;
            };

            const targetTagName = target.tagName.toLowerCase();
            const targetDepth = getDepth(target);

            // 应用三重过滤
            return candidates.filter(candidate => {
                // 1. Tag 一致性校验
                if (candidate.tagName.toLowerCase() !== targetTagName) {
                    return false;
                }

                // 2. DOM 深度校验（深度差值绝对值必须 <= 1）
                const candidateDepth = getDepth(candidate);
                const depthDiff = Math.abs(candidateDepth - targetDepth);
                if (depthDiff > 1) {
                    return false;
                }

                // 3. 视觉区域校验（可选但推荐）
                // offsetParent === null 表示元素不可见（display:none 或祖先元素隐藏）
                if (candidate.offsetParent === null && target.offsetParent !== null) {
                    return false;
                }

                return true;
            });
        }

        getSimilarElementsDetailed(element) {
            // Level 1: CSS 泛化（基于 nth-child 替换）
            const preciseCSS = generateSelector(element, { root: document });
            const generalizedCSS = preciseCSS.replace(/:nth-child\(\d+\)/g, ':nth-child(n)');
            let cssElements = Array.from(document.querySelectorAll(generalizedCSS));

            // 应用后置过滤
            cssElements = this.filterSimilarElements(cssElements, element);

            // Level 2: XPath 泛化（移除索引）
            const preciseXPath = this.generatePreciseXPath(element);
            const generalizedXPath = preciseXPath.replace(/\[(\d+)\]/g, '');
            const xpathResult = document.evaluate(generalizedXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            let xpathElements = [];
            for (let i = 0; i < xpathResult.snapshotLength; i++) {
                xpathElements.push(xpathResult.snapshotItem(i));
            }

            // 应用后置过滤
            xpathElements = this.filterSimilarElements(xpathElements, element);

            const cssResult = {
                type: 'css',
                selector: generalizedCSS,
                count: cssElements.length,
                score: cssElements.length > 1 ? 10 : 100,
                reason: `CSS 泛化选中 ${cssElements.length} 个元素`
            };

            const xpathResult2 = {
                type: 'xpath',
                selector: generalizedXPath,
                count: xpathElements.length,
                score: xpathElements.length > 1 ? 10 : 100,
                reason: `XPath 泛化选中 ${xpathElements.length} 个元素`
            };

            // Level 3: LCA 暴力泛化（兜底策略）
            const lcaResult = this.getLCAGeneralization(element);

            // 智能选择最优策略
            let best;
            if (lcaResult && lcaResult.count > 0) {
                // 计算 LCA 相比其他策略的提升比例
                const maxOtherCount = Math.max(cssElements.length, xpathElements.length);
                const improvement = (lcaResult.count - maxOtherCount) / maxOtherCount;

                // 如果 LCA 策略抓取数量显著更多（至少多 30%），则采用 LCA
                if (improvement >= 0.3) {
                    best = { ...lcaResult, reason: `${lcaResult.reason} ⚡ 跨容器泛化` };
                } else {
                    // 否则使用传统策略
                    best = cssElements.length >= xpathElements.length ? cssResult : xpathResult2;
                }
            } else {
                // LCA 策略失败，使用传统策略
                best = cssElements.length >= xpathElements.length ? cssResult : xpathResult2;
            }

            return { css: cssResult, xpath: xpathResult2, best, lca: lcaResult };
        }

        generatePreciseXPath(element) {
            if (!element) return '';
            const paths = [];
            let current = element;
            let depth = 0;

            while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body && depth < 6) {
                let tagName = current.tagName.toLowerCase();
                let pathIndex = '';
                let shouldBreak = false;

                if (current !== element) {
                    // 尝试使用 ID 作为锚点（必须全页唯一）
                    if (current.id && !/^[0-9]/.test(current.id)) {
                        try {
                            const idSelector = '#' + escapeSelector(current.id);
                            const matchedElements = document.querySelectorAll(idSelector);
                            if (matchedElements.length === 1 && matchedElements[0] === current) {
                                paths.unshift(`//${tagName}[@id='${current.id}']`);
                                shouldBreak = true;
                            }
                        } catch (e) {
                            // ID 选择器无效，继续尝试其他方式
                        }
                    }

                    // 如果 ID 不唯一，尝试使用 Class 作为锚点（必须全页唯一）
                    if (!shouldBreak) {
                        const validClasses = Array.from(current.classList).filter(c =>
                            !/^[a-z]+-[a-z0-9]{3,}$/i.test(c) &&
                            !/^(active|hover|focus|current|is-)/i.test(c)
                        );

                        if (validClasses.length > 0) {
                            try {
                                const classSelector = tagName + '.' + escapeSelector(validClasses[0]);
                                const matchedElements = document.querySelectorAll(classSelector);
                                if (matchedElements.length === 1 && matchedElements[0] === current) {
                                    paths.unshift(`//${tagName}[contains(@class, '${validClasses[0]}')]`);
                                    shouldBreak = true;
                                }
                            } catch (e) {
                                // Class 选择器无效，继续尝试其他方式
                            }
                        }
                    }
                }

                // 如果找到唯一锚点，截断路径
                if (shouldBreak) {
                    break;
                }

                // 否则，继续构建相对路径（带索引）
                let index = 1;
                let sibling = current.previousElementSibling;
                while (sibling) {
                    if (sibling.tagName.toLowerCase() === tagName) {
                        index++;
                    }
                    sibling = sibling.previousElementSibling;
                }

                let hasSameNameSiblings = false;
                if (current.parentElement) {
                    const siblings = Array.from(current.parentElement.children);
                    hasSameNameSiblings = siblings.some(child => child !== current && child.tagName.toLowerCase() === tagName);
                }

                if (hasSameNameSiblings) {
                    pathIndex = `[${index}]`;
                }

                paths.unshift(tagName + pathIndex);

                current = current.parentElement;
                depth++;
            }

            if (paths.length === 0) return '';
            let finalPath = paths.join('/');
            if (!finalPath.startsWith('//')) {
                finalPath = '//' + finalPath;
            }
            finalPath = finalPath.replace(/\/\/\//g, '//');

            return finalPath;
        }
    }

    // ==================== 暴露到全局 ====================
    window.UltimateSelectorEngine = UltimateSelectorEngine;

    // ==================== 图片懒加载分析器 ====================
    function analyzeImageElement(element) {
        const result = {
            isImage: false,
            hasPicture: false,
            realSrc: null,
            lazyAttr: null,
            suggestion: '',
            extractionCode: ''
        };

        // 检查是否是图片元素
        if (element.tagName.toLowerCase() !== 'img') {
            return result;
        }

        result.isImage = true;

        // 检查是否被 <picture> 包裹
        const pictureParent = element.closest('picture');
        if (pictureParent) {
            result.hasPicture = true;
            const source = pictureParent.querySelector('source[srcset]');
            if (source) {
                const srcset = source.getAttribute('srcset');
                // 提取 srcset 中的第一个 URL（通常是最高质量的）
                const match = srcset.match(/([^\s,]+)/);
                if (match) {
                    result.realSrc = match[1];
                    result.suggestion = '检测到 <picture> 标签，建议抓取 <source> 的 srcset 属性';
                    result.extractionCode = `document.querySelector('${generateSelector(pictureParent, { root: document })} source').getAttribute('srcset')`;
                }
            }
        }

        // 检查常见的懒加载属性
        const lazyAttrs = ['data-src', 'data-original', 'data-lazy', 'data-srcset', 'data-actualsrc'];
        for (const attr of lazyAttrs) {
            const value = element.getAttribute(attr);
            if (value) {
                result.lazyAttr = attr;
                result.realSrc = value;
                result.suggestion = `检测到懒加载属性 ${attr}，建议抓取该属性而不是 src`;
                result.extractionCode = `element.getAttribute('${attr}')`;
                break;
            }
        }

        // 如果没有找到懒加载属性，检查普通 src
        if (!result.realSrc) {
            const src = element.getAttribute('src');
            if (src && !src.startsWith('data:image')) {
                result.realSrc = src;
                result.suggestion = '使用标准 src 属性';
                result.extractionCode = `element.getAttribute('src')`;
            }
        }

        return result;
    }

    // ==================== 可视化界面（使用 Shadow DOM 隔离）====================
    let selectedElement = null;
    let isSelecting = false;
    let highlightBox = null;
    let verifyHighlights = []; // 存储序号标签 DOM
    let verifiedElements = []; // 存储被高亮的元素及其原始样式
    let isPanelOpen = false;

    // ==================== 统一事件处理函数（兼容鼠标和触摸）====================
    // 统一获取事件坐标（兼容鼠标和触摸）
    function getEventCoords(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    // 统一获取结束事件坐标（兼容鼠标和触摸）
    function getEndEventCoords(e) {
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    // 创建 Shadow DOM 容器
    const shadowHost = document.createElement('div');
    shadowHost.id = 'ultimate-selector-host';
    shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none; overflow: visible;';
    document.body.appendChild(shadowHost);

    // 附加 Shadow DOM（使用 open 模式便于调试）
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    // 在 Shadow DOM 中添加样式
    const style = document.createElement('style');
    style.textContent = `
        /* ========== 主题变量 ========== */
        :host {
            --primary-start: #8E2DE2;
            --primary-end: #4A00E0;
            --primary-gradient: linear-gradient(90deg, var(--primary-start), var(--primary-end));
            --primary-soft: rgba(142, 45, 226, 0.08);
            --primary-border: rgba(142, 45, 226, 0.18);
            --text-primary: #1a1a2e;
            --text-secondary: #555;
            --text-muted: #999;
            --surface: #ffffff;
            --surface-alt: #f8f7fc;
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 14px;
            --shadow-sm: 0 2px 8px rgba(74, 0, 224, 0.10);
            --shadow-md: 0 8px 24px rgba(74, 0, 224, 0.15);
            --shadow-lg: 0 12px 36px rgba(74, 0, 224, 0.22);
        }

        /* ========== 胶囊挂件 ========== */
        #capsule-widget {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 0 18px;
            height: 38px;
            border-radius: 19px;
            background: var(--primary-gradient);
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
            display: flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            box-shadow: var(--shadow-md);
            z-index: 2147483647;
            user-select: none;
            transition: box-shadow 0.25s, transform 0.25s;
            will-change: transform;
            touch-action: none;
            pointer-events: auto !important;
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
        }

        #capsule-widget:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }

        /* ========== 面板容器 ========== */
        #selector-panel {
            position: fixed;
            top: 50px;
            right: 50px;
            width: 90vw;
            max-width: 420px;
            height: 80vh;
            max-height: 560px;
            background: var(--surface);
            border: none;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: none;
            overflow: hidden;
            box-sizing: border-box;
            pointer-events: auto !important;
            flex-direction: column;
        }

        /* ========== 顶部栏 ========== */
        #selector-header {
            background: var(--primary-gradient);
            height: 42px;
            min-height: 42px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 14px;
            color: #fff;
            border-radius: var(--radius-md) var(--radius-md) 0 0;
            cursor: move;
            user-select: none;
            position: relative;
            z-index: 1;
            touch-action: none;
            flex-shrink: 0;
        }

        #selector-header .header-title {
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* ========== 顶部按钮组 ========== */
        #header-actions {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        .header-btn {
            padding: 3px 9px;
            height: 26px;
            background: rgba(255,255,255,0.15);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.22);
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            gap: 3px;
            transition: background 0.2s, border-color 0.2s;
            white-space: nowrap;
        }

        .header-btn:hover {
            background: rgba(255,255,255,0.28);
            border-color: rgba(255,255,255,0.4);
        }

        .header-btn.close {
            background: rgba(255, 71, 87, 0.75);
            border-color: rgba(255, 71, 87, 0.5);
        }

        .header-btn.close:hover {
            background: rgba(255, 71, 87, 0.95);
        }

        /* ========== 内容区 ========== */
        #selector-panel .panel-body {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 14px;
            background: var(--surface);
        }

        /* 自定义滚动条 */
        #selector-panel .panel-body::-webkit-scrollbar {
            width: 5px;
        }
        #selector-panel .panel-body::-webkit-scrollbar-track {
            background: transparent;
        }
        #selector-panel .panel-body::-webkit-scrollbar-thumb {
            background: var(--primary-border);
            border-radius: 3px;
        }

        /* ========== 高亮框 ========== */
        .highlight-box {
            position: absolute;
            border: 2px solid var(--primary-start);
            background: var(--primary-soft);
            pointer-events: none;
            z-index: 999998;
            display: none;
        }

        .verify-highlight {
            position: absolute;
            border: 2px solid #ff5722;
            background: rgba(255, 87, 34, 0.15);
            pointer-events: none;
            z-index: 999997;
            box-sizing: border-box;
        }

        .verify-label {
            position: absolute;
            top: -20px;
            left: 0;
            background: #ff5722;
            color: white;
            padding: 2px 6px;
            font-size: 11px;
            border-radius: 3px;
            font-family: inherit;
        }

        /* ========== 移动端适配 ========== */
        @media (max-width: 768px) {
            #capsule-widget {
                padding: 0 22px !important;
                height: 42px !important;
                font-size: 15px !important;
            }

            #selector-panel {
                width: 95vw !important;
                max-width: none !important;
                height: 88vh !important;
                max-height: none !important;
                right: 2.5vw !important;
                left: 2.5vw !important;
                top: 6vh !important;
                border-radius: var(--radius-lg) !important;
            }

            #selector-header {
                height: 46px;
                min-height: 46px;
                padding: 0 12px;
            }

            .header-btn {
                height: 30px;
                padding: 3px 10px;
                font-size: 12px;
            }
        }
    `;
    shadowRoot.appendChild(style);

    // 创建胶囊挂件
    const capsuleWidget = document.createElement('div');
    capsuleWidget.id = 'capsule-widget';
    capsuleWidget.innerHTML = '🤖 终极助手';
    shadowRoot.appendChild(capsuleWidget);

    // 悬停效果
    capsuleWidget.addEventListener('mouseenter', () => {
        if (!isDraggingWidget) {
            capsuleWidget.style.transition = 'transform 0.2s';
            capsuleWidget.style.transform = `translate(${widgetXOffset}px, ${widgetYOffset}px) scale(1.05)`;
        }
    });
    capsuleWidget.addEventListener('mouseleave', () => {
        if (!isDraggingWidget) {
            capsuleWidget.style.transition = 'transform 0.2s';
            capsuleWidget.style.transform = `translate(${widgetXOffset}px, ${widgetYOffset}px) scale(1)`;
        }
    });

    // 创建悬浮面板
    const panel = document.createElement('div');
    panel.innerHTML = `
        <div id="selector-panel">
            <div id="selector-header">
                <span class="header-title">🎯 终极选择器引擎</span>
                <div id="header-actions">
                    <button id="select-element-btn" class="header-btn" title="选取元素">🎯 选取</button>
                    <button id="minimize-panel-btn" class="header-btn" title="最小化面板">➖</button>
                    <button id="scroll-trigger-btn" class="header-btn" title="滚动到底部触发懒加载">📜 加载</button>
                    <button id="close-panel-btn" class="header-btn close" title="关闭面板">✕</button>
                </div>
            </div>
            <div class="panel-body">
                <div id="selector-results">
                    <div style="text-align: center; padding: 36px 20px; color: #666;">
                        <div style="font-size: 44px; margin-bottom: 18px;">👋</div>
                        <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary, #1a1a2e);">欢迎使用终极选择器</div>
                        <div style="font-size: 13px; line-height: 1.7; color: var(--text-secondary, #555);">
                            <p style="margin: 4px 0;">目前尚未选择任何元素。</p>
                            <p style="margin: 4px 0;">请点击顶部工具栏的 <span style="background: linear-gradient(90deg, #8E2DE2, #4A00E0); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">🎯 选取</span> 按钮</p>
                            <p style="margin: 4px 0;">然后在页面上点击您想要分析的目标。</p>
                        </div>
                        <div style="margin-top: 28px; padding: 14px; background: rgba(142, 45, 226, 0.04); border-radius: 8px; border: 1px dashed rgba(142, 45, 226, 0.2); font-size: 12px; color: #777; text-align: left;">
                            <strong style="color: #8E2DE2;">✨ 功能提示</strong>
                            <ul style="margin: 6px 0 0 18px; padding: 0; line-height: 1.8;">
                                <li>支持生成 CSS / XPath 选择器</li>
                                <li>自动识别列表并进行泛化</li>
                                <li>网络嗅探雷达可抓取媒体链接</li>
                                <li>支持 Playwright / Selenium 代码生成</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    shadowRoot.appendChild(panel);

    // 创建高亮框（放在 Shadow DOM 外部，因为需要覆盖页面元素）
    highlightBox = document.createElement('div');
    highlightBox.className = 'ultimate-selector-highlight';
    highlightBox.style.cssText = 'position: absolute; border: 2px solid #8E2DE2; background: rgba(142, 45, 226, 0.08); pointer-events: none; z-index: 999998; display: none;';
    document.body.appendChild(highlightBox);

    // 获取面板和头部元素的引用（用于后续操作）
    const panelElement = shadowRoot.getElementById('selector-panel');
    const header = shadowRoot.getElementById('selector-header');
    const selectElementBtn = shadowRoot.getElementById('select-element-btn');
    const minimizePanelBtn = shadowRoot.getElementById('minimize-panel-btn');
    const scrollTriggerBtn = shadowRoot.getElementById('scroll-trigger-btn');
    const closePanelBtn = shadowRoot.getElementById('close-panel-btn');

    // 关闭面板按钮事件
    closePanelBtn.addEventListener('click', () => {
        panelElement.style.display = 'none';
        capsuleWidget.style.display = 'flex';
        isPanelOpen = false;
        isSelecting = false;
        capsuleWidget.innerHTML = '🤖 终极助手';
        capsuleWidget.style.background = 'linear-gradient(90deg, #8E2DE2, #4A00E0)';
        document.body.style.cursor = 'default';
        highlightBox.style.display = 'none';
    });

    // 选取元素按钮事件
    selectElementBtn.addEventListener('click', () => {
        isSelecting = !isSelecting;
        if (isSelecting) {
            capsuleWidget.style.display = 'flex';
            capsuleWidget.innerHTML = '⏸️';
            capsuleWidget.style.background = 'linear-gradient(90deg, #f44336, #e91e63)';
            document.body.style.cursor = 'crosshair';
            isPanelOpen = false;
            panelElement.style.display = 'none';
        } else {
            capsuleWidget.innerHTML = '🤖 终极助手';
            capsuleWidget.style.background = 'linear-gradient(90deg, #8E2DE2, #4A00E0)';
            document.body.style.cursor = 'default';
            highlightBox.style.display = 'none';
        }
    });

    // 最小化面板按钮事件
    minimizePanelBtn.addEventListener('click', () => {
        panelElement.style.display = 'none';
        capsuleWidget.style.display = 'flex';
        isPanelOpen = false;
    });

    // 滚动触发按钮事件
    scrollTriggerBtn.addEventListener('click', () => {
        const originalText = scrollTriggerBtn.textContent;
        scrollTriggerBtn.textContent = '⏳ 滚动中...';
        scrollTriggerBtn.disabled = true;

        // 平滑滚动到页面底部
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });

        // 等待滚动完成后恢复按钮状态
        setTimeout(() => {
            scrollTriggerBtn.textContent = '✅ 已触发';
            setTimeout(() => {
                scrollTriggerBtn.textContent = originalText;
                scrollTriggerBtn.disabled = false;
            }, 1500);
        }, 2000);
    });

    // 拖拽胶囊挂件（兼容鼠标和触摸）
    let isDraggingWidget = false;
    let widgetCurrentX, widgetCurrentY, widgetInitialX, widgetInitialY;
    let widgetXOffset = 0, widgetYOffset = 0;
    let widgetMouseDownTime = 0;
    let widgetHasMoved = false;
    let widgetStartX = 0, widgetStartY = 0; // 记录拖拽真实起点

    // 统一的拖拽开始处理
    function handleWidgetDragStart(e) {
        if (e.button !== undefined && e.button !== 0) return; // 只处理左键（鼠标）
        if (e.type === 'touchstart') e.preventDefault(); // 防止触摸滚动

        const coords = getEventCoords(e);
        widgetMouseDownTime = Date.now();
        widgetHasMoved = false;
        widgetStartX = coords.x; // 记录真实鼠标起点
        widgetStartY = coords.y;
        widgetInitialX = coords.x - widgetXOffset;
        widgetInitialY = coords.y - widgetYOffset;
        isDraggingWidget = true;
    }

    // 统一的拖拽移动处理
    function handleWidgetDragMove(e) {
        if (!isDraggingWidget) return;
        if (e.type === 'touchmove') e.preventDefault(); // 防止触摸滚动

        capsuleWidget.style.transition = 'none';

        const coords = getEventCoords(e);
        let newX = coords.x - widgetInitialX;
        let newY = coords.y - widgetInitialY;

        // 获取挂件尺寸和视口尺寸
        const widgetWidth = 120;
        const widgetHeight = 36;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 计算挂件当前的绝对位置（考虑 top/right 定位）
        const widgetRect = capsuleWidget.getBoundingClientRect();
        const currentLeft = widgetRect.left;
        const currentTop = widgetRect.top;

        // 计算目标位置
        const targetLeft = currentLeft + (newX - widgetXOffset);
        const targetTop = currentTop + (newY - widgetYOffset);

        // 边界限制：确保挂件至少有 10px 在视口内
        const minVisible = 10;
        const maxX = viewportWidth - minVisible;
        const maxY = viewportHeight - minVisible;
        const minX = -(widgetWidth - minVisible);
        const minY = -(widgetHeight - minVisible);

        // 限制在边界内
        if (targetLeft < minX) newX = widgetXOffset + (minX - currentLeft);
        if (targetLeft > maxX) newX = widgetXOffset + (maxX - currentLeft);
        if (targetTop < minY) newY = widgetYOffset + (minY - currentTop);
        if (targetTop > maxY) newY = widgetYOffset + (maxY - currentTop);

        // 如果移动超过3px，认为是拖拽（与真实起点比较）
        if (Math.abs(coords.x - widgetStartX) > 3 || Math.abs(coords.y - widgetStartY) > 3) {
            widgetHasMoved = true;
        }

        widgetCurrentX = newX;
        widgetCurrentY = newY;
        widgetXOffset = newX;
        widgetYOffset = newY;
        capsuleWidget.style.transform = `translate(${newX}px, ${newY}px)`;
    }

    // 统一的拖拽结束处理
    function handleWidgetDragEnd(e) {
        if (!isDraggingWidget) return;
        isDraggingWidget = false;

        // 如果没有移动且按下时间短，认为是点击
        if (!widgetHasMoved && (Date.now() - widgetMouseDownTime) < 300) {
            // 点击展开面板
            panelElement.style.display = 'flex';
            isPanelOpen = true;

            // 强制面板位置重置为屏幕右上角（防止依赖已隐藏的挂件坐标）
            panelElement.style.top = '50px';
            panelElement.style.right = '50px';
            panelElement.style.left = 'auto';
            panelElement.style.transform = 'translate(0px, 0px)';

            // 清零面板拖拽偏移量
            xOffset = 0;
            yOffset = 0;
        } else {
            widgetInitialX = widgetCurrentX;
            widgetInitialY = widgetCurrentY;
        }
    }

    // 绑定鼠标事件
    capsuleWidget.addEventListener('mousedown', handleWidgetDragStart);
    document.addEventListener('mousemove', handleWidgetDragMove);
    document.addEventListener('mouseup', handleWidgetDragEnd);

    // 绑定触摸事件
    capsuleWidget.addEventListener('touchstart', handleWidgetDragStart, { passive: false });
    document.addEventListener('touchmove', handleWidgetDragMove, { passive: false });
    document.addEventListener('touchend', handleWidgetDragEnd, { passive: false });

    // 禁用右键菜单
    capsuleWidget.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // 拖拽面板（兼容鼠标和触摸）
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0, yOffset = 0;

    function dragStart(e) {
        if (isResizing) return; // 如果正在调整大小，不处理拖拽
        if (e.type === 'touchstart') e.preventDefault();

        const coords = getEventCoords(e);
        initialX = coords.x - xOffset;
        initialY = coords.y - yOffset;
        isDragging = true;
    }

    function drag(e) {
        if (isDragging && !isResizing) {
            if (e.type === 'touchmove') e.preventDefault();

            const coords = getEventCoords(e);
            currentX = coords.x - initialX;
            currentY = coords.y - initialY;
            xOffset = currentX;
            yOffset = currentY;
            panelElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }

    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    // 绑定鼠标事件
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // 绑定触摸事件
    header.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd, { passive: false });

    // 调整面板大小 - 通过边框
    let isResizing = false;
    let resizeType = null; // 'right', 'bottom', 'corner'
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;

    const borderSize = 4; // 边框宽度
    const resizeZone = 8; // 可调整大小的区域宽度

    // 检测鼠标是否在可调整大小的区域
    function getResizeType(e) {
        const rect = panelElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;

        const onRightEdge = x >= width - resizeZone && x <= width;
        const onBottomEdge = y >= height - resizeZone && y <= height;
        const onLeftEdge = x >= 0 && x <= resizeZone;
        const onTopEdge = y >= 0 && y <= resizeZone;

        if (onRightEdge && onBottomEdge) return 'se'; // 右下角
        if (onLeftEdge && onBottomEdge) return 'sw'; // 左下角
        if (onRightEdge && onTopEdge) return 'ne'; // 右上角
        if (onLeftEdge && onTopEdge) return 'nw'; // 左上角
        if (onRightEdge) return 'e'; // 右边
        if (onBottomEdge) return 's'; // 下边
        if (onLeftEdge) return 'w'; // 左边
        if (onTopEdge) return 'n'; // 上边

        return null;
    }

    // 更新鼠标光标
    function updateCursor(type) {
        if (!type) {
            panelElement.style.cursor = '';
            return;
        }

        const cursors = {
            'n': 'ns-resize',
            's': 'ns-resize',
            'e': 'ew-resize',
            'w': 'ew-resize',
            'ne': 'nesw-resize',
            'sw': 'nesw-resize',
            'nw': 'nwse-resize',
            'se': 'nwse-resize'
        };

        panelElement.style.cursor = cursors[type] || '';
    }

    // 鼠标移动事件 - 更新光标
    panelElement.addEventListener('mousemove', (e) => {
        if (isResizing || isDragging) return;

        const type = getResizeType(e);
        updateCursor(type);
    });

    panelElement.addEventListener('mouseleave', () => {
        if (!isResizing) {
            panelElement.style.cursor = '';
        }
    });

    // 鼠标按下 - 开始调整大小
    panelElement.addEventListener('mousedown', (e) => {
        const type = getResizeType(e);
        if (type && e.target === panelElement) {
            e.preventDefault();
            e.stopPropagation();

            isResizing = true;
            resizeType = type;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;

            const rect = panelElement.getBoundingClientRect();
            resizeStartWidth = rect.width;
            resizeStartHeight = rect.height;

            // 记录初始位置（用于左边和上边的调整）
            const computedStyle = window.getComputedStyle(panelElement);
            const currentLeft = parseFloat(computedStyle.left) || rect.left;
            const currentTop = parseFloat(computedStyle.top) || rect.top;

            panelElement.dataset.resizeStartLeft = currentLeft;
            panelElement.dataset.resizeStartTop = currentTop;
        }
    });

    // 全局鼠标移动 - 执行调整大小
    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            e.preventDefault();

            const deltaX = e.clientX - resizeStartX;
            const deltaY = e.clientY - resizeStartY;

            const startLeft = parseFloat(panelElement.dataset.resizeStartLeft);
            const startTop = parseFloat(panelElement.dataset.resizeStartTop);

            // 根据调整类型更新尺寸和位置
            if (resizeType.includes('e')) { // 右边
                const newWidth = Math.max(300, resizeStartWidth + deltaX);
                panelElement.style.width = newWidth + 'px';
            }

            if (resizeType.includes('w')) { // 左边
                const newWidth = Math.max(300, resizeStartWidth - deltaX);
                if (newWidth > 300) {
                    panelElement.style.width = newWidth + 'px';
                    panelElement.style.left = (startLeft + deltaX) + 'px';
                }
            }

            if (resizeType.includes('s')) { // 下边
                const newHeight = Math.max(200, resizeStartHeight + deltaY);
                panelElement.style.height = newHeight + 'px';
            }

            if (resizeType.includes('n')) { // 上边
                const newHeight = Math.max(200, resizeStartHeight - deltaY);
                if (newHeight > 200) {
                    panelElement.style.height = newHeight + 'px';
                    panelElement.style.top = (startTop + deltaY) + 'px';
                }
            }
        }
    });

    // 全局鼠标释放 - 结束调整大小
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeType = null;
            panelElement.style.cursor = '';
        }
    });

    // 创建高亮框
    highlightBox = document.createElement('div');
    highlightBox.style.cssText = 'position: absolute; border: 2px solid #8E2DE2; background: rgba(142, 45, 226, 0.08); pointer-events: none; z-index: 999998; display: none;';
    document.body.appendChild(highlightBox);

    // 清除验证高亮（恢复元素原始样式 + 删除序号标签）
    function clearVerifyHighlights() {
        // 1. 删除序号标签 DOM
        verifyHighlights.forEach(el => el.remove());
        verifyHighlights = [];

        // 2. 恢复元素原始样式
        verifiedElements.forEach(item => {
            item.element.style.outline = item.originalOutline;
            item.element.style.backgroundColor = item.originalBgColor;
        });
        verifiedElements = [];
    }

    // 代码生成函数：根据框架、模式、选择器类型生成对应的爬虫代码
    function generateCode(framework, mode, selectorType, selector) {
        // 转义选择器中的特殊字符（用于代码字符串）
        const escapedSelector = JSON.stringify(selector).slice(1, -1);

        if (framework === 'playwright') {
            if (mode === 'single') {
                if (selectorType === 'xpath') {
                    return `# Python Playwright - 单点定位 (XPath)
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto('https://example.com')

    # 定位元素
    element = page.locator("xpath=${escapedSelector}")

    # 提取文本
    text = element.first.text_content()
    print(f"提取的文本: {text}")

    # 或者点击元素
    # element.first.click()

    browser.close()`;
                } else {
                    return `# Python Playwright - 单点定位 (CSS)
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto('https://example.com')

    # 定位元素
    element = page.locator("${escapedSelector}")

    # 提取文本
    text = element.first.text_content()
    print(f"提取的文本: {text}")

    # 或者点击元素
    # element.first.click()

    browser.close()`;
                }
            } else {
                // list mode
                if (selectorType === 'xpath') {
                    return `# Python Playwright - 列表泛化 (XPath)
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto('https://example.com')

    # 定位所有元素
    elements = page.locator("xpath=${escapedSelector}").all()

    # 遍历提取
    for i, element in enumerate(elements):
        text = element.text_content()
        print(f"元素 {i+1}: {text}")

    browser.close()`;
                } else {
                    return `# Python Playwright - 列表泛化 (CSS)
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto('https://example.com')

    # 定位所有元素
    elements = page.locator("${escapedSelector}").all()

    # 遍历提取
    for i, element in enumerate(elements):
        text = element.text_content()
        print(f"元素 {i+1}: {text}")

    browser.close()`;
                }
            }
        } else if (framework === 'selenium') {
            if (mode === 'single') {
                if (selectorType === 'xpath') {
                    return `# Python Selenium - 单点定位 (XPath)
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get('https://example.com')

# 定位元素
element = driver.find_element(By.XPATH, "${escapedSelector}")

# 提取文本
text = element.text
print(f"提取的文本: {text}")

# 或者点击元素
# element.click()

driver.quit()`;
                } else {
                    return `# Python Selenium - 单点定位 (CSS)
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get('https://example.com')

# 定位元素
element = driver.find_element(By.CSS_SELECTOR, "${escapedSelector}")

# 提取文本
text = element.text
print(f"提取的文本: {text}")

# 或者点击元素
# element.click()

driver.quit()`;
                }
            } else {
                // list mode
                if (selectorType === 'xpath') {
                    return `# Python Selenium - 列表泛化 (XPath)
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get('https://example.com')

# 定位所有元素
elements = driver.find_elements(By.XPATH, "${escapedSelector}")

# 遍历提取
for i, element in enumerate(elements):
    text = element.text
    print(f"元素 {i+1}: {text}")

driver.quit()`;
                } else {
                    return `# Python Selenium - 列表泛化 (CSS)
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get('https://example.com')

# 定位所有元素
elements = driver.find_elements(By.CSS_SELECTOR, "${escapedSelector}")

# 遍历提取
for i, element in enumerate(elements):
    text = element.text
    print(f"元素 {i+1}: {text}")

driver.quit()`;
                }
            }
        } else if (framework === 'puppeteer') {
            if (mode === 'single') {
                if (selectorType === 'xpath') {
                    return `// Node.js Puppeteer - 单点定位 (XPath)
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://example.com');

    // 定位元素 (XPath)
    const [element] = await page.$x("${escapedSelector}");

    // 提取文本
    const text = await page.evaluate(el => el.textContent, element);
    console.log(\`提取的文本: \${text}\`);

    // 或者点击元素
    // await element.click();

    await browser.close();
})();`;
                } else {
                    return `// Node.js Puppeteer - 单点定位 (CSS)
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://example.com');

    // 定位元素
    const element = await page.$("${escapedSelector}");

    // 提取文本
    const text = await page.evaluate(el => el.textContent, element);
    console.log(\`提取的文本: \${text}\`);

    // 或者点击元素
    // await element.click();

    await browser.close();
})();`;
                }
            } else {
                // list mode
                if (selectorType === 'xpath') {
                    return `// Node.js Puppeteer - 列表泛化 (XPath)
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://example.com');

    // 定位所有元素 (XPath)
    const elements = await page.$x("${escapedSelector}");

    // 遍历提取
    for (let i = 0; i < elements.length; i++) {
        const text = await page.evaluate(el => el.textContent, elements[i]);
        console.log(\`元素 \${i+1}: \${text}\`);
    }

    await browser.close();
})();`;
                } else {
                    return `// Node.js Puppeteer - 列表泛化 (CSS)
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://example.com');

    // 定位所有元素
    const elements = await page.$$("${escapedSelector}");

    // 遍历提取
    for (let i = 0; i < elements.length; i++) {
        const text = await page.evaluate(el => el.textContent, elements[i]);
        console.log(\`元素 \${i+1}: \${text}\`);
    }

    await browser.close();
})();`;
                }
            }
        }
    }

    // 验证选择器（使用原生样式注入，防止错位）
    function verifySelector(selector, type) {
        clearVerifyHighlights();
        let elements = [];

        try {
            if (type === 'css') {
                elements = Array.from(document.querySelectorAll(selector));
            } else if (type === 'xpath') {
                const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (let i = 0; i < result.snapshotLength; i++) {
                    elements.push(result.snapshotItem(i));
                }
            }

            elements.forEach((el, index) => {
                // 排除 Shadow DOM 容器本身
                if (el === shadowHost || shadowHost.contains(el)) {
                    return;
                }

                // 保存原始样式
                const originalOutline = el.style.outline;
                const originalBgColor = el.style.backgroundColor;

                // 直接修改元素本身的样式（原生跟随，不会错位）
                el.style.outline = '3px solid #ff5722';
                el.style.backgroundColor = 'rgba(255, 87, 34, 0.1)';

                // 记录元素和原始样式，用于后续恢复
                verifiedElements.push({
                    element: el,
                    originalOutline: originalOutline,
                    originalBgColor: originalBgColor
                });

                // 创建序号标签（绝对定位，但会在 resize/scroll 时自动清除）
                const rect = el.getBoundingClientRect();
                const label = document.createElement('div');
                label.className = 'ultimate-selector-verify-label';
                label.style.cssText = `
                    position: absolute;
                    left: ${rect.left + window.scrollX}px;
                    top: ${rect.top + window.scrollY - 20}px;
                    background: #ff5722;
                    color: white;
                    padding: 2px 6px;
                    font-size: 11px;
                    border-radius: 3px;
                    font-family: Arial, sans-serif;
                    z-index: 999997;
                    pointer-events: none;
                `;
                label.textContent = `#${index + 1}`;

                document.body.appendChild(label);
                verifyHighlights.push(label);
            });

            return elements.length;
        } catch (e) {
            return 0;
        }
    }

    // 动态更新序号标签的位置，而不是粗暴地清除它们
    function updateVerifyLabels() {
        if (verifiedElements.length === 0 || verifyHighlights.length === 0) return;

        verifiedElements.forEach((item, index) => {
            const el = item.element;
            const label = verifyHighlights[index];
            if (el && label) {
                const rect = el.getBoundingClientRect();
                // 动态重新计算绝对定位坐标
                label.style.left = (rect.left + window.scrollX) + 'px';
                label.style.top = (rect.top + window.scrollY - 20) + 'px';
            }
        });
    }

    // 监听窗口 resize 和滚动事件，使用 requestAnimationFrame 保证丝滑跟随不卡顿
    window.addEventListener('resize', () => requestAnimationFrame(updateVerifyLabels));
    window.addEventListener('scroll', () => requestAnimationFrame(updateVerifyLabels), true);

    // 鼠标移动高亮元素（排除 Shadow DOM 容器）
    document.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        const target = e.target;
        // 排除面板、高亮框和 Shadow DOM 容器
        if (target === shadowHost || target === highlightBox) return;

        const rect = target.getBoundingClientRect();
        highlightBox.style.display = 'block';
        highlightBox.style.left = rect.left + window.scrollX + 'px';
        highlightBox.style.top = rect.top + window.scrollY + 'px';
        highlightBox.style.width = rect.width + 'px';
        highlightBox.style.height = rect.height + 'px';
    });

    // 触摸高亮元素（移动端）
    document.addEventListener('touchstart', (e) => {
        if (!isSelecting) return;
        e.preventDefault(); // 防止页面滚动和默认行为

        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);

        if (target && target !== shadowHost && target !== highlightBox) {
            const rect = target.getBoundingClientRect();
            highlightBox.style.display = 'block';
            highlightBox.style.left = rect.left + window.scrollX + 'px';
            highlightBox.style.top = rect.top + window.scrollY + 'px';
            highlightBox.style.width = rect.width + 'px';
            highlightBox.style.height = rect.height + 'px';
        }
    }, { passive: false });

    // 点击选择元素（PC端 - 排除 Shadow DOM 容器）
    document.addEventListener('click', (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        e.stopPropagation();

        const target = e.target;
        // 排除 Shadow DOM 容器和高亮框
        if (target === shadowHost || target === highlightBox) return;

        handleElementSelection(target);
    }, true);

    // 触摸选择元素（移动端）
    document.addEventListener('touchend', (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        e.stopPropagation();

        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);

        if (target && target !== shadowHost && target !== highlightBox) {
            handleElementSelection(target);
        }
    }, { passive: false });

    // ==================== 面包屑导航功能 ====================
    /**
     * 构建 DOM 层级面包屑
     * @param {Element} element - 目标元素
     * @returns {Array} 面包屑数组,每项包含 {element, label}
     */
    function buildBreadcrumbs(element) {
        const breadcrumbs = [];
        let current = element;
        let level = 0;
        const maxLevel = 6;

        while (current && current !== document.body && level < maxLevel) {
            const tagName = current.tagName.toLowerCase();
            let label = tagName;

            // 添加 ID
            if (current.id && isValidId(current.id)) {
                label += `#${current.id}`;
            }
            // 或添加第一个有效的 class
            else if (current.classList && current.classList.length > 0) {
                const validClass = Array.from(current.classList).find(cls =>
                    !isRandomClassName(cls) && !isUtilityClassName(cls)
                );
                if (validClass) {
                    label += `.${validClass}`;
                }
            }

            breadcrumbs.unshift({ element: current, label });
            current = current.parentElement;
            level++;
        }

        return breadcrumbs;
    }

    // ==================== 数据预览功能 ====================
    /**
     * 生成列表泛化的数据预览
     * @param {string} selector - 选择器
     * @param {string} type - 类型 ('css' 或 'xpath')
     * @returns {string} HTML 字符串
     */
    function generateDataPreview(selector, type) {
        let elements = [];

        try {
            if (type === 'css') {
                elements = Array.from(document.querySelectorAll(selector)).slice(0, 3);
            } else if (type === 'xpath') {
                const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                const count = Math.min(3, result.snapshotLength);
                for (let i = 0; i < count; i++) {
                    elements.push(result.snapshotItem(i));
                }
            }
        } catch (e) {
            return `<div style="padding: 10px; background: #ffebee; border-radius: 4px; color: #c62828; font-size: 11px;">❌ 选择器查询失败</div>`;
        }

        if (elements.length === 0) {
            return `<div style="padding: 10px; background: #fff3e0; border-radius: 4px; color: #e65100; font-size: 11px;">⚠️ 未匹配到任何元素</div>`;
        }

        let previewHtml = '';
        elements.forEach((el, index) => {
            // 提取文本（限制30字符）
            let text = el.innerText || el.textContent || '';
            text = text.trim().replace(/\s+/g, ' ');
            if (text.length > 30) {
                text = text.substring(0, 30) + '...';
            }
            if (!text) {
                text = '(无文本)';
            }

            // 提取链接
            let href = '';
            if (el.tagName.toLowerCase() === 'a') {
                href = el.getAttribute('href') || '';
            } else {
                const link = el.querySelector('a');
                if (link) {
                    href = link.getAttribute('href') || '';
                }
            }

            previewHtml += `
                <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #8E2DE2;">
                    <div style="font-size: 10px; color: #999; margin-bottom: 4px;">项目 ${index + 1}</div>
                    <div style="font-size: 11px; color: #333; margin-bottom: 4px;">📝 ${text}</div>
                    ${href ? `<div style="font-size: 10px; color: #8E2DE2; word-break: break-all;">🔗 ${href}</div>` : ''}
                </div>
            `;
        });

        return `
            <div style="margin-top: 12px; padding: 10px; background: #f5f5f5; border-radius: 4px; border: 1px solid #e0e0e0;">
                <div style="font-size: 11px; color: #666; margin-bottom: 8px; font-weight: bold;">👁️ 数据抓取预览 (前 ${elements.length} 项)</div>
                ${previewHtml}
            </div>
        `;
    }

    // ==================== 嗅探雷达渲染函数 ====================
    /**
     * 渲染嗅探雷达内容（占位函数，防止报错）
     */
    function renderSnifferContent() {
        const snifferContent = shadowRoot.getElementById('sniffer-content');
        if (!snifferContent) return;

        if (window.sniffedMediaUrls && window.sniffedMediaUrls.length === 0) {
            snifferContent.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📡</div>
                    <div style="font-size: 14px; margin-bottom: 8px; color: #666;">正在监听网络请求...</div>
                    <div style="font-size: 12px; color: #999;">请尝试播放视频或触发媒体加载</div>
                </div>
            `;
        } else if (window.sniffedMediaUrls && window.sniffedMediaUrls.length > 0) {
            let listHtml = '';
            window.sniffedMediaUrls.forEach((item) => {
                const typeColor = {
                    'M3U8': '#ff5722',
                    'MP4': '#2196f3',
                    'FLV': '#9c27b0',
                    'TS': '#ff9800',
                    'API': '#8E2DE2',
                    'MPD': '#e91e63'
                }[item.mediaType] || '#666';

                listHtml += `
                    <div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 4px; border-left: 4px solid ${typeColor};">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="background: ${typeColor}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px;">${item.mediaType}</span>
                            <span style="font-size: 10px; color: #999;">${item.timestamp}</span>
                        </div>
                        <code class="copyable-code" data-selector="${item.url.replace(/"/g, '&quot;')}" style="display: block; background: #f5f5f5; padding: 8px; border-radius: 3px; font-size: 11px; word-break: break-all; color: #333; cursor: pointer;">${item.url}</code>
                        <div style="font-size: 10px; color: #888; margin-top: 6px;">点击复制链接</div>
                    </div>
                `;
            });

            snifferContent.innerHTML = `
                <div style="margin-bottom: 12px; padding: 10px; background: #fff3e0; border-radius: 4px;">
                    <div style="font-size: 12px; color: #e65100; font-weight: bold;">🎉 已拦截 ${window.sniffedMediaUrls.length} 个媒体请求</div>
                </div>
                ${listHtml}
                <button id="clear-sniffer" style="width: 100%; padding: 8px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️ 清空列表</button>
            `;
        }
    }

    // 暴露刷新函数到全局，供 Hook 调用
    window.refreshSnifferTab = function() {
        const snifferTab = shadowRoot.querySelector('.tab-btn[data-tab="sniffer"]');
        if (snifferTab && snifferTab.classList.contains('active')) {
            renderSnifferContent();
        }
    };

    // ==================== 核心渲染函数（重构后）====================
    /**
     * 渲染选择器面板
     * @param {Element} targetElement - 目标 DOM 元素
     */
    function renderSelectorPanel(targetElement) {
        selectedElement = targetElement;

        // 显示面板，隐藏挂件（互斥）
        isPanelOpen = true;
        panelElement.style.display = 'flex';
        capsuleWidget.style.display = 'none';

        // 加载保存的设置（直接注入 HTML value 属性，无需 setTimeout 回填）
        const savedApiKey = GM_getValue('ai_api_key', '');
        const savedBaseUrl = GM_getValue('ai_base_url', 'https://api.openai.com/v1');
        const savedModel = GM_getValue('ai_model', 'gpt-3.5-turbo');

        // 生成选择器
        const engine = new UltimateSelectorEngine();
        const singleResult = engine.getBestSelector(selectedElement);
        const listResult = engine.getSimilarElementsDetailed(selectedElement);

        // 构建面包屑
        const breadcrumbs = buildBreadcrumbs(selectedElement);
        let breadcrumbsHtml = '';
        if (breadcrumbs.length > 0) {
            breadcrumbsHtml = `
                <div style="margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, rgba(142,45,226,0.05) 0%, rgba(74,0,224,0.03) 100%); border-radius: 8px; border: 1px solid rgba(142,45,226,0.15);">
                    <div style="font-size: 11px; color: #8E2DE2; margin-bottom: 6px; font-weight: bold;">🧭 DOM 层级导航</div>
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 11px;">
                        ${breadcrumbs.map((item, index) => {
                            const isLast = index === breadcrumbs.length - 1;
                            const style = isLast
                                ? 'background: #8E2DE2; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: default;'
                                : 'background: white; color: #4A00E0; padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 1px solid rgba(142,45,226,0.2);';
                            return `
                                <span class="breadcrumb-item" data-element-index="${index}" style="${style}">${item.label}</span>
                                ${!isLast ? '<span style="color: #bbb; margin: 0 2px;">›</span>' : ''}
                            `;
                        }).join('')}
                    </div>
                    <div style="font-size: 10px; color: #888; margin-top: 6px;">💡 点击祖先节点可切换目标元素</div>
                </div>
            `;
        }

        // 生成数据预览
        const dataPreview = generateDataPreview(listResult.best.selector, listResult.best.type);

        // 分析图片元素（如果是图片）
        const imageAnalysis = analyzeImageElement(selectedElement);

        // 构建抓取建议模块的 HTML
        let extractionHtml = '';
        if (imageAnalysis.isImage && imageAnalysis.realSrc) {
            extractionHtml = `
                <div style="margin-bottom: 15px;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #333; font-size: 13px;">🖼️ 抓取建议 (Data Extraction)</div>
                    <div style="background: #fff3e0; padding: 10px; border-radius: 4px; border-left: 3px solid #ff9800;">
                        <div style="font-size: 11px; color: #e65100; margin-bottom: 6px; font-weight: bold;">💡 ${imageAnalysis.suggestion}</div>
                        ${imageAnalysis.hasPicture ? '<div style="font-size: 10px; color: #666; margin-bottom: 4px;">📦 检测到 &lt;picture&gt; 标签包裹</div>' : ''}
                        ${imageAnalysis.lazyAttr ? `<div style="font-size: 10px; color: #666; margin-bottom: 4px;">🔄 懒加载属性: <code style="background: #fff; padding: 2px 4px; border-radius: 2px;">${imageAnalysis.lazyAttr}</code></div>` : ''}
                        <div style="font-size: 10px; color: #666; margin-bottom: 4px;">🔗 真实链接:</div>
                        <code class="copyable-code" data-selector="${imageAnalysis.realSrc.replace(/"/g, '&quot;')}" style="display: block; background: white; padding: 6px; border-radius: 3px; font-size: 11px; word-break: break-all; color: #d63384; cursor: pointer; max-height: 60px; overflow-y: auto;">${imageAnalysis.realSrc}</code>
                        <div style="font-size: 10px; color: #888; margin-top: 4px;">点击复制链接</div>
                        ${imageAnalysis.extractionCode ? `<div style="margin-top: 8px; font-size: 10px; color: #666;">📝 提取代码:</div><code style="display: block; background: #f5f5f5; padding: 6px; border-radius: 3px; font-size: 10px; word-break: break-all; color: #333; margin-top: 4px;">${imageAnalysis.extractionCode}</code>` : ''}
                    </div>
                </div>
            `;
        }

        // 渲染面板内容
        const resultsDiv = shadowRoot.getElementById('selector-results');
        resultsDiv.innerHTML = `
            ${breadcrumbsHtml}
            ${extractionHtml}

            <!-- 选项卡导航 -->
            <div style="display: flex; gap: 6px; margin-bottom: 15px; border-bottom: 2px solid #e0e0e0; flex-wrap: wrap;">
                <button class="tab-btn" data-tab="single" style="flex: 1; min-width: 80px; padding: 12px 8px; background: white; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 12px; font-weight: bold; color: #666; transition: all 0.2s; min-height: 44px;">
                    🎯 单点
                </button>
                <button class="tab-btn active" data-tab="list" style="flex: 1; min-width: 80px; padding: 12px 8px; background: white; border: none; border-bottom: 3px solid #8E2DE2; cursor: pointer; font-size: 12px; font-weight: bold; color: #8E2DE2; transition: all 0.2s; min-height: 44px;">
                    📑 泛化
                </button>
                <button class="tab-btn" data-tab="sniffer" style="flex: 1; min-width: 80px; padding: 12px 8px; background: white; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 12px; font-weight: bold; color: #666; transition: all 0.2s; min-height: 44px;">
                    📡 雷达
                </button>
                <button class="tab-btn" data-tab="ai" style="flex: 1; min-width: 80px; padding: 12px 8px; background: white; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 12px; font-weight: bold; color: #666; transition: all 0.2s; min-height: 44px;">
                    🤖 AI
                </button>
                <button class="tab-btn" data-tab="settings" style="flex: 1; min-width: 80px; padding: 12px 8px; background: white; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 12px; font-weight: bold; color: #666; transition: all 0.2s; min-height: 44px;">
                    ⚙️ 设置
                </button>
            </div>

            <!-- 单点定位内容 -->
            <div class="tab-content" data-tab-content="single" style="display: none;">
                <!-- 最优解（醒目展示） -->
                <div style="background: linear-gradient(135deg, rgba(142,45,226,0.06) 0%, rgba(74,0,224,0.03) 100%); padding: 12px; border-radius: 6px; border: 2px solid #8E2DE2; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(142, 45, 226, 0.15);">
                    <div style="font-size: 12px; color: #6b21a8; margin-bottom: 6px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 16px;">✅</span>
                        <span>最优 (${singleResult.best.type.toUpperCase()})</span>
                    </div>
                    <code class="copyable-code" data-selector="${singleResult.best.selector.replace(/"/g, '&quot;')}" style="display: block; background: white; padding: 8px; border-radius: 4px; font-size: 12px; word-break: break-all; color: #d63384; cursor: pointer; border: 1px solid rgba(142,45,226,0.12);">${singleResult.best.selector}</code>
                    <div style="font-size: 10px; color: #6b21a8; margin-top: 6px;">${singleResult.best.reason}</div>
                    <button class="verify-btn" data-selector="${singleResult.best.selector.replace(/"/g, '&quot;')}" data-type="${singleResult.best.type}" style="margin-top: 8px; padding: 8px 16px; background: #8E2DE2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; min-height: 44px;">🔍 验证</button>
                </div>

                <!-- 备用选择器（折叠） -->
                <details style="margin-bottom: 12px;">
                    <summary style="padding: 10px; background: #f5f5f5; border-radius: 4px; cursor: pointer; font-size: 12px; color: #666; user-select: none; list-style: none; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 14px;">🔽</span>
                        <span>查看备用选择器 (CSS / XPath)</span>
                    </summary>
                    <div style="margin-top: 10px; padding: 10px; background: #fafafa; border-radius: 4px; border: 1px solid #e0e0e0;">
                        <!-- CSS 备用 -->
                        <div style="margin-bottom: 12px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #8E2DE2;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: bold;">CSS (评分: ${singleResult.css.score.toFixed(1)})</div>
                            <code class="copyable-code" data-selector="${singleResult.css.selector.replace(/"/g, '&quot;')}" style="display: block; background: #f9f9f9; padding: 6px; border-radius: 3px; font-size: 11px; word-break: break-all; color: #d63384; cursor: pointer;">${singleResult.css.selector}</code>
                            <div style="font-size: 10px; color: #888; margin-top: 4px;">${singleResult.css.reason}</div>
                            <button class="verify-btn" data-selector="${singleResult.css.selector.replace(/"/g, '&quot;')}" data-type="css" style="margin-top: 6px; padding: 6px 12px; background: #8E2DE2; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; min-height: 40px;">🔍 验证</button>
                        </div>
                        <!-- XPath 备用 -->
                        <div style="padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #4A00E0;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: bold;">XPath (评分: ${singleResult.xpath.score.toFixed(1)})</div>
                            <code class="copyable-code" data-selector="${singleResult.xpath.selector.replace(/"/g, '&quot;')}" style="display: block; background: #f9f9f9; padding: 6px; border-radius: 3px; font-size: 11px; word-break: break-all; color: #d63384; cursor: pointer;">${singleResult.xpath.selector}</code>
                            <div style="font-size: 10px; color: #888; margin-top: 4px;">${singleResult.xpath.reason}</div>
                            <button class="verify-btn" data-selector="${singleResult.xpath.selector.replace(/"/g, '&quot;')}" data-type="xpath" style="margin-top: 6px; padding: 6px 12px; background: #4A00E0; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; min-height: 40px;">🔍 验证</button>
                        </div>
                    </div>
                </details>
            </div>

            <!-- 列表泛化内容 -->
            <div class="tab-content" data-tab-content="list" style="display: block;">
                <!-- 最优解（醒目展示） -->
                <div style="background: linear-gradient(135deg, rgba(142,45,226,0.06) 0%, rgba(74,0,224,0.03) 100%); padding: 12px; border-radius: 6px; border: 2px solid #8E2DE2; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(142, 45, 226, 0.15);">
                    <div style="font-size: 12px; color: #6b21a8; margin-bottom: 6px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 16px;">✅</span>
                        <span>最优 (${listResult.best.type.toUpperCase()}, 选中 ${listResult.best.count} 个)</span>
                    </div>
                    <code class="copyable-code" data-selector="${listResult.best.selector.replace(/"/g, '&quot;')}" style="display: block; background: white; padding: 8px; border-radius: 4px; font-size: 12px; word-break: break-all; color: #d63384; cursor: pointer; border: 1px solid rgba(142,45,226,0.12);">${listResult.best.selector}</code>
                    <div style="font-size: 10px; color: #6b21a8; margin-top: 6px;">${listResult.best.reason}</div>
                    <button class="verify-btn" data-selector="${listResult.best.selector.replace(/"/g, '&quot;')}" data-type="${listResult.best.type}" style="margin-top: 8px; padding: 8px 16px; background: #8E2DE2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; min-height: 44px;">🔍 验证</button>
                </div>

                <!-- 数据预览 -->
                ${dataPreview}

                <!-- 备用选择器（折叠） -->
                <details style="margin-bottom: 12px;">
                    <summary style="padding: 10px; background: #f5f5f5; border-radius: 4px; cursor: pointer; font-size: 12px; color: #666; user-select: none; list-style: none; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 14px;">🔽</span>
                        <span>查看备用选择器 (CSS / XPath${listResult.lca ? ' / LCA' : ''})</span>
                    </summary>
                    <div style="margin-top: 10px; padding: 10px; background: #fafafa; border-radius: 4px; border: 1px solid #e0e0e0;">
                        <!-- CSS 备用 -->
                        <div style="margin-bottom: 12px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #8E2DE2;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: bold;">CSS (选中 ${listResult.css.count} 个)</div>
                            <code class="copyable-code" data-selector="${listResult.css.selector.replace(/"/g, '&quot;')}" style="display: block; background: #f9f9f9; padding: 6px; border-radius: 3px; font-size: 11px; word-break: break-all; color: #d63384; cursor: pointer;">${listResult.css.selector}</code>
                            <div style="font-size: 10px; color: #888; margin-top: 4px;">${listResult.css.reason}</div>
                            <button class="verify-btn" data-selector="${listResult.css.selector.replace(/"/g, '&quot;')}" data-type="css" style="margin-top: 6px; padding: 6px 12px; background: #8E2DE2; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; min-height: 40px;">🔍 验证</button>
                        </div>
                        <!-- XPath 备用 -->
                        <div style="margin-bottom: ${listResult.lca ? '12px' : '0'}; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #4A00E0;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: bold;">XPath (选中 ${listResult.xpath.count} 个)</div>
                            <code class="copyable-code" data-selector="${listResult.xpath.selector.replace(/"/g, '&quot;')}" style="display: block; background: #f9f9f9; padding: 6px; border-radius: 3px; font-size: 11px; word-break: break-all; color: #d63384; cursor: pointer;">${listResult.xpath.selector}</code>
                            <div style="font-size: 10px; color: #888; margin-top: 4px;">${listResult.xpath.reason}</div>
                            <button class="verify-btn" data-selector="${listResult.xpath.selector.replace(/"/g, '&quot;')}" data-type="xpath" style="margin-top: 6px; padding: 6px 12px; background: #4A00E0; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; min-height: 40px;">🔍 验证</button>
                        </div>
                        ${listResult.lca ? `
                        <!-- LCA 备用 -->
                        <div style="padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #ff9800;">
                            <div style="font-size: 11px; color: #e65100; margin-bottom: 4px; font-weight: bold;">⚡ LCA 暴力泛化 (选中 ${listResult.lca.count} 个)</div>
                            <code class="copyable-code" data-selector="${listResult.lca.selector.replace(/"/g, '&quot;')}" style="display: block; background: #f9f9f9; padding: 6px; border-radius: 3px; font-size: 11px; word-break: break-all; color: #d63384; cursor: pointer;">${listResult.lca.selector}</code>
                            <div style="font-size: 10px; color: #888; margin-top: 4px;">${listResult.lca.reason}</div>
                            <button class="verify-btn" data-selector="${listResult.lca.selector.replace(/"/g, '&quot;')}" data-type="css" style="margin-top: 6px; padding: 6px 12px; background: #ff9800; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; min-height: 40px;">🔍 验证</button>
                        </div>
                        ` : ''}
                    </div>
                </details>

                <!-- 💻 生成爬虫代码模块 -->
                <details style="margin-bottom: 12px; margin-top: 15px;">
                    <summary style="padding: 10px; background: rgba(142,45,226,0.06); border-radius: 6px; cursor: pointer; font-size: 12px; color: #8E2DE2; user-select: none; list-style: none; display: flex; align-items: center; gap: 6px; font-weight: bold;">
                        <span style="font-size: 14px;">💻</span>
                        <span>生成爬虫代码 (Code Snippet Generator)</span>
                    </summary>
                    <div style="margin-top: 10px; padding: 10px; background: #fafafa; border-radius: 4px; border: 1px solid #e0e0e0;">
                        <!-- 框架选择Tab -->
                        <div style="display: flex; gap: 4px; margin-bottom: 10px; border-bottom: 1px solid #e0e0e0;">
                            <button class="code-framework-btn active" data-framework="playwright" data-mode="list" style="flex: 1; padding: 6px; background: white; border: none; border-bottom: 2px solid #8E2DE2; cursor: pointer; font-size: 11px; font-weight: bold; color: #8E2DE2;">
                                🎭 Playwright
                            </button>
                            <button class="code-framework-btn" data-framework="selenium" data-mode="list" style="flex: 1; padding: 6px; background: white; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 11px; color: #666;">
                                🔧 Selenium
                            </button>
                            <button class="code-framework-btn" data-framework="puppeteer" data-mode="list" style="flex: 1; padding: 6px; background: white; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 11px; color: #666;">
                                🎪 Puppeteer
                            </button>
                        </div>

                        <!-- 代码显示区域 -->
                        <div class="code-display-area">
                            <code class="generated-code copyable-code" data-selector="${generateCode('playwright', 'list', listResult.best.type, listResult.best.selector)}" style="display: block; background: #263238; color: #aed581; padding: 12px; border-radius: 4px; font-size: 11px; white-space: pre-wrap; word-break: break-all; cursor: pointer; font-family: 'Courier New', monospace; line-height: 1.5; max-height: 300px; overflow-y: auto;">${generateCode('playwright', 'list', listResult.best.type, listResult.best.selector)}</code>
                            <div style="font-size: 10px; color: #888; margin-top: 6px; text-align: center;">点击代码块复制</div>
                        </div>
                    </div>
                </details>
            </div>

            <!-- 嗅探雷达内容 -->
            <div class="tab-content" data-tab-content="sniffer" style="display: none;">
                <div id="sniffer-content">
                    <!-- 动态渲染嗅探到的 URL -->
                </div>
            </div>

            <!-- AI 分析内容 -->
            <div class="tab-content" data-tab-content="ai" style="display: none;">
                <div style="padding: 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🤖</div>
                    <div style="font-size: 14px; margin-bottom: 8px; color: #666;">AI 智能分析</div>
                    <div style="font-size: 12px; color: #999; margin-bottom: 20px;">使用 AI 分析当前选中元素的作用</div>
                    <button id="ai-analyze-btn" style="padding: 10px 24px; background: linear-gradient(90deg, #8E2DE2, #4A00E0); color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 4px 12px rgba(74, 0, 224, 0.3);">
                        ✨ 开始分析
                    </button>
                    <div id="ai-result" style="margin-top: 20px; text-align: left;"></div>
                </div>
            </div>

            <!-- 设置内容 -->
            <div class="tab-content" data-tab-content="settings" style="display: none;">
                <div style="padding: 15px;">
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 20px; color: #333;">⚙️ API 设置</div>

                    <div style="margin-bottom: 15px; padding: 10px; background: rgba(142,45,226,0.05); border-radius: 6px; border-left: 3px solid #8E2DE2;">
                        <div style="font-size: 11px; color: #6b21a8;">💡 本插件支持 OpenAI、DeepSeek、Claude 等兼容接口。推荐使用 New API 或 One API 转发服务。</div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 12px; font-weight: bold; color: #666; margin-bottom: 6px;">🔑 API Key</label>
                        <input id="settings-api-key" type="password" placeholder="sk-xxx 或您的 API Key" value="${savedApiKey.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 12px; font-weight: bold; color: #666; margin-bottom: 6px;">🌐 Base URL</label>
                        <input id="settings-base-url" type="text" placeholder="https://api.openai.com/v1" value="${savedBaseUrl.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
                        <div style="font-size: 10px; color: #c62828; margin-top: 4px;">⚠️ 必须包含 /v1，例如：https://api.deepseek.com/v1</div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 12px; font-weight: bold; color: #666; margin-bottom: 6px;">🎯 Model</label>
                        <input id="settings-model" type="text" placeholder="gpt-3.5-turbo 或 deepseek-chat" value="${savedModel.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
                    </div>

                    <button id="settings-save-btn" style="width: 100%; padding: 12px; background: #8E2DE2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
                        💾 保存设置
                    </button>

                    <div id="settings-status" style="margin-top: 15px; font-size: 12px; color: #666;"></div>
                </div>
            </div>

            <button id="clear-verify" style="width: 100%; margin-top: 10px; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">清除高亮</button>
        `;

        // 渲染嗅探雷达内容
        renderSnifferContent();

        // ==================== 统一事件委托（防止 innerHTML 重写导致事件失效）====================
        resultsDiv.onclick = (e) => {
            const target = e.target;

            // 1. 处理面包屑点击
            if (target.classList.contains('breadcrumb-item')) {
                const index = parseInt(target.getAttribute('data-element-index'));
                const targetEl = breadcrumbs[index].element;
                if (targetEl && targetEl !== selectedElement) {
                    // 清除旧的验证高亮
                    clearVerifyHighlights();

                    // 更新面板
                    renderSelectorPanel(targetEl);

                    // 强制高亮新目标元素（关键步骤）
                    const rect = targetEl.getBoundingClientRect();
                    highlightBox.style.display = 'block';
                    highlightBox.style.left = rect.left + window.scrollX + 'px';
                    highlightBox.style.top = rect.top + window.scrollY + 'px';
                    highlightBox.style.width = rect.width + 'px';
                    highlightBox.style.height = rect.height + 'px';
                }
                return;
            }

            // 2. 处理 Tab 切换
            if (target.classList.contains('tab-btn')) {
                const tabName = target.getAttribute('data-tab');

                // 更新 Tab 按钮状态
                resultsDiv.querySelectorAll('.tab-btn').forEach(btn => {
                    if (btn.getAttribute('data-tab') === tabName) {
                        btn.classList.add('active');
                        const activeColor = tabName === 'sniffer' ? '#ff9800' :
                                          tabName === 'ai' ? '#9c27b0' :
                                          tabName === 'settings' ? '#607d8b' : '#8E2DE2';
                        btn.style.borderBottomColor = activeColor;
                        btn.style.color = activeColor;
                    } else {
                        btn.classList.remove('active');
                        btn.style.borderBottomColor = 'transparent';
                        btn.style.color = '#666';
                    }
                });

                // 切换内容显示
                resultsDiv.querySelectorAll('.tab-content').forEach(content => {
                    if (content.getAttribute('data-tab-content') === tabName) {
                        content.style.display = 'block';
                    } else {
                        content.style.display = 'none';
                    }
                });

                // 如果切换到嗅探雷达 Tab，刷新内容
                if (tabName === 'sniffer') {
                    renderSnifferContent();
                }
                return;
            }

            // 3. 处理复制功能
            if (target.classList.contains('copyable-code')) {
                const selector = target.getAttribute('data-selector');
                navigator.clipboard.writeText(selector).then(() => {
                    const msg = document.createElement('div');
                    msg.textContent = '已复制';
                    msg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #8E2DE2; color: white; padding: 10px 20px; border-radius: 4px; z-index: 9999999; font-size: 14px;';
                    document.body.appendChild(msg);
                    setTimeout(() => msg.remove(), 1000);
                });
                return;
            }

            // 4. 处理验证按钮
            if (target.classList.contains('verify-btn')) {
                const selector = target.getAttribute('data-selector');
                const type = target.getAttribute('data-type');
                const count = verifySelector(selector, type);
                target.textContent = `✅ 已验证 (${count}个)`;
                setTimeout(() => {
                    target.textContent = '🔍 验证';
                }, 2000);
                return;
            }

            // 5. 处理清除高亮按钮
            if (target.id === 'clear-verify') {
                clearVerifyHighlights();
                return;
            }

            // 6. 处理清空嗅探列表按钮
            if (target.id === 'clear-sniffer') {
                window.sniffedMediaUrls = [];
                renderSnifferContent();
                const msg = document.createElement('div');
                msg.textContent = '已清空列表';
                msg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ff9800; color: white; padding: 10px 20px; border-radius: 4px; z-index: 9999999; font-size: 14px;';
                document.body.appendChild(msg);
                setTimeout(() => msg.remove(), 1000);
                return;
            }

            // 7. 处理代码框架切换按钮
            if (target.classList.contains('code-framework-btn')) {
                const framework = target.getAttribute('data-framework');
                const mode = target.getAttribute('data-mode');

                // 获取当前Tab的最优选择器信息
                let bestSelector, bestType;
                if (mode === 'single') {
                    bestSelector = singleResult.best.selector;
                    bestType = singleResult.best.type;
                } else {
                    bestSelector = listResult.best.selector;
                    bestType = listResult.best.type;
                }

                // 更新框架按钮状态（只更新同一模式下的按钮）
                const parentDetails = target.closest('details');
                parentDetails.querySelectorAll('.code-framework-btn').forEach(btn => {
                    if (btn.getAttribute('data-framework') === framework && btn.getAttribute('data-mode') === mode) {
                        btn.classList.add('active');
                        btn.style.borderBottomColor = '#8E2DE2';
                        btn.style.color = '#8E2DE2';
                        btn.style.fontWeight = 'bold';
                    } else if (btn.getAttribute('data-mode') === mode) {
                        btn.classList.remove('active');
                        btn.style.borderBottomColor = 'transparent';
                        btn.style.color = '#666';
                        btn.style.fontWeight = 'normal';
                    }
                });

                // 生成新代码并更新显示
                const newCode = generateCode(framework, mode, bestType, bestSelector);
                const codeElement = parentDetails.querySelector('.generated-code');
                codeElement.textContent = newCode;
                codeElement.setAttribute('data-selector', newCode);
                return;
            }

            // 8. 处理 AI 分析按钮
            if (target.id === 'ai-analyze-btn') {
                if (!selectedElement) {
                    alert('请先选择一个元素！');
                    return;
                }

                const aiResultDiv = shadowRoot.getElementById('ai-result');
                aiResultDiv.innerHTML = '<div style="text-align: center; color: #8E2DE2;">⏳ 正在分析中...</div>';

                // 获取设置
                const apiKey = GM_getValue('ai_api_key', '');
                let baseUrl = GM_getValue('ai_base_url', 'https://api.openai.com/v1');
                const model = GM_getValue('ai_model', 'gpt-3.5-turbo');

                if (!apiKey) {
                    aiResultDiv.innerHTML = '<div style="padding: 10px; background: #ffebee; border-radius: 4px; color: #c62828;">❌ 请先在「设置」标签页中配置 API Key</div>';
                    return;
                }

                // URL 智能清洗
                // 1. 去除末尾多余斜杠
                baseUrl = baseUrl.replace(/\/+$/, '');
                // 2. 智能补全 /v1（排除 Azure/Gemini 等特殊接口）
                if (!baseUrl.includes('/v1') && !baseUrl.includes('azure') && !baseUrl.includes('gemini')) {
                    baseUrl += '/v1';
                }

                // 获取元素的 outerHTML（限制前1000字符）
                const elementHtml = selectedElement.outerHTML.substring(0, 1000);

                // 构建请求
                const prompt = `分析此 HTML 元素的作用，并给出 Playwright Python 定位代码：\n\n${elementHtml}`;

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${baseUrl}/chat/completions`,
                    anonymous: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    data: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    }),
                    onload: function(response) {
                        // 重新获取 DOM 引用，防止异步回调时元素已脱离文档流
                        const aiResultDiv = shadowRoot.getElementById('ai-result');
                        if (!aiResultDiv) return;

                        // 首先检查 HTTP 状态码
                        if (response.status !== 200) {
                            aiResultDiv.innerHTML = `<div style="padding: 10px; background: #ffebee; border-radius: 4px; color: #c62828;">❌ API Error ${response.status}: ${response.responseText || response.statusText}</div>`;
                            return;
                        }

                        try {
                            const result = JSON.parse(response.responseText);

                            // 检查是否有错误响应
                            if (result.error) {
                                aiResultDiv.innerHTML = `<div style="padding: 10px; background: #ffebee; border-radius: 4px; color: #c62828;">❌ API 错误: ${result.error.message || JSON.stringify(result.error)}</div>`;
                                return;
                            }

                            // 提取内容（兼容 OpenAI 和 DeepSeek 格式）
                            let content = '';
                            if (result.choices && result.choices[0] && result.choices[0].message) {
                                content = result.choices[0].message.content;
                            } else if (result.output && result.output.content) {
                                // DeepSeek 兼容格式
                                content = result.output.content;
                            } else if (result.message) {
                                content = result.message;
                            } else {
                                aiResultDiv.innerHTML = `<div style="padding: 10px; background: #fff3e0; border-radius: 4px; color: #e65100;">⚠️ 无法解析 API 响应，请检查返回格式<br><pre style="font-size: 10px; overflow: auto; max-height: 100px;">${JSON.stringify(result, null, 2)}</pre></div>`;
                                return;
                            }

                            aiResultDiv.innerHTML = `
                                <div style="padding: 15px; background: #f3e5f5; border-radius: 6px; border-left: 4px solid #9c27b0;">
                                    <div style="font-size: 12px; font-weight: bold; color: #6a1b9a; margin-bottom: 10px;">✨ AI 分析结果</div>
                                    <pre style="white-space: pre-wrap; word-break: break-word; font-size: 12px; color: #333; margin: 0;">${content}</pre>
                                </div>
                            `;
                        } catch (e) {
                            aiResultDiv.innerHTML = `<div style="padding: 10px; background: #ffebee; border-radius: 4px; color: #c62828;">❌ 解析响应失败: ${e.message}<br><details><summary>查看原始响应</summary><pre style="font-size: 10px; overflow: auto; max-height: 200px;">${response.responseText}</pre></details></div>`;
                        }
                    },
                    onerror: function(error) {
                        const aiResultDiv = shadowRoot.getElementById('ai-result');
                        if (!aiResultDiv) return;
                        aiResultDiv.innerHTML = `<div style="padding: 10px; background: #ffebee; border-radius: 4px; color: #c62828;">❌ 请求失败: ${error.error || '未知错误'}</div>`;
                    },
                    ontimeout: function() {
                        const aiResultDiv = shadowRoot.getElementById('ai-result');
                        if (!aiResultDiv) return;
                        aiResultDiv.innerHTML = '<div style="padding: 10px; background: #ffebee; border-radius: 4px; color: #c62828;">❌ 请求超时</div>';
                    },
                    timeout: 30000
                });

                return;
            }

            // 9. 处理设置保存按钮
            if (target.id === 'settings-save-btn') {
                const apiKey = shadowRoot.getElementById('settings-api-key').value.trim();
                const baseUrl = shadowRoot.getElementById('settings-base-url').value.trim();
                const model = shadowRoot.getElementById('settings-model').value.trim();

                // 保存到 GM_setValue
                GM_setValue('ai_api_key', apiKey);
                GM_setValue('ai_base_url', baseUrl || 'https://api.openai.com/v1');
                GM_setValue('ai_model', model || 'gpt-3.5-turbo');

                const statusDiv = shadowRoot.getElementById('settings-status');
                statusDiv.innerHTML = '<span style="color: #8E2DE2;">✅ 设置已保存</span>';
                setTimeout(() => {
                    statusDiv.innerHTML = '';
                }, 2000);

                return;
            }
        };
    }

    // 统一的元素选择处理函数
    function handleElementSelection(target) {
        selectedElement = target;
        isSelecting = false;
        document.body.style.cursor = 'default';
        highlightBox.style.display = 'none';

        // 恢复胶囊挂件状态
        capsuleWidget.innerHTML = '🤖 终极助手';
        capsuleWidget.style.background = 'linear-gradient(90deg, #8E2DE2, #4A00E0)';

        // 【智能记忆定位】只有面板完全飞出屏幕或从未初始化时才重置位置
        const panelRect = panelElement.getBoundingClientRect();
        const isOffScreen = panelRect.bottom < 0 || panelRect.top > window.innerHeight ||
                            panelRect.right < 0 || panelRect.left > window.innerWidth;
        const isNeverInitialized = !panelElement.style.top && !panelElement.style.left;

        if (isOffScreen || isNeverInitialized) {
            panelElement.style.top = '50px';
            panelElement.style.right = '50px';
            panelElement.style.left = 'auto';
            panelElement.style.transform = 'translate(0px, 0px)';
        }

        // 重置拖拽偏移量，防止拖拽逻辑错乱
        xOffset = 0;
        yOffset = 0;

        // 调用重构后的渲染函数
        renderSelectorPanel(target);
    }


    console.log('✅ 终极选择器引擎已加载 (油猴脚本)');
    console.log('📍 右上角悬浮框可视化选择元素');
    console.log('💻 控制台使用: const engine = new UltimateSelectorEngine(); engine.getBestSelector($0);');
    } // initUI 函数结束
})();
