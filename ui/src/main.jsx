import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk'
import './index.css'
import App from './App.jsx'

const clientSideID = import.meta.env.VITE_LD_CLIENT_SIDE_ID

if (!clientSideID) {
  throw new Error(
    'Missing VITE_LD_CLIENT_SIDE_ID. Add it to .env.local (see .env.example).'
  )
}

const LDProvider = await asyncWithLDProvider({
  clientSideID,
  context: {
    kind: 'user',
    key: 'anonymous-user',
    anonymous: true,
  },
  options: {
    bootstrap: 'localStorage',
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LDProvider>
      <App />
    </LDProvider>
  </StrictMode>,
)
