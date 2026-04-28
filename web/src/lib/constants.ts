// ========================================
// 共享常量 (Viral Shorts Engine)
// ========================================

export const VOICE_OPTIONS = [
  { group: "🌟 高音域 (Higher Pitch)", options: [
      { id: "Zephyr", label: "Zephyr (女 / 明亮 / 默认)" },
      { id: "Leda", label: "Leda (女 / 年轻)" },
      { id: "Laomedeia", label: "Laomedeia (女 / 欢快)" },
      { id: "Achernar", label: "Achernar (女 / 轻柔)" },
  ]},
  { group: "🌤️ 中音域 (Middle Pitch)", options: [
      { id: "Aoede", label: "Aoede (女 / 轻松)" },
      { id: "Autonoe", label: "Autonoe (女 / 明亮)" },
      { id: "Callirrhoe", label: "Callirrhoe (女 / 随和)" },
      { id: "Despina", label: "Despina (女 / 平滑)" },
      { id: "Erinome", label: "Erinome (女 / 清脆)" },
      { id: "Gacrux", label: "Gacrux (女 / 成熟)" },
      { id: "Kore", label: "Kore (女 / 坚定)" },
      { id: "Puck", label: "Puck (男 / 欢快)" },
      { id: "Pulcherrima", label: "Pulcherrima (女 / 前卫)" },
      { id: "Rasalgethi", label: "Rasalgethi (男 / 知性)" },
      { id: "Sadaltager", label: "Sadaltager (男 / 渊博)" },
      { id: "Sulafat", label: "Sulafat (女 / 温暖)" },
      { id: "Vindemiatrix", label: "Vindemiatrix (女 / 温柔)" },
  ]},
  { group: "🌥️ 中低音域 (Lower Middle Pitch)", options: [
      { id: "Achird", label: "Achird (男 / 友好)" },
      { id: "Alnilam", label: "Alnilam (男 / 坚定)" },
      { id: "Fenrir", label: "Fenrir (男 / 激动)" },
      { id: "Iapetus", label: "Iapetus (男 / 清爽)" },
      { id: "Orus", label: "Orus (男 / 坚实)" },
      { id: "Schedar", label: "Schedar (男 / 平稳)" },
      { id: "Umbriel", label: "Umbriel (男 / 随和)" },
      { id: "Zubenelgenubi", label: "Zubenelgenubi (男 / 随性)" },
  ]},
  { group: "🌙 低音域 (Lower Pitch)", options: [
      { id: "Algenib", label: "Algenib (男 / 沙哑)" },
      { id: "Algieba", label: "Algieba (男 / 平滑)" },
      { id: "Charon", label: "Charon (男 / 稳重)" },
      { id: "Enceladus", label: "Enceladus (男 / 气声)" },
      { id: "Sadachbia", label: "Sadachbia (男 / 活泼)" },
  ]}
];

