import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Client, Room } from 'colyseus.js';
import * as WebFontLoader from 'webfontloader'
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, getFirestore } from "firebase/firestore";
const db = getFirestore();

class BlackjackScene extends Phaser.Scene {
  
  // constructor to initialize all the scene variables
  constructor() {
    super({ key: 'BlackjackScene' })
    this.started = false
    this.cardScale = 0.15
    this.allPhysicalPositions = []
    this.allPositionCoordinates = []
    this.amountOfPlayers = 0
    this.playerIndex
    this.players = {}
    this.waitingRoom = {}
    this.playerHands = {}
    this.dealerHand = []
    this.currentTurn
    // object used for later (because its gotta be played at first, then flipped over later instead of right away)
    this.dealersSecond
    this.playerCredits
    this.currentBet = 0
    this.possibleBets = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000]
    this.possibleBetButtons = []
    this.possibleRemoveBetButtons = []
    this.totalCredits
    this.currentBetText
    this.placeBetsText
    this.placeBetsButton
    this.resultsText
    this.activeCards = []
    this.isWaiting = false
    this.disconnectCount = 0
    this.client = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`)
    this.room = Room
  }

  // loading all the image assets
  preload() {
    WebFontLoader.default.load({
      google: {
        families: ['Rowdies']
      },
      active: () => {
        this.totalCredits.setFontFamily('"Rowdies"')
        this.currentBetText.setFontFamily('"Rowdies"')
        this.resultsText.setFontFamily('"Rowdies"')
        this.placeBetsText.setFontFamily('"Rowdies"')
        this.possibleRemoveBetButtons.forEach((item) => {item.setFontFamily('"Rowdies')})
        this.allPhysicalPositions.forEach((item) => {item.setFontFamily('"Rowdies')})
      }
    })

    this.load.image('bg', '/table.jpg')
    this.load.image('card', '/card-back.png')
    this.load.image('logo', '/blackjack-logo.png')

    const chipValues = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000]
    chipValues.forEach(value => {
      this.load.image(`${value}-chip`, `/Chips/${value}-chip.png`);
    });

    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"]
    const suits = ["spades", "clubs", "diamonds", "hearts"]
    suits.forEach((suit) => {
      values.forEach((value) => {
        const fileName = `${value}_of_${suit}.png`
        this.load.image(fileName, `/Cards/${fileName}`)
      })
    })
    this.load.audio("win", "/cha-ching.mp3")
  }

  init(data) {
    console.log("Init: ", data.roomId);
    this.roomId = data.roomId;
  }

  // method to create the scene
  async create() {
      console.log("Creating Scene...");
      const playerId = localStorage.getItem("firebaseIdToken");
      const userRef = doc(db, "users", playerId);
      const userDoc = await getDoc(doc(db, "users", playerId));
        try{
        if(userDoc.data().isInGame && this.roomId === null){
                    console.log(`Player with ID is already in a game.`);
                    // open popup to inform user that they are already in a game and redirect to home page
                    // redirect to home page
                    window.location.href = "/";
                    return
                  }
        // update isInGame to true
        await updateDoc(userRef, {
          isInGame: true
        });
        
      }
      catch (error) {
        console.error('Error fetching player data:', error);
      }
    // if room is found
    console.log("playerId:", playerId);
    try {
      const firestoreBalance = userDoc.data().balance || 10000;

      this.room = await this.client.joinById(this.roomId, { playerId: playerId || "anonymous", balance: firestoreBalance});
      console.log("Joining room:", this.roomId);
    } 
    // if not room is found
    catch (err) 
    {
      // Commented this out since we only want to create rooms using lobbies.
      // this.room = await this.client.create("blackjack", { customRoomId: this.roomId ,  playerId: playerId || "anonymous", balance: 10000});
      // this.clientId = this.room.playerId
      console.log(err);
    }

    // method is called every time there is a state change, but is only used for actually starting the game
    this.room.onStateChange((state) => {
      console.log("State updated:", state);
    });

    this.room.onMessage('gameStart', (message) => {
      if (message.gamePhase == "playing" && !this.started) {
        for(var i = 0; i < this.disconnectCount; i++)
          this.playerIndex--
        this.disconnectCount = 0
        this.currentTurn = message.owner
        this.playerHands = message.hands
        this.dealerHand = message.dealerHand
        console.log(this.dealerHand)
        this.started = true
        this.startGame()
      }
    });

    // handling a player joining
    this.room.onMessage('playerJoin', (message) => {
      console.log(`Player ${message.playerName} joined the room`);
      // if cards havent been dealt yet, add the player to the table
      this.waitingRoom = message.waitingRoom
      console.log(this.waitingRoom)
      if(this.room.state.gamePhase == "waiting") {
        this.amountOfPlayers = Object.keys(message.players).length
        if (this.playerIndex === undefined) this.playerIndex = this.amountOfPlayers - 1
        this.players = message.players
        this.getPlayerNames()
        this.editPlayerSlots()
      }
      // if a game is in progress, show them a waiting screen
      else if (this.room.state.gamePhase == "playing" && this.room.sessionId in this.waitingRoom) {
        this.resultsText.setText("Waiting for Game to Finish...").setVisible(true)
        this.removeBetButtons()
        this.placeBetsText.setVisible(false)
        this.placeBetsButton.setActive(false).setVisible(false)
        this.isWaiting = true
      }
      // update the total credits screen
      if (message.sessionId === this.room.sessionId) {
        this.playerCredits = message.totalCredits
        console.log("Player credits:", this.playerCredits);
        this.totalCredits.setText(`Credits: ${this.playerCredits}`)
      }
    })

    // handling a player leaving
    this.room.onMessage("playerLeft", (message) => {
      console.log(`Player ${message.sessionId} left the room`);
  
      // find the removed player and update the UI
      this.amountOfPlayers = Object.keys(message.players).length
      this.players = message.players
      if(this.room.state.gamePhase != "playing" && this.room.state.gamePhase != "dealing") {
        if (this.playerIndex >= message.index)
          this.playerIndex--
        this.getPlayerNames()
        this.editPlayerSlots()
      }
      // if the game is in progress, update the name of the player slot with Disconnected
      if(this.room.state.gamePhase == "playing") {
        this.allPhysicalPositions[message.index].setText("Disconnected");
        if (this.playerIndex >= message.index)
          this.disconnectCount++
      }
      // if it was the disconnected players turn, handle that on the server
      if(this.currentTurn == message.sessionId)
        this.room.send("currentTurnDisconnect", { nextPlayer: message.nextPlayer })
    });

    // handling a disconnection
    this.room.onMessage("handleDisconnection", (message) => {
      // make the next person go
      this.currentTurn = message.nextPlayer
      // send an acknowledgement back to the server so it isnt pinged by multiple clients 
      this.room.send("disconnectionHandled")
      // show hit and stand buttons to the correct user
      if (this.currentTurn == this.room.sessionId) {
        this.changeActionButtonState(true, this.hitText, this.hitButton, this.hitGraphics)
        this.changeActionButtonState(true, this.standText, this.standButton, this.standGraphics)
      }
      // if the last player diconnected, go straight to the dealer
      if (this.currentTurn == "dealer")
        this.room.send("dealerTurn")
    })

    // making the players wait for others once they put their bet in
    this.room.onMessage("waitForOthers", (message) => {
      if(message.user == this.room.sessionId) {
        this.resultsText.setVisible(true)
        this.removeBetButtons()
      }
    })

    // client-side hit managing
    this.room.onMessage("hitResult", (message) => {
      const player = message.index
      this.playerHands[message.sessionId] = message.hand
      const hand = this.playerHands[message.sessionId]
      // animate the card from the server
      this.animateCard(this.allPhysicalPositions[player].x + (this.doesRotate(player) == 1 ? (hand.length - 1) * (this.scale.width / 50) : 0) - (this.doesRotate(player) == 0 ? (this.scale.width / 20) : (this.doesRotate(player) == 2 ? -(this.scale.width / 20) : 0)), 
          this.allPhysicalPositions[player].y + (this.doesRotate(player) != 1 ? (hand.length - 1) * (this.scale.height / 30) : 0) - (this.doesRotate(player) == 1 ? (this.scale.width / 18) : 0), 
          `${hand[hand.length - 1].rank}_of_${hand[hand.length - 1].suit}.png`, 0, this.doesRotate(player), player != this.playerIndex)

      // updating the value
      const playerValue = this.calculateHandValue(this.playerHands[this.room.sessionId])
      this.playerValueText.setText(playerValue)
      // if they got more than 21, tell the server that they busted
      if (this.room.sessionId == this.currentTurn && playerValue > 21)
        this.room.send("playerBusts")
    })

    // making the next player go
    this.room.onMessage("nextTurn", (message) => {
      // start by setting the message to be the result of their turn
      if(this.currentTurn == this.room.sessionId) {
        this.resultsText.setVisible(true)
        if(!message.busted)
          this.resultsText.setText(`Standing on ${message.score}`)
        else
          this.resultsText.setText(`You Busted on ${message.score}...`)
      }
      
      // set hit and stand buttons inivisible for the one who finished, and visible for the next player
      this.currentTurn = message.nextPlayer
      if (this.currentTurn == this.room.sessionId) {
        this.changeActionButtonState(true, this.hitText, this.hitButton, this.hitGraphics)
        this.changeActionButtonState(true, this.standText, this.standButton, this.standGraphics)
      }
      if (message.prevPlayer == this.room.sessionId) {
        this.changeActionButtonState(false, this.hitText, this.hitButton, this.hitGraphics)
        this.changeActionButtonState(false, this.standText, this.standButton, this.standGraphics)
      }

      // if the last player finished, go to the dealer
      if (this.currentTurn == "dealer")
        this.room.send("dealerTurn")
    })

    // dealing with dealer results from the server
    this.room.onMessage("dealerResult", (message) => {
      this.dealerHand = message.dealerHand
      this.dealerTurn(message.playerResults, message.winnings)
    })

    // reset game message from the server
    this.room.onMessage("newGame", (message) => { 
      this.started = false
      if(this.playAgainButton) this.destroyButtons(this.playAgainText, this.playAgainButton, this.playAgainGraphics)
      if(this.quitButton) this.destroyButtons(this.quitText, this.quitButton, this.quitGraphics)
      this.playerHands = {}
      this.currentBetText.destroy()
      this.totalCredits.destroy()
      this.resultsText.destroy()
      if (this.playerValueText) this.playerValueText.destroy()
      this.activeCards.forEach(item => item.destroy())
      this.activeCardNames = []
      if (this.dealerValueText) this.dealerValueText.destroy()
      this.waitingRoom = message.waitingRoom
      this.createUI(!this.isWaiting)
    })

    // if the room is destroyed, then reset the game
    this.room.onMessage("roomDestroyed", () => {
        this.resetGame()
    })

    // if the client refreshes or leaves, only alert them if the game is in play and they are not in the waiting room
    window.addEventListener("beforeunload", (event) => {
      if (this.room && (this.room.state.gamePhase === "playing" || this.room.state.gamePhase === "dealing") && !this.room.state.waitingRoom.has(this.room.sessionId)) {
        event.preventDefault();
      }
    });

    // adding everything else
    this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height)
    this.load.audio('win', '/cha-ching.mp3')
    this.createUI(true)
  }

  // adding the player's names to the text boxes around the table
  getPlayerNames(){
    // do not run if someones in the waiting room
    if(this.room.sessionId in this.waitingRoom) return
    var j = 0
    console.log("Players:", this.players);
    Object.keys(this.players).forEach((item) => {
      this.allPhysicalPositions[j].setText(this.players[item].name);
      j++
    })
  }

  // method to create buttons, including text and hoverr effects
  addActionButtons(action, x, y, onClick, size, colour) {
    const buttonRadius = 20;
    const buttonGraphics = this.add.graphics();
    buttonGraphics.fillStyle(0x000000, 0.5).setVisible(false).setActive(false);

    const text = this.add.text(x, y, action, { fontSize: size, fill: colour }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"').setVisible(false)

    buttonGraphics.fillRoundedRect((text.x - text.width / 2) - 10, (text.y - text.height / 2) - 10, text.width + 20, text.height + 20, buttonRadius);
    
    const button = this.add.zone(text.x - 10, text.y - 10, text.width + 20, text.height + 20)
        .setOrigin(0.5, 0.5)
        .setInteractive().on('pointerdown', () => onClick()).setVisible(false).setActive(false)

    button.on('pointerover', () => {
      buttonGraphics.clear();
      buttonGraphics.fillStyle(0x555555, 0.7);
      buttonGraphics.fillRoundedRect((text.x - text.width / 2) - 10, (text.y - text.height / 2) - 10, text.width + 20, text.height + 20, buttonRadius);
    });

    button.on('pointerout', () => {
      buttonGraphics.clear();
      buttonGraphics.fillStyle(0x000000, 0.5);
      buttonGraphics.fillRoundedRect((text.x - text.width / 2) - 10, (text.y - text.height / 2) - 10, text.width + 20, text.height + 20, buttonRadius);
    });

    return [text, button, buttonGraphics]
  }

  // method to enable / disable the buttons
  changeActionButtonState(state, text, button, graphics) {
    text.setVisible(state).setFontFamily('"Rowdies"')
    button.setActive(state).setVisible(state)
    graphics.setActive(state).setVisible(state)
  }

  // method to destroy the buttons
  destroyButtons(text, button, graphics) {
    text.destroy()
    button.destroy()
    graphics.destroy()
  }

  // adding the buttons to make a bet
  addBetButtons(amount, x, y){
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY
    this.possibleBetButtons.push(this.add.image(x, y, `${amount}-chip`).setInteractive().on('pointerdown', () => {
      // if the button is pressed while the user has enough credits to bet that amount, then let it slide
      if (this.playerCredits >= amount)
        this.bet(amount)
      // otherwise, show text that says not enough, and make it disappear after 3 seconds
      else {
        const text = this.add.text(centerX, centerY - (this.scale.height / 3), 'Not enough credits', {
          fontSize: '48px',
          fill: 'red',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"')
        this.time.delayedCall(3000, () => {
          text.destroy()
        })
      }
    }).setOrigin(0.5, 0.5).setScale(0.2))
    // adding buttons to remove the displayed bet amount and put it back in the account
    this.possibleRemoveBetButtons.push(this.add
      .text(this.possibleBetButtons[this.possibleBetButtons.length - 1].x, this.possibleBetButtons[this.possibleBetButtons.length - 1].y + 70, `Remove`, { fontSize: '18px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.removeBet(amount)).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"')
    )
  }

  // dynamically changing player slots based on however many people are in the room (maximum of 8)
  editPlayerSlots(){
    // start by resetting them all
    for (var i = 0; i < 8; i++)
      this.allPhysicalPositions[i].setPosition(this.cameras.main.centerX, -100);
    // then add them depending on the amount of players in the room
    if(this.amountOfPlayers >= 7)
      for(var i = 0; i < this.amountOfPlayers; i++)
        this.allPhysicalPositions[i].setPosition(this.allPositionCoordinates[i][0], this.allPositionCoordinates[i][1]).setAngle(this.doesRotate(i) == 0 ? -90 : this.doesRotate(i) == 2 ? 90 : 0)
    else if (this.amountOfPlayers >= 5)
      for(var i = 0; i < this.amountOfPlayers; i++)
        this.allPhysicalPositions[i].setPosition(this.allPositionCoordinates[i + 1][0], this.allPositionCoordinates[i + 1][1]).setAngle(this.doesRotate(i) == 0 ? -90 : this.doesRotate(i) == 2 ? 90 : 0)
    else if (this.amountOfPlayers >= 3)
      for(var i = 0; i < this.amountOfPlayers; i++)
        this.allPhysicalPositions[i].setPosition(this.allPositionCoordinates[i + 2][0], this.allPositionCoordinates[i + 2][1]).setAngle(this.doesRotate(i) == 0 ? -90 : this.doesRotate(i) == 2 ? 90 : 0)
    else {
      for(var i = 0; i < this.amountOfPlayers; i++)
        this.allPhysicalPositions[i].setPosition(this.allPositionCoordinates[i + 3][0], this.allPositionCoordinates[i + 3][1]).setAngle(this.doesRotate(i) == 0 ? -90 : this.doesRotate(i) == 2 ? 90 : 0)
    }  
  }

  // creating all the elements on the screen before the actual game-play
  createUI(firstTime) {
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    if(firstTime) {
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
        this.allPhysicalPositions.push(this.add.text(centerX, -100, `Player ${i + 1}`, { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"'))
      this.add.image(centerX, this.scale.height / 12, 'logo').setOrigin(0.5, 0.5)
    }

    // adding the player slots
    this.editPlayerSlots()
    this.getPlayerNames()

    this.totalCredits = this.add.text(centerX + (this.scale.width / 3.5), this.scale.height / 20, `Credits: ${this.playerCredits}`, { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"')
    this.currentBetText = this.add.text(centerX - (this.scale.width / 3.5), this.scale.height / 20, `Current Bet: ${this.currentBet}`, { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"')

    // creating buttons for each possible amount that can be bet
    if(this.possibleBetButtons.length == 0) {
      const numChips = this.possibleBets.length;
      const numRows = 2
      const numCols = Math.ceil(numChips / numRows)

      const chipSpacingX = this.scale.width / (numCols + 1)
      const chipSpacingY = this.scale.height / 4

      this.possibleBets.forEach((item, index) => {
          const row = Math.floor(index / numCols)
          const col = index % numCols

          const x = (this.scale.width / 2) - ((numCols - 1) * chipSpacingX / 2) + (col * chipSpacingX) + (index > 4 ? chipSpacingX / 2 : 0)
          const y = (this.scale.height / 3) + (row * chipSpacingY)

          this.addBetButtons(item, x, y)
      })
    }
    else {
      this.possibleBetButtons.forEach((item) => {item.setActive(true).setVisible(true)})
      this.possibleRemoveBetButtons.forEach((item) => {item.setActive(true).setVisible(true)})
    }

    // game starts once all bets are finalized
    [this.placeBetsText, this.placeBetsButton, this.placeBetsGraphics] = this.addActionButtons("Place Bets", centerX, centerY + (this.scale.height / 4), () => this.room.send("bet", { value: this.currentBet }), '72px', '#FFD700')
    this.changeActionButtonState(true, this.placeBetsText, this.placeBetsButton, this.placeBetsGraphics)

    // text to show any results of a player (ie. busted, standing, waiting, etc.)
    this.resultsText = this.add.text(centerX, centerY + (this.scale.height / 20), 'Waiting...', { fontSize: '60px', fill: '#fff' }).setOrigin(0.5, 0.5).setVisible(false).setFontFamily('"Rowdies"')
  }

  // method to see if a certain player's name and cards rotate a certain way
  // 0 indicates the player is on the right side of the screen, 1 on the bottom, and 2 on the left
  // method to make sure all the cards rotate as specified depending on where on the table they need to go
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

  
  // dealing cards to all the players and dealer
  dealInitialCards() {
    this.room.state.players.keys().forEach((item) => this.playerHands.set(item, this.room.state.players.get(item).hand))
    this.dealerHand = this.room.state.dealer.hand
  }

  // methods to remove the bet buttons once all bets are placed
  removeBetButtons(){
    this.possibleBetButtons.forEach((item) => {item.setActive(false).setVisible(false)})
    this.possibleRemoveBetButtons.forEach((item) => {item.setActive(false).setVisible(false)})
    this.placeBetsText.destroy()
    this.placeBetsButton.destroy()
    this.placeBetsGraphics.destroy()
  }

  // method to actually start the game up
  startGame(){
    // removing the betting buttons
    this.removeBetButtons()
    if(!this.room.state.players.has(this.room.sessionId)) return
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    // removing any results text (only thing would be "Waiting for other players...")
    this.resultsText.setVisible(false)

    // dealing cards to all the players and dealer
    // this.room.state.players.keys().forEach((item) =>  {
    //   this.playerHands.set(item, this.room.state.players.get(item).hand)
    //   console.log('HERE:', this.room.state.players.get(item).hand)
    // })

    var i = 0
    // visually dealing out the first card to each player
    for (const key in this.playerHands) {
      const string = `${this.playerHands[key][0].rank}_of_${this.playerHands[key][0].suit}.png`
      this.animateCard(this.allPhysicalPositions[i].x - (this.doesRotate(i) == 0 ? (this.scale.width / 20) : (this.doesRotate(i) == 2 ? -(this.scale.width / 20) : 0)),
        this.allPhysicalPositions[i].y - (this.doesRotate(i) == 1 ? (this.scale.width / 18) : 0), string, 0, this.doesRotate(i), i != this.playerIndex)
      i++
    }
    
    // dealing the dealer's first card
    this.animateCard(centerX - (this.scale.width / 20), this.scale.width / 6, `${this.dealerHand[0].rank}_of_${this.dealerHand[0].suit}.png`, 1, 1, false)

    // dealing out the second card to each player
    i = 0
    for (const key in this.playerHands) {
      const string = `${this.playerHands[key][1].rank}_of_${this.playerHands[key][1].suit}.png`
      this.animateCard(this.allPhysicalPositions[i].x + (this.doesRotate(i) == 1 ? (this.playerHands[key].length - 1) * (this.scale.width / 50) : 0) - (this.doesRotate(i) == 0 ? (this.scale.width / 20) : (this.doesRotate(i) == 2 ? -(this.scale.width / 20) : 0)), 
        this.allPhysicalPositions[i].y + (this.doesRotate(i) != 1 ? (this.playerHands[key].length - 1) * (this.scale.height / 30) : 0) - (this.doesRotate(i) == 1 ? (this.scale.width / 18) : 0), string, 2, this.doesRotate(i), i != this.playerIndex)
      i++
    }

    // dealing the dealer's second card
    this.dealersSecond = this.animateCard(centerX - (this.scale.width / 20) + (this.scale.width / 50), this.scale.width / 6, `card`, 3, 1, false)

    // showing the numeric value of the player's cards
    var horiz = 0, vert = 0
    if (this.doesRotate(this.playerIndex) == 1)
      vert = -(this.scale.height / 4.5)
    else if (this.doesRotate(this.playerIndex) == 0)
      horiz = -(this.scale.width / 9)
    else
      horiz = (this.scale.width / 9)
    this.playerValueText = this.add.text(this.allPhysicalPositions[this.playerIndex].x + horiz, this.allPhysicalPositions[this.playerIndex].y + vert,
      this.calculateHandValue(this.playerHands[this.room.sessionId]), { fontSize: '36px', fill: '#fff' }).setOrigin(0.5, 0.5)

    const [hitText, hitButton, hitGraphics] = this.addActionButtons('Hit', centerX - (this.scale.width / 5), centerY + (this.scale.height / 6), () => this.hit(this.playerIndex), '48px','#0f0')
    this.hitText = hitText
    this.hitButton = hitButton
    this.hitGraphics = hitGraphics

    const [standText, standButton, standGraphics] = this.addActionButtons('Stand', centerX + (this.scale.width / 5), centerY + (this.scale.height / 6), () => this.stand(this.playerIndex), '48px', '#f00')
    this.standText = standText
    this.standButton = standButton
    this.standGraphics = standGraphics
  }

  //method to animate a card going from above the screen, down to its indicated position, and flipped over
  animateCard(handX, handY, newTexture, order, rotate, tint) {
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
        // only do if the card is supposed to be flipped over (ie. the dealer's second card)
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
              try {
                card.setTexture(newTexture)
              } catch (e) {
                return; // There's a race condition here that causes problems if the user resets the scene too early. Return so that it doesn't break the scene after the reset happens.
              }
              // make the card greyed out if it's not the user's or dealer's card
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
        // show the value of the dealer's card if once it's finished
        else{
          this.dealerValueText = this.add.text(card.x - (this.scale.width / 12), card.y, this.currentTurn != "dealer" ? (isNaN(this.dealerHand[0].rank) ? 10 : this.dealerHand[0].rank) : 
            this.calculateHandValue(this.dealerHand), { fontSize: '36px', fill: '#fff' }).setOrigin(0.5, 0.5)
          if (this.currentTurn == this.room.sessionId && order == 3) {
            this.changeActionButtonState(true, this.hitText, this.hitButton, this.hitGraphics)
            this.changeActionButtonState(true, this.standText, this.standButton, this.standGraphics)
          }
        }
      },
    })

    this.activeCards.push(card)
    return card
  }

  // method to make a bet
  bet(value) {
    // check to make sure the user cannot go into debt
    if (value <= this.playerCredits) {
      this.currentBet += value
      this.currentBetText.setText(`Current Bet: ${this.currentBet}`)
      this.playerCredits -= value
      this.totalCredits.setText(`Credits: ${this.playerCredits}`)
    }
  }

  //method to remove a value from their bet
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
    // ignore if in the waiting room
    if(this.room.state.waitingRoom.has(this.room.sessionId)) return
    let value = 0
    let aces = 0

    hand.forEach((card) => {
      if (['jack', 'queen', 'king'].includes(card.rank)) {
        value += 10
      } else if (card.rank === 'ace') {
        value += 11
        aces += 1
      } else {
        value += parseInt(card.rank, 10)
      }
    })

    while (value > 21 && aces > 0) {
      value -= 10
      aces -= 1
    }

    return value || 0
  }

  // method called by the hit button. cannot be called if not your turn, and sends a message to the server
  hit(player) {
    if (this.currentTurn != this.room.sessionId) return
    this.room.send("hit", { index: player })
  }

  // method called by the stand button. cannot be called if not your turn, and sends a message to the server
  stand(player) {
    if (this.currentTurn != this.room.sessionId) return
    this.room.send("stand", { index: player })
  }

  // handles the dealer's turn
  dealerTurn(playerResults, winnings) {
    // do not call if not the dealer's turn or in the waiting room
    if (this.currentTurn != "dealer" || this.room.state.waitingRoom.has(this.room.sessionId)) return
    // another animation specifically for the dealer's second card
    // essentially the same as the once used previously in animateCard()
    this.tweens.add({
      targets: this.dealersSecond,
      scaleX: 0,
      duration: 200,
      ease: 'Linear',
      onComplete: () => {
        this.dealersSecond.setTexture(`${this.dealerHand[1].rank}_of_${this.dealerHand[1].suit}.png`)
        this.tweens.add({
          targets: this.dealersSecond,
          scaleX: this.cardScale,
          duration: 200,
          ease: 'Linear',
        })
      },
    })

    // setting text after the dealer's second card is flipped
    const centerX = this.cameras.main.centerX
    let dealerValue = this.calculateHandValue(this.dealerHand)
    this.dealerValueText.setText(dealerValue)

    // dealer draws the rest of cards passed in from dealerHand
    for (var i = 2; i < this.dealerHand.length; i++){
      this.animateCard(centerX - (this.scale.width / 20) + (i * (this.scale.width / 50)), this.scale.width / 6, `${this.dealerHand[i].rank}_of_${this.dealerHand[i].suit}.png`, (i - 2) * 2, 1, false)
      dealerValue = this.calculateHandValue(this.dealerHand)
      this.dealerValueText.setText(dealerValue)
    }

    // distribute winnings and setting appropriate text boxes
    this.playerCredits = winnings[this.room.sessionId]
    this.totalCredits.setText(`Credits: ${this.playerCredits}`)

    this.currentBet = 0
    this.currentBetText.setText(`Current Bet: ${this.currentBet}`) 

    // in this case, 0 = win, 1 = dealer wins, 2 = push, 3 = player busts
    const result = playerResults[this.room.sessionId]
    if (result == 0)
      this.endGame('You Win!')
    else if (result == 1 || result == 3)
      this.endGame('You Lose...')
    else if (result == 2)
      this.endGame("That's a Push")
  }

  // method to reset the game
  async resetGame(){
    console.log("Resetting Game")
    this.playerHands = {}
    this.playerIndex = undefined
    this.currentTurn = ""
    this.allPhysicalPositions = []
    this.started = false
    this.registry.destroy()
    this.events.off()
    this.scene.restart(this.scene.key);
    await this.room.leave()
  }

  //method to end the game
  endGame(message) {
    this.currentTurn = "done"
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY
    
    // show results
    this.resultsText.setText(message).setVisible(true)
    if(message == "You Win!")
      this.sound.play("win")

    // replace the hit and stand buttons with play again and quit
    this.destroyButtons(this.hitText, this.hitButton, this.hitGraphics)
    this.destroyButtons(this.standText, this.standButton, this.standGraphics)

    const [playAgainText, playAgainButton, playAgainGraphics] = this.addActionButtons("Play Again", centerX - (this.scale.width / 6), centerY + (this.scale.height / 6.5), 
      () => {
        this.resultsText.setText('Waiting for room owner...')
        this.destroyButtons(this.playAgainText, this.playAgainButton, this.playAgainGraphics)
        this.destroyButtons(this.quitText, this.quitButton, this.quitGraphics)
        if (this.room.sessionId == this.room.state.owner)
          this.room.send("newGame")
      }, '72px', '#0f0')
    this.playAgainText = playAgainText
    this.playAgainButton = playAgainButton
    this.playAgainGraphics = playAgainGraphics

    const [quitText, quitButton, quitGraphics] = this.addActionButtons("Quit", centerX + (this.scale.width / 6), centerY + (this.scale.height / 6.5), () => window.location.href = '/', '72px', '#f00')
    this.quitText = quitText
    this.quitButton = quitButton
    this.quitGraphics = quitGraphics

    this.changeActionButtonState(true, playAgainText, playAgainButton, playAgainGraphics)
    this.changeActionButtonState(true, quitText, quitButton, quitGraphics)
  }
}

// putting it all in a React component
const BlackjackGame = () => {
  const gameRef = useRef(null)
  const { roomId } = useParams();
  const [gameInstance, setGameInstance] = useState(null)

  useEffect(() => {
    const header = document.getElementById("header")
    const headerHeight = header ? header.offsetHeight : 0

    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight - headerHeight,
      backgroundColor: "#2d2d2d",
      parent: "phaser-game",
      scene: [],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    }

    const game = new Phaser.Game(config)
    gameRef.current = game
    setGameInstance(game)

    // Set scene manually so that roomId can be passed.
    game.scene.add('BlackjackScene', BlackjackScene, true, { roomId })

    setTimeout(() => {
      game.scale.resize(window.innerWidth, window.innerHeight - headerHeight)
    }, 100)

    return () => {
      game.destroy(true)
    }
  }, [])

  useEffect(() => {
    const updateGameSize = () => {
      const header = document.getElementById("header")
      const headerHeight = header ? header.offsetHeight : 0
      if (gameRef.current)
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight - headerHeight)
    };

    window.addEventListener("resize", updateGameSize)
    return () => window.removeEventListener("resize", updateGameSize)
  }, []);

  return <div id="phaser-game"></div>
}

export default BlackjackGame
