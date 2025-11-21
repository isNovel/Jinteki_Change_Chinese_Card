document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusDiv = document.getElementById('statusDiv');

  // 更新UI显示
  function updateUI(isReplacing) {
    if (isReplacing) {
      toggleBtn.textContent = '关闭图片替换';
      statusDiv.textContent = '状态：图片替换已启动';
      statusDiv.style.color = '#28a745';
    } else {
      toggleBtn.textContent = '启动图片替换';
      statusDiv.textContent = '状态：图片替换已关闭';
      statusDiv.style.color = '#dc3545';
    }
  }

  // 获取当前状态并更新UI
  chrome.runtime.sendMessage({ action: "getStatus" }, function (response) {
    if (response) {
      updateUI(response.isReplacing);
    }
  });

  // 切换按钮点击事件
  toggleBtn.addEventListener('click', function () {
    toggleBtn.disabled = true;
    toggleBtn.textContent = '处理中...';

    chrome.runtime.sendMessage({ action: "toggle" }, function (response) {
      if (response && response.success) {
        updateUI(response.isReplacing);

        // 提示用户重新载入页面以应用变更
        if (response.isReplacing) {
          statusDiv.innerHTML = '<strong>状态：图片替换已启动</strong><br><small>变更将在重新载入后生效</small>';
        } else {
          statusDiv.innerHTML = '<strong>状态：图片替换已关闭</strong><br><small>变更将在重新载入后生效</small>';
        }
      }

      toggleBtn.disabled = false;
    });
  });
});