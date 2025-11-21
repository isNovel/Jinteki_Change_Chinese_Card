// 背景脚本，处理状态管理和网络请求拦截
let isReplacing = false;
const RULE_IDS = [1, 2];

// 从储存中载入状态
chrome.storage.local.get(['isReplacing'], function (result) {
    isReplacing = result.isReplacing || false;
    console.log('Extension loaded, isReplacing:', isReplacing);
    updateNetworkRules();
});

// 更新网络拦截规则
async function updateNetworkRules() {
    try {
        // 获取现有的动态规则
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const existingRuleIds = existingRules.map(rule => rule.id);
        
        // 只移除我们的规则ID（如果存在）
        const ruleIdsToRemove = RULE_IDS.filter(id => existingRuleIds.includes(id));
        
        if (ruleIdsToRemove.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIdsToRemove
            });
            console.log('Removed existing rules:', ruleIdsToRemove);
        }

        if (isReplacing) {
            // 添加新的拦截规则
            const rules = [
                {
                    "id": 1,
                    "priority": 1,
                    "action": {
                        "type": "redirect",
                        "redirect": {
                            "regexSubstitution": "https://play.sneakdoorbeta.net/img/cards/zh-simp/\\1.webp"
                        }
                    },
                    "condition": {
                        "regexFilter": "^https://www\\.jinteki\\.net/img/cards/en/(.+)\\.png$",
                        "resourceTypes": ["image"]
                    }
                },
                {
                    "id": 2,
                    "priority": 1,
                    "action": {
                        "type": "redirect",
                        "redirect": {
                            "regexSubstitution": "https://play.sneakdoorbeta.net/img/cards/zh-simp/\\1.webp"
                        }
                    },
                    "condition": {
                        "regexFilter": "^https://www\\.jinteki\\.net/img/cards/zh-simp/(.+)\\.png$",
                        "resourceTypes": ["image"]
                    }
                }
            ];

            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: rules
            });

            console.log('Network redirection rules activated');
        } else {
            console.log('Network redirection rules disabled');
        }
    } catch (error) {
        console.error('Failed to update network rules:', error);
    }
}

// 通知所有jinteki.net标签页状态变化
async function notifyContentScripts(isReplacing) {
    try {
        const tabs = await chrome.tabs.query({ url: "https://www.jinteki.net/*" });
        
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: "statusChanged",
                    isReplacing: isReplacing
                });
            } catch (error) {
                // 忽略无法发送消息的标签页（例如尚未完全加载的页面）
                console.log(`Could not send message to tab ${tab.id}:`, error.message);
            }
        }
    } catch (error) {
        console.error('Error notifying content scripts:', error);
    }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);

    if (request.action === "toggle") {
        isReplacing = !isReplacing;

        // 储存状态
        chrome.storage.local.set({ isReplacing: isReplacing }, async function () {
            console.log('Status saved:', isReplacing);

            // 更新网络拦截规则
            await updateNetworkRules();

            // 通知content scripts
            await notifyContentScripts(isReplacing);

            sendResponse({ success: true, isReplacing: isReplacing });
        });

        return true; // 保持消息通道开启
    }

    if (request.action === "getStatus") {
        sendResponse({ isReplacing: isReplacing });
    }
});

// 监听储存变化
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (changes.isReplacing) {
        isReplacing = changes.isReplacing.newValue;
        console.log('Storage changed, new status:', isReplacing);
        updateNetworkRules();
        notifyContentScripts(isReplacing);
    }
});

// 扩展启动时初始化
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension startup');
    updateNetworkRules();
});

// 扩展安装时初始化
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
    updateNetworkRules();
});