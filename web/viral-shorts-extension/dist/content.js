"use strict";
(() => {
  // viral-shorts-extension/src/content.ts
  var LOCAL_HOST = "http://localhost:3000";
  function customConfirm(message, defaultValue = null) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:99999999;display:flex;align-items:center;justify-content:center;";
      const dialog = document.createElement("div");
      dialog.style.cssText = "background:#1f2937;color:#fff;padding:24px;border-radius:12px;max-width:450px;width:90%;font-family:sans-serif;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);font-size:14px;line-height:1.6;white-space:pre-wrap;";
      const msgDiv = document.createElement("div");
      msgDiv.innerText = message;
      dialog.appendChild(msgDiv);
      let inputEl = null;
      if (defaultValue !== null) {
        inputEl = document.createElement("input");
        inputEl.value = defaultValue;
        inputEl.style.cssText = "width:100%; box-sizing:border-box; margin-top:16px; padding:10px; border-radius:6px; border:1px solid #4b5563; background:#374151; color:#fff; font-family:monospace; font-size:14px; focus:outline-none;";
        dialog.appendChild(inputEl);
      }
      const btnContainer = document.createElement("div");
      btnContainer.style.cssText = "margin-top:24px;display:flex;justify-content:flex-end;gap:12px;";
      const cancelBtn = document.createElement("button");
      cancelBtn.innerText = "\u53D6\u6D88";
      cancelBtn.style.cssText = "padding:8px 16px;border:none;border-radius:6px;background:#374151;color:#fff;cursor:pointer;font-weight:bold;";
      cancelBtn.onmouseover = () => cancelBtn.style.background = "#4b5563";
      cancelBtn.onmouseout = () => cancelBtn.style.background = "#374151";
      cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(false);
      };
      const okBtn = document.createElement("button");
      okBtn.innerText = "\u786E\u5B9A\u63D0\u53D6";
      okBtn.style.cssText = "padding:8px 16px;border:none;border-radius:6px;background:#3b82f6;color:#fff;cursor:pointer;font-weight:bold;";
      okBtn.onmouseover = () => okBtn.style.background = "#2563eb";
      okBtn.onmouseout = () => okBtn.style.background = "#3b82f6";
      okBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(inputEl ? inputEl.value.trim() : true);
      };
      btnContainer.appendChild(cancelBtn);
      btnContainer.appendChild(okBtn);
      dialog.appendChild(btnContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }
  async function fetchTargetId() {
    let targetId = "VS_Generic_Asset_" + Math.floor(Math.random() * 1e3);
    try {
      const ctxRes = await fetch(`${LOCAL_HOST}/api/extension/active-context`, { mode: "cors" });
      const ctxData = await ctxRes.json();
      if (ctxData.success && ctxData.data) {
        const { projectId, index } = ctxData.data;
        const targetType = ctxData.data.targetType;
        const safeProjectId = (projectId || "Proj").replace(/[^\w\u4e00-\u9fa5]/g, "").replace("projects", "");
        
        if (ctxData.data.meta && ctxData.data.meta.charName) {
            targetId = ctxData.data.meta.charName;
        } else {
            if (targetType === "sceneImage") {
              targetId = `${safeProjectId}_S${index}_Img`;
            } else if (targetType === "sceneStartImage") {
              targetId = `${safeProjectId}_S${index}_StartImg`;
            } else if (targetType === "sceneVideo") {
              targetId = `${safeProjectId}_S${index}_Vid`;
            } else if (targetType === "locationImage") {
              targetId = "\u573A\u666F";
            } else if (targetType === "sceneLocationImage") {
              targetId = `\u573A\u666F_S${index}`;
            } else if (targetType === "characterImage") {
              targetId = `${safeProjectId}_Char${index}`;
            } else if (targetType === "coverImage" && ctxData.data.meta) {
              const safeRatio = (ctxData.data.meta.ratio || "").replace(":", "x");
              targetId = `${safeProjectId}_Cover_${safeRatio}`;
            }
        }
      }
    } catch (e) {
      console.warn("Failed fetching context, using random ID", e);
    }
    return targetId;
  }
  var currentHoveredMedia = null;
  var currentMediaType = null;
  var buttonTimeout = null;
  var isButtonLocked = false;
  var floatContainer = document.createElement("div");
  floatContainer.className = "vs-extension-floating-container";
  floatContainer.style.cssText = "position:fixed; z-index:9999999; display:none; gap:8px; align-items:center; transition:opacity 0.2s;";
  var copyBtn = document.createElement("button");
  copyBtn.style.cssText = "padding:4px 8px; font-size:11px; border:none; border-radius:4px; background:rgba(59, 130, 246, 0.9); color:#fff; cursor:pointer; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.2);";
  copyBtn.innerText = "\u{1F4CB} \u590D\u5236\u9632\u4F2A\u540D";
  var extractBtn = document.createElement("button");
  extractBtn.style.cssText = "padding:4px 8px; font-size:11px; border:none; border-radius:4px; background:rgba(234, 88, 12, 0.9); color:#fff; cursor:pointer; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.2);";
  floatContainer.appendChild(copyBtn);
  floatContainer.appendChild(extractBtn);
  document.body.appendChild(floatContainer);
  function hideButton() {
    if (isButtonLocked) return;
    floatContainer.style.display = "none";
    currentHoveredMedia = null;
  }
  document.addEventListener("mousemove", (e) => {
    if (isButtonLocked) return;
    const target = e.target;
    let mediaEl = null;
    if (target.tagName === "IMG" || target.tagName === "VIDEO") {
      mediaEl = target;
    } else if (target.querySelector && (target.querySelector("img") || target.querySelector("video"))) {
      mediaEl = target.querySelector("img") || target.querySelector("video");
    } else if (target.closest) {
      const wrapper = target.closest('div[role="button"], div[class*="media"]');
      if (wrapper) {
        mediaEl = wrapper.querySelector("img") || wrapper.querySelector("video");
      }
    }
    if (mediaEl && mediaEl.src && mediaEl.src.startsWith("http")) {
      const rect = mediaEl.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        if (currentHoveredMedia !== mediaEl) {
          currentHoveredMedia = mediaEl;
          currentMediaType = mediaEl.tagName.toLowerCase() === "img" ? "image" : "video";
          let topPos = rect.bottom - 30;
          let rightPos = window.innerWidth - rect.right + 10;
          if (topPos > window.innerHeight - 35) topPos = window.innerHeight - 35;
          if (rightPos < 10) rightPos = 10;
          floatContainer.style.left = "auto";
          floatContainer.style.right = rightPos + "px";
          floatContainer.style.top = topPos + "px";
          extractBtn.style.backgroundColor = "rgba(234, 88, 12, 0.9)";
          extractBtn.innerHTML = currentMediaType === "image" ? "\u{1F3AF} \u63D0\u53D6\u843D\u76D8" : "\u{1F3AC} \u63D0\u53D6\u89C6\u9891";
          floatContainer.style.display = "flex";
        }
        if (buttonTimeout) clearTimeout(buttonTimeout);
        return;
      }
    }
    if (e.target !== floatContainer && !floatContainer.contains(e.target)) {
      buttonTimeout = setTimeout(hideButton, 200);
    } else {
      if (buttonTimeout) clearTimeout(buttonTimeout);
    }
  });
  document.addEventListener("scroll", () => {
    if (!isButtonLocked) {
      hideButton();
    }
  }, false);
  copyBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyBtn.innerText = "\u23F3 \u62C9\u53D6\u4E2D...";
    const targetId = await fetchTargetId();
    try {
      await navigator.clipboard.writeText(targetId);
      copyBtn.innerText = "\u2705 " + targetId;
    } catch (err) {
      copyBtn.innerText = "\u274C \u5931\u8D25";
    }
    setTimeout(() => {
      copyBtn.innerText = "\u{1F4CB} \u590D\u5236\u9632\u4F2A\u540D";
    }, 2e3);
  });
  extractBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isButtonLocked) {
      isButtonLocked = false;
      hideButton();
      return;
    }
    const mediaEl = currentHoveredMedia;
    if (!mediaEl) {
      console.warn("[VS Extension] currentHoveredMedia is null at click time");
      return;
    }
    const mediaUrl = mediaEl.src || mediaEl.querySelector("source")?.src;
    if (!mediaUrl) {
      alert("\u65E0\u6CD5\u83B7\u53D6\u5A92\u4F53 URL");
      return;
    }
    const mediaType = currentMediaType || (mediaEl.tagName.toLowerCase() === "img" ? "image" : "video");
    isButtonLocked = true;
    try {
      extractBtn.innerHTML = "\u{1F504} \u62C9\u53D6\u5F15\u64CE\u4E0A\u4E0B\u6587...";
      let targetId = await fetchTargetId();
      let originalName = mediaEl.alt || mediaEl.title || "\u672A\u77E5\u622A\u56FE";
      try {
        await navigator.clipboard.writeText(targetId);
      } catch (err) {
        console.error("Failed to copy to clipboard", err);
      }
      let skipConfirm = false;
      try {
        const ctxCheck = await fetch(`${LOCAL_HOST}/api/extension/active-context`, { mode: "cors" });
        const ctxCheckData = await ctxCheck.json();
        if (ctxCheckData.success && ctxCheckData.data) {
          const tt = ctxCheckData.data.targetType;
          if (tt === "locationImage" || tt === "sceneLocationImage" || tt === "characterImage") {
            skipConfirm = true;
          }
        }
      } catch (e2) {
      }
      if (!skipConfirm) {
        const conf = await customConfirm(`\u3010\u4E00\u952E\u9632\u5D29\u6E83\u91CD\u547D\u540D\u3011

Google\u751F\u6210\u7684\u539F\u56FE\u663E\u793A\u4E3A\uFF1A
"${originalName.substring(0, 60)}..."

\u5982\u679C\u8FD9\u662F\u9996\u5E27\uFF0C\u8BF7\u786E\u4FDD\u540E\u7F00\u4E3A _StartImg
\u5982\u679C\u8FD9\u662F\u5C3E\u5E27\uFF0C\u8BF7\u786E\u4FDD\u540E\u7F00\u4E3A _Img

\u7CFB\u7EDF\u63A8\u6D4B\u5F53\u524D\u7684\u9632\u4F2A\u6807\u7B7E\u4E3A\uFF1A`, targetId);
        if (!conf) {
          extractBtn.innerHTML = "\u5DF2\u53D6\u6D88";
          isButtonLocked = false;
          setTimeout(() => {
            hideButton();
          }, 1e3);
          return;
        }
        targetId = typeof conf === "string" ? conf : targetId;
      }
      extractBtn.innerHTML = "\u23F3 \u6B63\u5728\u62C9\u53D6\u4ECB\u8D28...";
      let base64Data = null;
      try {
        const mediaFetchRes = await fetch(mediaUrl);
        if (!mediaFetchRes.ok) throw new Error(`Browser fetch failed: ${mediaFetchRes.status}`);
        const mediaBlob = await mediaFetchRes.blob();
        const reader = new FileReader();
        base64Data = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(mediaBlob);
        });
      } catch (e2) {
        console.warn("Could not fetch media directly from browser, will send URL for server-side fetch", e2);
      }
      extractBtn.innerHTML = "\u23F3 \u53D1\u9001\u843D\u76D8\u4E2D...";
      const pushRes = await fetch(`${LOCAL_HOST}/api/extension/push-asset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl,
          mediaType,
          referenceKeyword: targetId,
          base64Data
        }),
        mode: "cors"
      });
      const pushData = await pushRes.json();
      if (pushData.success) {
        extractBtn.style.backgroundColor = "#10b981";
        extractBtn.innerHTML = "\u2705 \u53D1\u9001\u5E76\u843D\u76D8\u6210\u529F\uFF01";
      } else {
        throw new Error(pushData.error);
      }
    } catch (err) {
      extractBtn.style.backgroundColor = "#ef4444";
      extractBtn.innerHTML = "\u274C \u5931\u8D25: " + err.message + " (\u70B9\u51FB\u5173\u95ED)";
      return;
    }
    setTimeout(() => {
      extractBtn.style.backgroundColor = "rgba(234, 88, 12, 0.9)";
      isButtonLocked = false;
      hideButton();
    }, 2e3);
  });
})();
