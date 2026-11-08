# WordQuest 英语单词学习系统 V1.0

> **中学生专属 • 极简无 AI • iPad 横屏优先 • 认知科学组块闭环**

WordQuest 是一套真正可运行、具备本地数据持久化、艾宾浩斯复习算法与高内聚解耦架构的英语单词学习 Web 应用。

---

## 🌟 核心设计原则

1. **绝对零 AI 依赖**：
   - 不接入任何大模型 API、AI 语音识别与语义判定。
   - 英文发音采用浏览器原生 `window.speechSynthesis` 与 Web Audio API 柔和合成音效，零网络延迟，开箱即用。
2. **认知科学组块闭环 (3~5 Words Batching)**：
   - 杜绝“刚看单词卡，2秒后立马考该词”的瞬时记忆假象。
   - 按 3~5 词为一组，先连续识记，再打乱混排进行 4 类题型考核。
3. **方案 A 动静分离结果页**：
   - **答对时**：轻快微动效，1.0 秒自动平滑切入下一题（支持轻触屏幕跳过）。
   - **答错时**：锁定停留！展示完整释义、例句与中文翻译，底部提供 `[ 记住了 / 下一题 ]` 按钮由学生自主推进。
4. **防雪崩学习量封顶 (Daily Cap = 30)**：
   - 严格执行每日最多 30 词上限，到期复习词优先消耗，避免复习雪崩。
5. **iPad 横屏专属硬件防御**：
   - 触控防误触（禁用双击与双指拉伸缩放）、软键盘弹起防遮挡、屏幕常亮保活（WakeLock API）。

---

## 🏗️ 六维解耦架构目录

```
src/
├── config/                  # 1. 常量与规则中心 (复习天数、单日上限、文案、档位)
│   ├── learningRules.ts
│   ├── gamification.ts
│   └── copywriting.ts
├── styles/                  # 2. 界面设计变量 (Tokens)
│   └── theme.ts
├── components/
│   ├── ui/                  # 3. 基础原子组件 (Button, Card, SpeakerBtn, LetterInput)
│   └── study/views/         # 4. 纯展示型业务视图 (WordCardView, ChoiceQuizView, ResultFeedbackView...)
├── lib/
│   ├── algorithms/          # 5. 核心算法纯函数 (srsScheduler, planEngine, spellingMasker)
│   ├── quiz-factory/        # 6. 题型生成工厂 (QuestionFactory)
│   ├── audio/               # 7. 发音与音效适配器 (SoundService)
│   ├── importer/            # 8. 词库文件解码管道 (FileDecoder - UTF-8 / GBK)
│   └── db/                  # 9. 本地文件持久化引擎 (LocalDB - JSON/SQLite)
└── tests/                   # 10. 自动化测试套件 (Vitest)
```

---

## 🚀 快速启动指南

### 1. 环境要求
- Node.js: `v18.0.0` 或更高版本（已内置 Node.js v20 LTS）
- npm: `v9.0.0` 或更高版本

### 2. 本地一键启动
在项目根目录（`c:\Users\张勇\OneDrive\文档\wordquest`）运行：

```bash
# 启动本地开发服务器
npm run dev
```

浏览器打开：`http://localhost:3000`

> **提示**：系统已内置 **初中核心必考 100 词** 种子数据，首次打开即可直接点击“开始学习”！

### 3. 执行自动化测试
```bash
# 运行全部算法、组块、挖空与导入测试套件
npm run test
```

---

## 📖 页面与功能说明

1. **首页 (`/`)**：中文极简风格，展示学生昵称、日期、今日进度、连续天数、积分与唯一主按钮。
2. **学习 (`/study`)**：有限状态机流转视窗，支持意外关闭与刷新现场精准恢复。
3. **我的单词 (`/words`)**：仅收录真正参加过测试的单词，支持【全部】/【学习中】/【已掌握】筛选。
4. **学习统计 (`/statistics`)**：真实数据看板与近 7 天学习趋势图。
5. **系统设置 (`/settings`)**：学习档位切换（新手/常规/大师）、CSV/Excel 导入、数据重置与 JSON 备份导出。

---

## 📄 词库导入模板
根目录下提供 `template.csv` 标准模板：
```csv
word,phonetic,meaning,pos,example,translation
abandon,/əˈbændən/,放弃；抛弃,v.,He decided to abandon the plan.,他决定放弃这个计划。
```
