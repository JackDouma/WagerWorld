import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Header from '../page/header.jsx'
import Poker from '../page/poker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <Header /> */}
    <Poker />
  </StrictMode>,
)
