import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Client, Room } from 'colyseus.js';
import * as WebFontLoader from 'webfontloader'
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, getFirestore } from "firebase/firestore";
const db = getFirestore();

class WaitingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WaitingScene' });
        this.client = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`);
        this.playerListText = null;
    }

    preload() {
        this.load.image('bg', '/table.jpg');
        this.load.image('logo', '/baccarat-logo.png');
    }

    init(data) {
        this.roomId = data.roomId;
    }

    async create() {
        const playerId = localStorage.getItem("firebaseIdToken");
        const userRef = doc(db, "users", playerId);
        const userDoc = await getDoc(doc(db, "users", playerId));

        // // isInGame logic - this section works
        // try {
        //     if (userDoc.exists() && userDoc.data().isInGame) {
        //         console.log(`Player with ID is already in a game.`);
        //         // redirect to signin -> org page
        //         window.location.href = "/signin";
        //         return
        //     }
        //     // update isInGame to true
        //     await updateDoc(userRef, {
        //         isInGame: true
        //     });
        // }
        // catch (error) {
        //     console.error('Error fetching player data:', error);
        // }

        this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height);
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        this.add.image(centerX, centerY - 300, 'logo');

        // PLAYER LIST
        this.add.text(centerX, centerY - 150, 'Players in Room:', {
            fontSize: '48px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        this.playerListText = this.add.text(centerX, centerY - 100, '', {
            fontSize: '36px',
            fill: '#fff',
            align: 'center'
        }).setOrigin(0.5, 0).setFontFamily('"Rowdies"');

        // READY BUTTON
        const buttonWidth = 300;
        const buttonHeight = 100;
        const buttonRadius = 20;
        const buttonGraphics = this.add.graphics();
        buttonGraphics.fillStyle(0x000000, 0.5);
        buttonGraphics.fillRoundedRect(centerX - buttonWidth / 2, centerY - buttonHeight / 2 + 350, buttonWidth, buttonHeight, buttonRadius);

        const button = this.add.zone(centerX, centerY + 350, buttonWidth, buttonHeight)
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.room.send('playerReady', { playerId: playerId });
                buttonText.setText('Waiting for other players...');
                buttonGraphics.clear();
                button.disableInteractive();
            });

        const buttonText = this.add.text(centerX, centerY + 350, 'Ready', {
            fontSize: '48px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        button.on('pointerover', () => {
            buttonGraphics.clear();
            buttonGraphics.fillStyle(0x555555, 0.7);
            buttonGraphics.fillRoundedRect(centerX - buttonWidth / 2, centerY - buttonHeight / 2 + 350, buttonWidth, buttonHeight, buttonRadius);
        });

        button.on('pointerout', () => {
            buttonGraphics.clear();
            buttonGraphics.fillStyle(0x000000, 0.5);
            buttonGraphics.fillRoundedRect(centerX - buttonWidth / 2, centerY - buttonHeight / 2 + 350, buttonWidth, buttonHeight, buttonRadius);
        });

        // HANDLE JOINING
        try {
            const firestoreBalance = userDoc.data().balance;
            this.room = await this.client.joinById(this.roomId, { playerId: playerId, balance: firestoreBalance, playerName: userDoc.data().name });
        } catch (err) {
            console.error(err);
        }

        // handle player list updates
        this.room.onMessage('playerListUpdate', (message) => {
            const players = message.players || [];
            const playerNames = players.map(player => player.name).join('\n');
            this.playerListText.setText(playerNames);
        });

        // when all players are ready
        this.room.onMessage('allPlayersReady', (message) => {
            this.scene.start('PlaceBetsScene', { room: this.room });
        });

        this.room.onMessage("cannotJoin", (data) => {
            alert(data.message);
            window.location.href = "/signin";
        });
    }
}


class PlaceBetsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlaceBetsScene' });
        this.betAmount = 0;
        this.selectedBetOption = '..';
        this.betMessageText = null;
        this.initialBalance
        this.room = null;
    }

    init(data) {
        this.room = data.room;
    }

    preload() {
        this.load.image('bg', '/table.jpg');
    }

    async create() {
        const playerId = localStorage.getItem("firebaseIdToken");
        const userDoc = await getDoc(doc(db, "users", playerId));

        if (userDoc.exists()) {
            this.initialBalance = userDoc.data().balance;
        } else {
            console.error("User document not found.");
            window.location.href = "/";
        }

        this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height);
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const buttonWidth = 100;
        const buttonHeight = 100;
        const buttonRadius = 20;

        this.add.text(centerX, centerY / 4, 'Place Bets', {
            fontSize: '80px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        this.add.text(centerX, centerY / 4 + 100, `You have: ${this.initialBalance.toLocaleString()} credits.`, {
            fontSize: '36px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        const betValues = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000]
            .filter(value => value <= this.initialBalance);

        if (!betValues.includes(this.initialBalance)) {
            betValues.push(this.initialBalance);
        }

        betValues.sort((a, b) => a - b);
        let betIndex = 0;
        const valueText = this.add.text(centerX, centerY - 120, betValues[betIndex].toString(), {
            fontSize: '48px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        this.betAmount = betValues[betIndex];

        // less button
        const lessButtonContainer = this.add.container(centerX - 150, centerY - 120);
        const lessButtonGraphics = this.add.graphics();
        lessButtonGraphics.fillStyle(0x000000, 0.5);
        lessButtonGraphics.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
        const lessButtonText = this.add.text(0, 0, '-', {
            fontSize: '120px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');
        lessButtonContainer.add([lessButtonGraphics, lessButtonText]);
        lessButtonContainer.setSize(buttonWidth, buttonHeight);
        lessButtonContainer.setInteractive()
            .on('pointerdown', () => {
                if (betIndex > 0) {
                    betIndex--;
                    valueText.setText(betValues[betIndex].toString());
                    this.betAmount = betValues[betIndex];
                    this.updateBetMessage();
                }
            })
            .on('pointerover', () => {
                lessButtonGraphics.clear();
                lessButtonGraphics.fillStyle(0x555555, 0.7);
                lessButtonGraphics.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
            })
            .on('pointerout', () => {
                lessButtonGraphics.clear();
                lessButtonGraphics.fillStyle(0x000000, 0.5);
                lessButtonGraphics.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
            });

        // more button
        const moreButtonContainer = this.add.container(centerX + 150, centerY - 120);
        const moreButtonGraphics = this.add.graphics();
        moreButtonGraphics.fillStyle(0x000000, 0.5);
        moreButtonGraphics.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
        const moreButtonText = this.add.text(0, 0, '+', {
            fontSize: '120px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');
        moreButtonContainer.add([moreButtonGraphics, moreButtonText]);
        moreButtonContainer.setSize(buttonWidth, buttonHeight);
        moreButtonContainer.setInteractive()
            .on('pointerdown', () => {
                if (betIndex < betValues.length - 1) {
                    betIndex++;
                    valueText.setText(betValues[betIndex].toString());
                    this.betAmount = betValues[betIndex];
                    this.updateBetMessage();
                }
            })
            .on('pointerover', () => {
                moreButtonGraphics.clear();
                moreButtonGraphics.fillStyle(0x555555, 0.7);
                moreButtonGraphics.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
            })
            .on('pointerout', () => {
                moreButtonGraphics.clear();
                moreButtonGraphics.fillStyle(0x000000, 0.5);
                moreButtonGraphics.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
            });


        this.add.text(centerX, centerY / 2 + 250, 'Place bet on:', {
            fontSize: '36px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        // bet buttons
        const betOptions = ['Banker', 'Tie', 'Player'];
        const buttonContainers = [];
        const buttonGraphicsArray = [];
        const betButtonWidth = 180;

        betOptions.forEach((option, index) => {
            const buttonContainer = this.add.container(centerX - 200 + index * 200, centerY / 2 + 350);
            const buttonGraphics = this.add.graphics();
            buttonGraphics.fillStyle(0x000000, 0.5);
            buttonGraphics.fillRoundedRect(-betButtonWidth / 2, -buttonHeight / 2, betButtonWidth, buttonHeight, buttonRadius);
            const buttonText = this.add.text(0, 0, option, {
                fontSize: '36px',
                fill: '#fff',
            }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');
            buttonContainer.add([buttonGraphics, buttonText]);
            buttonContainer.setSize(betButtonWidth, buttonHeight);
            buttonContainer.setInteractive()
                .on('pointerdown', () => {
                    this.selectedBetOption = option;
                    this.updateBetMessage();
                });

            buttonContainers.push(buttonContainer);
            buttonGraphicsArray.push(buttonGraphics);

            buttonContainer.on('pointerover', () => {
                if (buttonGraphics.fillColor !== 0x555555) {
                    buttonGraphics.clear();
                    buttonGraphics.fillStyle(0x555555, 0.7);
                    buttonGraphics.fillRoundedRect(-betButtonWidth / 2, -buttonHeight / 2, betButtonWidth, buttonHeight, buttonRadius);
                }
            });

            buttonContainer.on('pointerout', () => {
                if (buttonGraphics.fillColor !== 0x555555) {
                    buttonGraphics.clear();
                    buttonGraphics.fillStyle(0x000000, 0.5);
                    buttonGraphics.fillRoundedRect(-betButtonWidth / 2, -buttonHeight / 2, betButtonWidth, buttonHeight, buttonRadius);
                }
            });
        });

        // bet message text
        this.betMessageText = this.add.text(centerX, centerY / 2 + 500, `You are betting ${this.betAmount.toLocaleString()} on ${this.selectedBetOption}.`, {
            fontSize: '36px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        // play button
        const playButtonWidth = 200;
        const playButtonContainer = this.add.container(centerX, centerY / 2 + 590);
        const playButtonGraphics = this.add.graphics();
        playButtonGraphics.fillStyle(0x000000, 0.5);
        playButtonGraphics.fillRoundedRect(-playButtonWidth / 2, -buttonHeight / 2, playButtonWidth, buttonHeight, buttonRadius);
        const playButtonText = this.add.text(0, 0, 'Place Bet', {
            fontSize: '36px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');
        playButtonContainer.add([playButtonGraphics, playButtonText]);
        playButtonContainer.setSize(playButtonWidth, buttonHeight);
        playButtonContainer.setInteractive()
            .on('pointerdown', () => {
                if (this.selectedBetOption === '..') {
                    this.betMessageText.setText('Choose where to place your bet before proceeding.');
                } else {
                    this.room.send('bet', { playerId: playerId, playerName: userDoc.data().name, betAmount: this.betAmount, betOption: this.selectedBetOption });
                    playButtonText.setText('Waiting for other players...');
                    playButtonGraphics.clear();
                    playButtonContainer.disableInteractive();
                }
            })
            .on('pointerover', () => {
                playButtonGraphics.clear();
                playButtonGraphics.fillStyle(0x555555, 0.7);
                playButtonGraphics.fillRoundedRect(-playButtonWidth / 2, -buttonHeight / 2, playButtonWidth, buttonHeight, buttonRadius);
            })
            .on('pointerout', () => {
                playButtonGraphics.clear();
                playButtonGraphics.fillStyle(0x000000, 0.5);
                playButtonGraphics.fillRoundedRect(-playButtonWidth / 2, -buttonHeight / 2, playButtonWidth, buttonHeight, buttonRadius);
            });

        // when all players have placed bets
        this.room.onMessage('allBetsPlaced', (message) => {
            this.scene.start('GameScene', {
                room: this.room,
                initialBalance: this.initialBalance,
                betAmount: this.betAmount,
                selectedBetOption: this.selectedBetOption,
            });
        })

        this.room.send('startOngoingGame', {});
    }

    updateBetMessage() {
        if (this.betMessageText) {
            this.betMessageText.setText(`You are betting ${this.betAmount} on ${this.selectedBetOption}.`);
        }
    }
}



class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.cardScale = 0.3;
        this.playerCards = [];
        this.bankerCards = [];
        this.gameMessageText = null;
        this.bets = [];
        this.cardsDealt = false;
    }

    init(data) {
        this.resetState();
        this.room = data.room;
        this.initialBalance = data.initialBalance;
        this.betAmount = data.betAmount;
        this.selectedBetOption = data.selectedBetOption;
    }

    preload() {
        WebFontLoader.default.load({
            google: {
                families: ['Rowdies']
            },
        })

        this.load.image('bg', '/table.jpg');
        this.load.image('card', '/card-back.png');

        const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"]
        const suits = ["spades", "clubs", "diamonds", "hearts"]
        suits.forEach((suit) => {
            values.forEach((value) => {
                const fileName = `${value}_of_${suit}.png`;
                const filePath = `/Cards/${fileName}`;
                this.load.image(fileName, filePath);
            });
        });
    }

    async create() {
        const playerId = localStorage.getItem("firebaseIdToken");
        const userRef = doc(db, "users", playerId);
        const userDoc = await getDoc(doc(db, "users", playerId));

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height);

        this.add.text(centerX - 750, centerY / 2 - 50, 'Player', {
            fontSize: '80px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        this.add.text(centerX - 730, centerY / 2 + 250, 'Banker', {
            fontSize: '80px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        // create the background rectangle for the game message text
        const gameMessageBg = this.add.graphics();
        const textWidth = 1100;
        const textHeight = 270;
        gameMessageBg.fillStyle(0x000000, 0.5);
        gameMessageBg.fillRoundedRect(centerX + 390 - textWidth / 2, centerY / 2 + 560 - textHeight / 2, textWidth, textHeight, 10);

        // create the game message text object
        this.gameMessageText = this.add.text(centerX + 390, centerY / 2 + 560, "", {
            fontSize: '36px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        // create the background rectangle for the bets message text
        const betsBg = this.add.graphics();
        betsBg.fillStyle(0x000000, 0.5);
        betsBg.fillRoundedRect(centerX - 935, centerY / 2 + 560 - textHeight / 2, 745, 270, 10);


        this.add.text(400, this.scale.height - 260, "Player Bets:", {
            fontSize: '30px',
            fill: '#fff',
            align: 'center',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');;

        // manages all delays in the game
        let delayAccumulator = 0;

        this.room.send('getPlayerBets', {});

        let betsTextObject = null;

        this.room.onMessage('playerBets', (message) => {
            this.bets = message.bets;

            // display bets in the bottom left corner
            const betsText = this.bets.map(bet => `${bet.playerName}: ${bet.betAmount} on ${bet.betOption}`).join('\n');

            // if the text object already exists, update its content
            if (betsTextObject) {
                betsTextObject.setText(betsText);
            } else {
                // otherwise, create a new text object and store its reference
                betsTextObject = this.add.text(400, this.scale.height - 230, betsText, {
                    fontSize: '24px',
                    fill: '#fff',
                    align: 'center',
                }).setOrigin(0.5, 0).setFontFamily('"Rowdies"');
            }


            this.room.send('dealInitial', {});

            // deal initial cards
            this.room.onMessage('initialCardsDealt', (message) => {
                if (this.cardsDealt) return; // prevent duplicate handling
                this.cardsDealt = true;


                this.playerCards.push(message.playerCard1);
                this.playerCards.push(message.playerCard2);
                this.playerCards.push(message.playerCard3);
                this.bankerCards.push(message.bankerCard1);
                this.bankerCards.push(message.bankerCard2);
                this.bankerCards.push(message.bankerCard3);

                // game message
                this.time.delayedCall(delayAccumulator += 1000, () => {
                    this.gameMessageText.setText("Dealing cards...");
                });

                // deal cards animations
                const playerCard0 = this.animateCard(centerX - 350, centerY / 2 - 50, delayAccumulator += 1000);
                const bankerCard0 = this.animateCard(centerX - 350, centerY / 2 + 250, delayAccumulator += 750);
                const playerCard1 = this.animateCard(centerX - 50, centerY / 2 - 50, delayAccumulator += 750);
                const bankerCard1 = this.animateCard(centerX - 50, centerY / 2 + 250, delayAccumulator += 750);

                // PLAYER'S TURN

                // game message
                this.time.delayedCall(delayAccumulator += 2500, () => {
                    this.gameMessageText.setText("Player's turn!");
                });


                // flip player cards
                this.flipCard(playerCard0, `${this.playerCards[0]}.png`, delayAccumulator += 1000);
                this.flipCard(playerCard1, `${this.playerCards[1]}.png`, delayAccumulator += 500);

                // calculate player cards total
                // add cards together, drop the tens digit if exists
                let initialPlayerTotal = this.calculateCardsTotal(this.playerCards.slice(0, 2));
                let finalPlayerTotal = initialPlayerTotal;

                let playerStands = false;

                // if score of 8 or 9, no more cards dealt. ("natural")
                // game message
                if (initialPlayerTotal >= 8 && initialPlayerTotal <= 9) {
                    this.time.delayedCall(delayAccumulator += 1000, () => {
                        this.gameMessageText.setText(`Player has a score of ${initialPlayerTotal}, a "natural"!`);
                    });
                }

                // if score 6, 7, no more cards dealt and player stands
                else if (initialPlayerTotal >= 6 && initialPlayerTotal <= 7) {
                    playerStands = true;

                    // game message
                    this.time.delayedCall(delayAccumulator += 1000, () => {
                        this.gameMessageText.setText(`Player has an initial score of ${initialPlayerTotal}, so they stand.`);
                    });
                }
                // if score 0-5, draw a third card
                else if (initialPlayerTotal >= 0 && initialPlayerTotal <= 5) {

                    // game message
                    this.time.delayedCall(delayAccumulator += 1000, () => {
                        this.gameMessageText.setText(`Player has an initial score of ${initialPlayerTotal}, so they will draw a third card.`);
                    });

                    const playerCard2 = this.animateCard(centerX + 250, centerY / 2 - 50, delayAccumulator += 2000);
                    this.flipCard(playerCard2, `${this.playerCards[2]}.png`, delayAccumulator += 1500);
                    finalPlayerTotal = this.calculateCardsTotal(this.playerCards)
                }

                // show the player's final score after all animations run
                this.time.delayedCall(delayAccumulator += 2000, () => {
                    this.add.text(centerX + 700, centerY / 2 - 50, `Score: ${finalPlayerTotal}`, {
                        fontSize: '80px',
                        fill: '#fff',
                    }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');
                    this.gameMessageText.setText(`Player has a final score of ${finalPlayerTotal}.`);
                });

                // BANKER'S TURN

                // game message
                this.time.delayedCall(delayAccumulator += 4000, () => {
                    this.gameMessageText.setText(`Banker's turn!`);
                });

                this.flipCard(bankerCard0, `${this.bankerCards[0]}.png`, delayAccumulator += 1000);
                this.flipCard(bankerCard1, `${this.bankerCards[1]}.png`, delayAccumulator += 500);

                let initialBankerTotal = this.calculateCardsTotal(this.bankerCards.slice(0, 2));
                let finalBankerTotal = initialBankerTotal;

                if ((playerStands) && (initialBankerTotal >= 0 && initialBankerTotal <= 5)) {

                    // game message
                    this.time.delayedCall(delayAccumulator += 1000, () => {
                        this.gameMessageText.setText(`Banker has an initial score of ${initialBankerTotal}, so they will draw a third card.`);
                    });

                    // take third card
                    const bankerCard2 = this.animateCard(centerX + 250, centerY / 2 + 250, delayAccumulator += 1000);
                    this.flipCard(bankerCard2, `${this.bankerCards[2]}.png`, delayAccumulator += 1500);
                    finalBankerTotal = this.calculateCardsTotal(this.bankerCards);

                }
                else if (this.playerCards.length > 2) {
                    // calculate value of the player's third card
                    const playerCard2Value = this.getCardValueFromName(this.playerCards[2]);

                    if ((initialBankerTotal >= 0 && initialBankerTotal <= 2) || (initialBankerTotal >= 3 && initialBankerTotal <= 6 && playerCard2Value != 8)) {

                        // game message
                        this.time.delayedCall(delayAccumulator += 1000, () => {
                            this.gameMessageText.setText(`Banker has an initial score of ${initialBankerTotal}, so they will draw a third card.`);
                        });

                        // take third card
                        const bankerCard2 = this.animateCard(centerX + 250, centerY / 2 + 250, delayAccumulator += 1000);
                        this.flipCard(bankerCard2, `${this.bankerCards[2]}.png`, delayAccumulator += 1500);
                        finalBankerTotal = this.calculateCardsTotal(this.bankerCards);
                    }
                    else {
                        // game message
                        this.time.delayedCall(delayAccumulator += 1000, () => {
                            this.gameMessageText.setText(`Banker has a score of ${finalBankerTotal}, so they stand.`);
                        });
                    }
                }
                else {
                    // game message
                    this.time.delayedCall(delayAccumulator += 1000, () => {
                        this.gameMessageText.setText(`Banker has a score of ${finalBankerTotal}, so they stand.`);
                    });
                }

                // show the banker's final score after all animations run
                this.time.delayedCall(delayAccumulator += 2000, () => {
                    this.add.text(centerX + 700, centerY / 2 + 250, `Score: ${finalBankerTotal}`, {
                        fontSize: '80px',
                        fill: '#fff',
                    }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');
                    this.gameMessageText.setText(`Banker has a final score of ${finalBankerTotal}.`);
                });


                let winner;
                // game message
                this.time.delayedCall(delayAccumulator += 2000, () => {
                    if (finalPlayerTotal > finalBankerTotal) {
                        this.gameMessageText.setText(`Player wins!`);
                        winner = "Player";
                    }
                    else if (finalBankerTotal > finalPlayerTotal) {
                        this.gameMessageText.setText("Banker wins!")
                        winner = "Banker";
                    }
                    else {
                        this.gameMessageText.setText("It's a tie!")
                        winner = "Tie";
                    }

                    // update firebase balance and game history
                    this.room.send('gameFinished', { playerId: playerId, initialBalance: this.initialBalance, betAmount: this.betAmount, winningBetOption: winner });

                    this.time.delayedCall(2000, () => {
                        const finalBalance = this.initialBalance + (winner === this.selectedBetOption ? this.betAmount : -this.betAmount);
                        this.scene.start('GameOverScene', { winner, finalBalance, room: this.room, });
                    });
                });
            });
        });
    }

    updatePlayerList(players) {
        const playerList = Object.values(players).map(player => `${player.name}: ${player.totalCredits} credits`);
        this.gameMessageText.setText(`Players:\n${playerList.join('\n')}`);
    }

    getCardValueFromName(cardName) {
        let valueString = cardName.substring(0, cardName.indexOf("_"));
        let valueInt;
        switch (valueString) {
            case "ace":
                valueInt = 1;
                break;
            case "10":
            case "jack":
            case "queen":
            case "king":
                valueInt = 0;
                break;
            default:
                valueInt = Number(valueString);
        }

        return valueInt;
    }

    calculateCardsTotal(hand) {
        let total = 0;
        let value;

        for (let card of hand) {
            value = this.getCardValueFromName(card)
            total += value;
        }

        total = total % 10;

        return total;
    }

    animateCard(handX, handY, delay) {
        const centerX = this.cameras.main.centerX;
        const card = this.add.image(centerX, -(this.scale.height / 5), 'card').setScale(this.cardScale).setOrigin(0.5, 0.5);

        this.tweens.add({
            targets: card,
            x: handX,
            y: handY,
            duration: 1500,
            delay: delay,
            ease: 'Cubic.easeOut',
        });

        return card;
    }

    flipCard(card, newTexture, delay, tint = false) {
        if (newTexture != 'card') {
            this.tweens.add({
                targets: card,
                scaleX: 0,
                duration: 200,
                delay: delay,
                ease: 'Linear',
                onComplete: () => {
                    card.setTexture(newTexture);
                    if (tint) card.setTint(0x808080);
                    this.tweens.add({
                        targets: card,
                        scaleX: this.cardScale,
                        duration: 200,
                        ease: 'Linear',
                    });
                },
            });
        }
    }

    resetState() {
        this.cardScale = 0.3;
        this.playerCards = [];
        this.bankerCards = [];
        this.gameMessageText = null;
        this.bets = [];
        this.cardsDealt = false;
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
        this.results = [];
    }

    init(data) {
        this.winner = data.winner;
        this.finalBalance = data.finalBalance;
        this.room = data.room;
    }

    preload() {
        this.load.image('bg', '/table.jpg');
        this.load.image('logo', '/baccarat-logo.png');
    }

    async create() {
        const playerId = localStorage.getItem("firebaseIdToken");
        const userDoc = await getDoc(doc(db, "users", playerId));


        this.room.send("getResults", {});

        if (!this.resultsListenerAdded) {
            this.room.onMessage('allResults', (message) => {
                this.results = message.results;
                this.displayResults();
            });
            this.resultsListenerAdded = true;
        }

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height);

        this.add.image(centerX, centerY - 350, 'logo');

        this.add.text(centerX, centerY - 200, `Game Over`, {
            fontSize: '80px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        const resultText = this.winner === "Tie"
            ? "Game Result: Tie!"
            : `${this.winner} Wins!`;

        this.add.text(centerX, centerY - 100, resultText, {
            fontSize: '48px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        this.add.text(centerX, centerY - 25, `Your final balance: ${this.finalBalance.toLocaleString()}`, {
            fontSize: '36px',
            fill: '#fff',
        }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');

        const buttonWidth = 300;
        const buttonHeight = 100;
        const buttonRadius = 20;

        const buttonGraphics = this.add.graphics();
        buttonGraphics.fillStyle(0x000000, 0.5);
        buttonGraphics.fillRoundedRect(centerX - buttonWidth / 2, centerY + 300 - buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);

        const buttonZone = this.add.zone(
            centerX,
            centerY + 300,
            buttonWidth,
            buttonHeight
        ).setOrigin(0.5, 0.5).setInteractive();

        const playAgainButton = this.add.text(centerX, centerY + 300, 'Play Again', {
            fontSize: '36px',
            fill: '#fff',
            fontFamily: '"Rowdies"',
        }).setOrigin(0.5, 0.5);

        buttonZone.on('pointerover', () => {
            buttonGraphics.clear();
            buttonGraphics.fillStyle(0x555555, 0.7);
            buttonGraphics.fillRoundedRect(centerX - buttonWidth / 2, centerY + 300 - buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
        });

        buttonZone.on('pointerout', () => {
            buttonGraphics.clear();
            buttonGraphics.fillStyle(0x000000, 0.5);
            buttonGraphics.fillRoundedRect(centerX - buttonWidth / 2, centerY + 300 - buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
        });

        buttonZone.on('pointerdown', () => {
            this.room.send("resetGame", { roomId: this.room.id });
            this.scene.start('WaitingScene', { roomId: this.room.id });
        });
    }

    displayResults() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        if (this.results && this.results.length > 0) {
            this.results.forEach((result, index) => {
                this.add.text(centerX, centerY + 20 + index * 30, `${result.playerName} ${result.result > 0 ? 'won' : 'lost'} ${Math.abs(result.result).toLocaleString()} credits`, {
                    fontSize: '24px',
                    fill: '#fff',
                    algin: 'center'
                }).setOrigin(0.5, 0).setFontFamily('"Rowdies"');
            });
        } else {
            this.add.text(centerX, centerY, "No results available.", {
                fontSize: '24px',
                fill: '#fff',
            }).setOrigin(0.5, 0.5).setFontFamily('"Rowdies"');
        }
    }
}

const BaccaratGame = () => {
    const gameRef = useRef(null);
    const { roomId } = useParams();
    const [gameInstance, setGameInstance] = useState(null);

    useEffect(() => {
        const header = document.getElementById("header");
        const headerHeight = header ? header.offsetHeight : 0;

        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight - headerHeight,
            backgroundColor: "#2d2d2d",
            parent: "phaser-game",
            scene: [WaitingScene, PlaceBetsScene, GameScene, GameOverScene],
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;
        setGameInstance(game);

        // set initial scene manually so that roomId can be passed.
        game.scene.start('WaitingScene', { roomId });

        setTimeout(() => {
            game.scale.resize(window.innerWidth, window.innerHeight - headerHeight);
        }, 100);

        return () => {
            game.destroy(true);
        };
    }, []);

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

    return <div id="phaser-game"></div>;
};

export default BaccaratGame;

