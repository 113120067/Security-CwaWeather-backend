# 管理員操作指南

## 📋 審核 API Key 申請流程

### 1. 收到申請

當有人提交 API Key 申請 Issue 時：

1. 檢查申請資訊是否完整
2. 評估使用目的是否合理
3. 決定是否核准

### 2. 生成 API Key

如果核准申請：

```bash
# 使用 Node.js 生成隨機金鑰
node -e "console.log(require('crypto'). randomBytes(32).toString('hex'))"
```

範例輸出：
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 3. 更新環境變數

#### 方法 A：修改 `.env` 檔案（本地開發）

編輯 `.env` 檔案：

```bash
AUTHORIZED_API_KEYS={"demo-key-12345":{"name":"測試帳號","email":"test@example.com","createdAt":"2025-12-01","permissions":["read"]},"NEW_API_KEY_HERE":{"name":"張三","email":"user@example.com","createdAt":"2025-12-01","permissions":["read","write"]}}
```

**注意**：整個 JSON 必須在同一行，不能有換行。

#### 方法 B：使用 GitHub Secrets（生產環境）

1. 前往 GitHub Repository
2. Settings → Secrets and variables → Actions
3. 點擊 "New repository secret"
4. Name: `AUTHORIZED_API_KEYS`
5. Value: 
```json
{
  "a1b2c3... ": {
    "name": "張三",
    "email": "user@example.com",
    "createdAt": "2025-12-01",
    "permissions": ["read", "write"]
  },
  "x9y8z7...": {
    "name": "李四",
    "email": "user2@example.com",
    "createdAt": "2025-12-02",
    "permissions": ["read"]
  }
}
```

#### 方法 C：在伺服器上設定（Production）

```bash
# 編輯環境變數
nano /etc/environment

# 或使用 systemd
nano /etc/systemd/system/cwa-weather.service

[Service]
Environment="AUTHORIZED_API_KEYS={... }"
```

### 4.  通知申請人

在 Issue 中回覆（不要直接貼 API Key！）：

```markdown
@申請人

您的 API Key 申請已核准！✅

API Key 已透過 Email 寄送至您申請時提供的信箱：`user@example.com`

請注意：
- API Key 只會顯示一次，請妥善保管
- 不要將 API Key 上傳到 Git 或公開分享
- 如有遺失，請重新提交申請

使用方式：
\`\`\`bash
curl https://your-api. com/api/config \
  -H "X-API-Key: YOUR_API_KEY"
\`\`\`

如有問題，歡迎隨時聯繫。
```

### 5. 關閉 Issue

審核完成後，標記 Issue 為 `approved` 或 `rejected`，然後關閉。

---

## 🔧 管理操作

### 查看所有 API Keys

```bash
curl http://localhost:3000/api/admin/keys \
  -H "X-API-Key: YOUR_ADMIN_KEY"
```

### 撤銷 API Key

編輯環境變數，將該 Key 的 `active` 設為 `false`：

```json
{
  "revoked-key-abc": {
    "name": "已撤銷的用戶",
    "email": "revoked@example.com",
    "createdAt": "2025-12-01",
    "permissions": ["read"],
    "active": false
  }
}
```

### 查看稽核日誌

所有 API 請求都會記錄在 console：

```
[API_AUDIT] 2025-12-01T10:30:00. 000Z | User: 張三 | GET /api/config
[CONFIG_CHANGE] 張三 changed maintenance_mode: no → yes
```

建議在生產環境中：
- 使用 `Winston` 或 `Bunyan` 記錄到檔案
- 整合 ELK Stack 或 Datadog 進行分析

---

## 🔐 安全檢查清單

- [ ] `. env` 檔案已加入 `. gitignore`
- [ ] GitHub Secrets 已正確設定
- [ ] Admin API Key 足夠複雜（至少 32 字元）
- [ ] 生產環境使用 HTTPS
- [ ] 定期審查授權的 API Keys
- [ ] 啟用 rate limiting（請求限制）
- [ ] 監控異常使用行為