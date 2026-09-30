(() => {
  const SECTION_GROUPS = globalThis.BILILESS_SECTION_GROUPS;
  const DEFAULT_SETTINGS = {
    enabled: true, blockAds: true, blockLive: false, blockMedia: false, blockManga: false,
    selectedContentTypes: [], contentTypesConfigured: false,
    blockedSections: [], selectedSectionIds: [], blockedSectionIds: [], sectionMode: "block", blockedUploaders: [], aiEnabled: false,
    aiPreference: "", aiThreshold: 0.8
  };
  const CARD_SELECTORS = [
    ".bili-video-card", ".video-page-card-small", ".video-page-special-card-small",
    ".bili-feed-card", ".video-list-item", ".search-all-list .video-item", ".bili-video-card__wrap",
    ".feed-card", ".floor-single-card", ".bili-live-card", ".live-card", ".room-card-wrapper",
    ".bangumi-card", ".manga-card"
  ];
  const DIRECT_AD_SELECTORS = [
    ".bili-video-card.is-ad", ".bili-feed-card.is-ad", "[data-ad-report]", "[data-ad-id]",
    "[data-ad-type]", "[class*='ad-card']", "[class*='commercial-card']"
  ];
  const BADGE_SELECTORS = [
    ".bili-video-card__stats--text", ".bili-video-card__info--author", ".bili-video-card__info--tit",
    ".bili-video-card__info--creative-ad", ".bili-video-card__info--ad", ".ad-tag", ".tag", ".badge",
    "[class*='badge']", "[class*='tag']", "[class*='label']"
  ];
  const CATEGORY_RULES = {
    ads: { badge: /^(广告|推广|创作推广)$/, href: /(?:cm\.bilibili\.com|ad\.bilibili\.com)/i },
    live: { badge: /^(直播|正在直播|LIVE)$/i, href: /(?:\/\/live\.bilibili\.com\/|\/blackboard\/live\/)/i, selector: ".bili-live-card, .live-card, .room-card-wrapper" },
    bangumi: { badge: /^(番剧|番剧相关)$/ },
    guochuang: { badge: /^(国创|国产动画)$/ },
    movie: { badge: /^(电影|电影相关)$/ },
    tv: { badge: /^(电视剧|TV剧|电视剧相关)$/ },
    variety: { badge: /^(综艺|综艺节目|综艺相关)$/ },
    documentary: { badge: /^(纪录片|纪录片相关)$/ },
    manga: { badge: /^(漫画|哔哩哔哩漫画)$/, href: /(?:\/\/manga\.bilibili\.com\/|\/manga\/detail\/)/i, selector: ".manga-card" },
    course: { badge: /^(课堂|课程|付费课程)$/, href: /\/cheese\/play\//i }
  };
  const SECTION_PATTERNS = {
    动画: /动画|MAD|MMD|手书|配音|特摄|动漫杂谈/,
    番剧: /番剧|国创|国产动画/,
    音乐: /音乐|演奏|翻唱|VOCALOID|说唱/,
    舞蹈: /舞蹈|宅舞|街舞|明星舞蹈/,
    游戏: /游戏|电竞|电子竞技/,
    知识: /知识|科学科普|社科|财经|校园学习|职业职场|野生技能/,
    科技数码: /科技|数码|计算机技术|软件应用|人工智能|极客DIY/,
    资讯: /资讯|新闻|时政|社会观察/,
    运动: /运动|篮球|足球|健身|竞技体育/,
    汽车: /汽车|赛车|改装玩车|新能源车/,
    生活: /生活|日常|搞笑|亲子|家居房产|手工|绘画/,
    美食: /美食|料理|探店|美食制作/,
    动物圈: /动物|萌宠|野生动物/,
    鬼畜: /鬼畜|音MAD|人力VOCALOID/,
    时尚: /时尚|美妆护肤|穿搭|仿妆/,
    娱乐: /娱乐|综艺|明星综合/,
    影视: /影视|电影|电视剧|纪录片|影视杂谈/
  };
  const LEGACY_TID_SECTIONS = {
    动画: [1, 24, 25, 27, 47, 86, 210], 番剧: [13, 32, 33, 51, 152, 153, 167, 168, 169, 170, 195],
    音乐: [3, 28, 29, 30, 31, 59, 130, 193, 194], 舞蹈: [20, 129, 154, 156, 198, 199, 200],
    游戏: [4, 17, 19, 65, 121, 136, 171, 172, 173], 知识: [36, 122, 124, 201, 207, 208, 209, 228, 229],
    科技数码: [95, 188, 230, 231, 232, 233], 运动: [164, 234, 235, 236, 237, 238],
    汽车: [176, 223, 224, 225, 226, 227, 240], 生活: [21, 138, 160, 161, 162, 239],
    美食: [76, 211, 212, 213, 214, 215], 动物圈: [75, 217, 218, 219, 220, 221, 222],
    鬼畜: [22, 26, 119, 126, 127, 216], 时尚: [155, 157, 158, 159],
    娱乐: [5, 71, 137], 影视: [11, 23, 37, 83, 85, 145, 146, 147, 177, 178, 179, 180, 181, 182, 183, 184, 185, 187]
  };
  const LEGACY_GROUP_IDS = {
    动画: [1005], 番剧: [1005], 音乐: [1003], 舞蹈: [1004], 游戏: [1008], 知识: [1010],
    科技数码: [1011, 1012], 运动: [1017, 1018], 汽车: [1013],
    生活: [1006, 1015, 1016, 1019, 1022, 1023, 1025, 1026, 1027, 1028, 1029, 1030, 1031],
    美食: [1020], 动物圈: [1024], 鬼畜: [1007], 时尚: [1014], 娱乐: [1002, 1021], 影视: [1001]
  };

  function effectiveSelectedIds() {
    const currentIds = [...settings.selectedSectionIds, ...settings.blockedSectionIds].map(Number);
    if (currentIds.length) return new Set(currentIds);
    const legacyGroupIds = [...new Set(settings.blockedSections.flatMap((name) => LEGACY_GROUP_IDS[name] || []))];
    return new Set(legacyGroupIds);
  }

  function effectiveSelectedContentTypes() {
    if (settings.contentTypesConfigured) return new Set(settings.selectedContentTypes);
    const types = [];
    if (settings.blockAds) types.push("ads");
    if (settings.blockLive) types.push("live");
    if (settings.blockMedia) types.push("bangumi", "guochuang", "movie", "tv", "variety", "documentary");
    if (settings.blockManga) types.push("manga");
    return new Set(types);
  }

  function v2GroupFor(tidV2) {
    return SECTION_GROUPS.find((group) => group.id === tidV2 || group.children.some((child) => child.id === tidV2));
  }

  let settings = { ...DEFAULT_SETTINGS };
  let blockedCount = 0;
  let scanQueued = false;
  const hiddenCards = new Map();
  const metadata = new Map();
  const requested = new Set();
  const aiResults = new Map();
  const aiPending = new Map();
  let aiBatchTimer;
  let aiRequestRunning = false;
  let openActionMenu = null;

  function cardMatches(card, rule, category) {
    if (category === "ads" &&
        (card.matches(DIRECT_AD_SELECTORS.join(",")) || card.querySelector(DIRECT_AD_SELECTORS.join(",")))) return true;
    if (rule.selector && (card.matches(rule.selector) || card.querySelector(rule.selector))) return true;
    const links = [card.matches("a[href]") ? card : null, ...card.querySelectorAll("a[href]")].filter(Boolean);
    if (rule.href && links.some((link) => rule.href.test(link.href))) return true;
    const marked = [...card.querySelectorAll(BADGE_SELECTORS.join(",")), ...card.querySelectorAll("span, i, em")];
    return marked.some((element) => element.childElementCount === 0 && rule.badge.test(element.textContent.trim()));
  }

  function extractBvid(card) {
    for (const link of card.querySelectorAll("a[href*='/video/BV']")) {
      const match = link.href.match(/\/video\/(BV[\w]+)/i);
      if (match) return match[1];
    }
    return "";
  }

  function requestMetadata(bvid) {
    if (!bvid || requested.has(bvid) || metadata.has(bvid)) return;
    requested.add(bvid);
    chrome.runtime.sendMessage({ type: "BILILESS_GET_VIDEO_META", bvid })
      .then((result) => { metadata.set(bvid, result || false); })
      .catch(() => {})
      .finally(() => { requested.delete(bvid); queueScan(); });
  }

  async function loadMetadataForCard(card) {
    const bvid = extractBvid(card);
    if (!bvid) return null;
    if (metadata.has(bvid)) return metadata.get(bvid) || null;
    if (requested.has(bvid)) {
      for (let attempt = 0; attempt < 20 && requested.has(bvid); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return metadata.get(bvid) || null;
    }
    requested.add(bvid);
    try {
      const result = await chrome.runtime.sendMessage({ type: "BILILESS_GET_VIDEO_META", bvid });
      metadata.set(bvid, result || false);
      return result || null;
    } catch {
      metadata.set(bvid, false);
      return null;
    } finally {
      requested.delete(bvid);
    }
  }

  function closeActionMenu() {
    openActionMenu?.classList.remove("bililess-menu-open");
    openActionMenu = null;
  }

  async function persistQuickChange(update) {
    const presetState = await chrome.storage.sync.get({ activePreset: "", savedPresets: [] });
    if (!presetState.activePreset) {
      await chrome.storage.sync.set({ ...update, activePreset: "" });
      return;
    }
    const presetExists = presetState.savedPresets.some((preset) => preset.id === presetState.activePreset);
    if (!presetExists) {
      await chrome.storage.sync.set({ ...update, activePreset: "" });
      return;
    }
    const savedPresets = presetState.savedPresets.map((preset) =>
      preset.id === presetState.activePreset
        ? { ...preset, config: { ...preset.config, ...update } }
        : preset
    );
    await chrome.storage.sync.set({ ...update, savedPresets });
  }

  async function blockUploader(meta) {
    const stored = await chrome.storage.sync.get({ blockedUploaders: [] });
    const identity = meta.uploaderId || meta.uploaderName;
    if (!identity) return;
    const blockedUploaders = [...new Set([...stored.blockedUploaders, String(identity)])];
    await persistQuickChange({ blockedUploaders });
  }

  async function blockSection(meta, wholeGroup) {
    const group = v2GroupFor(Number(meta.tidV2));
    if (!group) return;
    const stored = await chrome.storage.sync.get({ selectedSectionIds: [], blockedSectionIds: [] });
    const selected = new Set([...stored.selectedSectionIds, ...stored.blockedSectionIds].map(Number));
    const childIds = group.children.map((child) => child.id);
    if (wholeGroup) {
      for (const id of childIds) selected.delete(id);
      selected.add(group.id);
    } else if (!selected.has(group.id)) selected.add(Number(meta.tidV2));
    await persistQuickChange({ selectedSectionIds: [...selected], blockedSectionIds: [] });
  }

  function addMenuItem(menu, label, onClick, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;
      button.disabled = true;
      await onClick();
      closeActionMenu();
    });
    menu.append(button);
  }

  async function populateActionMenu(card, menu) {
    menu.replaceChildren();
    const loading = document.createElement("div");
    loading.className = "bililess-menu-status";
    loading.textContent = "正在识别视频…";
    menu.append(loading);
    const meta = await loadMetadataForCard(card);
    if (!meta || !card.isConnected) {
      loading.textContent = "无法取得视频信息";
      return;
    }
    const group = v2GroupFor(Number(meta.tidV2));
    const child = group?.children.find((item) => item.id === Number(meta.tidV2));
    menu.replaceChildren();
    addMenuItem(menu, `屏蔽 UP 主：${meta.uploaderName || meta.uploaderId}`, () => blockUploader(meta), !meta.uploaderName && !meta.uploaderId);
    addMenuItem(menu, child ? `屏蔽「${child.name}」分区` : "无法识别子分区", () => blockSection(meta, false), !child);
    addMenuItem(menu, group ? `屏蔽「${group.name}」整个分区` : "无法识别一级分区", () => blockSection(meta, true), !group);
  }

  function attachCardAction(card) {
    if (card.querySelector(":scope > .bililess-card-controls")) return;
    card.classList.add("bililess-action-host");
    const controls = document.createElement("div");
    controls.className = "bililess-card-controls";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "bililess-card-trigger";
    trigger.textContent = "筛选";
    trigger.title = "屏蔽这个 UP 主或分区";
    const menu = document.createElement("div");
    menu.className = "bililess-filter-menu";
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (openActionMenu === controls) { closeActionMenu(); return; }
      closeActionMenu();
      controls.classList.add("bililess-menu-open");
      openActionMenu = controls;
      populateActionMenu(card, menu);
    });
    controls.addEventListener("click", (event) => event.stopPropagation());
    controls.append(trigger, menu);
    card.append(controls);
  }

  function queueAiClassification(video) {
    if (!video?.bvid || aiResults.has(video.bvid) || aiPending.has(video.bvid)) return;
    aiPending.set(video.bvid, video);
    clearTimeout(aiBatchTimer);
    aiBatchTimer = setTimeout(flushAiBatch, 500);
  }

  async function flushAiBatch() {
    if (aiRequestRunning || !settings.aiEnabled || !settings.aiPreference.trim()) return;
    const videos = [...aiPending.values()].slice(0, 20);
    if (!videos.length) return;
    for (const video of videos) aiPending.delete(video.bvid);
    aiRequestRunning = true;
    try {
      const response = await chrome.runtime.sendMessage({
        type: "BILILESS_AI_CLASSIFY", videos, preference: settings.aiPreference.trim()
      });
      if (response?.ok) for (const result of response.results) aiResults.set(result.bvid, result);
    } catch {}
    aiRequestRunning = false;
    queueScan();
    if (aiPending.size) aiBatchTimer = setTimeout(flushAiBatch, 500);
  }

  function normalized(value) {
    return String(value || "").trim().toLocaleLowerCase();
  }

  function matchesUploader(card, meta) {
    const blocked = new Set(settings.blockedUploaders.map(normalized).filter(Boolean));
    if (!blocked.size) return false;
    const values = [meta?.uploaderName, meta?.uploaderId];
    for (const link of card.querySelectorAll("a[href*='space.bilibili.com']")) {
      values.push(link.textContent, link.href.match(/space\.bilibili\.com\/(\d+)/)?.[1]);
    }
    for (const node of card.querySelectorAll(".bili-video-card__info--author, [class*='author'], [class*='up-name']")) {
      values.push(node.textContent);
    }
    return values.some((value) => blocked.has(normalized(value)));
  }

  function matchesSectionRule(card, meta) {
    const selectedIds = effectiveSelectedIds();
    const tidV2 = Number(meta?.tidV2) || 0;
    if (tidV2) {
      const group = v2GroupFor(tidV2);
      if (!group) return false;
      if (!selectedIds.size) return false;
      const selected = selectedIds.has(tidV2) || selectedIds.has(group.id);
      return selected;
    }

    const visibleLabels = [...card.querySelectorAll(".tag, .badge, [class*='badge'], [class*='tag'], [class*='label']")]
      .map((node) => node.textContent.trim());
    const values = [meta?.sectionV2, meta?.section, ...visibleLabels].filter(Boolean);
    const legacySection = Object.keys(LEGACY_TID_SECTIONS)
      .find((section) => LEGACY_TID_SECTIONS[section].includes(Number(meta?.tid))) || "";
    const recognizedSections = Object.keys(SECTION_PATTERNS).filter((section) =>
      values.some((value) => SECTION_PATTERNS[section]?.test(value))
    );
    if (legacySection && !recognizedSections.includes(legacySection)) recognizedSections.unshift(legacySection);
    if (!recognizedSections.length) return false;
    if (!selectedIds.size) return false;
    const selected = recognizedSections.some((section) =>
      (LEGACY_GROUP_IDS[section] || []).some((groupId) => selectedIds.has(groupId))
    );
    return selected;
  }

  function blockingReason(card) {
    const selectedContentTypes = effectiveSelectedContentTypes();
    for (const [category, rule] of Object.entries(CATEGORY_RULES)) {
      if (selectedContentTypes.has(category) && cardMatches(card, rule, category)) return category;
    }
    const bvid = extractBvid(card);
    const meta = metadata.get(bvid);
    if ((effectiveSelectedIds().size || settings.blockedUploaders.length || settings.aiEnabled) && bvid && !metadata.has(bvid)) requestMetadata(bvid);
    if (matchesUploader(card, meta)) return "uploader";
    if (matchesSectionRule(card, meta)) return "section";
    if (settings.aiEnabled && settings.aiPreference.trim() && meta) {
      const result = aiResults.get(bvid);
      if (!result) queueAiClassification(meta);
      if (result?.block && result.confidence >= settings.aiThreshold) return "ai";
    }
    return "";
  }

  function restoreAll() {
    for (const [card, record] of hiddenCards) {
      if (record.placeholder.isConnected) record.placeholder.replaceWith(card);
    }
    hiddenCards.clear();
  }

  function scan() {
    if (!settings.enabled) { restoreAll(); updateCount(); return; }
    const selector = CARD_SELECTORS.join(",");
    const cards = [...document.querySelectorAll(selector)].filter((card) => !card.parentElement?.closest(selector));
    for (const card of cards) {
      const reason = blockingReason(card);
      if (!reason) { attachCardAction(card); continue; }
      const placeholder = document.createComment(`bililess:${reason}`);
      card.replaceWith(placeholder);
      hiddenCards.set(card, { placeholder, reason });
    }
    updateCount();
  }

  function updateCount() {
    for (const [card, record] of hiddenCards) if (!record.placeholder.isConnected) hiddenCards.delete(card);
    const nextCount = hiddenCards.size;
    if (nextCount === blockedCount) return;
    blockedCount = nextCount;
    chrome.runtime.sendMessage({ type: "BILILESS_COUNT", count: blockedCount }).catch(() => {});
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => { scanQueued = false; scan(); });
  }

  chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    settings = stored;
    scan();
    new MutationObserver(() => queueScan()).observe(document.documentElement, { childList: true, subtree: true });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    let relevantChange = false;
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (changes[key]) { settings[key] = changes[key].newValue; relevantChange = true; }
    }
    if (!relevantChange) return;
    if (changes.aiPreference || changes.aiEnabled) {
      aiResults.clear();
      aiPending.clear();
      chrome.runtime.sendMessage({ type: "BILILESS_AI_CLEAR_CACHE" }).catch(() => {});
    }
    restoreAll();
    scan();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "BILILESS_GET_STATUS") sendResponse({ settings, count: blockedCount });
    if (message.type === "BILILESS_AI_CONFIG_CHANGED") {
      aiResults.clear();
      aiPending.clear();
      restoreAll();
      scan();
    }
  });

  document.addEventListener("click", (event) => {
    if (openActionMenu && !openActionMenu.contains(event.target)) closeActionMenu();
  }, true);
})();
