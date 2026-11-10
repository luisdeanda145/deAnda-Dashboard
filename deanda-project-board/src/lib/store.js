import { createContext, useContext } from 'react'

/** Everything a page needs from the shell: navigation, settings, the board's tasks and toasts. */
export const AppContext = createContext(null)

export const useApp = () => useContext(AppContext)
