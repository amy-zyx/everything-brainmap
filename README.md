# Everything Brainmap

输入任意概念，生成一张从宏观大图逐层展开到具体细节的可交互脑图，帮助新手快速建立认知框架和学习路径。

- 后端：Python + FastAPI，调用 OpenAI API 生成结构化 Markdown 大纲
- 前端：原生 HTML/JS + [markmap](https://markmap.js.org/)，把大纲渲染成可缩放、可展开/折叠的树状脑图

## 1. 配置 API Key

需要一个 **OpenAI 平台**的按量计费 API Key（ChatGPT Plus/Pro 订阅不包含 API 额度，要去
[platform.openai.com](https://platform.openai.com/api-keys) 单独创建 Key 并绑定付款方式）。

出于安全考虑，请**自己**动手完成这一步（不要把 key 发给任何人，包括粘贴到聊天里）：

```bash
cd backend
cp .env.example .env
```

然后用编辑器打开 `backend/.env`，填入你自己的 OpenAI API Key：

```
OPENAI_API_KEY=sk-xxxxxxxx
```

默认使用 `gpt-4o` 模型，如果想换成更便宜的模型，在 `.env` 里加一行
`BRAINMAP_MODEL=gpt-4o-mini` 即可。

## 2. 启动服务

虚拟环境和依赖已经装好了，直接运行：

```bash
cd backend
./venv/Scripts/python.exe -m uvicorn main:app --reload --port 8420
```

然后浏览器打开 http://127.0.0.1:8420

## 3. 使用

在输入框里键入任意概念（例如"期权""光合作用""Transformer""复利"），回车或点击「生成脑图」。
脑图节点默认展开，点击节点圆点可以折叠/展开子节点；右下角工具栏可以缩放、居中、导出。

## 项目结构

```
everything-brainmap/
  backend/
    main.py          FastAPI 服务：/api/brainmap 接口 + 托管前端静态文件
    requirements.txt
    .env.example      API key 配置模板（.env 本身不会被提交）
  frontend/
    index.html
    app.js            调用后端接口 + markmap 渲染逻辑
    style.css
```

## 已知限制 / 后续可以做的事

- 目前每次生成都是一次全新的 API 调用，没有缓存/历史记录
- 没有对同一概念做多语言支持判断，输入什么语言模型大概率就用什么语言回答
- 可以加：生成结果导出为图片/Markdown、历史记录侧栏、节点点击后追加"再深入一层"的二次生成
