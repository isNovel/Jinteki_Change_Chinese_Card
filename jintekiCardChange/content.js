// Content script 簡化版本 - 主要用於錯誤處理和回退機制
(function () {
  'use strict';

  let isReplacing = false;

  // 從背景腳本獲取當前狀態
  if (window.location.hostname === 'www.jinteki.net') {
    chrome.runtime.sendMessage({ action: "getStatus" }, function (response) {
      if (response && response.isReplacing) {
        isReplacing = response.isReplacing;
        console.log('Content script loaded on jinteki.net, isReplacing:', isReplacing);
      }
    });
  }

  // 錯誤處理：如果中文圖片載入失敗，嘗試英文版本
  function handleImageError(img) {
    if (!img || !img.src) return;

    const currentSrc = img.src;

    // 如果當前是中文簡體版本且載入失敗，嘗試英文版本
    if (currentSrc.includes('play.sneakdoorbeta.net/img/cards/zh-simp/')) {
      const englishSrc = currentSrc
        .replace('https://play.sneakdoorbeta.net/img/cards/zh-simp/', 'https://play.sneakdoorbeta.net/img/cards/en/')
        .replace('.webp', '.webp'); // 保持webp格式

      console.log(`Chinese image failed, trying English: ${currentSrc} -> ${englishSrc}`);

      // 添加一次性錯誤處理器，如果英文版本也失敗則使用原始jinteki.net版本
      const fallbackHandler = function () {
        console.log(`English image also failed, using original jinteki.net version`);
        const originalSrc = currentSrc
          .replace('https://play.sneakdoorbeta.net/img/cards/zh-simp/', 'https://www.jinteki.net/img/cards/en/')
          .replace('.webp', '.png');
        img.src = originalSrc;
        img.removeEventListener('error', fallbackHandler);
      };

      img.addEventListener('error', fallbackHandler, { once: true });
      img.src = englishSrc;
    }
    // 如果是英文版本失敗，回退到原始版本
    else if (currentSrc.includes('play.sneakdoorbeta.net/img/cards/en/')) {
      console.log(`English image failed, using original jinteki.net version`);
      const originalSrc = currentSrc
        .replace('https://play.sneakdoorbeta.net/img/cards/en/', 'https://www.jinteki.net/img/cards/en/')
        .replace('.webp', '.png');
      img.src = originalSrc;
    }
  }

  // 設置錯誤處理器
  function setupErrorHandling() {
    // 監聽所有圖片的錯誤事件
    document.addEventListener('error', function (e) {
      if (e.target && e.target.tagName === 'IMG' && isReplacing) {
        handleImageError(e.target);
      }
    }, true);

    // 使用MutationObserver監聽新增的圖片
    const observer = new MutationObserver(function (mutations) {
      if (!isReplacing) return;

      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 為新圖片添加錯誤處理
              if (node.tagName === 'IMG') {
                node.addEventListener('error', function () {
                  handleImageError(node);
                }, { once: true });
              }

              // 為新元素內的圖片添加錯誤處理
              const images = node.querySelectorAll && node.querySelectorAll('img');
              if (images) {
                images.forEach(img => {
                  img.addEventListener('error', function () {
                    handleImageError(img);
                  }, { once: true });
                });
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 為現有圖片添加錯誤處理
  function setupExistingImages() {
    if (!isReplacing) return;

    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('error', function () {
        handleImageError(img);
      }, { once: true });
    });
  }

  // 監聽來自背景腳本的狀態變化
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "statusChanged") {
      isReplacing = request.isReplacing;
      console.log('Status changed in content script:', isReplacing);

      if (isReplacing) {
        setupExistingImages();
      }
    }
  });

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupErrorHandling();
      setupExistingImages();
    });
  } else {
    setupErrorHandling();
    setupExistingImages();
  }

})();