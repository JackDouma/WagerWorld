import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

// wheel animation based off https://phaser.io/news/2018/08/wheel-of-fortune-tutorial

var game;
 
var gameOptions = {
 
    // slices (numbers) placed in the wheel
    slices: 37,
 
    // numbers and color, starting from 12 o'clock going clockwise
    // black=0, red=1
    sliceValues: [[0, -1], [32, 1], [15, 0], [19, 1], [4, 0], [21, 1], [2, 0], [25, 1], [17, 0], [34, 1], [6, 0], [27, 1], [13, 0], [36, 1], [11, 0], [30, 1], [8, 0], [23, 1], [10, 0], [5, 1], [24, 0], [16, 1], [33, 0], [1, 1], [20, 0], [14, 1], [31, 0], [9, 1], [22, 0], [18, 1], [29, 0], [7, 1], [28, 0], [12, 1], [35, 0], [3, 1], [26, 0]],
 
    // length of animation
    rotationTime: 6000
}
 
// Phaser scene
class RouletteScene extends Phaser.Scene{

    constructor(){
        super("RouletteScene");
    }
 
    preload(){
        // images
        // roulette wheel @ https://www.vexels.com/png-svg/preview/151205/roulette-wheel-icon
        this.load.image("wheel", "/roulette/roulette-wheel.png");
        this.load.image("wheel-bg", "/roulette/roulette-wheel-bg.png");
        // bet table @ https://www.freepik.com/premium-vector/american-roulette-table-layout-with-bets-options_237485384.htm
        this.load.image("betTable", "/roulette/betTable.jpg")
        this.load.image("chip", "/roulette/chip.png")
    }
 
    create(){
        // ******************************************************* //
        // get user balance from db
        this.userBal = 10000
        // ******************************************************* //
        this.newUserBal = 10000 // temp save in case page is refreshed before the wheel is spun

        // roulette_wheel @ @ https://www.vexels.com/png-svg/preview/151205/roulette-wheel-icon
        // set for input and add circular hit area
		this.roulette_wheel = this.add.sprite(575, 299, "wheel").setInteractive(new Phaser.Geom.Circle(240.5, 240.5, 235), Phaser.Geom.Circle.Contains);
		this.roulette_wheel.scaleX = 0.8;
		this.roulette_wheel.scaleY = 0.8;
        // listener to call spinWheel
        this.roulette_wheel.on("pointerdown", () => {  
            this.spinWheel()
        })

		// roulette_wheel_bg
		this.roulette_wheel_bg = this.add.image(575, 299, "wheel-bg");
		this.roulette_wheel_bg.scaleX = 0.77;
		this.roulette_wheel_bg.scaleY = 0.77;

		// betTable @ https://stock.adobe.com/search?k=roulette+table&asset_id=409514024
		this.betTable = this.add.image(182, 295, "betTable");
		this.betTable.scaleX = 0.9;
		this.betTable.scaleY = 0.9;
		this.betTable.angle = 90;

        // log text field (centered horizontally relative to roulette wheel)
        this.txt_info = this.add.text(this.roulette_wheel.x, 537, "", {})
        this.txt_info.setStyle({"align": "center", "fontSize": "24px"})
        this.txt_info.setOrigin(0.5, 0)

        // user balance text field
        this.txt_userBal = this.add.text(450, 10, `Balance: ${this.userBal} credits`, {})
        this.txt_userBal.setStyle({"align": "center", "fontSize": "24px"})

        // result of roulette spin text field
        this.txt_spinResult = this.add.text(545, 82, "", {})
        
        // arrays for betting logic
        this.straightUp = new Array(36) //35:1
        this.split = new Array(57) //17:1
        this.street = new Array(12) //11:1
        this.cornerBet = new Array(22) //8:1
        this.fiveNumber //6:1
        this.line = new Array(11) //5:1
        this.dozensCols = new Array(6) //2:1
        this.evenMoney = new Array(6)

        // Create a container for chips relative to the betTable
        this.chipContainer = this.add.container(this.betTable.x, this.betTable.y);
        // sync scale so chips dynamically shift position as needed
        this.chipContainer.setScale(this.betTable.scaleX, this.betTable.scaleY)

        // Adjust these values based on betTable alignment
        const chipOffsetX = -14;
        const chipOffsetY = -261;

        // Position chips relative to betTable
        this.chips = new Array(); // store chip references
        var x = chipOffsetX; // Starting position relative to betTable
        var y = chipOffsetY;
        var chipScale = 0.20
        
        // straight-up bet chips
        for (let i = 0; i < 12; i++) {
            for (let j = 0; j < 3; j++) { 
                // index to be used in bet logic 
                let index = i * 3 + j;

                // Create chip at a relative position
                let chip = this.add.image(x, y, "chip")
                chip.scaleX = chipScale
                chip.scaleY = chipScale

                // Set interactive
                chip.type = 0 // Bet type
                chip.index = index
                chip.setInteractive()
                chip.on("pointerdown", () => {
                    if (this.canSpin)
                        this.onChipClicked(chip)
                })

                // Add chip to container (relative positioning)
                this.chipContainer.add(chip)

                this.chips.push(chip) // Store reference
                x += 59 // Move across row
            }
            y += 47.6 // Move down column
            x = chipOffsetX; // Reset X position for new row
        }
        
        // dozens
        x = chipOffsetX - 48
        y = chipOffsetY + 20
        for (let i=0; i<3; i++) {
            // chip creation
            let chip = this.add.image(x, y, "chip")
            chip.scaleX = chipScale
            chip.scaleY = chipScale

            // set interactive
            chip.type = 6 // for bet logic
            chip.index = i
            chip.setInteractive(new Phaser.Geom.Rectangle(66, -75, 160, 900), Phaser.Geom.Rectangle.Contains)
            chip.on("pointerdown", () =>{
                if (this.canSpin)
                    chip.alpha = 0.01
                    this.onChipClicked(chip)
            })

            this.chipContainer.add(chip)
            this.chips.push(chip)
            y += 190.4
        }
        // columns
        x = chipOffsetX
        y = chipOffsetY + 571.2
        for (let i=3; i<6; i++) {
            // chip creation
            let chip = this.add.image(x, y, "chip")
            chip.scaleX = chipScale
            chip.scaleY = chipScale

            // set interactive
            chip.type = 6 // for bet logic
            chip.index = i
            chip.setInteractive()
            chip.on("pointerdown", () =>{
                if (this.canSpin)
                    chip.alpha = 0.01
                    this.onChipClicked(chip)
            })

            this.chipContainer.add(chip)
            this.chips.push(chip)
            x += 59
        }

        // even money
        x = chipOffsetX - 84
        y = chipOffsetY + 25
        for (let i=0; i<6; i++) {
            // chip creation
            let chip = this.add.image(x, y, "chip")
            chip.scaleX = chipScale
            chip.scaleY = chipScale

            // set interactive
            chip.type = 7 // for bet logic
            chip.index = i
            chip.setInteractive(new Phaser.Geom.Rectangle(66, -110, 160, 450), Phaser.Geom.Rectangle.Contains)
            chip.on("pointerdown", () =>{
                if (this.canSpin)
                    chip.alpha = 0.01
                    this.onChipClicked(chip)
            })

            this.chipContainer.add(chip)
            this.chips.push(chip)
            y += 95
        }

        this.reset() // all bets=0 and hide chips
        this.canSpin = true;
    }

