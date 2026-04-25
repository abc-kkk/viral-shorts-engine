import { create } from 'zustand';
import { DEFAULT_ART_STYLE } from '../constants';
import type { Character, ScriptLine, InspirationItem, ScriptReview, CreativeMode } from '../types';

export interface ProjectStore {
  projectId: string | null;
  setProjectId: (id: string) => void;

  // Global Settings
  artStyle: string;
  setArtStyle: (artStyle: string) => void;
  
  flowUrl: string;
  setFlowUrl: (flowUrl: string) => void;
  
  aiProvider: 'gemini' | 'doubao';
  setAiProvider: (aiProvider: 'gemini' | 'doubao') => void;
  
  useHitlMode: boolean;
  setUseHitlMode: (useHitlMode: boolean) => void;

  // Hydration utility
  hydrateGlobalSettings: (data: Partial<ProjectStore>) => void;

  // Phase 1: Writer Room
  theme: string;
  setTheme: (theme: string) => void;
  isBrainstorming: boolean;
  setIsBrainstorming: (val: boolean) => void;
  characters: Character[];
  setCharacters: (chars: Character[] | ((prev: Character[]) => Character[])) => void;
  scriptLines: ScriptLine[];
  setScriptLines: (lines: ScriptLine[] | ((prev: ScriptLine[]) => ScriptLine[])) => void;
  writerStep: number;
  setWriterStep: (step: number) => void;
  inspirations: InspirationItem[];
  setInspirations: (items: InspirationItem[] | ((prev: InspirationItem[]) => InspirationItem[])) => void;
  creativeMode: CreativeMode;
  setCreativeMode: (mode: CreativeMode) => void;
  rawScript: string;
  setRawScript: (script: string) => void;
  scriptReview: ScriptReview | null;
  setScriptReview: (review: ScriptReview | null) => void;
  scriptIteration: number;
  setScriptIteration: (i: number) => void;
  isGeneratingScript: boolean;
  setIsGeneratingScript: (val: boolean) => void;
  isIteratingScript: boolean;
  setIsIteratingScript: (val: boolean) => void;
  isReviewingScript: boolean;
  setIsReviewingScript: (val: boolean) => void;
  isSplittingScript: boolean;
  setIsSplittingScript: (val: boolean) => void;
  isFetchingReddit: boolean;
  setIsFetchingReddit: (val: boolean) => void;
  userDirection: string;
  setUserDirection: (val: string | ((prev: string) => string)) => void;

  hydrateWriterRoomSettings: (data: Partial<ProjectStore>) => void;

  // Phase 2: Casting Room
  locationPrompt: string;
  setLocationPrompt: (val: string) => void;
  locationImage: string;
  setLocationImage: (val: string) => void;
  isProcessingLocation: 'prompt' | 'image' | null;
  setIsProcessingLocation: (val: 'prompt' | 'image' | null) => void;
  characterPrompts: Record<number, string>;
  setCharacterPrompts: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  characterImages: Record<number, string>;
  setCharacterImages: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  processingChars: Record<number, 'prompt' | 'image' | null>;
  setProcessingChars: (val: Record<number, 'prompt' | 'image' | null> | ((prev: Record<number, 'prompt' | 'image' | null>) => Record<number, 'prompt' | 'image' | null>)) => void;

