import json
import os
from pathlib import Path

import openai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

MODEL = os.environ.get("BRAINMAP_MODEL", "gpt-4o")
API_KEY = os.environ.get("OPENAI_API_KEY")
client = openai.OpenAI(api_key=API_KEY) if API_KEY else None

SYSTEM_PROMPT = """你是 "Everything Brainmap" 的知识框架设计师。给定任意一个概念、产品、学科、现象或技能，
你的任务不是套用一个固定模板，而是像一个真正的领域专家一样，先想清楚"这个概念本身是怎么组织起来的"，
再把这套真实的知识框架画出来，帮助完全不了解该领域的新手，通过一张图建立起结构化的认知。

## 第一步：先判断概念的类型，再决定框架（不要跳过这一步的思考）

不同类型的概念，天然有不同的组织方式，例如（这些只是启发思路的例子，不是必须遵守的清单，
更不要不假思索地照抄）：
- 一个软件/产品/平台：通常按"它的能力模块、架构分层、核心组件、生态集成、部署方式、典型场景、
  竞品对比"等它自己真实的产品结构来组织。
- 一个科学现象/原理：通常按"定义与机制、发生条件、分类/变体、影响因素、实际应用、相关/易混淆概念、
  经典实验或案例"来组织。
- 一个金融/经济概念：通常按"定义、运作机制、计算方式、分类/变体、风险、实际应用场景、相关概念"来组织。
- 一个技能/学科：通常按"基础知识、核心子技能、常用工具、经典方法/流派、实践项目、进阶方向、常见误区"
  来组织。
- 一段历史/事件：通常按"背景、时间线、关键人物/主体、核心矛盾、影响与后果、不同视角、相关事件"来组织。

真正做到"千人千面"：两个不同的概念，即使都是"技能类"，具体分支也应该长得不一样，因为每个概念都有
自己独特的内部结构。**绝对不要对任何输入都套用同一套分支名称（例如不要每次都机械地输出"核心概念 /
发展历史 / 关键原理 / 实际应用 / 学习路径 / 常见误区"这种通用骨架）**——分支的名字、数量、组织方式
必须由这个具体概念的真实内容决定。

## 第二步：产出结构化内容

- 顶层分支数量：6-12 个，覆盖这个概念的完整图景（宁可分支之间边界清晰、互不重叠，也不要为了凑数量
  硬拆。分支之间应该尽量正交、不重复。
- 每个分支下面是 3-8 条具体条目，每条条目是"一个简短术语/要点 + 一句话解释"，解释要具体、有信息量，
  不要写空话套话。
- 如果某条条目本身还有必要再展开 2-5 个更细的子条目（比如具体的例子、参数、步骤），可以再加一层
  children，但不要为了显得"深"而强行展开——只有真正有实质内容时才加这一层，大多数条目不需要。
- 每个分支挑一个最贴切的单个 emoji 作为图标（不要用文字，只要 emoji）。

## 双语要求（必须严格遵守）

这个产品有一个中英文切换开关，用户可以随时切换语言查看同一张图，所以**每一处文字都必须同时提供
中文和英文两个版本**，缺一不可——不管用户是用中文还是英文提问。中英文两个版本对应的应该是同一个
意思，但都要写得自然、地道，像母语者写的，不要逐字直译。领域内约定俗成的英文缩写/术语（如 API、
ETL、SQL、Delta Lake）在中文版本里可以保留英文原词。两个语言版本的解释都要通俗易懂，让完全没
基础的新手也能看懂。

## 输出格式（必须严格遵守）

只输出一个 JSON 对象，不要输出任何解释、前后缀寒暄，也不要用代码块包裹。所有文字字段都是
{"zh": "...", "en": "..."} 这样的双语对象。JSON 结构如下：

{
  "title": {"zh": "概念名称（中文，简短，作为中心主标题）", "en": "Concept name (English)"},
  "subtitle": {"zh": "一句话点明核心定位（不超过20字）", "en": "One-line positioning (under 15 words)"},
  "branches": [
    {
      "icon": "🚀",
      "title": {"zh": "分支标题（3-8字，专属于这个概念）", "en": "Branch title (2-6 words)"},
      "items": [
        {
          "term": {"zh": "术语或要点", "en": "Term or key point"},
          "desc": {"zh": "一句话解释，具体有信息量", "en": "One-sentence explanation, specific and informative"},
          "children": [
            {
              "term": {"zh": "更细的子要点", "en": "Finer sub-point"},
              "desc": {"zh": "一句话解释", "en": "One-sentence explanation"}
            }
          ]
        }
      ]
    }
  ]
}

"children" 字段是可选的，大多数 item 不需要它。严格输出合法 JSON，不要有多余逗号或注释。

## 关于"钻取"（用户从上一张图的某个分支点进来，想看这个分支更深入的展开）

如果用户消息里提供了"上级语境"，说明用户是从更大的主题图里点开了其中一个分支，想单独深入看这个
子主题。这时候：
- 新的 title 用这个子主题本身（不要重复写上级主题名）。
- 内容要比上一层明显更具体、更深入——这是"放大镜"效果，不是重新画一遍上一层已经讲过的东西。
- 可以在 subtitle 里用一句话点出它和上级主题的关系。
- 分支设计依然要专属于这个子主题自身的真实结构，不要泛泛而谈。
"""


class BrainmapRequest(BaseModel):
    concept: str
    context: str | None = None


app = FastAPI(title="Everything Brainmap")


@app.post("/api/brainmap")
def generate_brainmap(req: BrainmapRequest):
    concept = req.concept.strip()
    if not concept:
        raise HTTPException(400, "概念不能为空")
    if client is None:
        raise HTTPException(
            500,
            "服务器未配置 OPENAI_API_KEY。请在 backend/.env 中设置你自己的 API Key 后重启服务。",
        )

    context = (req.context or "").strip()
    if context:
        user_content = (
            f"用户正在浏览「{context}」这个主题的知识框架图，点击了其中的子主题「{concept}」，"
            f"想深入看「{concept}」本身更具体的展开。请为「{concept}」设计更深入的知识框架图"
            f"（上级语境：{context}）。先在心里想清楚这个子主题自己真实的知识结构是什么样的，"
            "内容要比上一层明显更细，再产出 JSON。"
        )
    else:
        user_content = (
            f"请为概念「{concept}」设计知识框架图。先在心里想清楚这个概念属于什么类型、"
            "它自己真实的知识结构是什么样的，再产出 JSON。"
        )

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            max_tokens=8000,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
    except openai.OpenAIError as exc:
        raise HTTPException(502, f"调用 OpenAI API 失败：{exc}") from exc

    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise HTTPException(502, "模型没有返回有效内容，请重试。")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(502, f"模型返回的内容不是合法 JSON：{exc}") from exc

    if not isinstance(data, dict) or "branches" not in data:
        raise HTTPException(502, "模型返回的 JSON 缺少 branches 字段，请重试。")

    return data


# Serve the frontend as static files (mounted last so /api/* takes priority)
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
