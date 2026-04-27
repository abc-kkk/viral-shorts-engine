# Freedom Studio 开发进度

> 最后更新：2026-04-27 00:12 (GMT+8)

---

## 一、已完成功能

### 1. AI 资产提取（并行化）
- **分类独立提取**：角色、场景、道具各自独立提取按钮，互不干扰
- **角色描述净化**：AI 提取时过滤情绪化表情词（如"眉头紧锁"），只保留中性外貌特征
- **场景唯一命名**：强制 AI 返回具体场景名（如"苏氏集团总裁办公室"），杜绝泛化的"场景"命名
- 文件：`web/src/app/api/studio/scripts/[id]/analyze/route.ts`

### 2. 防伪命名系统（Anti-Counterfeit Naming）
- **文件名生成**：`generateAssetFilename()` 统一使用 `meta.charName` 作为文件名，确保角色、场景、道具各自唯一
- **Chrome 扩展同步**：扩展的 `fetchTargetId()` 已修复，`locationImage` 类型也读取 `meta.charName`，不再硬编码"场景"
- **全链路一致性**：`set-context → push-asset → inbox → SSE → poller` 完整透传 `charName`
- 文件：`web/src/lib/assetUrl.ts`、`web/viral-shorts-extension/src/content.ts`

### 3. 道具生图支持
- **UI**：AssetCard 的 ✨ 生成按钮已解除类型限制，角色/场景/道具均可生图
- **Prompt**：道具专用英文 Prompt，产品摄影级别（macro lens, studio strobe, 8K, material texture detail）
- **Pipeline**：道具的 `targetType` 统一为 `locationImage`，复用场景的落盘通道
- 文件：`web/src/lib/studio/store/useStudioStore.ts`、`web/src/components/studio/assets/AssetCard.tsx`

### 4. SSE + DB 双通道轮询
- **SSE 主通道**：实时推送，收到 push-asset 消息后立即更新 UI
- **DB 轮询兜底**：每 3 秒对比数据库，防止 SSE 丢消息（消费即删除的架构缺陷）
- **精确 patch**：DB 轮询改为逐个资产对比更新，不再替换整个 `currentAssets` 数组
- 文件：`web/src/components/studio/assets/useStudioInboxPoller.ts`

### 5. 场景多角度面板 ✨ 新功能
- **交互**：点击场景卡片图片 → 打开全屏多角度面板（左侧大图预览 + 右侧 8 角度网格）
- **8 个预设机位**：正面、左45°、右45°、左侧、右侧、下俯视、俯瞰45°、俯瞰90°
- **数据存储**：`FsSceneData.angles: Record<string, string>` 存储角度图 URL
- **命名策略**：
  - `charName` = `场景名_角度`（如"地下车库_左45°"）→ 文件名唯一不冲突
  - `referenceKeyword` = `场景名`（如"地下车库"）→ Flow 能搜到主图作参考
  - `meta.angleKey` = 角度名 → SSE poller 路由到正确的 `data.angles` 槽位
- **Prompt**：简洁一句话 `This same scene, shot from a [angle]. Keep everything identical, only change the camera position.`
- 文件：`web/src/components/studio/assets/SceneAngleModal.tsx`、`web/src/lib/studio/types.ts`

---

## 二、当前正在解决的问题

### 🔴 P0：多角度提取落盘后 modal 自动关闭（已确认复现，已修复）
- **现象**：在多角度面板里点击角度生图 → 提取落盘 → modal 自动关闭回到资产列表页
- **根因链路**：
  1. SSE poller 收到角度图 → 之前调用了 `updateAsset()` 
  2. `updateAsset()` 内部调用 `selectScript()` → 设置 `loading: true`
  3. 页面组件 `if (loading) return <Spinner>` → **整个页面被替换为加载动画**
  4. AssetCard + SceneAngleModal **全部卸载**
  5. `selectScript` 完成后 `loading: false` → 页面重建 → 但 modal 的 local state 已丢失
- **修复措施**：
  1. ✅ SSE poller 角度分支改用轻量 `fetch PATCH`，不调 `updateAsset()`
  2. ✅ SceneAngleModal 的开关状态从 AssetCard **提升到页面级别** `angleModalAssetId`
  3. ✅ DB 轮询兜底改为逐个 patch，不替换整个 `currentAssets`
- **状态**：已修复，待验证

### 🟡 P1：SSE 消费即删除架构
- **现象**：`/api/sse` 路由使用 DB 轮询 + 读后删除，如果有多个 SSE 连接（如老版 storyboard + Studio 同时打开），消息可能被错误消费
- **临时方案**：已加 DB 轮询兜底，但架构上仍不够可靠
- **建议**：未来改为广播机制（如 WebSocket 或 SSE + 不删除 + 客户端消费位点追踪）

---

## 三、已知待优化项

### UI/UX
- [ ] 场景卡片右下角「📐 N 角度」角标已实现，需验证显示是否正确
- [ ] 道具卡片缺少生成进度的视觉反馈（2 秒超时后 loading 消失但图未到）
- [ ] 扩展提取失败时，AssetCard 没有错误状态展示

### 数据一致性
- [ ] AI 提取仍可能返回泛化名称（"场景"），需在 `createAssetsFromAnalysis` 加验证拦截
- [ ] 多角度图的 `push-asset` 保存路径需确认与主图保存在同一目录
- [ ] 角度图生成后，DB 里的 `data.angles` 是否正确持久化（需重启后验证）

### 架构
- [ ] `updateAsset()` 内部调用 `selectScript()` 过于重量级，应提供轻量版 `patchAsset()` 方法
- [ ] Chrome 扩展需在 `chrome://extensions` 手动刷新后才能生效新代码

---

## 四、关键文件索引

| 文件 | 职责 |
|------|------|
| `web/src/lib/assetUrl.ts` | 资产文件名生成（防伪命名核心） |
| `web/src/lib/studio/types.ts` | FsAsset / FsSceneData / FsPropData 类型定义 |
| `web/src/lib/studio/store/useStudioStore.ts` | Zustand Store：生图 Prompt 组装、资产 CRUD |
| `web/src/components/studio/assets/AssetCard.tsx` | 资产卡片 UI（含场景多角度入口） |
| `web/src/components/studio/assets/SceneAngleModal.tsx` | 场景多角度面板（8 机位预设） |
| `web/src/components/studio/assets/useStudioInboxPoller.ts` | SSE + DB 双通道轮询 |
| `web/src/app/api/studio/assets/[id]/set-context/route.ts` | 设置 active-context（含 angleKey） |
| `web/src/app/api/extension/push-asset/route.ts` | 扩展落盘 → 保存文件 + 写入 inbox |
| `web/src/app/api/sse/route.ts` | SSE 推送（消费即删除） |
| `web/viral-shorts-extension/src/content.ts` | Chrome 扩展（防伪名 + 提取落盘） |
| `web/src/app/api/studio/scripts/[id]/analyze/route.ts` | AI 资产提取（分类并行） |
