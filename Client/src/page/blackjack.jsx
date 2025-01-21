import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

class BlackjackScene extends Phaser.Scene {

  constructor() {``
    super({ key: 'BlackjackScene' })
    this.cardScale = 0.25
    this.deck = []
    this.playerHand = []
    this.dealerHand = []
    this.isPlayerTurn = true
    this.playerCardCount = 0
    this.dealerCardCount = 0
    // object used for later (cuz its gotta be played, then flipped over later instead of right away)
    this.dealersSecond
    this.playerCredits = 10_000
    this.currentBet = 0
    this.possibleBets = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000]
    this.possibleBetButtons = []
    this.possibleRemoveBetButtons = []
    this.totalCredits
    this.currentBetText
    this.placeBetsButton
  }

  preload() {
    this.load.image('card', '/card-back.png')
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"]
    const suits = ["spades", "clubs", "diamonds", "hearts"]

    suits.forEach((suit) => {
      values.forEach((value) => {
        const fileName = `${value}_of_${suit}.png`
        this.load.image(fileName, `/Cards/${fileName}`)
      })
    })
  }

  create() {
    this.createDeck()
    this.createUI()
  }

  createDeck() {
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"]
    const suits = ["spades", "clubs", "diamonds", "hearts"]
    this.deck = suits.flatMap((suit) => values.map((value) => ({ suit, value })))
    Phaser.Utils.Array.Shuffle(this.deck)
    // scale is set to 0.25 because the actual .png files are huge
    this.add.image(0, 0, 'card').setScale(this.cardScale)
  }

  dealInitialCards() {
    this.playerHand = [this.deck.pop()]
    this.playerHand.push(this.deck.pop())
    this.dealerHand = [this.deck.pop()]
    this.dealerHand.push(this.deck.pop())
  }

  addBetButtons(amount, x, y){
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY
    this.possibleBetButtons.push(this.add.text(x, y, amount, { fontSize: '48px', fill: '#FFD700' }).setInteractive().on('pointerdown', () => {
      // if the button is pressed while the user has enough credits to bet that amount, then let it slide
      if (this.playerCredits >= amount)
        this.bet(amount)
      // otherwise, show text that says not enough, and make it disappear after 3 seconds
      else {
        const text = this.add.text(centerX - 300, centerY + 240, 'Not enough credits', {
          fontSize: '24px',
          fill: 'red',
        })
        this.time.delayedCall(3000, () => {
          text.destroy()
        })
      }
    }))
    this.possibleRemoveBetButtons.push(this.add
      .text(x + 10, y + 50, `Remove`, { fontSize: '18px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.removeBet(amount))
    )
  }

  createUI() {
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    this.add.text(centerX - 100, 50, 'Blackjack', { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' })

    this.totalCredits = this.add.text(centerX + 200, 25, `Credits: ${this.playerCredits}`, { fontFamily: 'Arial', fontSize: '24px', fill: '#fff' })

    // creating buttons for each possible amount that can be bet
    this.possibleBets.forEach((item, index) => {
      this.addBetButtons(item, (centerX - 300) + (index < 5 ? index * 100 : (index - 5) * 135), (centerY - 200) + (index < 5 ? 125 : 225))
    })

    this.currentBetText = this.add.text(centerX + 50, centerY + 240, `Current Bet: ${this.currentBet}`, { fontSize: '24px', fill: '#fff' })

    // game starts once all bets are finalized
    this.placeBetsButton = this.add.text(centerX + 250, centerY + 170, "Place Bets", { fontSize: '24px', fill: '#FFD700' }).setInteractive().on('pointerdown', () => this.startGame())
  }

  startGame(){
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    this.possibleBetButtons.forEach((item, index) => {item.destroy()})
    this.possibleRemoveBetButtons.forEach((item, index) => {item.destroy()})
    this.placeBetsButton.destroy()
    
    this.dealInitialCards()
    // visually dealing out the cards
    this.animateCard(100 + this.playerCardCount * 50, 400, `${this.playerHand[0].value}_of_${this.playerHand[0].suit}.png`, 0)
    this.playerCardCount++
    this.animateCard(100 + this.dealerCardCount * 50, 200, `${this.dealerHand[0].value}_of_${this.playerHand[0].suit}.png`, 1)
    this.dealerCardCount++
    this.animateCard(100 + this.playerCardCount * 50, 400, `${this.playerHand[1].value}_of_${this.playerHand[0].suit}.png`, 2)
    this.playerCardCount++
    this.dealersSecond = this.animateCard(100 + this.dealerCardCount * 50, 200, `card`, 3)
    this.dealerCardCount++

    this.playerValueText = this.add.text(centerX - 300, centerY + 210, this.calculateHandValue(this.playerHand), { fontSize: '24px', fill: '#fff' })
    this.dealerValueText = this.add.text(centerX - 300, centerY - 225, this.isPlayerTurn ? (isNaN(this.dealerHand[0].value) ? 10 : this.dealerHand[0].value) : 
      this.calculateHandValue(this.dealerHand), { fontSize: '24px', fill: '#fff' })

    this.hitButton = this.add
      .text(centerX + 200, centerY - 75, 'Hit', { fontSize: '24px', fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => this.hit())

    this.standButton = this.add
      .text(centerX + 190, centerY + 50, 'Stand', { fontSize: '24px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.stand())
  }

  animateCard(handX, handY, newTexture, order) {
    // start by creating a card object in the top left of the screen
    const card = this.add.image(0, 0, 'card').setScale(this.cardScale)
  
    // here we use tweens, the phaser way of doing animations
    this.tweens.add({
      // setting the object to be animated as the card we just made
      targets: card,
      // setting the destination for the card to end up
      x: handX,
      y: handY,
      // how long the animation will take
      duration: 500,
      // how much time is spent waiting for it to happen (for at the start when 4 cards are dealt at the same time)
      delay: order * 200,
      // type of animation (idk, its what google said to use)
      ease: 'Cubic.easeOut',
      // do this once the animation is done
      onComplete: () => {
        // only do if the card is supposed to be flipped over (ie. the dealer's second card)
        if (newTexture != 'card') {
          // make another animation to make it flip over
          this.tweens.add({
            targets: card,
            // by setting the horizontal scale to 0, we make it look like its mid-flip
            scaleX: 0,
            duration: 200,
            ease: 'Linear',
            // once its done we change the image used, and make it fully flip
            onComplete: () => {
              // Change the texture to the new card face
              card.setTexture(newTexture)
              // Flip back to full size
              this.tweens.add({
                targets: card,
                // set horizontal scale back to what it was originally
                scaleX: this.cardScale,
                duration: 200,
                ease: 'Linear',
              })
            },
          })
        }
      },
    })

    return card
  }


  bet(value) {
    // another check to make sure the user cannot go into debt
    if (value <= this.playerCredits) {
      this.currentBet += value
      this.currentBetText.setText(`Current Bet: ${this.currentBet}`)
      this.playerCredits -= value
      this.totalCredits.setText(`Credits: ${this.playerCredits}`)
    }
  }

  removeBet(value) {
    // another check to make sure the user cannot go into debt
    if (value <= this.currentBet) {
      this.currentBet -= value
      this.currentBetText.setText(`Current Bet: ${this.currentBet}`)
      this.playerCredits += value
      this.totalCredits.setText(`Credits: ${this.playerCredits}`)
    }
  }

  // manages all blackjack counting logic :)
  calculateHandValue(hand) {
    let value = 0
    let aces = 0

    hand.forEach((card) => {
      if (['jack', 'queen', 'king'].includes(card.value)) {
        value += 10
      } else if (card.value === 'ace') {
        value += 11
        aces += 1
      } else {
        value += parseInt(card.value, 10)
      }
    })

    while (value > 21 && aces > 0) {
      value -= 10
      aces -= 1
    }

    return value
  }


  hit() {
    if (!this.isPlayerTurn) return

    this.playerHand.push(this.deck.pop())
    this.animateCard(100 + this.playerCardCount * 50, 400, `${this.playerHand[this.playerHand.length - 1].value}_of_${this.playerHand[this.playerHand.length - 1].suit}.png`, 0)
    this.playerCardCount++

    const playerValue = this.calculateHandValue(this.playerHand)
    this.playerValueText.setText(playerValue)
    if (playerValue > 21)
      this.endGame('You Lose...')
  }

  stand() {
    if (!this.isPlayerTurn) return

    // another animation specifically for the dealer's second card
    // essentially the same as the once used previously in animateCard()
    this.tweens.add({
      targets: this.dealersSecond,
      scaleX: 0,
      duration: 200,
      ease: 'Linear',
      onComplete: () => {
        this.dealersSecond.setTexture(`${this.dealerHand[1].value}_of_${this.dealerHand[1].suit}.png`)
        this.tweens.add({
          targets: this.dealersSecond,
          scaleX: this.cardScale,
          duration: 200,
          ease: 'Linear',
        })
      },
    })
    this.isPlayerTurn = false
    this.dealerTurn()
  }

  dealerTurn() {
    let dealerValue = this.calculateHandValue(this.dealerHand)
    this.dealerValueText.setText(dealerValue)

    // dealer will draw cards until they get a total of at least 17
    while (dealerValue < 17) {
      this.dealerHand.push(this.deck.pop())
      this.animateCard(100 + this.dealerCardCount * 50, 200, `${this.dealerHand[this.dealerHand.length - 1].value}_of_${this.dealerHand[this.dealerHand.length - 1].suit}.png`, 0)
      this.dealerCardCount++
      dealerValue = this.calculateHandValue(this.dealerHand)
      this.dealerValueText.setText(dealerValue)
    }

    this.checkWinner()
  }

  checkWinner() {
    const playerValue = this.calculateHandValue(this.playerHand)
    const dealerValue = this.calculateHandValue(this.dealerHand)

    if (dealerValue > 21 || playerValue > dealerValue)
      this.endGame('You Win!')
    else if (playerValue < dealerValue)
      this.endGame('You Lose...')
    else
      this.endGame("That's a Push")
  }

  endGame(message) {
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    if(message.includes('Win')){
      this.playerCredits += this.currentBet * 2
      this.totalCredits.setText(`Credits: ${this.playerCredits}`)
    }
    else if(message.includes('Push')){
      this.playerCredits += this.currentBet
      this.totalCredits.setText(`Credits: ${this.playerCredits}`)
    }
    this.currentBet = 0
    this.currentBetText.setText(`Current Bet: ${this.currentBet}`)
    
    this.add.text(centerX - 200, centerY + 225, message, {
      fontSize: '32px',
      fill: '#fff',
    })

    this.hitButton.destroy()
    this.standButton.destroy()
    this.playAgainButton = this.add
      .text(centerX + 150, centerY - 75, 'Play Again', { fontSize: '24px', fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => {
        this.playerCardCount = 0
        this.dealerCardCount = 0
        this.isPlayerTurn = true
        this.registry.destroy()
        this.events.off()
        this.scene.restart()
      })

    this.quitButton = this.add
      .text(centerX + 190, centerY + 50, 'Quit', { fontSize: '24px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => window.location.href = '/')
  }
}

// putting it all in a React component
const BlackjackGame = () => {
  const gameRef = useRef(null)
  const [gameInstance, setGameInstance] = useState(null)

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      backgroundColor: '#2d2d2d',
      parent: 'phaser-game',
      scene: BlackjackScene,
      scale: {
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
      },
    }

    const game = new Phaser.Game(config)
    gameRef.current = game
    setGameInstance(game)

    return () => {
      game.destroy(true)
    }
  }, [])

  return <div id="phaser-game"></div>
}

export default BlackjackGame
