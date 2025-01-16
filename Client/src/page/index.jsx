import { useState } from 'react'
import '../css/index.css'

function Index() {

  return (
    <main>
        <h1>WagerWorld</h1>
        <section class="roomContainer">
            <div class="createRoom">
                <h2>Create Room</h2>
                <input type="text" placeholder="Enter room name"></input>
                <button>Create Room</button>
            </div>
            <div class="joinRoom">
                <h2>Join Room</h2>
                <input type="text" placeholder="Enter code"></input>
                <button>Join Room</button>
            </div>
        </section>
    </main>
  )
}

export default Index
