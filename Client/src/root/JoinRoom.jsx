import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Header from '../page/header.jsx'
import RoomConnection from '../page/joinroom.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header />
    <RoomConnection />
  </StrictMode>,
)
