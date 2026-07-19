"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  postMessage,
  renameConversation,
} from "@/services/copilot-api"
import { detectPageContext, isRecruiterRoute } from "@/lib/copilot-context"
import type {
  Conversation,
  CopilotMessage,
  CopilotPageContext,
} from "@/types/copilot"

const OPEN_KEY = "hirelens.copilot.open"
const ACTIVE_KEY = "hirelens.copilot.activeConversationId"

let idCounter = 0
const nextId = () => `local-${Date.now()}-${idCounter++}`

interface CopilotContextValue {
  available: boolean
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  pageContext: CopilotPageContext
  conversations: Conversation[]
  activeConversationId: string | null
  messages: CopilotMessage[]
  isSending: boolean
  isLoadingMessages: boolean
  send: (text: string) => Promise<void>
  newConversation: () => void
  selectConversation: (id: string) => Promise<void>
  rename: (id: string, title: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

const CopilotCtx = createContext<CopilotContextValue | null>(null)

export function useCopilot(): CopilotContextValue {
  const ctx = useContext(CopilotCtx)
  if (!ctx) throw new Error("useCopilot must be used within CopilotProvider")
  return ctx
}

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const { user, configured } = useAuth()
  const pathname = usePathname()
  const available = Boolean(configured && user && isRecruiterRoute(pathname ?? ""))

  const pageContext = useMemo(
    () => detectPageContext(pathname ?? ""),
    [pathname],
  )

  const [open, setOpenState] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const loadedList = useRef(false)

  // Restore persisted UI state once on mount.
  useEffect(() => {
    try {
      setOpenState(localStorage.getItem(OPEN_KEY) === "1")
      const savedActive = localStorage.getItem(ACTIVE_KEY)
      if (savedActive) setActiveConversationId(savedActive)
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, [])

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => setOpen(!open), [open, setOpen])

  const persistActive = useCallback((id: string | null) => {
    setActiveConversationId(id)
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id)
      else localStorage.removeItem(ACTIVE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const refreshList = useCallback(async () => {
    if (!user || !configured) return
    try {
      const list = await listConversations()
      setConversations(list)
    } catch {
      /* keep existing list on transient failure */
    }
  }, [user, configured])

  // Load the conversation list when the copilot first becomes usable.
  useEffect(() => {
    if (!user || !configured || loadedList.current) return
    loadedList.current = true
    void refreshList()
  }, [user, configured, refreshList])

  const loadMessages = useCallback(async (id: string) => {
    setIsLoadingMessages(true)
    try {
      const history = await listMessages(id)
      setMessages(
        history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          structured: m.structured,
        })),
      )
    } catch {
      setMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  // Restore the active conversation's transcript after a refresh.
  useEffect(() => {
    if (!user || !configured || !activeConversationId) return
    if (messages.length > 0) return
    void loadMessages(activeConversationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, configured, activeConversationId])

  const selectConversation = useCallback(
    async (id: string) => {
      persistActive(id)
      setMessages([])
      await loadMessages(id)
    },
    [persistActive, loadMessages],
  )

  const newConversation = useCallback(() => {
    // Created lazily on first send so empty threads never litter the list.
    persistActive(null)
    setMessages([])
  }, [persistActive])

  const send = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || isSending) return

      setIsSending(true)
      const userMsg: CopilotMessage = { id: nextId(), role: "user", content: question }
      const pendingId = nextId()
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: pendingId, role: "assistant", content: "", pending: true },
      ])

      try {
        // Ensure a conversation exists (create lazily, scoped to this page).
        let convId = activeConversationId
        if (!convId) {
          const conv = await createConversation(pageContext)
          convId = conv.id
          persistActive(convId)
          setConversations((prev) => [conv, ...prev])
        }

        const res = await postMessage(convId, question, pageContext)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  id: res.assistant_message.id,
                  role: "assistant",
                  content: res.response.answer,
                  structured: res.response,
                }
              : m,
          ),
        )
        // Title may have been auto-generated; refresh ordering/titles.
        void refreshList()
      } catch (err) {
        const detail = err instanceof Error ? err.message : "The copilot is unavailable right now."
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? { id: pendingId, role: "assistant", content: `⚠️ ${detail}` }
              : m,
          ),
        )
      } finally {
        setIsSending(false)
      }
    },
    [activeConversationId, isSending, pageContext, persistActive, refreshList],
  )

  const rename = useCallback(
    async (id: string, title: string) => {
      const updated = await renameConversation(id, title)
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)))
    },
    [],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (id === activeConversationId) {
        persistActive(null)
        setMessages([])
      }
    },
    [activeConversationId, persistActive],
  )

  const value = useMemo<CopilotContextValue>(
    () => ({
      available,
      open: available && open,
      setOpen,
      toggle,
      pageContext,
      conversations,
      activeConversationId,
      messages,
      isSending,
      isLoadingMessages,
      send,
      newConversation,
      selectConversation,
      rename,
      remove,
    }),
    [
      available, open, setOpen, toggle, pageContext, conversations,
      activeConversationId, messages, isSending, isLoadingMessages, send,
      newConversation, selectConversation, rename, remove,
    ],
  )

  return <CopilotCtx.Provider value={value}>{children}</CopilotCtx.Provider>
}
