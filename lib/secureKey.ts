import * as SecureStore from "expo-secure-store";

const OPENAI_KEY = "cplan.openaiApiKey";

export const getOpenAiKey = () => SecureStore.getItemAsync(OPENAI_KEY);

export const hasOpenAiKey = async () => Boolean(await getOpenAiKey());

export const saveOpenAiKey = (value: string) => SecureStore.setItemAsync(OPENAI_KEY, value.trim());

export const deleteOpenAiKey = () => SecureStore.deleteItemAsync(OPENAI_KEY);
