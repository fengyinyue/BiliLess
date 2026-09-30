const SECTION_GROUPS = globalThis.BILILESS_SECTION_GROUPS;
const AI_PROVIDER_DEFAULTS = {
  minimax: { endpoint: "https://api.minimax.cn/v1/chat/completions", model: "MiniMax-M3" },
  openai: { endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4.1-mini" },
  deepseek: { endpoint: "https://api.deepseek.com/chat/completions", model: "deepseek-chat" },
  gemini: { endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-2.5-flash" },
  qwen: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-plus" },
  custom: { endpoint: "", model: "" }
};
const CONTENT_TYPES = [
  ["ads", "广告推广", "商业广告、创作推广与运营卡片"],
  ["live", "直播", "直播间与正在直播卡片"],
  ["bangumi", "番剧", "番剧及相关播放卡片"],
  ["guochuang", "国创", "国产动画与国创内容"],
  ["movie", "电影", "电影内容卡片"],
  ["tv", "电视剧", "电视剧内容卡片"],
  ["documentary", "纪录片", "纪录片内容卡片"],
  ["manga", "漫画", "哔哩哔哩漫画相关卡片"],
  ["course", "课程", "课堂、付费课程与课程推广"]
];
const DEFAULT_SETTINGS = {
  enabled: true, blockAds: true, blockLive: false, blockMedia: false, blockManga: false,
  selectedContentTypes: [], contentTypesConfigured: false,
  blockedSections: [], selectedSectionIds: [], blockedSectionIds: [], sectionMode: "block", blockedUploaders: [], aiEnabled: false, activePreset: "", savedPresets: [],
  aiPreference: "", aiThreshold: 0.8
};
const PRESET_KEYS = [
  "selectedContentTypes", "contentTypesConfigured", "selectedSectionIds",
  "blockedUploaders", "aiEnabled", "aiPreference", "aiThreshold"
];
const sectionsElement = document.querySelector("#sections");
const uploadersElement = document.querySelector("#uploaders");
const statusText = document.querySelector("#status-text");
const countElement = document.querySelector("#count");
const aiPreferenceElement = document.querySelector("#ai-preference");
const thresholdElement = document.querySelector("#ai-threshold");
const thresholdValue = document.querySelector("#threshold-value");
const aiProviderElement = document.querySelector("#ai-provider");
const aiApiKeyElement = document.querySelector("#ai-api-key");
const aiEndpointElement = document.querySelector("#ai-endpoint");
const aiModelElement = document.querySelector("#ai-model");
let saveTimer;
const EMPTY_USAGE = { input: 0, output: 0, total: 0, requests: 0 };
const LEGACY_GROUP_IDS = {
  "动画": [1005], "番剧": [1005], "音乐": [1003], "舞蹈": [1004], "游戏": [1008],
  "知识": [1010], "科技数码": [1011, 1012], "运动": [1017, 1018], "汽车": [1013],
  "生活": [1006, 1015, 1016, 1019, 1022, 1023, 1025, 1026, 1027, 1028, 1029, 1030, 1031],
  "美食": [1020], "动物圈": [1024], "鬼畜": [1007], "时尚": [1014], "娱乐": [1002, 1021], "影视": [1001]
};

function migrateSectionIds(settings) {
  const legacyGroupIds = settings.selectedSectionIds?.length
    ? []
    : settings.blockedSections.flatMap((name) => LEGACY_GROUP_IDS[name] || []);
  const selectedSectionIds = [...new Set([
    ...(settings.selectedSectionIds || []),
    ...(settings.blockedSectionIds || []),
    ...legacyGroupIds
  ].map(Number))];
  return { ...settings, selectedSectionIds, blockedSectionIds: [] };
}

function migrateContentTypes(settings) {
  if (settings.contentTypesConfigured) return settings;
  const selectedContentTypes = [];
  if (settings.blockAds) selectedContentTypes.push("ads");
  if (settings.blockLive) selectedContentTypes.push("live");
  if (settings.blockMedia) selectedContentTypes.push("bangumi", "guochuang", "movie", "tv", "documentary");
  if (settings.blockManga) selectedContentTypes.push("manga");
  return { ...settings, selectedContentTypes, contentTypesConfigured: true };
}

for (const group of SECTION_GROUPS) {
  const details = document.createElement("details");
  details.className = "section-group";
  details.dataset.search = `${group.name} ${group.children.map((child) => child.name).join(" ")}`.toLocaleLowerCase();
  details.innerHTML = `<summary><label><input type="checkbox" data-section-group="${group.id}"><strong>${group.name}</strong></label><small>${group.children.length} 个子分区</small></summary><div class="section-children"></div>`;
  const children = details.querySelector(".section-children");
  for (const child of group.children) {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" data-section-id="${child.id}" data-parent-id="${group.id}"><span>${child.name}</span>`;
    children.append(label);
  }
  sectionsElement.append(details);
}

for (const [id, name, description] of CONTENT_TYPES) {
  const label = document.createElement("label");
  label.className = "filter";
  label.innerHTML = `<span><strong>${name}</strong><small>${description}</small></span><input data-content-type="${id}" type="checkbox">`;
  document.querySelector("#content-type-list").append(label);
}

function render(settings, count = 0) {
  for (const input of document.querySelectorAll("[data-setting]")) input.checked = Boolean(settings[input.dataset.setting]);
  for (const input of document.querySelectorAll("[data-content-type]")) input.checked = settings.selectedContentTypes.includes(input.dataset.contentType);
  const selectedIds = new Set(settings.selectedSectionIds.map(Number));
  for (const group of SECTION_GROUPS) {
    const parent = document.querySelector(`[data-section-group="${group.id}"]`);
    const selectedChildren = group.children.filter((child) => selectedIds.has(child.id)).length;
    parent.checked = selectedIds.has(group.id) || selectedChildren === group.children.length;
    parent.indeterminate = !parent.checked && selectedChildren > 0;
    for (const child of group.children) {
      document.querySelector(`[data-section-id="${child.id}"]`).checked = parent.checked || selectedIds.has(child.id);
    }
  }
  if (document.activeElement !== uploadersElement) uploadersElement.value = settings.blockedUploaders.join("\n");
  if (document.activeElement !== aiPreferenceElement) aiPreferenceElement.value = settings.aiPreference;
  if (document.activeElement !== thresholdElement) thresholdElement.value = settings.aiThreshold;
  thresholdValue.textContent = `${Math.round(settings.aiThreshold * 100)}%`;
  document.querySelector("#ai-state").textContent = settings.aiEnabled ? "已开启" : "";
  renderPresetOptions(settings);
  document.body.classList.toggle("disabled", !settings.enabled);
  const selectedChildCount = document.querySelectorAll("[data-section-id]:checked").length;
  document.querySelector("#section-count").textContent = selectedChildCount ? `已选 ${selectedChildCount}` : "";
  document.querySelector("#content-type-count").textContent = settings.selectedContentTypes.length ? `已选 ${settings.selectedContentTypes.length}` : "";
  document.querySelector("#section-warning").textContent = "";
  document.querySelector("#uploader-count").textContent = settings.blockedUploaders.length ? `已有 ${settings.blockedUploaders.length}` : "";
  statusText.textContent = settings.enabled ? "本页已屏蔽" : "屏蔽已暂停";
  countElement.textContent = settings.enabled ? String(count) : "—";
}

function renderPresetOptions(settings) {
  const select = document.querySelector("#preset");
  const signature = JSON.stringify(settings.savedPresets.map(({ id, name }) => [id, name]));
  if (select.dataset.signature !== signature) {
    select.replaceChildren(new Option("选择已保存预设", ""));
    for (const preset of settings.savedPresets) select.add(new Option(preset.name, preset.id));
    select.dataset.signature = signature;
  }
  select.value = settings.activePreset || "";
  document.querySelector("#delete-preset").disabled = !settings.activePreset;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value) || 0);
}

