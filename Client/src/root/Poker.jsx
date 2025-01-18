import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Header from '../page/header.jsx'
import BlackJack from '../page/blackjack.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <BlackJack />
  </StrictMode>,
)
