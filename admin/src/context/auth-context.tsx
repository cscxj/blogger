/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { User } from "@/types"

const TOKEN_KEY = "blogger-admin-token"

type AuthContextValue = {
  token: string | null
  user: User | null
  setUser: (user: User | null) => void
  setAuthenticated: (token: string, user: User) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)

  const setAuthenticated = useCallback(
    (nextToken: string, nextUser: User) => {
      localStorage.setItem(TOKEN_KEY, nextToken)
      setToken(nextToken)
      setUser(nextUser)
      queryClient.setQueryData(["me", nextToken], nextUser)
    },
    [queryClient]
  )

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({
      token,
      user,
      setUser,
      setAuthenticated,
      signOut,
    }),
    [token, user, setAuthenticated, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