function renderTokenUsage(usage = EMPTY_USAGE) {
  document.querySelector("#token-total").textContent = formatNumber(usage.total);
  document.querySelector("#token-input").textContent = formatNumber(usage.input);
  document.querySelector("#token-output").textContent = formatNumber(usage.output);
  document.querySelector("#token-requests").textContent = formatNumber(usage.requests);
}

async function currentSettings() { return chrome.storage.sync.get(DEFAULT_SETTINGS); }

document.addEventListener("change", async (event) => {
  const input = event.target;
  if (input.id === "preset") return;
  if (input.dataset.setting) {
    const update = { [input.dataset.setting]: input.checked };
    if (input.dataset.setting !== "enabled") update.activePreset = "";
    await chrome.storage.sync.set(update);
  }
  if (input.dataset.contentType) {
    const selectedContentTypes = [...document.querySelectorAll("[data-content-type]:checked")]
      .map((item) => item.dataset.contentType);
    await chrome.storage.sync.set({ selectedContentTypes, contentTypesConfigured: true, activePreset: "" });
  }
  if (input.dataset.sectionGroup) {
    const group = input.closest(".section-group");
    for (const child of group.querySelectorAll("[data-section-id]")) child.checked = input.checked;
  }
  if (input.dataset.sectionGroup || input.dataset.sectionId) {
    const selectedSectionIds = [];
    for (const group of SECTION_GROUPS) {
      const parent = document.querySelector(`[data-section-group="${group.id}"]`);
      const children = [...document.querySelectorAll(`[data-parent-id="${group.id}"]`)];
      const all = children.every((child) => child.checked);
      const some = children.some((child) => child.checked);
      parent.checked = all;
      parent.indeterminate = !all && some;
      if (all) selectedSectionIds.push(group.id);
      else selectedSectionIds.push(...children.filter((child) => child.checked).map((child) => Number(child.dataset.sectionId)));
    }
    await chrome.storage.sync.set({ selectedSectionIds, activePreset: "" });
  }
  render(await currentSettings(), Number(countElement.textContent) || 0);
});

