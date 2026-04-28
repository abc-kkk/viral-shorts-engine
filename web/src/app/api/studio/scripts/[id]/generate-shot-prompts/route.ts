/**
 * Freedom Studio — 分镜提示词生成（阶段 2：逐镜头精雕）
 *
 * POST /api/studio/scripts/[id]/generate-shot-prompts
 *
 * 为指定镜头生成 firstFramePrompt / lastFramePrompt / videoPrompt
 * 参考剧本全文 + 镜头画面描述 + 上下文 + 角色/场景/道具资产信息
 *
 * 十二大铁律提示词体系 V3.0：
 * - 全局空间锚点 / 物体唯一性 / 位置锁定 / 姿态物理规范
 * - Z轴面对面构图 / 视线朝向锁定 / 表情克制 / 闭嘴铁律
 * - 动作首尾帧分解 / 光影色调继承 / 安全合规转化
 * - 视觉白板原则（人物由角色卡继承，提示词只写姿态和位置）
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, listAssets } from '@/lib/studio/db';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

type RouteParams = { params: Promise<{ id: string }> };

const SYSTEM_PROMPT = `你是一位精通视觉叙事的导演兼镜头大师。你的任务是基于分镜的画面描述、台词和上下文，为 AI 视频生成引擎撰写高精度的"首帧/尾帧画面描述词"和"视频动态提示词"。你必须确保画面构图精准、空间关系清晰、人物姿态符合物理规律，且严格贴合美术风格设定。

=== 输出格式 ===
严格返回 JSON，不要有任何额外文本或 Markdown 标记：
{
  "firstFramePrompt": "首帧提示词（视频第0秒的静止画面，中文）",
  "lastFramePrompt": "尾帧提示词（视频最后一秒的静止画面，中文）",
  "videoPrompt": "视频动态提示词（从首帧到尾帧的完整运动过程，中文）"
}

=== 引用语法规则 ===
- 首帧/尾帧提示词中：用 {@角色名} 引用角色图片，用 {@场景名} 引用场景图，用 {@道具名} 引用道具图。
- 首帧/尾帧必须以"在 {@场景名} 中，"开头（使用【指定场景名称】中的精确名字）。
- 画面中涉及的道具必须用 {@道具名} 显式引用。
- videoPrompt 中**绝对禁止**使用 {@} 标签（视频引擎不支持），直接用纯文本描述。

=== 十二大铁律（首帧/尾帧必须全部遵守） ===

【铁律1：人物命名 — 视觉白板原则】
- 描述人物时使用"服装颜色+身份"格式引用，例如"白衣青年 {@角色名}"。
- 禁止在提示词中重复描述角色的服装款式、发型、五官细节 — 这些由 {@} 引用的角色卡自动继承。
- 只描述当前镜头的**姿态、位置、朝向、表情**。

【铁律2：全局空间锚点（强制）】
- 每条首帧/尾帧提示词必须在开头建立空间锚点，固定当前场景的基准平面和参照物。
- 明确定义：基准面（门槛、床沿、桌面边缘）、关键参照物位置、人物相对方位。
- 格式：在 {@场景名} 中，[空间锚点：关键参照物及位置关系]，然后展开画面描述。

【铁律3：场景内物体唯一性 — 防"满屋子都是床"】
- 每个场景的关键道具（床、桌、椅等）有且只有一个，必须在空间锚点中锁定其唯一位置。
- 后续描述中，人物只能与该道具的特定部位互动（床头、床尾、桌面左侧等），不得出现第二个同类型道具。

【铁律4：人物-物体相对位置锁定 — 防"AI拉人"】
- 当剧情要求两人位置分离（如一人卧床、一人站在门口），必须明确写出物理距离和视线状态。
- 若视线不交汇，必须写明"视线不交汇"或"各自看向不同方向"，防止 AI 强行将两人拉近至画面中心。
- 禁止出现"A躺在床上，B跪在床头深情看着A"这种 AI 自动补全的亲密构图，除非剧情明确要求。

【铁律5：人物姿态物理规范 — 防斜躺、悬浮、扭曲】
- 人物姿态必须符合物理规律和人体工学。使用标准姿态词汇：
  卧床：平躺（面部朝上）/ 侧卧（身体侧向一方）/ 半躺（上身靠枕头，双腿伸直）
  跪姿：双膝跪地（上身直立）/ 跪坐（臀部坐于脚后跟）
  坐姿：端坐（背部挺直）/ 靠坐（背部贴靠椅背）
  站立：站立（双脚着地，身体直立）
- 禁止：斜躺（除非"半躺"）、身体悬浮于空中、四肢不自然扭曲。

【铁律6：面对面构图强制规范 — Z轴锚定】
- 双人场景禁止两人同时正面面朝镜头。必须采用以下构图之一：
  A. 过肩构图：一人背对/侧对镜头（前景），另一人正对镜头（主体），视线相交。
  B. 侧面对峙：两人均侧对镜头，呈左右相对站位，视线水平相交。
  C. 一正一侧：一人正面朝镜头（主体），另一人侧面朝向主体。
- 连续对话场景中，默认锁定左右站位，除非剧情明确互换。

【铁律7：视线与朝向强制锁定】
- 严禁默认人物正脸直视镜头（除非打破第四面墙）。
- 每个人物必须指定：面部朝向（侧脸/3/4侧脸/背对/朝左/朝右/正对镜头仅限主体）+ 视线落点（看向画外右方/低头看手中物品/视线失焦望向虚空/视线与某角色相交等）。

【铁律8：表情克制 — 防恐怖谷】
- 首帧/尾帧作为静止画面，禁止复杂动态表情，使用含蓄的静态微表情。
- 禁用词：面目狰狞、青筋暴起、眼球充血、咧嘴大笑、张大嘴巴。
- 推荐词：眉心微蹙、下颌线微绷、嘴角轻抿、眼神低垂、视线失焦、眼神平静。

【铁律9：闭嘴铁律 — 防"口型死锁"】
- 首帧/尾帧中所有人物必须闭嘴。即使原文要求"正在说话"，画面只表现"说话前的蓄力瞬间"或"说话后的余韵"，用静态微表情替代。
- 禁用：嘴唇张开、嘴微张、口型呈XX、正在说、开口道。
- 推荐替代：嘴唇轻抿、下颌线微收、欲言又止的静默状态、嘴唇闭合。

【铁律10：光影与色调全程继承】
- 同一场景下，环境描述和光影基调必须全程统一。
- 首帧/尾帧提示词末尾必须包含与美术风格一致的色调描述（如"画面整体呈现低饱和度电影质感，暗部偏冷蓝，高光偏暖黄"）。

【铁律11：动作的首尾帧分解】
- 首帧 = 动作的起始姿态或蓄力瞬间（静止状态）。
- 尾帧 = 动作完成后的最终姿态（静止状态）。
- 两帧之间的变化幅度由 videoPrompt 承接，首尾帧本身必须是可以被定格为一张照片的静止画面。
- 好的首帧："角色双手撑在桌面上，身体微微前倾，眉心紧蹙"（蓄力瞬间）。
- 好的尾帧："角色已经站直，一只手指向对方，下颌线绷紧"（动作完成）。

【铁律12：安全合规转化】
- 冲突动作必须转化为温和但保持张力的描述：
  "打人" → "情绪激动地挥舞手臂"
  "愤怒指着骂" → "神情严肃地向前伸出手示意"
  "杀意/威胁" → "眼神凌厉地注视对方"
- 绝不使用任何可能被判定为暴力、色情或危险的词汇。

=== 首帧/尾帧输出结构模板（吸收纪实写实与高级质感） ===
每条首帧/尾帧提示词应按此结构组织（不分段，一整段）：
在 {@场景名} 中，[空间锚点：基准面+关键参照物位置]；（主体人物），（前景/次要角色）；【镜头与画质】：景别 + 角度 + 采用写实摄影风格与纪录感生活影像基调，保留原生肤质细节（无磨皮无滤镜）；【画面描述】：人物空间位置关系 + 姿态/道具 + 面部朝向/视线落点 + 静止状态微表情（闭嘴，绝无开口暗示）；【光影与色调】：明确主光源（如窗外自然光/暖黄灯笼光），描述光斑与阴影分布，背景轻微虚化凸显空间呼吸感，整体色调完美契合美术风格设定。
=== videoPrompt 专属规则（吸收时间轴强控与影视级调度） ===
- 禁止使用 {@} 标签，用纯文本详尽描述所有元素。
- 第一句必须明确人物视觉特征映射（例如：“白衣青年是陆长生，红衣女子是苏母。”）。
- 必须采用【时间轴强控法则】来划分 5 秒视频的动作流，确保与首尾帧无缝衔接：
  1. 【0-2秒 画面开篇与蓄力】：对应首帧状态。描述镜头的初始运动（缓推/拉远等）、人物的静止姿态与蓄力微表情，建立场景张力。
  2. 【2-4.5秒 核心动作与台词】：将具体动作与语音结合。按照“5字≈1秒”的物理定律计算说话时间，将原文台词完全嵌入动作中（如：2-4秒：角色猛地站起，厉声说道：“XXXX”）。
  3. 【4.5-5秒 反馈与余韵】：对应尾帧状态。描述动作结束后的缓冲定格、面部情绪反馈或环境余韵（如光斑折射、烟雾消散），使画面归于平稳。
- 结尾必须写：画面整体呈现与美术风格一致的色调与光影。

【videoPrompt 台词嵌入规则 — Veo 3.1 原生语音支持】
- Veo 3.1 支持中文语音合成，videoPrompt 中**必须**将该镜头的台词/对白直接嵌入。
- 格式：在描述人物动作的对应位置，用引号写出角色的原话，并标注说话人。
- 示例格式：
  「…镜头缓推，男子转过身，语气沉稳地说："你以为我不知道吗？"，女子后退一步，低声回应："这不是你想的那样。"…」
- 如果该镜头有【台词/旁白】，videoPrompt 必须完整包含这些台词，不得省略或改写台词原文。
- 台词应嵌入到角色动作的对应时间点，让语音与画面动作同步（例如角色转身时开口说话）。
- 如果有多个角色轮流说话，按剧本顺序逐句嵌入，并在每句前标注说话人名字。
- 旁白/独白用"画外音："前缀标注。
- 注意：首帧/尾帧仍然是静止画面，闭嘴铁律不变；台词只出现在 videoPrompt 中。

=== 不要输出任何 JSON 以外的内容 ===`;

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      shotVisual, shotDialogue, groupContext, groupTitle,
      characters: shotCharacters, sceneName, props: shotProps,
      previousShotLastFramePrompt,
      videoMode, // 'frame' | 'r2v' | 'broll' — 素材模式需要在 videoPrompt 中使用 {@} 语法
    } = body;

    const script = getScriptById(id);
    if (!script) return NextResponse.json({ error: '剧本不存在' }, { status: 404 });

    // 获取美术风格
    const artStyle = (script.metadata as any)?.artStyle || '极度写实，手机实拍感，自然光影';

    // 获取资产上下文
    const assets = listAssets({ scriptId: id });
    const charAssets = assets.filter(a => a.type === 'character');
    const sceneAssets = assets.filter(a => a.type === 'scene');
    const propAssets = assets.filter(a => a.type === 'prop');

    // 构建角色外貌上下文（从 asset.data 中提取详细信息）
    const charContext = (shotCharacters || []).map((name: string) => {
      const asset = charAssets.find(a => a.name === name);
      if (!asset) return `- ${name}（无外貌信息）`;
      const data = JSON.parse(typeof asset.data === 'string' ? asset.data : JSON.stringify(asset.data));
      const gender = data.metadata?.gender || '';
      const age = data.metadata?.age || '';
      const appearance = data.appearance || '';
      return `- ${name}（${[gender, age, appearance].filter(Boolean).join('，')}）`;
    }).join('\n');

    const sceneContext = sceneName
      ? (() => {
          const sa = sceneAssets.find(a => a.name === sceneName);
          if (!sa) return `${sceneName}（无详细描述）`;
          const data = JSON.parse(typeof sa.data === 'string' ? sa.data : JSON.stringify(sa.data));
          const atmosphere = data.atmosphere || '';
          const timeOfDay = data.timeOfDay || '';
          const weather = data.weather || '';
          const imgPrompt = data.imagePrompt || '';
          return `${sceneName} — ${[atmosphere, timeOfDay, weather, imgPrompt, sa.description].filter(Boolean).join('；')}`;
        })()
      : '';

    // 构建道具上下文
    const propContext = (() => {
      const propNames = shotProps && shotProps.length > 0 ? shotProps : propAssets.map(a => a.name);
      if (propNames.length === 0) return '';
      return propNames.map((name: string) => {
        const asset = propAssets.find(a => a.name === name);
        if (!asset) return `- ${name}（无详细描述）`;
        const data = JSON.parse(typeof asset.data === 'string' ? asset.data : JSON.stringify(asset.data));
        const details = [data.imagePrompt, data.sizeDescription, asset.description].filter(Boolean).join('；');
        return `- ${name}（${details || '无详细描述'}）`;
      }).join('\n');
    })();

    const userPrompt = `请为以下镜头生成高精度的首帧/尾帧画面描述词和视频动态提示词。

=== 当前镜头信息 ===
【镜头组】${groupTitle}
【镜头组上下文】${groupContext}
【画面描述（由分镜师提供）】${shotVisual}
【台词/旁白】${shotDialogue || '（无台词 — 画面为纯视觉叙事）'}

=== 资产引用表（首帧/尾帧中必须用 {@名称} 引用） ===
【指定场景】${sceneName || '未指定场景'}
场景细节：${sceneContext || '（无场景信息）'}

【涉及角色】
${charContext || '（无角色信息）'}

【涉及道具】
${propContext || '（无道具信息）'}

=== 美术风格设定 ===
${artStyle}
（首帧/尾帧提示词末尾的色调描述必须与此风格一致）
${previousShotLastFramePrompt ? `
=== 上一镜头的尾帧提示词（用于保持视觉连贯性） ===
${previousShotLastFramePrompt}
（请注意：当前镜头的首帧应与上一镜头的尾帧在空间、光影上自然衔接）
` : ''}
=== 关键提醒 ===
1. 首帧/尾帧是静止画面：所有人物必须闭嘴（用"嘴唇轻抿"等替代"正在说话"）
2. 必须建立空间锚点：明确场景基准面和关键参照物的位置
3. 双人场景禁止两人同时面朝镜头：使用过肩/侧面/一正一侧构图
4. 每个人物必须指定面部朝向和视线落点
5. 首帧 = 动作蓄力瞬间，尾帧 = 动作完成定格
6. 人物姿态必须符合物理规律，禁止悬浮或扭曲
7. videoPrompt 中必须嵌入该镜头的所有台词原文（Veo 3.1 支持中文语音），不得省略或改写

【剧本全文片段（仅供理解上下文，不要照搬）】
${script.content?.substring(0, 2000) || '（空）'}
`;

    // 根据 videoMode 动态调整 system prompt 中 videoPrompt 的 {@} 规则
    let finalSystemPrompt = SYSTEM_PROMPT;
    if (videoMode === 'r2v') {
      // R2V 素材模式：videoPrompt 也需要使用 {@} 引用角色/场景/道具素材
      finalSystemPrompt = finalSystemPrompt
        .replace(
          '- videoPrompt 中**绝对禁止**使用 {@} 标签（视频引擎不支持），直接用纯文本描述。',
          '- videoPrompt 中**必须使用** {@角色名}、{@场景名}、{@道具名} 引用素材（素材模式下视频引擎会将这些标签映射为参考图）。'
        )
        .replace(
          '- 禁止使用 {@} 标签，用纯文本详尽描述所有元素。',
          '- **必须使用** {@角色名}、{@场景名}、{@道具名} 标签引用素材，让视频引擎参考这些资产的原画。'
        );
    }

    const res = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: finalSystemPrompt, userPrompt, forceJson: true }),
    });

    if (!res.ok) throw new Error(`AI Gateway Error: ${await res.text()}`);

    const data = await res.json();
    let text = (data.text || '').trim();

    // Clean markdown
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) text = jsonMatch[1];

    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error('AI 返回格式异常');

    const result = JSON.parse(text.substring(startIdx, endIdx + 1));

    return NextResponse.json({
      firstFramePrompt: result.firstFramePrompt || '',
      lastFramePrompt: result.lastFramePrompt || '',
      videoPrompt: result.videoPrompt || '',
    });
  } catch (error: any) {
    console.error('Failed to generate shot prompts:', error);
    return NextResponse.json({ error: error.message || '内部错误' }, { status: 500 });
  }
}
