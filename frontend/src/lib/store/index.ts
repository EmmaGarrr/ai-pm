// Temporary React Context-based state management
// TODO: Revert to Zustand when React 19 compatibility is resolved
export { AppProvider, useGlobalStore, useUserStore, useProjectStore, useChatStore, useSystemStore } from './appContext';