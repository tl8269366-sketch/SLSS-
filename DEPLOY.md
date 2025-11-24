# SLSS 系统部署指南

本文档详细说明如何将 SLSS (Server Lifecycle Service System) 部署到 Linux 生产环境，并推送到 GitHub。

## 1. 环境准备 (Linux Server)

确保服务器已安装以下基础环境 (以 Ubuntu/Debian 为例):

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 MySQL Server
sudo apt install -y mysql-server

# 安装 PM2 (进程管理)
sudo npm install -g pm2
```

## 2. 数据库配置

1. 登录 MySQL:
   ```bash
   sudo mysql
   ```
2. 创建数据库和用户:
   ```sql
   -- 创建数据库
   CREATE DATABASE slss_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   
   -- 创建用户 (请修改 'your_password' 为强密码)
   CREATE USER 'slss_user'@'localhost' IDENTIFIED BY 'your_password';
   
   -- 授权
   GRANT ALL PRIVILEGES ON slss_db.* TO 'slss_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

## 3. 项目部署

### A. 获取代码

如果是推送到 GitHub 开源，首先在 GitHub 创建仓库，然后本地推送：

```bash
# 本地初始化 (开发机)
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

然后在服务器拉取：
```bash
# 服务器端
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### B. 安装依赖与构建

```bash
# 安装依赖
npm install

# 构建前端 (生成 dist 目录)
npm run build
```

### C. 导入数据库结构

使用项目提供的 `db/schema.sql` 初始化表结构：

```bash
mysql -u slss_user -p slss_db < db/schema.sql
```

### D. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
nano .env
```

内容如下：
```env
PORT=3000
DB_HOST=localhost
DB_USER=slss_user
DB_PASSWORD=your_password
DB_NAME=slss_db
API_KEY=your_google_gemini_api_key
```

### E. 启动服务

使用 PM2 启动 Node.js 后端。由于我们在 `server.ts` 中配置了静态文件托管，启动后端即可同时服务前端页面。

```bash
# 启动方式 1: 直接运行 TS (开发/轻量级)
pm2 start "npm run serve" --name "slss-app"

# 启动方式 2: 编译后运行 (推荐生产)
# 需先运行: npx tsc (生成 dist/server.js)
# pm2 start dist/server.js --name "slss-app"

# 保存 PM2 列表以便开机自启
pm2 save
pm2 startup
```

访问 `http://your_server_ip:3000` 即可看到应用。

## 4. Nginx 反向代理 (推荐)

为了通过域名访问并使用 80/443 端口，建议配置 Nginx。

```bash
sudo apt install -y nginx
```

创建配置 `/etc/nginx/sites-available/slss`:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

激活配置:
```bash
sudo ln -s /etc/nginx/sites-available/slss /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. 常见问题

*   **前端刷新 404**: `server.ts` 中已配置 `app.get('*')` 指向 `index.html`，确保 `dist` 目录存在且路径正确。
*   **数据库连接失败**: 检查 `.env` 中的密码和 MySQL 用户权限。
*   **API 报错**: 查看 PM2 日志 `pm2 logs slss-app`。