document.querySelector("#preset").addEventListener("change", async (event) => {
  const activePreset = event.target.value;
  const settings = await currentSettings();
  const preset = settings.savedPresets.find((item) => item.id === activePreset);
  if (!preset) { await chrome.storage.sync.set({ activePreset: "" }); return; }
  const migratedConfig = migrateContentTypes(migrateSectionIds(preset.config));
  await chrome.storage.sync.set({ ...migratedConfig, sectionMode: "block", activePreset });
  document.querySelector("#preset-name").value = preset.name;
  render(await currentSettings(), Number(countElement.textContent) || 0);
});

document.querySelector("#section-search").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLocaleLowerCase();
  for (const group of document.querySelectorAll(".section-group")) {
    group.hidden = Boolean(query && !group.dataset.search.includes(query));
    if (query && !group.hidden) group.open = true;
  }
});

function setAllSections(checked) {
  for (const input of document.querySelectorAll("[data-section-group], [data-section-id]")) input.checked = checked;
  document.querySelector("[data-section-group]").dispatchEvent(new Event("change", { bubbles: true }));
}
document.querySelector("#select-all-sections").addEventListener("click", () => setAllSections(true));
document.querySelector("#clear-sections").addEventListener("click", () => setAllSections(false));
async function setAllContentTypes(checked) {
  for (const input of document.querySelectorAll("[data-content-type]")) input.checked = checked;
  const selectedContentTypes = checked ? CONTENT_TYPES.map(([id]) => id) : [];
  await chrome.storage.sync.set({ selectedContentTypes, contentTypesConfigured: true, activePreset: "" });
  render(await currentSettings(), Number(countElement.textContent) || 0);
}
document.querySelector("#select-all-types").addEventListener("click", () => setAllContentTypes(true));
document.querySelector("#clear-types").addEventListener("click", () => setAllContentTypes(false));

document.querySelector("#save-preset").addEventListener("click", async () => {
  const name = document.querySelector("#preset-name").value.trim();
  const state = document.querySelector("#preset-state");
  if (!name) { state.textContent = "请先输入预设名称"; return; }
  const settings = await currentSettings();
  const config = Object.fromEntries(PRESET_KEYS.map((key) => [key, settings[key]]));
  const existing = settings.savedPresets.find((item) => item.name === name);
  let savedPresets;
  let activePreset;
  if (existing) {
    activePreset = existing.id;
    savedPresets = settings.savedPresets.map((item) => item.id === existing.id ? { ...item, config } : item);
  } else {
    if (settings.savedPresets.length >= 10) { state.textContent = "最多保存 10 个预设"; return; }
    activePreset = crypto.randomUUID();
    savedPresets = [...settings.savedPresets, { id: activePreset, name, config }];
  }
  await chrome.storage.sync.set({ savedPresets, activePreset });
  state.textContent = existing ? "预设已更新" : "预设已保存";
  render(await currentSettings(), Number(countElement.textContent) || 0);
});

document.querySelector("#delete-preset").addEventListener("click", async () => {
  const settings = await currentSettings();
  if (!settings.activePreset) return;
  const savedPresets = settings.savedPresets.filter((item) => item.id !== settings.activePreset);
  await chrome.storage.sync.set({ savedPresets, activePreset: "" });
  document.querySelector("#preset-name").value = "";
  document.querySelector("#preset-state").textContent = "预设已删除";
  render(await currentSettings(), Number(countElement.textContent) || 0);
});

uploadersElement.addEventListener("input", () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const blockedUploaders = [...new Set(uploadersElement.value.split(/[\n,，]+/).map((item) => item.trim()).filter(Boolean))];
    await chrome.storage.sync.set({ blockedUploaders, activePreset: "" });
    render(await currentSettings(), Number(countElement.textContent) || 0);
  }, 400);
});

aiPreferenceElement.addEventListener("input", () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await chrome.storage.sync.set({ aiPreference: aiPreferenceElement.value.trim(), activePreset: "" });
    render(await currentSettings(), Number(countElement.textContent) || 0);
  }, 400);
});

thresholdElement.addEventListener("input", () => {
  thresholdValue.textContent = `${Math.round(Number(thresholdElement.value) * 100)}%`;
});
thresholdElement.addEventListener("change", async () => {
  await chrome.storage.sync.set({ aiThreshold: Number(thresholdElement.value), activePreset: "" });
});

