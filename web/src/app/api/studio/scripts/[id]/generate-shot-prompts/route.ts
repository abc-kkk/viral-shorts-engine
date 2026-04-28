/**
 * Freedom Studio — 分镜提示词生成（阶段 2：逐镜头精雕）
 *
 * POST /api/studio/scripts/[id]/generate-shot-prompts
 *
 * 为指定镜头生成 firstFramePrompt / lastFramePrompt / videoPrompt
 * 参考剧本全文 + 镜头画面描述 + 上下文 + 角色/场景资产信息
 *
 * 融合 Seaweed 2.0 提示词规范：
 * - 视觉关键词密集 / 情绪色彩主导 / 运镜指令化
 * - 动作分解 / 角色视觉区分 / 安全合规转化 / 听觉元素辅助
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScriptById, listAssets } from '@/lib/studio/db';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:4100';

type RouteParams = { params: Promise<{ id: string }> };

const SYSTEM_PROMPT = `你是一位顶级短剧分镜提示词专家，擅长将画面描述转化为 AI 视频生成引擎能精准理解的高密度视觉指令。

=== 输出格式 ===
严格返回 JSON，不要有任何额外文本或 Markdown 标记：
{
  "firstFramePrompt": "首帧提示词（视频第0秒的静止画面，中文）",
  "lastFramePrompt": "尾帧提示词（视频最后一秒的静止画面，中文）",
  "videoPrompt": "视频动态提示词（从首帧到尾帧的完整运动过程，中文）"
}

=== 引用语法规则 ===
- 首帧/尾帧提示词中：用 {@角色名} 引用角色图片，用 {@场景名} 引用场景图，用 {@道具名} 引用道具图。
- 首帧/尾帧必须以"在 {@场景名} 中，"开头（使用【指定场景名称】中的精确名字）
- 画面中如果角色拿着、穿着或旁边摆放着【涉及道具】中提供的物品，必须用 {@道具名} 显式引用。
- videoPrompt 中绝对禁止使用 {@} 标签（视频引擎不支持），直接用纯文本描述。

=== 七大核心原则 ===

1.【视觉关键词密集】
  使用大量具体、高辨识度的视觉描述词汇，最大化 AI 对画面的控制力。
  好的示例："幽暗的烛火映照着红木雕花的大厅，鎏金烛台的火焰微微摇曳"
  好的示例："金色晨光穿透竹林缝隙，地面散落着湿润的落叶"
  坏的示例："很漂亮的大厅" "非常壮观的场景"
  每个提示词至少包含 3-5 个具象化的视觉细节（材质、颜色、光影、纹理）。

2.【情绪/氛围色彩主导】
  明确指定画面传达的情绪，通过色彩对比和光影风格强化氛围。
  示例："压抑的冷蓝色调笼罩全场" "暖金色逆光勾勒出角色的轮廓剪影"
  为每个提示词设定一个主色调情绪关键词。

3.【运镜指令化（专业电影术语）】
  首帧/尾帧（静帧）：重点描述景别和构图
  - 景别：【特写】【近景】【中景】【全景】【远景】【超广角】
  - 构图：三分法、对称、纵深、前景遮挡
  videoPrompt：重点描述镜头运动轨迹
  - 运动：【缓推】【拉远】【环绕慢摇】【低角度仰拍】【俯瞰】【跟拍】【手持晃动】【推轨】

4.【动作分解与关键帧强调】
  复杂动作必须分解成关键姿态，不能一笔带过。
  好的："角色猛地站起（椅子向后滑动），双手撑桌面前倾，眼神从震惊转为愤怒"
  坏的："角色生气地站了起来"
  首帧描述动作起始姿态，尾帧描述动作完成姿态，videoPrompt 描述中间过程。

5.【角色视觉区分（防止 AI 混淆人物）】
  - 每个出现的角色必须携带其核心外貌特征描述（从角色资产数据中提取）
  - 跟班/随从等群体角色分配独立视觉标签（如"灰衣瘦高跟班""蓝衣圆脸跟班"）
  - 使用具体数量和明确站位（"左侧叉腰""右侧抱臂"）

6.【安全合规转化】
  短剧常见的冲突动作必须转化为温和但保持张力的描述：
  - "打人/扇耳光" 改为 "情绪激动地挥舞手臂"
  - "愤怒指着骂" 改为 "神情严肃地向前伸出手示意"
  - "杀意/威胁" 改为 "眼神凌厉地注视对方"
  - "下跪/磕头" 改为 "身体前倾做出恭敬姿态"
  绝不使用任何可能被判定为暴力、色情或危险的词汇。

7.【听觉元素辅助】（仅 videoPrompt）
  在关键动作后备注音效提示，帮助引擎理解场景能量密度。
  示例："伴随推门的沉闷撞击声与众人倒吸凉气的声音"
  示例："无台词段落，只有脚步回响与远处风声"

=== 不要输出任何 JSON 以外的内容 ===`;

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { shotVisual, shotDialogue, groupContext, groupTitle, characters: shotCharacters, sceneName, props: shotProps } = body;

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
      if (!asset) return `${name}（无外貌信息）`;
      const data = JSON.parse(typeof asset.data === 'string' ? asset.data : JSON.stringify(asset.data));
      const details = [data.appearance, data.personality, asset.description].filter(Boolean).join('；');
      return `${name}（${details || '无详细描述'}）`;
    }).join('\n');

    const sceneContext = sceneName
      ? (() => {
          const sa = sceneAssets.find(a => a.name === sceneName);
          if (!sa) return `场景：${sceneName}`;
          const data = JSON.parse(typeof sa.data === 'string' ? sa.data : JSON.stringify(sa.data));
          const details = [data.atmosphere, data.imagePrompt, sa.description].filter(Boolean).join('；');
          return `场景：${sceneName} — ${details}`;
        })()
      : '';

    // 构建道具上下文
    const propContext = (() => {
      // 如果前端传了 shotProps，使用指定的道具列表
      const propNames = shotProps && shotProps.length > 0 ? shotProps : propAssets.map(a => a.name);
      if (propNames.length === 0) return '';
      return propNames.map((name: string) => {
        const asset = propAssets.find(a => a.name === name);
        if (!asset) return `${name}（无详细描述）`;
        const data = JSON.parse(typeof asset.data === 'string' ? asset.data : JSON.stringify(asset.data));
        const details = [data.appearance, data.material, data.function, asset.description].filter(Boolean).join('；');
        return `${name}（${details || '无详细描述'}）`;
      }).join('\n');
    })();

    const userPrompt = `请为以下镜头生成高质量视觉提示词：

【美术风格设定】${artStyle}
请确保首帧/尾帧提示词中明确包含体现该风格的核心关键词（如3D渲染、CG动画、真实摄影等），保持画面风格一致。

【镜头组】${groupTitle}
【镜头组上下文】${groupContext}
【画面描述】${shotVisual}
【台词/旁白】${shotDialogue || '（无台词）'}

【涉及角色及外貌】
${charContext || '（无角色信息）'}

【指定场景名称】
${sceneName || '未指定场景'}

【场景细节信息】
${sceneContext || '（无场景信息）'}

【涉及道具】
${propContext || '（无道具信息）'}

【剧本全文（供理解上下文）】
${script.content?.substring(0, 3000) || '（空）'}
`;

    const res = await fetch(`${AI_GATEWAY_URL}/api/text/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT, userPrompt, forceJson: true }),
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
