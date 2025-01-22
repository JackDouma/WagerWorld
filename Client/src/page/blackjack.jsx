import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

class BlackjackScene extends Phaser.Scene {

  constructor() {
    super({ key: 'BlackjackScene' })
    this.cardScale = 0.25
    this.allPhysicalPositions = []
    this.currentPhysicalPositions = []
    this.deck = []
    this.amountOfPlayers = 1
    this.playerIndex
    this.playerHands = []
    this.dealerHand = []
    this.isPlayersTurn = []
    this.playerCardCounts = []
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
    this.load.image('bg', 'table.jpg')
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
    this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height)
    this.amountOfPlayers = 8
    // this.amountOfPlayers = Math.floor(Math.random() * (8)) + 1
    this.playerIndex = Math.floor(Math.random() * (this.amountOfPlayers)) + 1
    for (var i = 0; i < this.amountOfPlayers; i++)
      this.playerCardCounts.push(0)
    this.createDeck()
    this.createUI()
  }

  createDeck() {
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"]
    const suits = ["spades", "clubs", "diamonds", "hearts"]
    this.deck = suits.flatMap((suit) => values.map((value) => ({ suit, value })))
    Phaser.Utils.Array.Shuffle(this.deck)
  }

  dealInitialCards() {
    for (var i = 0; i < this.amountOfPlayers; i++){
      this.playerHands.push([this.deck.pop()])
    }
    this.dealerHand = [this.deck.pop()]
    for (var i = 0; i < this.amountOfPlayers; i++){
      this.playerHands[i].push(this.deck.pop())
    }
    this.dealerHand.push(this.deck.pop())
  }

  addBetButtons(amount, x, y){
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY
    this.possibleBetButtons.push(this.add.text(x, y, amount, { fontSize: '96px', fill: '#FFD700' }).setInteractive().on('pointerdown', () => {
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
    }).setOrigin(0.5, 0.5))
    this.possibleRemoveBetButtons.push(this.add
      .text(x + 10, y + 50, `Remove`, { fontSize: '18px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.removeBet(amount)).setOrigin(0.5, 0.5)
    )
  }

  createUI() {
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    this.allPhysicalPositions.push(this.add.text(this.scale.width - 100, this.scale.height / 4, "1", { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5))
    this.allPhysicalPositions.push(this.add.text(this.scale.width - 100, (this.scale.height / 4) * 2.75, "2", { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5))
    this.allPhysicalPositions.push(this.add.text(centerX + (this.scale.width / 3), (this.scale.height / 8) * 7, "3", { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5))
    this.allPhysicalPositions.push(this.add.text(centerX + (this.scale.width / 7), (this.scale.height / 8) * 7, "4", { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5))
    this.allPhysicalPositions.push(this.add.text(centerX - (this.scale.width / 7), (this.scale.height / 8) * 7, "5", { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5))
    this.allPhysicalPositions.push(this.add.text(centerX - (this.scale.width / 3), (this.scale.height / 8) * 7, "6", { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5))
    this.allPhysicalPositions.push(this.add.text(100, (this.scale.height / 4) * 2.75, "7", { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5))
    this.allPhysicalPositions.push(this.add.text(100, this.scale.height / 4, "8", { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5))

    this.add.text(centerX, this.scale.height / 20, 'Blackjack', { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5)

    this.totalCredits = this.add.text(centerX + (this.scale.width / 5), this.scale.height / 20, `Credits: ${this.playerCredits}`, { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5)
    this.currentBetText = this.add.text(centerX - (this.scale.width / 3.5), this.scale.height / 20, `Current Bet: ${this.currentBet}`, { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5)

    // creating buttons for each possible amount that can be bet
    this.possibleBets.forEach((item, index) => {
      this.addBetButtons(item, (centerX - (this.scale.width / 3.5)) + (index < 5 ? index * 200 : (index - 5) * 300), (centerY - (this.scale.height / 3)) + (index < 5 ? 125 : 300))
    })

    // game starts once all bets are finalized
    this.placeBetsButton = this.add.text(centerX - (this.scale.width / 6), centerY + (this.scale.height / 4.5), "Place Bets", { fontSize: '72px', fill: '#FFD700' }).setInteractive().on('pointerdown', () => this.startGame())
  }

  startGame(){
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    this.possibleBetButtons.forEach((item, index) => {item.destroy()})
    this.possibleRemoveBetButtons.forEach((item, index) => {item.destroy()})
    this.placeBetsButton.destroy()

    this.dealInitialCards()
    // visually dealing out the cards
    for (var i = 0; i < this.amountOfPlayers; i++){
      this.isPlayersTurn[i] = i == 0 ? true : false
      const string = `${this.playerHands[i][0].value}_of_${this.playerHands[i][0].suit}.png`
      const rotate = i < 2 || i > 5
      this.animateCard(this.allPhysicalPositions[i].x - (i > 5 ? 50 : (i < 2 ? -50 : 0)), this.allPhysicalPositions[i].y, string, 0, rotate, i != this.playerIndex)
      this.playerCardCounts[i]++
    }
    
    this.animateCard(centerX - 100 + this.dealerCardCount * 50, 250, `${this.dealerHand[0].value}_of_${this.dealerHand[0].suit}.png`, 1, false)
    this.dealerCardCount++

    for (var i = 0; i < this.amountOfPlayers; i++){
      const string = `${this.playerHands[i][1].value}_of_${this.playerHands[i][1].suit}.png`
      const rotate = i < 2 || i > 5
      this.animateCard(this.allPhysicalPositions[i].x + (!rotate ? this.playerCardCounts[i] * 50 : 0) - (i > 5 ? 50 : (i < 2 ? -50 : 0)), 
        this.allPhysicalPositions[i].y + (rotate ? (i < 2 ? -(this.playerCardCounts[i] * 50) : this.playerCardCounts[i] * 50) : 0), string, 2, rotate, i != this.playerIndex)
      this.playerCardCounts[i]++
    }
    this.dealersSecond = this.animateCard(centerX - 100 + this.dealerCardCount * 50, 250, `card`, 3, false)
    this.dealerCardCount++

    var horiz = 0, vert = 0
    if (this.playerIndex < 2)
      horiz = -100
    else if (this.playerIndex < 6)
      vert = -125
    else
      horiz = 80
    this.playerValueText = this.add.text(this.allPhysicalPositions[this.playerIndex].x + horiz, this.allPhysicalPositions[this.playerIndex].y + vert,
      this.calculateHandValue(this.playerHands[this.playerIndex]), { fontSize: '36px', fill: '#fff' }).setOrigin(0.5, 0.5)

    this.hitButton = this.add
      .text(centerX - (this.scale.width / 5), centerY + (this.scale.height / 6), 'Hit', { fontSize: '48px', fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => this.hit(this.playerIndex)).setOrigin(0.5,0.5)

    this.standButton = this.add
      .text(centerX + (this.scale.width / 5), centerY + (this.scale.height / 6), 'Stand', { fontSize: '48px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.stand()).setOrigin(0.5,0.5)

    console.log(this.playerIndex)
  }

  animateCard(handX, handY, newTexture, order, rotate, tint) {
    const centerX = this.cameras.main.centerX
    // start by creating a card object in the top left of the screen
    const card = this.add.image(centerX, -(this.scale.height / 5), 'card').setScale(this.cardScale)
  
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
            angle: rotate ? 90 : 0,
            duration: 200,
            ease: 'Linear',
            // once its done we change the image used, and make it fully flip
            onComplete: () => {
              // Change the texture to the new card face
              card.setTexture(newTexture)
              if (tint)
                card.setTint(0x808080)
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
        else{
          this.dealerValueText = this.add.text(card.x - 150, card.y, this.isPlayersTurn.includes(true) ? (isNaN(this.dealerHand[0].value) ? 10 : this.dealerHand[0].value) : 
            this.calculateHandValue(this.dealerHand), { fontSize: '36px', fill: '#fff' }).setOrigin(0.5, 0.5)
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


  hit(player) {
    if (!this.isPlayersTurn[player]) return

    this.playerHands[player].push(this.deck.pop())
    this.animateCard(this.allPhysicalPositions[i].x + this.playerCardCounts[player] * 50, this.allPhysicalPositions[i].y, `${this.playerHands[player][this.playerHands[player].length - 1].value}_of_${this.playerHands[player][this.playerHands[player].length - 1].suit}.png`, 0, player < 2 || player > 5 ? true : false, false)
    this.playerCardCounts[player]++

    const playerValue = this.calculateHandValue(this.playerHands[player])
    this.playerValueText.setText(playerValue)
    if (playerValue > 21)
      this.endGame('You Lose...')
  }

  stand(player) {
    if (!this.isPlayersTurn[player]) return

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
    this.isPlayersTurn[player] = false
    if (player == this.amountOfPlayers - 1)
      this.dealerTurn()
    else
      this.isPlayersTurn[player + 1] = true
  }

  dealerTurn() {
    let dealerValue = this.calculateHandValue(this.dealerHand)
    this.dealerValueText.setText(dealerValue)

    // dealer will draw cards until they get a total of at least 17
    while (dealerValue < 17) {
      this.dealerHand.push(this.deck.pop())
      this.animateCard(100 + this.dealerCardCount * 50, 200, `${this.dealerHand[this.dealerHand.length - 1].value}_of_${this.dealerHand[this.dealerHand.length - 1].suit}.png`, 0, false)
      this.dealerCardCount++
      dealerValue = this.calculateHandValue(this.dealerHand)
      this.dealerValueText.setText(dealerValue)
    }

    this.checkWinner()
  }

  checkWinner() {
    const playerValue = this.calculateHandValue(this.playerHands[this.playerIndex])
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
        this.playerCardCounts = []
        this.dealerCardCount = 0
        this.isPlayersTurn = []
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
      width: window.innerWidth - 10,
      height: window.innerHeight - 10,
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