async function getProviderStorage() {
  return chrome.storage.local.get({ aiProvider: "minimax", aiProviderConfigs: {}, minimaxApiKey: "", minimaxModel: "MiniMax-M3" });
}

async function loadProvider(provider) {
  const local = await getProviderStorage();
  const saved = local.aiProviderConfigs[provider] || {};
  const defaults = AI_PROVIDER_DEFAULTS[provider];
  aiProviderElement.value = provider;
  aiApiKeyElement.value = saved.apiKey || (provider === "minimax" ? local.minimaxApiKey : "");
  aiEndpointElement.value = saved.endpoint || defaults.endpoint;
  aiModelElement.value = saved.model || (provider === "minimax" ? local.minimaxModel : defaults.model);
}

async function saveAiProviderSettings() {
  const provider = aiProviderElement.value;
  const endpoint = aiEndpointElement.value.trim();
  if (provider === "custom" && endpoint) {
    try {
      const origin = `${new URL(endpoint).origin}/*`;
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) throw new Error("未授予自定义接口访问权限");
    } catch (error) {
      document.querySelector("#ai-save-state").textContent = error.message || "接口地址无效";
      return;
    }
  }
  const local = await getProviderStorage();
  const aiProviderConfigs = {
    ...local.aiProviderConfigs,
    [provider]: { apiKey: aiApiKeyElement.value.trim(), endpoint, model: aiModelElement.value.trim() }
  };
  await chrome.storage.local.set({ aiProvider: provider, aiProviderConfigs, aiLastError: "" });
  await chrome.runtime.sendMessage({ type: "BILILESS_AI_CLEAR_CACHE" });
  await notifyAiConfigChanged();
  document.querySelector("#ai-save-state").textContent = "AI 设置已保存在本机";
}

aiProviderElement.addEventListener("change", async () => {
  await chrome.storage.local.set({ aiProvider: aiProviderElement.value });
  await loadProvider(aiProviderElement.value);
  await chrome.runtime.sendMessage({ type: "BILILESS_AI_CLEAR_CACHE" });
  await notifyAiConfigChanged();
  document.querySelector("#ai-save-state").textContent = "请填写该服务的 API Key";
});
aiApiKeyElement.addEventListener("change", saveAiProviderSettings);
aiEndpointElement.addEventListener("change", saveAiProviderSettings);
aiModelElement.addEventListener("change", saveAiProviderSettings);

async function notifyAiConfigChanged() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && tab.url?.includes("bilibili.com")) {
    await chrome.tabs.sendMessage(tab.id, { type: "BILILESS_AI_CONFIG_CHANGED" }).catch(() => {});
  }
}
document.querySelector("#reset-token-usage").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "BILILESS_AI_RESET_USAGE" });
  renderTokenUsage();
});

async function initialize() {
  let settings = migrateContentTypes(migrateSectionIds(await currentSettings()));
  const storedSettings = await currentSettings();
  if (JSON.stringify(storedSettings.selectedSectionIds) !== JSON.stringify(settings.selectedSectionIds) || storedSettings.blockedSectionIds.length) {
    await chrome.storage.sync.set({ selectedSectionIds: settings.selectedSectionIds, blockedSectionIds: [] });
  }
  if (!storedSettings.contentTypesConfigured) {
    await chrome.storage.sync.set({ selectedContentTypes: settings.selectedContentTypes, contentTypesConfigured: true });
  }
  if (storedSettings.sectionMode !== "block") await chrome.storage.sync.set({ sectionMode: "block" });
  const localSettings = await chrome.storage.local.get({
    aiProvider: "minimax", aiProviderConfigs: {}, minimaxApiKey: "", minimaxModel: "MiniMax-M3",
    aiLastError: "", aiTokenUsage: EMPTY_USAGE
  });
  await loadProvider(localSettings.aiProvider);
  renderTokenUsage(localSettings.aiTokenUsage);
  if (localSettings.aiLastError) document.querySelector("#ai-save-state").textContent = localSettings.aiLastError;
  render(settings);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes("bilibili.com")) { statusText.textContent = "请在哔哩哔哩页面使用"; return; }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "BILILESS_GET_STATUS" });
    // 配置以 storage 为唯一来源，页面消息只提供当前页计数。
    // 这样即使页面仍运行旧版内容脚本，也不会覆盖新设置。
    render(await currentSettings(), response.count);
  } catch { statusText.textContent = "刷新页面后即可生效"; }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "BILILESS_COUNT" && document.querySelector("#enabled").checked) countElement.textContent = String(message.count);
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.aiTokenUsage) renderTokenUsage(changes.aiTokenUsage.newValue);
});
initialize();
