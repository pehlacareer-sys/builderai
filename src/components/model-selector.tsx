'use client'

import { useSyncExternalStore, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useChatStore } from '@/stores/chat-store'
import { ChevronDown } from 'lucide-react'

export interface ModelOption {
  id: string
  name: string
  provider: string
  providerColor: string
}

export const MODEL_OPTIONS: ModelOption[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', providerColor: 'bg-emerald-500' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', providerColor: 'bg-emerald-500' },
  // Anthropic
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', providerColor: 'bg-amber-500' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', providerColor: 'bg-amber-500' },
  // Google
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', providerColor: 'bg-sky-500' },
  { id: 'gemini-flash', name: 'Gemini Flash', provider: 'Google', providerColor: 'bg-sky-500' },
  // Groq
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Groq', providerColor: 'bg-orange-500' },
  { id: 'mixtral', name: 'Mixtral', provider: 'Groq', providerColor: 'bg-orange-500' },
  // OpenRouter
  { id: 'openrouter-auto', name: 'Auto (Best)', provider: 'OpenRouter', providerColor: 'bg-violet-500' },
  { id: 'openrouter-llama', name: 'Llama 3.1 405B', provider: 'OpenRouter', providerColor: 'bg-violet-500' },
]

const PROVIDER_ORDER = ['OpenAI', 'Anthropic', 'Google', 'Groq', 'OpenRouter']

const STORAGE_KEY = 'builderai-selected-model'

function getGroupedModels(): Record<string, ModelOption[]> {
  const groups: Record<string, ModelOption[]> = {}
  for (const model of MODEL_OPTIONS) {
    if (!groups[model.provider]) {
      groups[model.provider] = []
    }
    groups[model.provider].push(model)
  }
  return groups
}

// Use useSyncExternalStore to detect client-side mount without setState in effect
const emptySubscribe = () => () => {}
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function ModelSelector() {
  const { selectedModel, setModel } = useChatStore()
  const mounted = useIsMounted()

  const handleModelChange = useCallback((value: string) => {
    setModel(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Ignore storage errors
    }
  }, [setModel])

  const groupedModels = getGroupedModels()
  const currentModel = MODEL_OPTIONS.find(m => m.id === selectedModel)

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 h-7 px-2 rounded-md border border-border/50 bg-muted/30 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <Select value={selectedModel} onValueChange={handleModelChange}>
      <SelectTrigger
        size="sm"
        className="h-7 gap-1 px-2 text-xs border-border/50 bg-muted/30 hover:bg-muted/50 w-auto max-w-[180px]"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${currentModel?.providerColor || 'bg-emerald-500'}`}
        />
        <SelectValue placeholder="Select model" />
        <ChevronDown className="w-3 h-3 opacity-50" />
      </SelectTrigger>
      <SelectContent className="min-w-[200px]">
        {PROVIDER_ORDER.map((provider) => {
          const models = groupedModels[provider]
          if (!models) return null

          const providerColor = models[0]?.providerColor || 'bg-gray-500'

          return (
            <SelectGroup key={provider}>
              <SelectLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
                <span className={`w-1.5 h-1.5 rounded-full ${providerColor}`} />
                {provider}
              </SelectLabel>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    {model.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
