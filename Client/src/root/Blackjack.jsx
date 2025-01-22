import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BlackJack from '../page/blackjack.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BlackJack />
  </StrictMode>,
)