    spinWheel(){
        if(this.canSpin){
            // number of rotations
            var rounds = Phaser.Math.Between(2, 4);
            // randomly selected stopping point
            var degrees = Phaser.Math.Between(0, 360);
            var spinResult = gameOptions.slices - 1 - Math.floor(degrees / (360 / gameOptions.slices));
            var value = gameOptions.sliceValues[spinResult]

            this.canSpin = false;

            var payout = this.payout(value)
            this.newUserBal += payout

            // ******************************************************* //
            // update user balance in db
            this.userBal = this.newUserBal
            // ******************************************************* //
 
            // animation with quadratic to simulate friction
            this.tweens.add({
                // adding the wheel to tween targets
                targets: [this.roulette_wheel],
                // angle destination
                angle: 360 * rounds + degrees,
                // tween duration
                duration: gameOptions.rotationTime,
                // tween easing
                ease: "Cubic.easeOut",
                // callback scope
                callbackScope: this,
 
                // function to be executed once the tween has been completed
                onComplete: function(tween){
                    var resultTxt
                    if (value[1] == 0)
                        resultTxt = "Black "
                    else if (value[1] == 1)
                        resultTxt = "Red "
                    else
                        resultTxt = ""
                    resultTxt += value[0]
                    this.txt_spinResult.setText(resultTxt)

                    if (payout == 0)
                        this.txt_info.setText("You lose.")
                    else
                        this.txt_info.setText(`${payout} credit payout!`)
                    this.txt_userBal.setText(`Balance: ${this.newUserBal} credits`)
                    setTimeout(() => {
                        // wait a couple seconds before hiding chips and resetting bets
                        this.reset()
                        this.canSpin = true;
                    }, 3000)
                }
            });
        }
    }

