const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中介軟體
app.use(cors());
app. use(express.json());

// ========== 從環境變數載入 API Keys ==========
let authorizedApiKeys = {};

try {
  // 從環境變數解析 JSON 格式的 API Keys
  if (process.env.AUTHORIZED_API_KEYS) {
    authorizedApiKeys = JSON.parse(process.env.AUTHORIZED_API_KEYS);
    console.log(`✓ 已載入 ${Object.keys(authorizedApiKeys). length} 個授權的 API Keys`);
  } else {
    console.warn('⚠️  未設定 AUTHORIZED_API_KEYS 環境變數');
  }
} catch (error) {
  console.error('❌ 解析 AUTHORIZED_API_KEYS 失敗:', error.message);
  console.error('請確認環境變數格式正確（必須是有效的 JSON）');
}

// Admin Key（用於管理操作）
const ADMIN_API_KEY = process. env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.warn('⚠️  未設定 ADMIN_API_KEY，管理功能將無法使用');
}

// ========== 工具函式 ==========

// 生成隨機 API Key（用於建議，不會自動生效）
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// 驗證 API Key 是否有效
function isValidApiKey(apiKey) {
  return authorizedApiKeys[apiKey] && authorizedApiKeys[apiKey].active !== false;
}

// 驗證是否為 Admin
function isAdmin(apiKey) {
  return apiKey === ADMIN_API_KEY && ADMIN_API_KEY !== undefined;
}

// 記錄 API 使用情況（稽核）
function logApiUsage(apiKey, endpoint, method) {
  const user = authorizedApiKeys[apiKey];
  const timestamp = new Date().toISOString();
  
  console.log(`[API_AUDIT] ${timestamp} | User: ${user?. name || 'Unknown'} | ${method} ${endpoint}`);
  
  // TODO: 在生產環境中，這裡應該寫入到日誌檔案或資料庫
}

// ========== 中介軟體：驗證 API Key ==========
function authenticateApiKey(req, res, next) {
  // 從 header 取得 API Key（不接受 query string，更安全）
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: '未提供 API Key',
      message: '請在 HTTP Header 中加入 X-API-Key',
      documentation: 'https://github.com/113120067/CwaWeather-backend#api-key-申請流程'
    });
  }
  
  if (!isValidApiKey(apiKey)) {
    return res.status(403).json({
      success: false,
      error: 'API Key 無效或未經授權',
      message: '請確認您的 API Key 是否正確，或聯絡管理員'
    });
  }
  
  // 記錄使用情況
  logApiUsage(apiKey, req.path, req.method);
  
  // 將使用者資訊附加到 request
  req.user = authorizedApiKeys[apiKey];
  req.apiKey = apiKey;
  
  next();
}

// ========== 中介軟體：驗證 Admin 權限 ==========
function authenticateAdmin(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !isAdmin(apiKey)) {
    return res.status(403).json({
      success: false,
      error: '需要管理員權限'
    });
  }
  
  next();
}

// ========== 公開路由（不需驗證）==========

// 首頁
app.get('/', (req, res) => {
  res.json({
    service: 'CWA 天氣預報 API',
    version: '2.0. 0',
    documentation: {
      applyApiKey: '請到 GitHub Issues 申請 API Key',
      githubRepo: 'https://github.com/113120067/CwaWeather-backend',
      issueTemplate: 'https://github.com/113120067/CwaWeather-backend/issues/new? template=api-key-request.md'
    },
    endpoints: {
      health: 'GET /api/health - 健康檢查（公開）',
      weather: 'GET /api/weather/kaohsiung - 取得高雄天氣（需驗證）',
      config: 'GET /api/config - 取得設定（需驗證）'
    },
    authentication: {
      method: 'API Key',
      header: 'X-API-Key: YOUR_API_KEY',
      security: '所有 API Key 需經過人工審核後由管理員設定'
    }
  });
});

