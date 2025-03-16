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

        // log text field
        this.txt_info = this.add.text(447, 537, "", {})
        this.txt_info.setStyle({"align": "center", "fontSize": "24px"})

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
        this.numbers = new Array(36);
        var x = chipOffsetX; // Starting position relative to betTable
        var y = chipOffsetY;

        for (let i = 0; i < 12; i++) {
            for (let j = 0; j < 3; j++) {
                let index = i * 3 + j;
                
                // Create chip at a relative position
                let chip = this.add.image(x, y, "chip");
                chip.scaleX = 0.25;
                chip.scaleY = 0.25;

                // Set interactive
                chip.type = 0; // Bet type
                chip.index = index;
                chip.setInteractive();
                chip.on("pointerdown", () => {
                    if (this.canSpin)
                        this.onChipClicked(chip);
                });

                // Add chip to container (relative positioning)
                this.chipContainer.add(chip);

                // Store reference
                this.numbers[index] = chip;

                x += 59; // Move across row
            }
            y += 47.6; // Move down column
            x = chipOffsetX; // Reset X position for new row
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
                    this.txt_info.setText(`Bet placed on ${chip.index + 1}`)
                    this.straightUp[chip.index] += 10
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
                    this.txt_info.setText("This is a dozens bet")
                    break
                case 7:
                    // even money
                    this.txt_info.setText("This is an even money bet")
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
        this.numbers.forEach(chip => {
            chip.alpha = 0.01
        });

        // clear info text
        this.txt_info.setText("")
        this.txt_spinResult.setText("")
    }

    payout(wheelResult) {
        var bet
        var totalPayout = 0
        bet = this.straightUp[wheelResult[0] - 1] // -1 to translate to index value
        if (bet > 0) {
            totalPayout += bet*35
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