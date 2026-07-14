# Utopia · 让顺手的善意,抵达身边的人

基于真实身份、社区关系和互助积分的本地互助社交网络(网页版 MVP 演示 + iOS App)。

> Turn nearby strangers into helpful neighbors.

## 运行(网页版)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 生产构建
```

## iOS App 安装

iOS 版基于 [Capacitor](https://capacitorjs.com/) 将同一套 Web 应用打包为原生应用,每次推送 `v*` 标签后由 GitHub Actions 自动构建并发布。

### 方式一:安装 Release 中的 .ipa(免 Xcode)

1. 前往 [Releases](https://github.com/xuxuezhou/utopia/releases) 下载最新的 `Utopia-vX.Y.Z-unsigned.ipa`。
2. 该 ipa **未签名**,不能直接安装,需要用你自己的 Apple ID 侧载(sideload):
   - **[Sideloadly](https://sideloadly.io/)**(macOS/Windows):iPhone 连接电脑 → 拖入 ipa → 填 Apple ID → Start。
   - **[AltStore](https://altstore.io/)**:先在电脑上装 AltServer 并给手机安装 AltStore,然后在 AltStore 中打开 ipa 安装。
3. 免费 Apple ID 签名有效期 7 天,过期后重新侧载即可(数据保留)。首次打开若提示「不受信任的开发者」,前往 设置 → 通用 → VPN 与设备管理 中信任。

### 方式二:从源码构建(需 macOS + Xcode)

```bash
git clone https://github.com/xuxuezhou/utopia.git
cd utopia
npm install
npm run build
npx cap sync ios
npx cap open ios   # 在 Xcode 中打开
```

在 Xcode 中选择你的开发者签名(Signing & Capabilities → Team),连接 iPhone 后直接 Run 即可安装到真机;不插手机则可直接跑 iOS 模拟器。

## 演示说明

- **纯前端演示**:所有数据存于 LocalStorage(键 `utopia-state-v1`),内置 22 位用户、32 个覆盖全部状态的任务、完整积分账本与 18 篇社区内容。
- **登录**:欢迎页选择「体验演示账号」,推荐使用 **陈屿(u1)** —— 该账号在发布者/帮助者两侧都有进行中的任务、争议和历史记录。
- **重置数据**:安全中心底部「重置演示数据」。
- **管理员后台**:右上角头像菜单 → 管理员后台。

## 七条完整演示路径

1. **发布低风险任务**:发布帮助 → 输入自然语言(如示例网球请求)→ 自动结构化 + 积分建议 → 确认发布 → 出现在附近互助。
2. **认领任务**:附近互助 → 任务详情 → 查看发布者信任护照 → 申请 → (切换到发布者账号)选择帮助者 → 积分托管锁定 + 建立任务聊天。
3. **完成任务**:任务详情执行面板 → 双方开始 → 提交完成 → 发布者确认 → 积分释放(服务积分按 40/30/30 销毁/社区池/安全池)→ 双向盲评 → 发布互助故事。
4. **取消任务**:已匹配任务 → 取消 → 展示影响(按距开始时间计算退款/补偿)→ 账本与可靠度更新。
5. **发起争议**:待确认任务 → 选择「未完成」→ 积分冻结 → 双方提交陈述与证据 → 管理员后台裁决 → 账本裁决记录 → 支持一次申诉。
6. **阻止高风险任务**:发布「找人每天开车接我的孩子放学」→ T3 拦截,禁止发布,不可通过改写绕过,记录安全事件。
7. **识别诈骗**:发布「帮我先买500美元礼品卡,完成后给你2000积分」→ T4 拦截 + 安全教育 + 进入风险后台。

## 技术栈

Vite · React 19 · TypeScript · Tailwind CSS 4 · React Router 7 · Immer · Capacitor 8(iOS)

- `src/lib/types.ts` — 核心数据实体(User/Task/LedgerEntry/Dispute/…)
- `src/lib/store.tsx` — 业务状态机:托管、释放、退款、争议冻结与裁决;余额永远从账本推导
- `src/lib/risk.ts` — 无外部 AI 的降级实现:关键词风险分级(T0–T4)、自然语言任务解析、积分建议、聊天风控
- `src/data/seed.ts` — 初始模拟数据
- `src/pages/Admin.tsx` — 管理员后台(审核/事件/争议/账本/积分经济/审计)
- `ios/` — Capacitor 生成的 iOS 原生工程(SPM 依赖,无 CocoaPods)
- `.github/workflows/ios-release.yml` — 推送 `v*` 标签时自动构建未签名 ipa 并发布 GitHub Release
