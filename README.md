# AI 对话实验室

一个采用 React、Vite、TypeScript 和 FastAPI 构建的中文 AI 对话实验项目，可对比 Prompt 预设和生成参数对回答的影响。

## 功能

- 中文界面、中文系统提示词与中文错误提示。
- 通过 SSE 逐段显示流式回答，生成期间显示忙碌状态。
- 四种 Prompt 预设：通用助手、代码审查、简历优化、产品构思。
- 可调节温度（0–2，默认 0.7）与最大生成词元数（64–4096，默认 800）。
- 当前浏览器通过 `localStorage` 保存对话与参数，刷新后恢复；清空对话保留参数，恢复默认参数保留对话。
- 桌面双栏与手机单栏布局，支持键盘焦点和系统减少动态效果偏好。
- FastAPI 代理兼容 OpenAI 的模型接口；前端部署到 Netlify，后端部署到 Render。

## 环境配置

本地需要 Node.js、npm 和 Python 3.11 或更高版本。后端必须配置 `OPENAI_API_KEY` 才能获得真实模型回答；健康检查成功仅表示服务在线，不代表密钥可用。

默认模型配置如下，可在后端环境中修改：

```env
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-V4-flash
```

本地密钥放在未纳入版本控制的 `backend/.env` 中。部署时密钥只配置在 Render，不能放入 Netlify、`VITE_*` 变量、前端代码或 Git 仓库。

## 本地开发

先启动后端：

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

编辑 `backend/.env`，填写 `OPENAI_API_KEY`，再运行：

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

在另一个终端启动前端：

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

打开终端显示的本地地址（默认 `http://localhost:5173`）。`VITE_API_BASE_URL` 默认指向 `http://127.0.0.1:8000`。若更改前端端口或域名，请同步更新后端 `ALLOWED_ORIGINS`，多个来源用逗号分隔。

## 本地验证

从仓库根目录分别执行：

```bash
cd frontend
npm test -- --run
npx tsc --noEmit
npm run build
```

```bash
cd backend
.venv/bin/python -m pytest
```

前端测试覆盖预设、流式解析、中文界面和会话状态；后端测试覆盖健康检查、请求校验和缺少密钥时的流式错误。构建结果位于 `frontend/dist/`，可运行 `npm run preview` 检查。

## 接口

- `GET /api/health` 返回 `status` 和当前 `model`。
- `POST /api/chat` 接收 `messages`、`preset`、`temperature`、`max_tokens`，返回 `text/event-stream`；`token` 事件携带 `content`，`done` 表示结束，`error` 携带错误消息。
- 角色标识 `system`、`user`、`assistant` 和预设标识保持原有接口格式。

## 部署

### Render 后端

使用仓库根目录的 `render.yaml` 创建服务，根目录为 `backend/`，构建命令为 `pip install -r requirements.txt`，启动命令为 `python run.py`。在 Render 设置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL` 和 `ALLOWED_ORIGINS`。将 Netlify 正式站点来源以及需要使用的预览站点来源加入 `ALLOWED_ORIGINS`。

### Netlify 前端

连接仓库，基础目录设为 `frontend/`，构建命令为 `npm run build`，发布目录为 `dist/`；该目录中的 `netlify.toml` 已配置单页应用重写。设置公开变量 `VITE_API_BASE_URL` 为 Render 后端的 HTTPS 地址，然后重新构建。Netlify 不需要模型密钥。

部署后检查健康状态，再发送一条中文消息确认流式回答。Netlify 预览站点的来源也必须列入 Render 的 `ALLOWED_ORIGINS`，否则浏览器会阻止跨域请求。
