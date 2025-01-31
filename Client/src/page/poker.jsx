import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

class PokerScene extends Phaser.Scene {

// constructor to initialize all the scene variables
  constructor() {
    super({ key: 'PokerScene' })
    this.cardScale = 0.15
    this.allPhysicalPositions = []
    this.allPositionCoordinates = []
    this.deck = []
    this.amountOfPlayers = 1
    this.playerIndex
    this.playerHands = []
    this.river = []
    this.isPlayersTurn = []
    this.playerCardCounts = []
    this.riverCardCount = 0
    this.playerCredits = 10_000
    this.currentBet = 0
    this.totalBet = 0
    this.possibleBets = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000]
    this.possibleBetButtons = []
    this.possibleRemoveBetButtons = []
    this.totalCredits
    this.currentBetText
    this.placeBetsButton
  }

  // loading all the image assets
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

  // method to create the scene
  create() {
    this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height)
    // randomizing player count and user position randomly for now
    this.amountOfPlayers = 8 /*Math.floor(Math.random() * (8)) + 1*/
    this.playerIndex = this.amountOfPlayers - 1/*Math.floor(Math.random() * (this.amountOfPlayers)) + 1*/
    for (var i = 0; i < this.amountOfPlayers; i++)
      this.playerCardCounts.push(0)
    this.createDeck()
    this.createUI()
  }

  // creating a randomly shuffled deck
  createDeck() {
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"]
    const suits = ["spades", "clubs", "diamonds", "hearts"]
    this.deck = suits.flatMap((suit) => values.map((value) => ({ suit, value })))
    Phaser.Utils.Array.Shuffle(this.deck)
  }

  // dealing cards to all the players
  dealInitialCards() {
    for (var i = 0; i < this.amountOfPlayers; i++){
      this.playerHands.push([this.deck.pop()])
    }
    for (var i = 0; i < this.amountOfPlayers; i++){
      this.playerHands[i].push(this.deck.pop())
    }
  }

  // adding the buttons to make a bet
  addBetButtons(amount, x, y){
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY
    this.possibleBetButtons.push(this.add.text(x, y, amount, { fontSize: '72px', fill: '#FFD700' }).setInteractive().on('pointerdown', () => {
      // if the button is pressed while the user has enough credits to bet that amount, then let it slide
      if (this.playerCredits >= amount)
        this.bet(amount)
      // otherwise, show text that says not enough, and make it disappear after 3 seconds
      else {
        const text = this.add.text(centerX, centerY - (this.scale.height / 3), 'Not enough credits', {
          fontSize: '48px',
          fill: 'red',
        }).setOrigin(0.5, 0.5)
        this.time.delayedCall(3000, () => {
          text.destroy()
        })
      }
    }).setOrigin(0.5, 0.5).setActive(false).setVisible(false))
    // adding buttons to remove the displayed bet amount and put it back in the account
    this.possibleRemoveBetButtons.push(this.add
      .text(x + 10, y + 50, `Remove`, { fontSize: '18px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.removeBet(amount)).setOrigin(0.5, 0.5).setActive(false).setVisible(false)
    )
  }

  // dynamically changing player slots based on however many people are in the room (maximum of 8)
  editPlayerSlots(){
    if(this.amountOfPlayers >= 7) 
      for(var i = 0; i < this.amountOfPlayers; i++)
        this.allPhysicalPositions[i].setPosition(this.allPositionCoordinates[i][0], this.allPositionCoordinates[i][1])
    else if (this.amountOfPlayers >= 5)
      for(var i = 0; i < this.amountOfPlayers; i++)
        this.allPhysicalPositions[i].setPosition(this.allPositionCoordinates[i + 1][0], this.allPositionCoordinates[i + 1][1])
    else if (this.amountOfPlayers >= 3)
      for(var i = 0; i < this.amountOfPlayers; i++)
        this.allPhysicalPositions[i].setPosition(this.allPositionCoordinates[i + 2][0], this.allPositionCoordinates[i + 2][1])
    else
      for(var i = 0; i < this.amountOfPlayers; i++)
        this.allPhysicalPositions[i].setPosition(this.allPositionCoordinates[i + 3][0], this.allPositionCoordinates[i + 3][1])
  }

  // creating all the elements on the screen before the actual game-play
  createUI() {
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    // setting the possible positions that the players can be
    this.allPositionCoordinates.push([this.scale.width - this.scale.width / 50, this.scale.height / 4])
    this.allPositionCoordinates.push([this.scale.width - this.scale.width / 50, (this.scale.height / 4) * 2.75])
    this.allPositionCoordinates.push([centerX + (this.scale.width / 3.5), this.scale.height - this.scale.height / 30])
    this.allPositionCoordinates.push([centerX + (this.scale.width / 10), this.scale.height - this.scale.height / 30])
    this.allPositionCoordinates.push([centerX - (this.scale.width / 10), this.scale.height - this.scale.height / 30])
    this.allPositionCoordinates.push([centerX - (this.scale.width / 3.5), this.scale.height - this.scale.height / 30])
    this.allPositionCoordinates.push([this.scale.width / 50, (this.scale.height / 4) * 2.75])
    this.allPositionCoordinates.push([this.scale.width / 50, this.scale.height / 4])

    // adding the player positions to be offscreen
    for (var i = 0; i < 8; i++)
      this.allPhysicalPositions.push(this.add.text(centerX, -100, `Player ${i + 1}`, { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5).setAngle(this.doesRotate(i) == 0 ? -90 : this.doesRotate(i) == 2 ? 90 : 0))

    // adding the player slots
    this.editPlayerSlots()

    this.add.text(centerX, this.scale.height / 20, 'Poker', { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5)

    this.totalCredits = this.add.text(centerX + (this.scale.width / 5), this.scale.height / 20, `Credits: ${this.playerCredits}`, { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5)
    this.currentBetText = this.add.text(centerX - (this.scale.width / 3.5), this.scale.height / 20, `Total Pot: ${this.totalBet}`, { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5)

    this.startGameButton = this.add.text(centerX - (this.scale.width / 6), centerY + (this.scale.height / 4.5), "Start Game", { fontSize: '72px', fill: '#FFD700' }).setInteractive().on('pointerdown', () => this.startGame()).setOrigin(0.5, 0.5)
    this.quitButton = this.add.text(centerX + (this.scale.width / 6), centerY + (this.scale.height / 4.5), 'Quit', { fontSize: '72px', fill: '#f00' }).setInteractive().on('pointerdown', () => window.location.href = '/').setOrigin(0.5, 0.5)

    
    // creating buttons for each possible amount that can be bet
    this.possibleBets.forEach((item, index) => {
      this.addBetButtons(item, (centerX - (this.scale.width / 4)) + (index < 5 ? index * (this.scale.width / 8) : (index - 5) * (this.scale.width / 6)), (centerY - (this.scale.height / 2.5)) + (index < 5 ? (this.scale.height / 5) : (this.scale.height / 2.5)))
    })

    // game starts once all bets are finalized
    this.placeBetsButton = this.add.text(centerX - (this.scale.width / 6), centerY + (this.scale.height / 4.5), "Place Bets", { fontSize: '72px', fill: '#FFD700' }).setInteractive().on('pointerdown', () => this.addBetToPot()).setOrigin(0.5, 0.5).setActive(false).setVisible(false)
    this.cancelBetButton = this.add.text(centerX + (this.scale.width / 6), centerY + (this.scale.height / 4.5), "Cancel", { fontSize: '72px', fill: '#FFD700' }).setInteractive().on('pointerdown', () => console.log('TODO')).setOrigin(0.5, 0.5).setActive(false).setVisible(false)
  }

  doesRotate(index){
    if(this.amountOfPlayers >= 7)
      if (index < 2)
        return 0
      else if (index > 5)
        return 2
      else
        return 1
    else if (this.amountOfPlayers >= 5)
      if (index < 1)
        return 0
      else if (index > 6)
        return 2
      else
        return 1
    else
      return 1
  }

  startGame(){
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    this.startGameButton.destroy()
    this.quitButton.setVisible(false).setActive(false)

    this.dealInitialCards()
    // visually dealing out the first card to each player
    for (var i = 0; i < this.amountOfPlayers; i++){
      this.isPlayersTurn[i] = i == 0 ? true : false
      const string = `${this.playerHands[i][0].value}_of_${this.playerHands[i][0].suit}.png`
      this.animateCard(this.allPhysicalPositions[i].x - (this.doesRotate(i) == 0 ? (this.scale.width / 20) : (this.doesRotate(i) == 2 ? -(this.scale.width / 20) : 0)),
        this.allPhysicalPositions[i].y - (this.doesRotate(i) == 1 ? (this.scale.width / 18) : 0), i == this.playerIndex ? string : 'card', 0, this.doesRotate(i))
      this.playerCardCounts[i]++
    }

    // dealing out the second card to each player
    for (var i = 0; i < this.amountOfPlayers; i++){
      const string = `${this.playerHands[i][1].value}_of_${this.playerHands[i][1].suit}.png`
      this.animateCard(this.allPhysicalPositions[i].x + (this.doesRotate(i) == 1 ? this.playerCardCounts[i] * (this.scale.width / 50) : 0) - (this.doesRotate(i) == 0 ? (this.scale.width / 20) : (this.doesRotate(i) == 2 ? -(this.scale.width / 20) : 0)), 
        this.allPhysicalPositions[i].y + (this.doesRotate(i) != 1 ? this.playerCardCounts[i] * (this.scale.height / 30) : 0) - (this.doesRotate(i) == 1 ? (this.scale.width / 18) : 0), i == this.playerIndex ? string : 'card', 2, this.doesRotate(i))
      this.playerCardCounts[i]++
    }

    // showing the numeric value of the player's cards
    var horiz = 0, vert = 0
    if (this.doesRotate(this.playerIndex) == 1)
      vert = -(this.scale.height / 4.5)
    else if (this.doesRotate(this.playerIndex) == 0)
      horiz = -(this.scale.width / 8)
    else
      horiz = (this.scale.width / 8)

    this.playerValueText = this.add.text(this.allPhysicalPositions[this.playerIndex].x + horiz, this.allPhysicalPositions[this.playerIndex].y + vert,
      this.totalBet, { fontSize: '36px', fill: '#fff' }).setOrigin(0.5, 0.5)

    // creating the raise, call, check and fold buttons
    this.betButton = this.add
      .text(centerX - (this.scale.width / 3.5), centerY + (this.scale.height / 7), 'Raise', { fontSize: '48px', fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => this.raise(this.playerIndex)).setOrigin(0.5,0.5)

    this.callButton = this.add
      .text(centerX - (this.scale.width / 9), centerY + (this.scale.height / 7), 'Call', { fontSize: '48px', fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => this.hit(this.playerIndex)).setOrigin(0.5,0.5)

    this.checkButton = this.add
      .text(centerX + (this.scale.width / 9), centerY + (this.scale.height / 7), 'Check', { fontSize: '48px', fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => this.hit(this.playerIndex)).setOrigin(0.5,0.5)

    this.foldButton = this.add
      .text(centerX + (this.scale.width / 3.5), centerY + (this.scale.height / 7), 'Fold', { fontSize: '48px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.fold(this.playerIndex)).setOrigin(0.5,0.5)
  }

  animateCard(handX, handY, newTexture, order, rotate) {
    const centerX = this.cameras.main.centerX
    // start by creating a card object in the top left of the screen
    const card = this.add.image(centerX, -(this.scale.height / 5), 'card').setScale(this.cardScale).setOrigin(0.5, 0.5)
  
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
        // only do if the card is supposed to be flipped over (ie. the player's cards / the river)
        if (newTexture != 'card') {
          // make another animation to make it flip over
          this.tweens.add({
            targets: card,
            // by setting the horizontal scale to 0, we make it look like its mid-flip
            scaleX: 0,
            angle: rotate != 1 ? 90 : 0,
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
        // just 
        else{
          this.tweens.add({
              targets: card,
              angle: rotate != 1 ? 90 : 0,
              duration: 200,
              ease: 'Linear',
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
      this.playerCredits -= value
      this.totalCredits.setText(`Credits: ${this.playerCredits}`)
    }
  }

  removeBet(value) {
    // another check to make sure the user cannot go into debt
    if (value <= this.currentBet) {
      this.currentBet -= value
      this.playerCredits += value
      this.totalCredits.setText(`Credits: ${this.playerCredits}`)
    }
  }

  addBetToPot(){
    this.totalBet += this.currentBet
    this.currentBetText.setText(`Total Pot: ${this.totalBet}`)
    this.currentBet = 0
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

  raise(player) {
    // if (!this.isPlayersTurn[player]) return
    if (!this.isPlayersTurn.includes(true)) return

    this.betButton.setVisible(false).setActive(false)
    this.callButton.setVisible(false).setActive(false)
    this.checkButton.setVisible(false).setActive(false)
    this.foldButton.setVisible(false).setActive(false)

    this.possibleBetButtons.forEach((item) => {item.setVisible(true).setActive(true)})
    this.possibleRemoveBetButtons.forEach((item) => {item.setVisible(true).setActive(true)})
    this.placeBetsButton.setVisible(true).setActive(true)
    this.cancelBetButton.setVisible(true).setActive(true)

    // this.playerHands[player].push(this.deck.pop())
    // this.animateCard(this.allPhysicalPositions[player].x + (this.doesRotate(player) == 1 ? this.playerCardCounts[player] * (this.scale.width / 50) : 0) - (this.doesRotate(player) == 0 ? (this.scale.width / 20) : (this.doesRotate(player) == 2 ? -(this.scale.width / 20) : 0)), 
    //     this.allPhysicalPositions[player].y + (this.doesRotate(player) != 1 ? this.playerCardCounts[player] * (this.scale.height / 30) : 0) - (this.doesRotate(player) == 1 ? (this.scale.width / 18) : 0), 
    //     `${this.playerHands[player][this.playerHands[player].length - 1].value}_of_${this.playerHands[player][this.playerHands[player].length - 1].suit}.png`, 0, this.doesRotate(player))

    // this.playerCardCounts[player]++

    // const playerValue = this.calculateHandValue(this.playerHands[player])
    // this.playerValueText.setText(playerValue)
    // if (playerValue > 21)
    //   this.endGame('You Lose...')
  }

  fold(player) {
    // if (!this.isPlayersTurn[player]) return
    if (!this.isPlayersTurn.includes(true)) return

    this.isPlayersTurn[player] = false
    if (player == this.amountOfPlayers - 1)
      this.dealerTurn()
    else
      this.isPlayersTurn[player + 1] = true
  }

  dealerTurn() {
    const centerX = this.cameras.main.centerX
    let dealerValue = this.calculateHandValue(this.dealerHand)
    this.dealerValueText.setText(dealerValue)

    // dealer will draw cards until they get a total of at least 17
    while (dealerValue < 17) {
      this.dealerHand.push(this.deck.pop())
      this.animateCard(centerX - 100 + this.dealerCardCount * 50, 250, `${this.dealerHand[this.dealerHand.length - 1].value}_of_${this.dealerHand[this.dealerHand.length - 1].suit}.png`, 0)
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
    
    this.add.text(centerX, centerY + (this.scale.height / 20), message, {
      fontSize: '60px',
      fill: '#fff',
    }).setOrigin(0.5, 0.5)

    this.betButton.destroy()
    this.callButton.destroy()
    this.checkButton.destroy()
    this.foldButton.destroy()
    this.playAgainButton = this.add
      .text(centerX - (this.scale.width / 5), centerY + (this.scale.height / 6), 'Play Again', { fontSize: '48px', fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => {
        this.playerHands = []
        this.playerCardCounts = []
        this.riverCardCount = 0
        this.isPlayersTurn = []
        this.allPhysicalPositions = []
        this.registry.destroy()
        this.events.off()
        this.scene.restart()
      }).setOrigin(0.5, 0.5)

    this.quitButton.setVisible(true).setActive(true)
  }
}

// putting it all in a React component
const PokerGame = () => {
  const gameRef = useRef(null)
    const [gameInstance, setGameInstance] = useState(null)
  
    useEffect(() => {
      const config = {
        type: Phaser.AUTO,
        width: window.innerWidth - 10,
        height: window.innerHeight - 10,
        backgroundColor: '#2d2d2d',
        parent: 'phaser-game',
        scene: PokerScene,
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

export default PokerGame