// 健康檢查（公開）
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(). toISOString(),
    environment: process.env.NODE_ENV || 'development',
    authorizedUsers: Object.keys(authorizedApiKeys). length
  });
});

// ========== API Key 申請說明 ==========

// 申請 API Key 的說明（不實際處理申請）
app.post('/api/auth/apply', (req, res) => {
  const suggestedKey = generateApiKey();
  
  res.json({
    success: false,
    message: 'API Key 需要人工審核',
    instructions: {
      step1: '前往 GitHub Issues 提交申請',
      step2: '填寫申請表單（姓名、Email、用途）',
      step3: '等待管理員審核（1-3 個工作天）',
      step4: '審核通過後，管理員會將 API Key 以安全方式提供給您',
      githubIssueUrl: 'https://github. com/113120067/CwaWeather-backend/issues/new?template=api-key-request.md'
    },
    suggestedApiKey: {
      note: '這是系統建議的 API Key，僅供參考',
      key: suggestedKey,
      warning: '此 Key 尚未啟用，必須由管理員加入環境變數後才能使用'
    }
  });
});

// 驗證 API Key（公開，用於測試）
app.get('/api/auth/verify', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: '未提供 API Key',
      hint: '請在 Header 中加入 X-API-Key'
    });
  }
  
  const valid = isValidApiKey(apiKey);
  
  if (valid) {
    const user = authorizedApiKeys[apiKey];
    res.json({
      success: true,
      valid: true,
      info: {
        name: user. name,
        email: user. email,
        createdAt: user.createdAt,
        permissions: user.permissions || ['read']
      }
    });
  } else {
    res.status(403).json({
      success: false,
      valid: false,
      message: 'API Key 無效或未經授權'
    });
  }
});

// ========== 管理員專用路由 ==========

// 列出所有授權的 API Keys（僅管理員）
app.get('/api/admin/keys', authenticateAdmin, (req, res) => {
  const keys = Object.entries(authorizedApiKeys). map(([key, info]) => ({
    apiKey: key. substring(0, 12) + '...' + key.substring(key.length - 4), // 部分遮罩
    name: info.name,
    email: info.email,
    createdAt: info.createdAt,
    permissions: info.permissions || ['read'],
    active: info.active !== false
  }));
  
  res.json({
    success: true,
    total: keys.length,
    keys: keys
  });
});

// 查看稽核日誌（僅管理員）
app. get('/api/admin/audit', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    message: '稽核日誌功能',
    note: '請查看伺服器 console 或日誌檔案',
    suggestion: '建議在生產環境中整合 Winston 或 Bunyan 日誌系統'
  });
});

// ========== 需要驗證的路由 ==========

// Yes/No 設定儲存
const configStore = {
  maintenance_mode: 'no',
  api_enabled: 'yes',
  feature_weather: 'yes',
  feature_alerts: 'no'
};

function isValidYesNo(value) {
  return value === 'yes' || value === 'no';
}

// 檢查寫入權限
function hasWritePermission(user) {
  return user.permissions && user.permissions.includes('write');
}

// 取得所有設定（需要驗證）
app.get('/api/config', authenticateApiKey, (req, res) => {
  res.json({
    success: true,
    data: configStore,
    requestedBy: req.user.name,
    timestamp: new Date().toISOString()
  });
});

// 取得特定設定（需要驗證）
app.get('/api/config/:key', authenticateApiKey, (req, res) => {
  const { key } = req.params;
  
  if (configStore. hasOwnProperty(key)) {
    res.json({
      success: true,
      key: key,
      value: configStore[key],
      requestedBy: req.user.name,
      timestamp: new Date().toISOString()
    });
  } else {
    res. status(404).json({
      success: false,
      error: '設定項目不存在',
      key: key
    });
  }
});

