(() => {
  "use strict";

  const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content;

  // --- サイドバー（モバイル） ---
  const toggle = document.querySelector("[data-menu-toggle]");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
  };
  toggle?.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  document.querySelector("[data-menu-close]")?.addEventListener("click", () => setMenu(false));

  // --- キーボードショートカット: "/" で検索 ---
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target.closest?.("input, textarea, select, [contenteditable]");
    if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      document.querySelector("[data-search-input]")?.focus();
    }
    if (event.key === "Escape") setMenu(false);
  });

  // --- 確認ダイアログ・二重送信防止 ---
  document.addEventListener("submit", (event) => {
    const form = event.target;
    const message = form.dataset.confirm;
    if (message && !window.confirm(message)) {
      event.preventDefault();
      return;
    }
    form.dataset.submitting = "true";
    form.querySelectorAll("[data-disable-with]").forEach((button) => {
      setTimeout(() => {
        button.disabled = true;
        button.value = button.dataset.disableWith;
      }, 0);
    });
  });

  // --- クリックでコピー ---
  document.querySelectorAll("[data-copy]").forEach((el) => {
    el.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(el.textContent.trim());
        el.classList.add("copied");
        setTimeout(() => el.classList.remove("copied"), 1200);
      } catch (_) { /* クリップボード非対応 */ }
    });
  });

  // --- 目次 ---
  const toc = document.querySelector("[data-toc]");
  if (toc) {
    const headings = document.querySelectorAll(".page > .markdown-body :is(h1, h2, h3)");
    if (headings.length >= 3) {
      const list = toc.querySelector("ol");
      headings.forEach((heading) => {
        const id = heading.id || heading.querySelector("a.anchor[id]")?.id;
        if (!id) return;
        const item = document.createElement("li");
        item.className = `toc-${heading.tagName.toLowerCase()}`;
        const link = document.createElement("a");
        link.href = `#${id}`;
        link.textContent = heading.textContent.trim();
        item.appendChild(link);
        list.appendChild(item);
      });
      toc.hidden = false;
    }
  }

  // --- エディタ ---
  const editor = document.querySelector("[data-editor]");
  if (!editor) return;

  const form = editor.closest("form");
  const textarea = editor.querySelector("[data-editor-textarea]");
  const preview = editor.querySelector("[data-editor-preview]");
  const uploadInput = editor.querySelector("[data-upload-input]");
  const initialValue = textarea.value;

  const insertText = (text) => {
    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.slice(0, start);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    textarea.setRangeText(`${prefix}${text}\n`, start, end, "end");
    textarea.dispatchEvent(new Event("input"));
  };

  // タブ切り替え（編集 / プレビュー）
  editor.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", async () => {
      editor.querySelectorAll("[data-tab]").forEach((t) => t.classList.toggle("active", t === tab));
      const showPreview = tab.dataset.tab === "preview";
      textarea.hidden = showPreview;
      preview.hidden = !showPreview;
      if (!showPreview) return textarea.focus();

      preview.innerHTML = '<p class="muted">プレビューを生成中...</p>';
      try {
        const body = new FormData();
        body.append("body", textarea.value);
        const response = await fetch(tab.dataset.previewUrl, {
          method: "POST",
          headers: { "X-CSRF-Token": csrfToken() },
          body,
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error(response.statusText);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        preview.innerHTML = doc.querySelector(".markdown-body")?.innerHTML || '<p class="muted">（内容がありません）</p>';
      } catch (error) {
        preview.innerHTML = `<p class="flash flash-alert">プレビューに失敗しました: ${error.message}</p>`;
      }
    });
  });

  // ファイルアップロード
  const uploadFiles = async (files) => {
    for (const file of files) {
      const placeholder = `<!-- ${file.name} をアップロード中... -->`;
      insertText(placeholder);
      const body = new FormData();
      body.append("file", file);
      let replacement = "";
      try {
        const response = await fetch(uploadInput.dataset.uploadUrl, {
          method: "POST",
          headers: { "X-CSRF-Token": csrfToken(), Accept: "application/json" },
          body,
          credentials: "same-origin",
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || response.statusText);
        replacement = json.markdown;
      } catch (error) {
        window.alert(`${file.name} のアップロードに失敗しました: ${error.message}`);
      }
      textarea.value = textarea.value.replace(placeholder, replacement);
      textarea.dispatchEvent(new Event("input"));
    }
  };

  uploadInput?.addEventListener("change", () => {
    uploadFiles([...uploadInput.files]);
    uploadInput.value = "";
  });
  textarea.addEventListener("dragover", (event) => {
    if ([...event.dataTransfer.types].includes("Files")) {
      event.preventDefault();
      textarea.classList.add("dragover");
    }
  });
  textarea.addEventListener("dragleave", () => textarea.classList.remove("dragover"));
  textarea.addEventListener("drop", (event) => {
    textarea.classList.remove("dragover");
    if (event.dataTransfer.files.length) {
      event.preventDefault();
      uploadFiles([...event.dataTransfer.files]);
    }
  });
  textarea.addEventListener("paste", (event) => {
    const files = [...(event.clipboardData?.files || [])];
    if (files.length) {
      event.preventDefault();
      uploadFiles(files);
    }
  });

  // Tab キーでインデント
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && !event.shiftKey && !event.isComposing && textarea.selectionStart === textarea.selectionEnd) {
      event.preventDefault();
      textarea.setRangeText("  ", textarea.selectionStart, textarea.selectionEnd, "end");
    }
  });

  // Ctrl/⌘ + S で保存
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  // 未保存の変更がある状態で離脱しようとしたら警告
  window.addEventListener("beforeunload", (event) => {
    if (form.dataset.submitting !== "true" && textarea.value !== initialValue) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
})();
