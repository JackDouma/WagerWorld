import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Client, Room } from 'colyseus.js';
import * as WebFontLoader from 'webfontloader'
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, getFirestore } from "firebase/firestore";
const db = getFirestore();

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
    this.players = {}
    this.waitingRoom = {}
    this.playerHands = {}
    this.dealer = []
    this.isPlayersTurn = []
    this.playerCardCounts = []
    this.playerCredits
    this.possibleBets = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000]
    this.possibleBetButtons = []
    this.possibleRemoveBetButtons = []
    this.totalCreditsText
    this.currentBetText
    this.currentBet = 0
    this.totalBet = 0
    this.overallHighestCurrentBet = 10
    this.highestCurrentBet = 0
    this.resultsText
    this.betType
    this.activeCards = new Map()
    this.isWaiting = false
    this.client = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`)
    this.room = Room
  }

  // loading all the image assets
  preload() {
    this.load.image('bg', '/table.jpg')
    this.load.image('card', '/card-back.png')
    this.load.image('logo', '/poker-logo.png')

    const chipValues = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000]
    chipValues.forEach(value => this.load.image(`${value}-chip`, `/Chips/${value}-chip.png`));

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
    console.log("Init here: ", data.roomId);
    this.roomId = data.roomId;
  }

  // method to create the scene
  async create() {
    console.log("Joining room...");
    const playerId = localStorage.getItem("firebaseIdToken");
    const userRef = doc(db, "users", playerId);
    const userDoc = await getDoc(doc(db, "users", playerId));
    try{
      if(userDoc.exists() && userDoc.data().isInGame){
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

    // joining room
    try {
      const firestoreBalance = userDoc.data().balance || 10000;

      this.room = await this.client.joinById(this.roomId, { playerId: playerId || "anonymous", balance: firestoreBalance });
      console.log("Joined successfully!");
    } catch (e) {
      console.error(e);
    }

    // method is called every time there is a state change, but is only used for actually starting the game
    this.room.onStateChange((state) => {
      console.log("State updated:", state);
    });

    this.room.onMessage('gameStart', (message) => {
      if (message.gamePhase.includes("playing") && !this.started) {
        for(var i = 0; i < this.disconnectCount; i++)
          this.playerIndex--
        this.players = message.players
        this.disconnectCount = 0
        this.currentTurn = message.currentTurn
        this.playerHands = message.hands
        this.started = true
        console.log(this.currentTurn)
        this.startGame(message.pot)
      }
    })

   // handling a player joining
    this.room.onMessage('playerJoin', (message) => {
      console.log(`Player ${message.playerName} joined the room`);
      // if cards havent been dealt yet, add the player to the table
      this.waitingRoom = message.waitingRoom
      console.log(this.waitingRoom)
      if(this.room.state.gamePhase == "waiting") {
        this.amountOfPlayers = Object.keys(message.players).length
        console.log(this.amountOfPlayers);
        if (this.playerIndex === undefined) this.playerIndex = this.amountOfPlayers - 1
        this.players = message.players
        this.editPlayerSlots()
        this.getPlayerNames()
      }
      // if a game is in progress, show them a waiting screen
      else if (this.room.state.gamePhase.includes('playing') && this.room.sessionId in this.waitingRoom) {
        this.resultsText.setText("Waiting for Game to Finish...").setVisible(true)
        this.changeActionButtonState(false, this.startGameText, this.startGameButton, this.startGameGraphics)
        this.changeActionButtonState(false, this.leaveRoomText, this.leaveRoomButton, this.leaveRoomGraphics)
        this.isWaiting = true
      }
      // update the total credits screen
      if (message.sessionId === this.room.sessionId) {
        this.playerCredits = message.totalCredits
        this.totalCreditsText.setText(`Credits: ${this.playerCredits}`)
      }
    })

    // handling a player leaving
    this.room.onMessage("playerLeft", (message) => {
      console.log(`Player ${message.sessionId} left the room`);
  
      // find the removed player and update the UI
      this.amountOfPlayers = Object.keys(message.players).length
      this.players = message.players
      if(!this.room.state.gamePhase.includes("playing") && this.room.state.gamePhase != "dealing") {
        if (this.playerIndex >= message.index)
          this.playerIndex--
        this.editPlayerSlots()
        this.getPlayerNames()
      }
      // if the game is in progress, update the name of the player slot with Disconnected
      if(this.room.state.gamePhase.includes("playing")) {
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
      // show raise, call, check and fold buttons to the correct user
      console.log(this.currentTurn == this.room.sessionId, message.dc)
      if (message.dc == false) {
        this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.raiseText, this.raiseButton, this.raiseGraphics)
        this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.callText, this.callButton, this.callGraphics)
        this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.checkText, this.checkButton, this.checkGraphics)
        this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.foldText, this.foldButton, this.foldGraphics)
      }
      // if the last player diconnected, go straight to the dealer
      if (this.currentTurn == "dealer")
        this.room.send("dealerTurn")
    })

    // making the players wait for others once they put their bet in
    this.room.onMessage("waitForOthers", (message) => {
      if(message.user == this.room.sessionId) {
        this.resultsText.setVisible(true)
        this.changeActionButtonState(false, this.startGameText, this.startGameButton, this.startGameGraphics)
        this.changeActionButtonState(false, this.leaveRoomText, this.leaveRoomButton, this.leaveRoomGraphics)
      }
    })

    // making the next player go
    this.room.onMessage("nextTurn", (message) => {
      this.addBetToPot(Array.from(this.room.state.players.keys()).indexOf(message.prevPlayer), message.currentBet, message.pot)
      // start by setting the message to be the result of their turn
      if(this.currentTurn == this.room.sessionId) {
        this.resultsText.setVisible(true)
        if (message.action == 'raise')
          this.resultsText.setText(`Raised to ${message.currentBet}`)
        else if (message.action == 'call')
          this.resultsText.setText(`Called to ${message.currentBet}`)
        else if (message.action == 'check')
          this.resultsText.setText(`Checked with ${message.currentBet}`)
        else if (message.action == 'fold')
          this.resultsText.setText(`Folded away ${message.currentBet}`)
      }
      if (message.action == 'fold')
        this.playerBetValues[Array.from(this.room.state.players.keys()).indexOf(message.prevPlayer)].setText("Folded")
      this.currentTurn = message.nextPlayer

      // if all players have equal bets, then go to the dealer
      if (message.dealerTurn == true) {
        if (message.prevPlayer === this.room.sessionId) {
          console.log('sending')
          this.room.send("dealerTurn")
        }
      }
      else {
        this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.raiseText, this.raiseButton, this.raiseGraphics)
        this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.callText, this.callButton, this.callGraphics)
        this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.checkText, this.checkButton, this.checkGraphics)
        this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.foldText, this.foldButton, this.foldGraphics)
      }
    })

    // dealing with dealer results from the server
    this.room.onMessage("dealerResult", (message) => {
      this.dealer = message.result
      this.dealerTurn(message.nextTurn)
    })

    this.room.onMessage("endGame", (message) => {
      this.endGame(message.winnerName, message.winner, message.winnings, message.result)
    })

    // reset game message from the server
    this.room.onMessage("newGame", (message) => {
      this.started = false
      if(this.playAgainButton) this.destroyButtons(this.playAgainText, this.playAgainButton, this.playAgainGraphics)
      if(this.quitButton) this.destroyButtons(this.quitText, this.quitButton, this.quitGraphics)
      this.totalPotText.destroy()
      this.totalCreditsText.destroy()
      this.resultsText.destroy()
      this.playerHands = {}
      if(this.playerBetValues) this.playerBetValues.forEach(item => item.destroy())
      this.activeCards.forEach(item => item.destroy())
      this.overallHighestCurrentBet = 10
      this.highestCurrentBet = 0
      this.players = message.players
      this.waitingRoom = message.waitingRoom
      this.createUI(this.isWaiting)
    })

    // if the client refreshes or leaves, only alert them if the game is in play and they are not in the waiting room
    window.addEventListener("beforeunload", (event) => {
      if (this.room && (this.room.state.gamePhase.includes("playing") || this.room.state.gamePhase === "dealing") && !this.room.state.waitingRoom.has(this.room.sessionId)) { event.preventDefault(); }
      else if (this.room) this.room.leave()
    });

    // if the client presses the back button, only alert them if the game is in play and they are not in the waiting room
    window.addEventListener("popstate", (event) => {
      if (this.room && (this.room.state.gamePhase.includes("playing") || this.room.state.gamePhase === "dealing") && !this.room.state.waitingRoom.has(this.room.sessionId)) { event.preventDefault(); }
      else if (this.room) this.room.leave()
    });

    // loading background and audio
    this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height)
    this.load.audio('win', 'cha-ching.mp3')
    this.createUI(true)
  }

  // adding the player's names to the text boxes around the table
  getPlayerNames(){
    console.log('getting', this.room.sessionId in this.waitingRoom)
    // do not run if someones in the waiting room
    if(this.room.sessionId in this.waitingRoom) return
    this.smallBlind.setPosition(0, -100)
    this.bigBlind.setPosition(0, -100)
    var j = 0
    Object.keys(this.players).forEach((item) => {
      console.log(item, this.players[item].blind, j)
      this.allPhysicalPositions[j].setText(this.players[item].name);
      if (this.players[item].blind === 1) {
        console.log('small blind found', this.allPhysicalPositions[j].x)
        this.smallBlind.setPosition(this.allPhysicalPositions[j].x - (this.doesRotate(j) == 2 ? -100 : 100), this.allPhysicalPositions[j].y - 100)
        console.log('small blind found 2', this.allPhysicalPositions[j].x)
      }
      else if (this.players[item].blind === 2) {
        console.log('big blind found', this.allPhysicalPositions[j].x)
        this.bigBlind.setPosition(this.allPhysicalPositions[j].x - (this.doesRotate(j) == 2 ? -100 : 100), this.allPhysicalPositions[j].y - 100)
        console.log('big blind found 2', this.allPhysicalPositions[j].x)
      }
      j++
    })
  }

  // method to create buttons, including text and hoverr effects
  addActionButtons(action, x, y, onClick, size, colour) {
    const buttonRadius = 20;
    const buttonGraphics = this.add.graphics();
    buttonGraphics.fillStyle(0x000000, 0.5).setVisible(false).setActive(false);

    const text = this.add.text(x, y, action, { fontSize: size, fill: colour }).setOrigin(0.5, 0.5).setVisible(false)
    text.setFontFamily("Rowdies")
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
    text.setVisible(state)
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
        this.time.delayedCall(3000, () => { text.destroy() })
      }
    }).setOrigin(0.5, 0.5).setScale(0.2).setActive(false).setVisible(false))
    // adding buttons to remove the displayed bet amount and put it back in the account
    this.possibleRemoveBetButtons.push(this.add
      .text(this.possibleBetButtons[this.possibleBetButtons.length - 1].x, this.possibleBetButtons[this.possibleBetButtons.length - 1].y + 70, `Remove`, { fontSize: '18px', fill: '#f00' })
      .setInteractive()
      .on('pointerdown', () => this.removeBet(amount)).setOrigin(0.5, 0.5).setActive(false).setVisible(false))
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

    // setting the possible positions that the players can be
    if(firstTime) {
      this.allPositionCoordinates.push([this.scale.width - this.scale.width / 50, this.scale.height / 4])
      this.allPositionCoordinates.push([this.scale.width - this.scale.width / 50, (this.scale.height / 4) * 2.75])
      this.allPositionCoordinates.push([centerX + (this.scale.width / 3.5), this.scale.height - this.scale.height / 30])
      this.allPositionCoordinates.push([centerX + (this.scale.width / 10), this.scale.height - this.scale.height / 30])
      this.allPositionCoordinates.push([centerX - (this.scale.width / 10), this.scale.height - this.scale.height / 30])
      this.allPositionCoordinates.push([centerX - (this.scale.width / 3.5), this.scale.height - this.scale.height / 30])
      this.allPositionCoordinates.push([this.scale.width / 50, (this.scale.height / 4) * 2.75])
      this.allPositionCoordinates.push([this.scale.width / 50, this.scale.height / 4])

      this.smallBlind = this.add.text(centerX, -100, "SB", { fontFamily: 'Arial', fontSize: '40px', fill: 'blue' }).setOrigin(0.5, 0.5)
      this.bigBlind = this.add.text(centerX, -100, "BB", { fontFamily: 'Arial', fontSize: '40px', fill: 'red' }).setOrigin(0.5, 0.5)

      // adding the player positions to be offscreen
      for (var i = 0; i < 8; i++)
        this.allPhysicalPositions.push(this.add.text(centerX, -100, `Player ${i + 1}`, { fontFamily: 'Arial', fontSize: '32px', fill: '#fff' }).setOrigin(0.5, 0.5).setAngle(this.doesRotate(i) == 0 ? -90 : this.doesRotate(i) == 2 ? 90 : 0))

      this.add.image(centerX, this.scale.height / 12, 'logo').setOrigin(0.5, 0.5)
    }
    
    // adding the player slots
    if(!firstTime) {
      this.editPlayerSlots()
      this.getPlayerNames()
    }

    // top texts
    this.totalCreditsText = this.add.text(centerX + (this.scale.width / 5), this.scale.height / 20, `Credits: ${this.playerCredits}`, { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5)
    this.totalPotText = this.add.text(centerX - (this.scale.width / 3.5), this.scale.height / 20, `Total Pot: 0`, { fontFamily: 'Arial', fontSize: '48px', fill: '#fff' }).setOrigin(0.5, 0.5)

    // start / leave buttons
    const [startGameText, startGameButton, startGameGraphics] = this.addActionButtons("Start Game", centerX, centerY - (this.scale.height / 6), () => this.room.send("readyUp"), '72px', '#FFD700')
    this.startGameText = startGameText, this.startGameButton = startGameButton, this.startGameGraphics = startGameGraphics
    this.changeActionButtonState(true, this.startGameText, this.startGameButton, this.startGameGraphics)
    const [leaveRoomText, leaveRoomButton, leaveRoomGraphics] = this.addActionButtons("Back To Lobby", centerX, centerY + (this.scale.height / 6), () => { 
      if(this.room) this.room.leave()
      history.back() }, '72px', '#f00')
    this.leaveRoomText = leaveRoomText, this.leaveRoomButton = leaveRoomButton, this.leaveRoomGraphics = leaveRoomGraphics
    this.changeActionButtonState(true, this.leaveRoomText, this.leaveRoomButton, this.leaveRoomGraphics)

    // creating buttons for each possible amount that can be bet
    const numChips = this.possibleBets.length
    const numRows = 2
    const numCols = Math.ceil(numChips / numRows)

    const chipSpacingX = this.scale.width / (numCols + 1)
    const chipSpacingY = this.scale.height / 5

    this.possibleBets.forEach((item, index) => {
        const row = Math.floor(index / numCols)
        const col = index % numCols

        const x = (this.scale.width / 2) - ((numCols - 1) * chipSpacingX / 2) + (col * chipSpacingX) + (index > 4 ? chipSpacingX / 2 : 0)
        const y = (this.scale.height / 4) + (row * chipSpacingY)

        this.addBetButtons(item, x, y)
    })

    // creating buttons to add / remove bets
    const [placeBetsText, placeBetsButton, placeBetsGraphics] = this.addActionButtons("Place Bet", centerX - (this.scale.width / 6), centerY + (this.scale.height / 6.5), () => this.betAttempt(), '72px', '#FFD700')
    this.placeBetsText = placeBetsText, this.placeBetsButton = placeBetsButton, this.placeBetsGraphics = placeBetsGraphics
    
    const [cancelText, cancelButton, cancelGraphics] = this.addActionButtons("Cancel", centerX + (this.scale.width / 6), centerY + (this.scale.height / 6.5), () => this.cancelCurrentAction(), '72px', '#FFD700')
    this.cancelText = cancelText, this.cancelButton = cancelButton, this.cancelGraphics = cancelGraphics

    const [confirmCheckText, confirmCheckButton, confirmCheckGraphics] = this.addActionButtons("Confirm", centerX - (this.scale.width / 6), centerY + (this.scale.height / 6.5), () => this.confirmCheck(), '72px', '#FFD700')
    this.confirmCheckText = confirmCheckText, this.confirmCheckButton = confirmCheckButton, this.confirmCheckGraphics = confirmCheckGraphics

    const [confirmFoldText, confirmFoldButton, confirmFoldGraphics] = this.addActionButtons("Confirm", centerX - (this.scale.width / 6), centerY + (this.scale.height / 6.5), () => this.confirmFold(), '72px', '#FFD700')
    this.confirmFoldText = confirmFoldText, this.confirmFoldButton = confirmFoldButton, this.confirmFoldGraphics = confirmFoldGraphics
    
    // results text for the player
    this.resultsText = this.add.text(centerX, centerY - (this.scale.height / 10), 'Waiting for others...', { fontSize: '60px', fill: '#fff' }).setOrigin(0.5, 0.5).setVisible(false)

    // creating the raise, call, check and fold buttons
    const [raiseText, raiseButton, raiseGraphics] = this.addActionButtons("Raise", centerX - (this.scale.width / 3.5), centerY + (this.scale.height / 7), () => this.raise(), '48px', '#0f0')
    this.raiseText = raiseText, this.raiseButton = raiseButton, this.raiseGraphics = raiseGraphics
    
    const [callText, callButton, callGraphics] = this.addActionButtons("Call", centerX - (this.scale.width / 9), centerY + (this.scale.height / 7), () => this.call(), '48px', '#0f0')
    this.callText = callText, this.callButton = callButton, this.callGraphics = callGraphics

    const [checkText, checkButton, checkGraphics] = this.addActionButtons("Check", centerX + (this.scale.width / 9), centerY + (this.scale.height / 7), () => this.check(), '48px', '#0f0')
    this.checkText = checkText, this.checkButton = checkButton, this.checkGraphics = checkGraphics
    
    const [foldText, foldButton, foldGraphics] = this.addActionButtons("Fold", centerX + (this.scale.width / 3.5), centerY + (this.scale.height / 7), () => this.fold(), '48px', '#f00')
    this.foldText = foldText, this.foldButton = foldButton, this.foldGraphics = foldGraphics

    this.optionTexts = [raiseText, callText, checkText, foldText]
        
    // Loading custom font from Google
    WebFontLoader.default.load({
      google: {
        families: ['Rowdies']
      },
      active: () => {
        this.totalCreditsText.setFontFamily('"Rowdies"')
        this.totalPotText.setFontFamily('"Rowdies')
        this.resultsText.setFontFamily('"Rowdies"')
        this.startGameText.setFontFamily('"Rowdies')
        this.leaveRoomText.setFontFamily('"Rowdies')
        this.possibleRemoveBetButtons.forEach((item) => {item.setFontFamily('"Rowdies')})
        this.allPhysicalPositions.forEach((item) => {item.setFontFamily('"Rowdies')})
        this.optionTexts.forEach(item => item.setFontFamily('"Rowdies"'))
        this.placeBetsText.setFontFamily('"Rowdies"')
        this.confirmCheckText.setFontFamily('"Rowdies"')
        this.confirmFoldText.setFontFamily('"Rowdies"')
        this.cancelText.setFontFamily('"Rowdies"')
      }
    })
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

  // method to show the amount of money each player has bet total during the game
  showWagers(pot){
    this.playerBetValues = []
    var i = 0
    Object.keys(this.players).forEach((item) => {
      console.log(item)
      // showing the numeric value of the player's cards
      var horiz = 0, vert = 0
      if (this.doesRotate(i) == 1)
        vert = -(this.scale.height / 4.5)
      else if (this.doesRotate(i) == 0)
        horiz = -(this.scale.width / 8)
      else
        horiz = (this.scale.width / 8)
      this.playerBetValues.push(this.add.text(this.allPhysicalPositions[i].x + horiz, this.allPhysicalPositions[i].y + vert, `Betting ${this.players[item].bet}`, { fontSize: '36px', fill: '#fff' }).setOrigin(0.5, 0.5))
      if (item == this.room.sessionId) {
        this.totalBet = this.players[item].bet
        this.playerCredits = this.players[item].totalCredits
        this.totalCreditsText.setText(`Credits: ${this.playerCredits}`)
      }
      i++
    })
    this.totalPotText.setText(`Total Pot: ${pot}`)
    console.log(this.playerBetValues);
  }

  startGame(pot){
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY

    // removing any results text (only thing would be "Waiting for other players...")
    this.resultsText.setVisible(false)
    
    // remove the start and quit buttons
    this.destroyButtons(this.startGameText, this.startGameButton, this.startGameGraphics)
    this.changeActionButtonState(false, this.leaveRoomText, this.leaveRoomButton, this.leaveRoomGraphics)

    // dealing cards to all the players
    // this.room.state.players.keys().forEach((item) => this.playerHands.set(item, this.room.state.players.get(item).hand))

    var i = 0
    // visually dealing out the first card to each player
    for (const key in this.playerHands) {
      const string = `${this.playerHands[key][0].rank}_of_${this.playerHands[key][0].suit}.png`
      this.activeCards.set(string, this.animateCard(this.allPhysicalPositions[i].x - (this.doesRotate(i) == 0 ? (this.scale.width / 20) : (this.doesRotate(i) == 2 ? -(this.scale.width / 20) : 0)),
        this.allPhysicalPositions[i].y - (this.doesRotate(i) == 1 ? (this.scale.width / 18) : 0), key == this.room.sessionId ? string : 'card', 0, this.doesRotate(i)))
      i++
    }

    // dealing out the second card to each player
    i = 0
    for (const key in this.playerHands) {
      const string = `${this.playerHands[key][1].rank}_of_${this.playerHands[key][1].suit}.png`
      this.activeCards.set(string, this.animateCard(this.allPhysicalPositions[i].x + (this.doesRotate(i) == 1 ? (this.playerHands[key].length - 1) * (this.scale.width / 50) : 0) - (this.doesRotate(i) == 0 ? (this.scale.width / 20) : (this.doesRotate(i) == 2 ? -(this.scale.width / 20) : 0)), 
        this.allPhysicalPositions[i].y + (this.doesRotate(i) != 1 ? (this.playerHands[key].length - 1) * (this.scale.height / 30) : 0) - (this.doesRotate(i) == 1 ? (this.scale.width / 18) : 0), key == this.room.sessionId ? string : 'card', 2, this.doesRotate(i), i == Object.keys(this.playerHands).length - 1))
      i++
    }

    // showing all wagers (each starts at 0, except for big and small blinds)
    this.showWagers(pot)

    // for testing purposes
    this.b = true
  }

  //method to animate a card going from above the screen, down to its indicated position, and flipped over
  animateCard(handX, handY, newTexture, order, rotate, last) {
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
        if (this.currentTurn == this.room.sessionId && last) {
          this.changeActionButtonState(true, this.raiseText, this.raiseButton, this.raiseGraphics)
          this.changeActionButtonState(true, this.callText, this.callButton, this.callGraphics)
          this.changeActionButtonState(true, this.checkText, this.checkButton, this.checkGraphics)
          this.changeActionButtonState(true, this.foldText, this.foldButton, this.foldGraphics)
        }
        // make another animation to make it flip over, only for the player's cards though
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
              try { // Fix for race condition. I haven't replicated it in poker but it was happening in blackjack so I've added this just in case.
                card.setTexture(newTexture)
              } catch (e) {
                return;
              }
              // Flip back to full size
              this.tweens.add({
                targets: card,
                // set horizontal scale back to what it was originally
                scaleX: this.cardScale,
                duration: 200,
                ease: 'Linear'
              })
            },
          })
        }
      },
    })

    return card
  }

  flipCard(card, newTexture, rotate) {
    this.tweens.add({
      targets: card,
      // by setting the horizontal scale to 0, we make it look like its mid-flip
      scaleX: !rotate ? 0 : this.cardScale,
      scaleY: rotate ? 0 : this.cardScale,
      duration: 200,
      ease: 'Linear',
      // once its done we change the image used, and make it fully flip
      onComplete: () => {
        // Change the texture to the new card face
        try { // Fix for race condition. I haven't replicated it in poker but it was happening in blackjack so I've added this just in case.
          card.setTexture(newTexture)
        } catch (e) {
          return;
        }
        // Flip back to full size
        this.tweens.add({
          targets: card,
          // set horizontal scale back to what it was originally
          scaleX: this.cardScale,
          duration: 200,
          ease: 'Linear'
        })
      },
    })
  }

  // method to make a bet
  bet(value) {
    // check to make sure the user cannot go into debt
    if (value < this.playerCredits) {
      this.currentBet += value
      this.totalBet += value
      this.playerBetValues[this.playerIndex].setText("Betting " + this.totalBet)
      this.playerCredits -= value
      this.totalCreditsText.setText(`Credits: ${this.playerCredits}`)
    }
    else if (value >= this.playerCredits) {
      this.currentBet += this.playerCredits - this.currentBet
      this.totalBet += this.playerCredits - this.totalBet
      console.log(value, this.playerCredits, this.totalBet)
      this.playerBetValues[this.playerIndex].setText("Betting " + this.totalBet)
      this.playerCredits = 0
      this.totalCreditsText.setText(`Credits: ${this.playerCredits}`)
    }
  }

  //method to remove a value from their bet
  removeBet(value) {
    // another check to make sure the user cannot go into debt
    if (value <= this.currentBet) {
      this.currentBet -= value
      this.totalBet -= value
      this.playerBetValues[this.playerIndex].setText("Betting " + this.totalBet)
      this.playerCredits += value
      this.totalCreditsText.setText(`Credits: ${this.playerCredits}`)
    }
  }

  betAttempt(){
    if(this.currentBet == 0)
      this.resultsText.setText("Cannot bet 0").setVisible(true)
    else {
      if(this.betType && this.totalBet <= this.overallHighestCurrentBet)
        this.resultsText.setText("Must raise more than " + this.overallHighestCurrentBet).setVisible(true)
      else
        this.room.send('bet', { value: this.totalBet, allIn: this.overallHighestCurrentBet - this.totalBet >= this.playerCredits })
    }
  }

  // method to cancel the player's betting
  cancelCurrentAction() {
    this.totalBet -= this.currentBet
    this.playerBetValues[this.playerIndex].setText("Betting " + this.totalBet)
    console.log('CB', this.currentBet)
    this.playerCredits += this.currentBet
    this.totalCreditsText.setText(`Credits: ${this.playerCredits}`)
    this.currentBet = 0
    this.resultsText.setVisible(false)
    this.changeActionButtonState(false, this.confirmCheckText, this.confirmCheckButton, this.confirmCheckGraphics)
    this.changeActionButtonState(false, this.confirmFoldText, this.confirmFoldButton, this.confirmFoldGraphics)
    this.changeBettingOptions(false, true)
  }

  // method to actually add a value to the total pot
  addBetToPot(player, betAmount, pot){
    if (this.overallHighestCurrentBet < betAmount)
      this.overallHighestCurrentBet = betAmount
    this.totalPotText.setText(`Total Pot: ${pot}`)
    this.playerBetValues[player].setText("Betting " + betAmount)
    this.currentBet = 0
    this.resultsText.setVisible(false)
    this.changeBettingOptions(false, true)
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

  // method to show or remove the betting options (0 ~ 10k, and place bets / cancel buttons)
  changeBettingOptions(option, raise){
    this.changeActionButtonState(!option, this.raiseText, this.raiseButton, this.raiseGraphics)
    this.changeActionButtonState(!option, this.callText, this.callButton, this.callGraphics)
    this.changeActionButtonState(!option, this.checkText, this.checkButton, this.checkGraphics)
    this.changeActionButtonState(!option, this.foldText, this.foldButton, this.foldGraphics)
    if (raise) {
      this.possibleBetButtons.forEach((item) => {item.setVisible(option).setActive(option)})
      this.possibleRemoveBetButtons.forEach((item) => {item.setVisible(option).setActive(option)})  
    }
    this.changeActionButtonState(option, this.placeBetsText, this.placeBetsButton, this.placeBetsGraphics)
    this.changeActionButtonState(option, this.cancelText, this.cancelButton, this.cancelGraphics)
  }

  // method for the designated player to make a raise to the pot (not yet fully implemented)
  raise() {
    if (this.currentTurn != this.room.sessionId) return
    this.betType = true
    this.changeBettingOptions(true, true)
  }

  // method for the designated player to call
  call(){
    if (this.currentTurn != this.room.sessionId) return
    this.betType = false
    this.bet(this.overallHighestCurrentBet - this.totalBet)
    console.log(this.overallHighestCurrentBet - this.totalBet)
    this.resultsText.setVisible(true).setText((this.overallHighestCurrentBet - this.totalBet >= this.playerCredits ? "Go All In " : "Call ") + "to match " + this.overallHighestCurrentBet)
    this.changeBettingOptions(true, false)
  }

  // method for the designated player to check to the next player 
  check(){
    if (this.currentTurn != this.room.sessionId) return
    // if the player has not matched the highest bet, then nothing will work
    if(this.totalBet != this.overallHighestCurrentBet)
      this.resultsText.setVisible(true).setText("Cannot Check")
    else {
      this.changeActionButtonState(false, this.raiseText, this.raiseButton, this.raiseGraphics)
      this.changeActionButtonState(false, this.callText, this.callButton, this.callGraphics)
      this.changeActionButtonState(false, this.checkText, this.checkButton, this.checkGraphics)
      this.changeActionButtonState(false, this.foldText, this.foldButton, this.foldGraphics)
      this.resultsText.setVisible(true).setText("Check to the next player?")
      this.changeActionButtonState(true, this.confirmCheckText, this.confirmCheckButton, this.confirmCheckGraphics)
      this.changeActionButtonState(true, this.cancelText, this.cancelButton, this.cancelGraphics)
    }
  }

  confirmCheck(){
    if (this.currentTurn != this.room.sessionId) return
    if(this.totalBet == this.overallHighestCurrentBet) {
      this.changeActionButtonState(false, this.confirmCheckText, this.confirmCheckButton, this.confirmCheckGraphics)
      this.room.send('check')
    }
  }

  // method for the designated player to fold
  fold(){
    if (this.currentTurn != this.room.sessionId) return
    this.changeActionButtonState(false, this.raiseText, this.raiseButton, this.raiseGraphics)
    this.changeActionButtonState(false, this.callText, this.callButton, this.callGraphics)
    this.changeActionButtonState(false, this.checkText, this.checkButton, this.checkGraphics)
    this.changeActionButtonState(false, this.foldText, this.foldButton, this.foldGraphics)
    this.resultsText.setVisible(true).setText("Are you sure you want to fold?")
    this.changeActionButtonState(true, this.confirmFoldText, this.confirmFoldButton, this.confirmFoldGraphics)
    this.changeActionButtonState(true, this.cancelText, this.cancelButton, this.cancelGraphics)
  }

  confirmFold(){
    if (this.currentTurn != this.room.sessionId) return
    this.changeActionButtonState(false, this.confirmFoldText, this.confirmFoldButton, this.confirmFoldGraphics)
    this.room.send('fold')
  }

  dealerTurn(nextTurn) {
    // do not call if not the dealer's turn or in the waiting room
    if (this.room.state.waitingRoom.has(this.room.sessionId)) return

    const centerX = this.cameras.main.centerX

    // dealer shows the cards on the table that haven't been showed already
    const gamePhase = parseInt(this.room.state.gamePhase.replace(/\D/g, ""), 10)
    // loop through the initial 3 if on the flop
    if(gamePhase == 1) {
      let i = 0
      this.dealer.forEach((item) => {
        const string = `${item.rank}_of_${item.suit}.png`
        this.activeCards.set(string, this.animateCard(centerX + ((i - 2) * (this.scale.width / 20)), this.scale.width / 10, string, i * 2, 1))
        i++
      })
    }
    // show just the next card if on the turn or river
    else if (gamePhase == 2 || gamePhase == 3) {
      const string = `${this.dealer[gamePhase + 1].rank}_of_${this.dealer[gamePhase + 1].suit}.png`
      this.activeCards.set(string, this.animateCard(centerX + ((gamePhase - 1) * (this.scale.width / 20)), this.scale.width / 10, string, 0, 1))
    }
    // set the next turn, and prompt them to go
    this.currentTurn = nextTurn
    this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.raiseText, this.raiseButton, this.raiseGraphics)
    this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.callText, this.callButton, this.callGraphics)
    this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.checkText, this.checkButton, this.checkGraphics)
    this.changeActionButtonState(this.currentTurn == this.room.sessionId, this.foldText, this.foldButton, this.foldGraphics)
    // send message back to signal end of dealer's turn
    this.room.send('dealerTurnHandled')
  }

  // method to end the game
  endGame(winnerName, winner, winnings, result) {
    if(this.room.state.waitingRoom.has(this.room.sessionId)) return
    this.currentTurn = "none"
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY
    let message = ''

    if (result == 'folded')
      message = " because everyone folded"
    else if (result == 'disconnect')
      message = " because everyone else disconnected"
    else
      message = " with a " + result
    
    // show results
    if (this.room.sessionId == winner) {
      this.resultsText.setText(`You Won${message}!!!`).setVisible(true)
      this.sound.play("win")
      this.playerCredits += winnings
      this.totalCreditsText.setText(`Credits: ${this.playerCredits}`)
    }
    else
      this.resultsText.setText(`${winnerName} won this round${message}`).setVisible(true)

    this.activeCards.keys().forEach(item => {
      if(this.activeCards.get(item).texture.key.includes('card'))
        this.flipCard(this.activeCards.get(item), item, item.height < item.width)
    })

    this.changeActionButtonState(false, this.raiseText, this.raiseButton, this.raiseGraphics)
    this.changeActionButtonState(false, this.callText, this.callButton, this.callGraphics)
    this.changeActionButtonState(false, this.checkText, this.checkButton, this.checkGraphics)
    this.changeActionButtonState(false, this.foldText, this.foldButton, this.foldGraphics)
    this.changeActionButtonState(false, this.cancelText, this.cancelButton, this.cancelGraphics)

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

    const [quitText, quitButton, quitGraphics] = this.addActionButtons("Back To Lobby", centerX + (this.scale.width / 6), centerY + (this.scale.height / 6.5), () => { 
      if(this.room) this.room.leave()
      history.back() }, '72px', '#f00')
    this.quitText = quitText
    this.quitButton = quitButton
    this.quitGraphics = quitGraphics

    this.changeActionButtonState(true, playAgainText, playAgainButton, playAgainGraphics)
    this.changeActionButtonState(true, quitText, quitButton, quitGraphics)
  }
}

// putting it all in a React component
const PokerGame = () => {
  const { roomId } = useParams();
  const gameRef = useRef(null)
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

    game.scene.add('PokerScene', PokerScene, true, { roomId })

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

export default PokerGame
