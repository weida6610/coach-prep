# 專案開發默契與指南 (Developer Guidelines)

## 📌 我們的核心開發哲學 (Rapport)
- **敏捷且高容錯**：遇到 API 限制或網路問題，不強迫使用者改變環境，而是從程式碼尋找「第二條路」（例如：建置雙引擎切換、Offline-First 機制）。
- **輕量與跨平台**：不需要冗長的框架編譯環境（不依賴 Node.js, React, Webpack 等），以乾淨的 Vanilla JavaScript、HTML、CSS 直接打造 Progressive Web App (PWA)。
- **無縫接軌的使用者體驗**：隨時保持「樂觀更新 (Optimistic UI)」，畫面必須點擊瞬間給予回饋，網路行為與資料同步全部在背景靜默處理。

## 🛠️ 專屬技術棧 (Tech Stack)
1. **Frontend**: 純原生 HTML5 + CSS3 (使用 CSS Variables 建構設計系統) + Vanilla ES6 JS。
2. **Backend/Database**: 零伺服器架構 (Serverless) -> 依賴 Google Apps Script (GAS) 搭配 Google Sheets 作為關聯式雲端資料庫。
3. **PWA Architecture**:
   - `sw.js` 負責核心與圖片資源快取。
   - `manifest.json` 定義全螢幕與無邊框的沉浸式 APP 體驗。
   - `data.js` 統一管理 `localStorage` 並內建離線佇列 (`sync_queue`)，進行雲端資料讀寫。
4. **AI Integration**:
   - 雙核心支援：預設採用 OpenAI API (ChatGPT 4o-mini)，同時保留 Google Gemini (1.5-flash) 彈性切換。
   - 設計 Few-Shot 提示詞策略，使 AI 能分析過往歷史紀錄並模仿教練風格，而非僅是資料套版。

## 🎨 UI/UX 視覺與互動準則
1. **Modern Minimalist**: 採現代極簡風格，依賴 `padding`, `border-radius`, 與細緻的 `--text-secondary` 色階來營造呼吸感。
2. **Glassmorphism / Gradients**: 按鈕與卡片常使用線性漸層（例如紫綠漸層、深藍到青色）與適度的陰影效果，拒絕死板的原色塊。
3. **Micro-Animations**:
   - 頁面切換：所有換頁元件都必須掛載 `.fade-in` 搭配 `--stagger-delay` 實現順暢的瀑布流滑入特效。
   - 按鈕點擊：必須有 `:active` 狀態下的 `transform: scale(0.96)` 微縮回饋。
   - 提示氣泡 (Toast)：任何儲存、刪除動作，都由浮動式 `showToast()` 處理，不使用生硬的 `alert()`。

## 🔄 溝通模式與開發節奏
- 對話不需要繁文縟節，直接拋出「痛點」與「期待結果」。
- 遇到報錯，直接複製 Console 或紅字錯誤貼上即可，AI 助教將自動爬梳原始碼並修復。
- 修補功能時，注重「不破壞原有資料結構」並順手進行版本控制 (Git Commit / Service Worker 升級)。