export const ART_STYLE_PRESETS = [
  // 🔥 可爱 / 治愈 / 反差萌 (Cute & Healing & Gap Moe)
  { value: "Surreal ultra-photorealistic pet photography, highly aesthetic, Pinterest/TikTok style, extremely cute fluffy animal standing upright, customized fashionable tiny pet clothing, huge adorable head and big expressive eyes, soft warm cinematic studio lighting, highly detailed fur, 8K resolution", label: "🐾 超写实精致萌宠 (Aesthetic Realistic Pet) 🔥" },
  { value: "Pop Mart blind box figurine style, chibi proportions, glossy plastic skin, soft pastel colors, adorable round face, minimal background, collectible toy aesthetic", label: "🎁 泡泡玛特潮玩盲盒 (Pop Mart Blind Box)" },
  { value: "Soft plush stuffed animal aesthetic, fluffy cotton texture, round chubby body, pastel pink and cream colors, cute button eyes, kawaii cozy vibes", label: "🧸 毛绒玩偶治愈风 (Fluffy Plush Toy)" },
  { value: "Dreamy pastel kawaii illustration, soft gradient background, sparkles and hearts, baby-like round proportions, sweet candy colors, healing aesthetic", label: "🍬 梦幻糖果少女心 (Pastel Kawaii Dream)" },
  { value: "Miniature tilt-shift diorama photography, tiny detailed world, soft bokeh, warm afternoon lighting, whimsical scale, adorable small characters", label: "🏡 微缩场景箱庭风 (Miniature Diorama)" },
  { value: "Sanrio character aesthetic, soft dreamy atmosphere, rainbow pastel palette, fluffy clouds backdrop, cute oversized head proportions, magical sparkle effects", label: "🌈 三丽鸥梦幻萌系 (Sanrio Dreamy Style)" },
  { value: "Children's watercolor storybook illustration, gentle brush strokes, warm earth tones, cozy heartwarming scenes, soft edges, nostalgic bedtime story feeling", label: "📖 水彩绘本睡前故事 (Watercolor Storybook)" },
  { value: "Cottagecore aesthetic, warm golden hour lighting, cozy countryside setting, soft film grain, nostalgic rural charm, gentle warm color palette", label: "🌿 田园治愈小清新 (Cozy Cottagecore)" },

  // 📸 原生写实 / 生活纪录 (Raw Realism & Documentary)
  { value: "原生写实主义(raw realism)，生活纪录感影像，毫无AI痕迹，不磨皮、不美颜、无任何滤镜，保留皮肤真实小瑕疵(如毛孔、细微色差)，不完美之美(imperfect beauty)，日常环境真实光影，拒绝刻意摆拍感，如iPhone前置或后置随手拍出的最真实生活影像。", label: "📸 极致原生纪实风 (Raw Realism / No Filter)" },
  { value: "深夜居家私密写实风，室内暖光或昏暗自然光，光线分布略不均匀，允许存在自然阴影，氛围静谧内敛(quiet)，亲密距离感(intimate proximity)，人物状态松弛自然甚至略带凌乱，展现深夜纯粹的原生生活状态。", label: "🌙 深夜居家写实风 (Nighttime Cozy Realism)" },
  { value: "电影级高保真写实，Arri Alexa 65摄影机拍摄质感，35mm定焦镜头，高级且克制的真实光影，保留肌肤、服饰与环境材质的所有真实物理细节，构图充满剧情张力，宛如现实主义剧情长片截图。", label: "🎥 电影级写实大片 (Cinematic Realism)" },
  { value: "真实生活Vlog/手持镜头感，非完美构图，极其自然随意的瞬间捕捉，强烈的“生活日常”代入感，毫无人工雕琢或影棚拍摄痕迹。", label: "📹 第一视角 Vlog 纪实 (Vlog / Candid Realism)" },

  // 🎬 电影 / 风格化 (Cinematic & Stylized)
  { value: "王家卫式港风复古写实，高对比度，霓虹环境光或昏暗街灯反射，轻微的抽帧模糊感与胶片颗粒(film grain)，情绪化、忧郁、暧昧的色彩基调，充满故事感。", label: "🎞️ 港风复古电影写实 (Vintage Cinematic)" },
  { value: "90年代家庭录像带(VHS)画质，带有真实的雪花噪点、轻微色差边缘和画面模糊，浓厚的怀旧家庭录像氛围，真实且温馨。", label: "📼 90年代家庭录像带 (90s Home Video VHS)" },
  { value: "暗黑情绪写实风，低调光(Low-key lighting)，强烈的明暗对比，色彩饱和度偏低，压抑、冷峻且充满戏剧张力的悬疑/心理现实质感。", label: "🌑 暗黑情绪写实风 (Moody Dark Realism)" },
  { value: "顶级3D国漫风格 (3D Donghua style), Unreal Engine 5 render, 3D CGI, 精致绝美的东方玄幻/武侠审美，三维动画顶级CG渲染，电影级唯美光效，超高精度模型材质，华丽细腻的服饰纹理，拥有真实的体积光影，非真人。", label: "🐉 顶级 3D 国漫风 (3D Donghua / Chinese CG)" },
  { value: "Pixar 3D animated movie, highly detailed, vibrant colors", label: "🌟 皮克斯 3D 动画风格 (Pixar 3D)" },
  { value: "Studio Ghibli anime style, beautiful hand-painted watercolor backgrounds", label: "🌸 吉卜力手绘动漫 (Ghibli Anime)" },
  { value: "Cyberpunk neon city style, futuristic, glowing reflections", label: "🌃 赛博朋克霓虹风 (Cyberpunk Neon)" },
  { value: "Soft claymation stop-motion aesthetic, tactile textures", label: "🧸 定格黏土动画 (Claymation)" },
  { value: "Japanese Ukiyo-e woodblock print style, flat ink colors", label: "🌊 日式浮世绘 (Ukiyo-e)" },
];

export const DEFAULT_ART_STYLE = "原生写实主义(raw realism)，生活纪录感影像，毫无AI痕迹，不磨皮、不美颜、无任何滤镜，保留皮肤真实小瑕疵(如毛孔、细微色差)，不完美之美(imperfect beauty)，日常环境真实光影，拒绝刻意摆拍感，如iPhone前置或后置随手拍出的最真实生活影像。";
export const DEFAULT_PROJECT_ID = "default";