// 更新特定設定（需要驗證 + 寫入權限）
app. post('/api/config/:key', authenticateApiKey, (req, res) => {
  // 檢查寫入權限
  if (!hasWritePermission(req.user)) {
    return res.status(403).json({
      success: false,
      error: '權限不足',
      message: '您的 API Key 沒有寫入權限，請聯絡管理員'
    });
  }
  
  const { key } = req.params;
  const { value } = req.body;
  
  if (! value) {
    return res.status(400).json({
      success: false,
      error: '請提供 value 欄位'
    });
  }
  
  if (! isValidYesNo(value)) {
    return res.status(400).json({
      success: false,
      error: '值必須是 "yes" 或 "no"',
      received: value
    });
  }
  
  const oldValue = configStore[key];
  configStore[key] = value;
  
  // 記錄變更
  console.log(`[CONFIG_CHANGE] ${req.user.name} changed ${key}: ${oldValue} → ${value}`);
  
  res.json({
    success: true,
    message: '設定已更新',
    key: key,
    oldValue: oldValue,
    newValue: value,
    updatedBy: req.user.name,
    timestamp: new Date().toISOString()
  });
});

// 批次更新設定（需要驗證 + 寫入權限）
app.post('/api/config/batch', authenticateApiKey, (req, res) => {
  if (!hasWritePermission(req.user)) {
    return res.status(403).json({
      success: false,
      error: '權限不足',
      message: '您的 API Key 沒有寫入權限'
    });
  }
  
  const { configs } = req.body;
  
  if (!configs || typeof configs !== 'object') {
    return res.status(400). json({
      success: false,
      error: '請提供 configs 物件'
    });
  }
  
  const errors = [];
  
  for (const [key, value] of Object.entries(configs)) {
    if (! isValidYesNo(value)) {
      errors.push({ key, value, error: '值必須是 "yes" 或 "no"' });
    }
  }
  
  if (errors. length > 0) {
    return res.status(400).json({
      success: false,
      error: '部分值無效',
      errors: errors
    });
  }
  
  const updated = [];
  const changes = [];
  
  for (const [key, value] of Object.entries(configs)) {
    const oldValue = configStore[key];
    configStore[key] = value;
    updated.push(key);
    changes.push({ key, oldValue, newValue: value });
  }
  
  console.log(`[CONFIG_BATCH] ${req.user.name} updated ${updated.length} configs`);
  
  res. json({
    success: true,
    message: '批次更新完成',
    updated: updated,
    changes: changes,
    updatedBy: req.user.name,
    timestamp: new Date(). toISOString()
  });
});

// 高雄天氣預報（需要驗證）
app.get('/api/weather/kaohsiung', authenticateApiKey, async (req, res) => {
  try {
    // 檢查功能是否啟用
    if (configStore.feature_weather === 'no') {
      return res.status(503).json({
        success: false,
        error: '天氣功能暫時關閉',
        message: '請稍後再試'
      });
    }
    
    // 您原有的天氣 API 程式碼
    // const response = await axios.get(CWA_API_URL);
    
    res.json({
      success: true,
      message: '這是天氣資料（範例）',
      requestedBy: req.user.name,
      data: {
        city: '高雄市',
        // ...  天氣資料
      }
    });
  } catch (error) {
    console.error('[WEATHER_ERROR]', error. message);
    res.status(500).json({
      success: false,
      error: '無法取得天氣資料'
    });
  }
});

// ========== 錯誤處理 ==========

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API 端點不存在',
    path: req.path
  });
});

// 全域錯誤處理
app. use((err, req, res, next) => {
  console. error('[ERROR]', err);
  res.status(500).json({
    success: false,
    error: '伺服器錯誤',
    message: process.env.NODE_ENV === 'development' ? err.message : '請聯絡管理員'
  });
});

// ========== 啟動伺服器 ==========

app.listen(PORT, () => {
  console.log('\n=================================');
  console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);
  console.log(`📝 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`👥 授權用戶: ${Object.keys(authorizedApiKeys).length}`);
  console.log(`🔐 Admin Key: ${ADMIN_API_KEY ?  '已設定' : '未設定'}`);
  console.log('=================================\n');
});