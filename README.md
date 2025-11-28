
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
   CREATE DATABASE IF NOT EXISTS slss_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   
   -- 创建用户 (请修改 'your_password' 为强密码)
   -- 1. 创建本地 Socket 连接用户
   CREATE USER IF NOT EXISTS 'slss_user'@'localhost' IDENTIFIED BY 'your_password';
   -- 2. 创建本地 TCP/IP 连接用户 (关键步骤: 解决 Node.js 127.0.0.1 连接问题)
   CREATE USER IF NOT EXISTS 'slss_user'@'127.0.0.1' IDENTIFIED BY 'your_password';
   
   -- 授权
   GRANT ALL PRIVILEGES ON slss_db.* TO 'slss_user'@'localhost';
   GRANT ALL PRIVILEGES ON slss_db.* TO 'slss_user'@'127.0.0.1';
   FLUSH PRIVILEGES;
   EXIT;
   ```

## 3. 项目部署

### A. 准备项目文件

上传或 `git clone` 代码到服务器。

### B. 清理干扰配置 (重要!)

在生产环境中，请**务必删除** `.env.local` 文件（如果存在）。该文件通常用于开发环境覆盖，如果不删除，可能会导致您的 `.env` 配置（如数据库 IP）不生效。

```bash
# 删除本地覆盖配置，避免冲突
rm -f .env.local
```

### C. 配置环境变量

复制模板并编辑配置：

```bash
cp .env.example .env
nano .env
```

**⚠️ 关键提示：** 请仔细填写 `.env` 中的数据库信息。**不要**将注释（如 `# 建议...`）复制到等号后面，这会导致连接失败！

**✅ 正确示例：**
```env
DB_HOST=127.0.0.1
DB_PORT=32121
```

**❌ 错误示例 (会导致连接失败)：**
```env
DB_HOST=127.0.0.1 # 这里的注释会被当做 IP 的一部分
```

### D. 安装依赖与构建

```bash
# 1. 安装项目依赖
npm install

# 2. 构建前端 (生成 dist 目录)
npm run build
```

### E. 导入数据库结构

使用项目自带的初始化脚本 `db/init.js` 自动创建数据库和表结构：

```bash
node db/init.js
```
*如果显示 `✅ Database schema applied successfully`，说明连接和导入均成功。*

### F. 启动服务

使用 PM2 后台启动：

```bash
# 需先运行 build，然后：
pm2 start dist/server.js --name "slss-app"

# 保存 PM2 列表以便开机自启
pm2 save
pm2 startup
```

访问 `http://your_server_ip:3000` 即可看到应用。

## 4. 常见问题排查

*   **Error: connect ECONNREFUSED 127.0.0.1:3306**:
    *   检查 MySQL 是否启动: `sudo systemctl status mysql`
    *   检查端口是否被防火墙拦截。
    *   确保 `.env` 中的 `DB_PORT` 与实际 MySQL 端口一致。
*   **Error: Access denied for user 'slss_user'@'127.0.0.1'**:
    *   请重新执行“第2步：数据库配置”中的 `CREATE USER ... @'127.0.0.1'` 语句。
*   **依赖安装报错**:
    *   如果提示找不到包，尝试运行 `npm install --legacy-peer-deps`。
