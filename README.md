## 🔑 API Key 申請流程

本 API 服務採用 API Key 驗證機制，所有 API Key 需經過人工審核。

### 申請步驟

1. **提交申請**
   - 前往 [GitHub Issues](https://github.com/113120067/CwaWeather-backend/issues/new? template=api-key-request.md)
   - 選擇「API Key 申請」模板
   - 填寫完整資訊

2. **等待審核**
   - 審核時間：1-3 個工作天
   - 管理員會評估申請內容

3. **接收 API Key**
   - 審核通過後，API Key 會透過 Email 寄送
   - **請妥善保管，API Key 只會顯示一次**

4. **開始使用**
   ```bash
   curl https://your-api.com/api/config \
     -H "X-API-Key: YOUR_API_KEY"
   ```

### API Key 使用規範

- ✅ 只在 HTTP Header 中傳送（不要用 query string）
- ✅ 儲存在環境變數中，不要硬編碼在程式碼
- ✅ 不要上傳到 Git 或公開分享
- ✅ 發現洩漏時立即聯絡管理員撤銷
- ❌ 不要與他人共用 API Key
- ❌ 不要超過核准的使用頻率

### 權限說明

- **Read 權限**：可以查詢資料
  - GET /api/config
  - GET /api/weather/kaohsiung
  
- **Write 權限**：可以修改設定
  - POST /api/config/:key
  - POST /api/config/batch

### 安全性

所有 API 請求都會被記錄，包括：
- 使用者名稱
- 請求時間
- 存取的端點
- 操作內容（如有修改資料）