  // Phase 3: Storyboard & Render Room
  activeSceneIndex: number;
  setActiveSceneIndex: (val: number | ((prev: number) => number)) => void;
  sceneLocationPrompts: Record<number, string>;
  setSceneLocationPrompts: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneLocationImages: Record<number, string>;
  setSceneLocationImages: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  startLayoutPrompts: Record<number, string>;
  setStartLayoutPrompts: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  endLayoutPrompts: Record<number, string>;
  setEndLayoutPrompts: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneImagePrompts: Record<number, string>;
  setSceneImagePrompts: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneVideoPrompts: Record<number, string>;
  setSceneVideoPrompts: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneStartImagePrompts: Record<number, string>;
  setSceneStartImagePrompts: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneDurations: Record<number, number>;
  setSceneDurations: (val: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => void;
  sceneVideoTrimStart: Record<number, number>;
  setSceneVideoTrimStart: (val: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => void;
  sceneVideoTrimEnd: Record<number, number>;
  setSceneVideoTrimEnd: (val: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => void;
  sceneImages: Record<number, string>;
  setSceneImages: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneStartImages: Record<number, string>;
  setSceneStartImages: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneImageRefs: Record<number, string>;
  setSceneImageRefs: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneVideos: Record<number, string>;
  setSceneVideos: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneAudio: Record<number, string>;
  setSceneAudio: (val: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  sceneAudioDelays: Record<number, number>;
  setSceneAudioDelays: (val: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => void;
  currentVideoTimes: Record<number, number>;
  setCurrentVideoTimes: (val: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => void;
  sceneCharacters: Record<number, string[]>;
  setSceneCharacters: (val: Record<number, string[]> | ((prev: Record<number, string[]>) => Record<number, string[]>)) => void;
  processingScene: Record<number, 'action' | 'startImage' | 'image' | 'video' | 'voice' | null>;
  setProcessingScene: (val: any) => void;

  // Covers
  coverPrompts: Record<string, string>;
  setCoverPrompts: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  coverImages: Record<string, string>;
  setCoverImages: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  processingCovers: Record<string, 'prompt' | 'image' | null>;
  setProcessingCovers: (val: any) => void;

  hydrateMediaSettings: (data: Partial<ProjectStore>) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projectId: null,
  setProjectId: (id) => set({ projectId: id }),

  artStyle: DEFAULT_ART_STYLE,
  setArtStyle: (artStyle) => set({ artStyle }),
  
  flowUrl: '',
  setFlowUrl: (flowUrl) => set({ flowUrl }),
  
  aiProvider: 'gemini',
  setAiProvider: (aiProvider) => set({ aiProvider }),
  
  useHitlMode: true,
  setUseHitlMode: (useHitlMode) => set({ useHitlMode }),

  hydrateGlobalSettings: (data) => set((state) => ({ ...state, ...data })),

  theme: "",
  setTheme: (theme) => set({ theme }),
  isBrainstorming: false,
  setIsBrainstorming: (isBrainstorming) => set({ isBrainstorming }),
  characters: [],
  setCharacters: (chars) => set((state) => ({ characters: typeof chars === 'function' ? chars(state.characters) : chars })),
  scriptLines: [],
  setScriptLines: (lines) => set((state) => ({ scriptLines: typeof lines === 'function' ? lines(state.scriptLines) : lines })),
  writerStep: 1,
  setWriterStep: (writerStep) => set({ writerStep }),
  inspirations: [],
  setInspirations: (items) => set((state) => ({ inspirations: typeof items === 'function' ? items(state.inspirations) : items })),
  creativeMode: 'reference',
  setCreativeMode: (creativeMode) => set({ creativeMode }),
  rawScript: "",
  setRawScript: (rawScript) => set({ rawScript }),
  scriptReview: null,
  setScriptReview: (scriptReview) => set({ scriptReview }),
  scriptIteration: 0,
  setScriptIteration: (scriptIteration) => set({ scriptIteration }),
  isGeneratingScript: false,
  setIsGeneratingScript: (isGeneratingScript) => set({ isGeneratingScript }),
  isIteratingScript: false,
  setIsIteratingScript: (isIteratingScript) => set({ isIteratingScript }),
  isReviewingScript: false,
  setIsReviewingScript: (isReviewingScript) => set({ isReviewingScript }),
  isSplittingScript: false,
  setIsSplittingScript: (isSplittingScript) => set({ isSplittingScript }),
  isFetchingReddit: false,
  setIsFetchingReddit: (isFetchingReddit) => set({ isFetchingReddit }),
  userDirection: "",
  setUserDirection: (val) => set((state) => ({ userDirection: typeof val === 'function' ? val(state.userDirection) : val })),

  hydrateWriterRoomSettings: (data) => set((state) => ({ ...state, ...data })),

  // Phase 2: Casting Room
  locationPrompt: "",
  setLocationPrompt: (val) => set({ locationPrompt: val }),
  locationImage: "",
  setLocationImage: (val) => set({ locationImage: val }),
  isProcessingLocation: null,
  setIsProcessingLocation: (val) => set({ isProcessingLocation: val }),
  characterPrompts: {},
  setCharacterPrompts: (val) => set((state) => ({ characterPrompts: typeof val === 'function' ? val(state.characterPrompts) : val })),
  characterImages: {},
  setCharacterImages: (val) => set((state) => ({ characterImages: typeof val === 'function' ? val(state.characterImages) : val })),
  processingChars: {},
  setProcessingChars: (val) => set((state) => ({ processingChars: typeof val === 'function' ? val(state.processingChars) : val })),

  // Phase 3: Storyboard & Render Room
  activeSceneIndex: 0,
  setActiveSceneIndex: (val) => set((state) => ({ activeSceneIndex: typeof val === 'function' ? val(state.activeSceneIndex) : val })),
  sceneLocationPrompts: {},
  setSceneLocationPrompts: (val) => set((state) => ({ sceneLocationPrompts: typeof val === 'function' ? val(state.sceneLocationPrompts) : val })),
  sceneLocationImages: {},
  setSceneLocationImages: (val) => set((state) => ({ sceneLocationImages: typeof val === 'function' ? val(state.sceneLocationImages) : val })),
  startLayoutPrompts: {},
  setStartLayoutPrompts: (val) => set((state) => ({ startLayoutPrompts: typeof val === 'function' ? val(state.startLayoutPrompts) : val })),
  endLayoutPrompts: {},
  setEndLayoutPrompts: (val) => set((state) => ({ endLayoutPrompts: typeof val === 'function' ? val(state.endLayoutPrompts) : val })),
  sceneImagePrompts: {},
  setSceneImagePrompts: (val) => set((state) => ({ sceneImagePrompts: typeof val === 'function' ? val(state.sceneImagePrompts) : val })),
  sceneVideoPrompts: {},
  setSceneVideoPrompts: (val) => set((state) => ({ sceneVideoPrompts: typeof val === 'function' ? val(state.sceneVideoPrompts) : val })),
  sceneStartImagePrompts: {},
  setSceneStartImagePrompts: (val) => set((state) => ({ sceneStartImagePrompts: typeof val === 'function' ? val(state.sceneStartImagePrompts) : val })),
  sceneDurations: {},
  setSceneDurations: (val) => set((state) => ({ sceneDurations: typeof val === 'function' ? val(state.sceneDurations) : val })),
  sceneVideoTrimStart: {},
  setSceneVideoTrimStart: (val) => set((state) => ({ sceneVideoTrimStart: typeof val === 'function' ? val(state.sceneVideoTrimStart) : val })),
  sceneVideoTrimEnd: {},
  setSceneVideoTrimEnd: (val) => set((state) => ({ sceneVideoTrimEnd: typeof val === 'function' ? val(state.sceneVideoTrimEnd) : val })),
  sceneImages: {},
  setSceneImages: (val) => set((state) => ({ sceneImages: typeof val === 'function' ? val(state.sceneImages) : val })),
  sceneStartImages: {},
  setSceneStartImages: (val) => set((state) => ({ sceneStartImages: typeof val === 'function' ? val(state.sceneStartImages) : val })),
  sceneImageRefs: {},
  setSceneImageRefs: (val) => set((state) => ({ sceneImageRefs: typeof val === 'function' ? val(state.sceneImageRefs) : val })),
  sceneVideos: {},
  setSceneVideos: (val) => set((state) => ({ sceneVideos: typeof val === 'function' ? val(state.sceneVideos) : val })),
  sceneAudio: {},
  setSceneAudio: (val) => set((state) => ({ sceneAudio: typeof val === 'function' ? val(state.sceneAudio) : val })),
  sceneAudioDelays: {},
  setSceneAudioDelays: (val) => set((state) => ({ sceneAudioDelays: typeof val === 'function' ? val(state.sceneAudioDelays) : val })),
  currentVideoTimes: {},
  setCurrentVideoTimes: (val) => set((state) => ({ currentVideoTimes: typeof val === 'function' ? val(state.currentVideoTimes) : val })),
  sceneCharacters: {},
  setSceneCharacters: (val) => set((state) => ({ sceneCharacters: typeof val === 'function' ? val(state.sceneCharacters) : val })),
  processingScene: {},
  setProcessingScene: (val) => set((state) => ({ processingScene: typeof val === 'function' ? val(state.processingScene) : val })),

  // Covers
  coverPrompts: {},
  setCoverPrompts: (val) => set((state) => ({ coverPrompts: typeof val === 'function' ? val(state.coverPrompts) : val })),
  coverImages: {},
  setCoverImages: (val) => set((state) => ({ coverImages: typeof val === 'function' ? val(state.coverImages) : val })),
  processingCovers: {},
  setProcessingCovers: (val) => set((state) => ({ processingCovers: typeof val === 'function' ? val(state.processingCovers) : val })),

  hydrateMediaSettings: (data) => set((state) => ({ ...state, ...data })),
}));

// Setup auto-save for Zustand-managed fields
let saveTimeout: any;
useProjectStore.subscribe((state, prevState) => {
  if (!state.projectId) return;

  const diff: any = {};
  let hasChanges = false;

  const fieldsToWatch = [
    'artStyle', 'flowUrl', 'aiProvider', 'useHitlMode',
    'theme', 'characters', 'scriptLines', 'writerStep', 'inspirations', 'creativeMode',
    'rawScript', 'scriptReview', 'scriptIteration', 'userDirection',
    // Casting Room & Scene Media
    'locationPrompt', 'locationImage', 'characterPrompts', 'characterImages',
    'activeSceneIndex', 'sceneLocationPrompts', 'sceneLocationImages', 'startLayoutPrompts', 'endLayoutPrompts',
    'sceneImagePrompts', 'sceneVideoPrompts', 'sceneStartImagePrompts', 'sceneCharacters',
    'sceneDurations', 'sceneVideoTrimStart', 'sceneVideoTrimEnd', 'sceneImages', 'sceneStartImages', 'sceneImageRefs',
    'sceneVideos', 'sceneAudio', 'sceneAudioDelays', 'coverPrompts', 'coverImages'
  ] as const;
  
  for (const key of fieldsToWatch) {
    if (state[key] !== prevState[key]) {
      diff[key] = state[key];
      hasChanges = true;
    }
  }

  if (hasChanges) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      fetch(`/api/state?projectId=${encodeURIComponent(state.projectId!)}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diff) 
      }).catch(e => console.error("Zustand save state error:", e));
    }, 1000);
  }
});