    onChipClicked(chip) {
        chip.alpha = 100
        // different logic for each type of bet
        if (this.userBal >= 10) {
            switch (chip.type) {
                case 0:
                    // straight up, 35:1
                    this.straightUp[chip.index] += 10
                    this.txt_info.setText(`${this.straightUp[chip.index]} credits on ${chip.index + 1}`)
                    break

                case 1:
                    // split, 17:1
                    this.txt_info.setText("This is a split bet")
                    break
                case 2:
                    // street, 11:1
                    this.txt_info.setText("This is a street bet")
                    break
                case 3:
                    // corner bet, 8:1
                    this.txt_info.setText("This is a corner bet")
                    break
                case 4:
                    // five number bet, 6:1
                    this.txt_info.setText("This is a five number bet")
                    break
                case 5:
                    // line, 5:1
                    this.txt_info.setText("This is a line bet")
                    break

                case 6:
                    // dozens and columns, 2:1
                    this.dozensCols[chip.index] += 10
                    var txt = `${this.dozensCols[chip.index]} credits on `
                    if (chip.index == 0) {
                        txt += `1st dozen`
                    } else if (chip.index == 1) {
                        txt += `2nd dozen`
                    } else if (chip.index == 2) {
                        txt += `3rd dozen`
                    } else if (chip.index == 3) {
                        txt += `1st column`
                    } else if (chip.index == 4) {
                        txt += `2nd column`
                    } else if (chip.index == 5) {
                        txt += `3rd column`
                    }
                    this.txt_info.setText(txt)
                    break

                case 7:
                    // dozens and columns, 2:1
                    this.evenMoney[chip.index] += 10
                    var txt = `${this.evenMoney[chip.index]} credits on `
                    if (chip.index == 0) {
                        txt += `first 18`
                    } else if (chip.index == 1) {
                        txt += `Even`
                    } else if (chip.index == 2) {
                        txt += `Red`
                    } else if (chip.index == 3) {
                        txt += `Black`
                    } else if (chip.index == 4) {
                        txt += `Odd`
                    } else if (chip.index == 5) {
                        txt += `last 18`
                    }
                    this.txt_info.setText(txt)
                    break
            }
            this.newUserBal -= 10
            this.txt_userBal.setText(`Balance: ${this.newUserBal} credits`)
        }
        else {
            this.txt_info.setText("Out of credits")
        }
    }

    reset() {
        // set all bets to 0
        for (let i = 0; i < this.straightUp.length; i++) {
            this.straightUp[i] = 0;
        }
        for (let i = 0; i < this.split.length; i++) {
            this.split[i] = 0;
        }
        for (let i = 0; i < this.street.length; i++) {
            this.street[i] = 0;
        }
        for (let i = 0; i < this.cornerBet.length; i++) {
            this.cornerBet[i] = 0;
        }
        for (let i = 0; i < this.line.length; i++) {
            this.line[i] = 0;
        }
        for (let i = 0; i < this.dozensCols.length; i++) {
            this.dozensCols[i] = 0;
        }
        for (let i = 0; i < this.evenMoney.length; i++) {
            this.evenMoney[i] = 0;
        }

        // hide all chips
        this.chips.forEach(chip => {
            chip.alpha = 0.01
        });

        // clear info text
        this.txt_info.setText("")
        this.txt_spinResult.setText("")
    }

    payout(wheelResult) {
        var bet
        var totalPayout = 0

        if (wheelResult[0] != 0) { // account for special case of 0

            // straight up 35:1
            bet = this.straightUp[wheelResult[0] - 1] // -1 to translate to index value
            totalPayout += bet*36

            // split
            // street
            // cornerBet
            // line

            // dozens
            var whichDozen = Math.ceil(wheelResult[0] / 12)
            bet = this.dozensCols[whichDozen - 1] // translate to index
            totalPayout += bet*3
            // columns
            var rm = wheelResult[0] % 3
            var whichCol
            if (rm == 1) {
                whichCol = 3
            } else if (rm == 2) {
                whichCol = 4
            } else if (rm == 0) {
                whichCol = 5
            }
            bet = this.dozensCols[whichCol]
            totalPayout += bet*3

            // even money
            // 18s
            if (wheelResult[0] <= 18) {
                totalPayout += this.evenMoney[0]*2
            } else {
                totalPayout += this.evenMoney[5]*2
            }
            // even and odd
            if (wheelResult[0] % 2 == 0) {
                totalPayout += this.evenMoney[1]*2
            } else {
                totalPayout += this.evenMoney[4]*2
            }
            // always bet on black
            if (wheelResult[1] == 0) {
                totalPayout += this.evenMoney[3]*2
            } else if (wheelResult[1] == 1) {
                totalPayout += this.evenMoney[2]*2
            }
        }

        this.userBal += totalPayout
        return totalPayout
    }
}

// putting it all in a React component
const RouletteGame = () => {
  const gameRef = useRef(null)
  const [gameInstance, setGameInstance] = useState(null)

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth - 10,
      height: window.innerHeight - 10,
      backgroundColor: '#236E45',
      parent: 'phaser-game',
      scene: RouletteScene,
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

export default RouletteGame