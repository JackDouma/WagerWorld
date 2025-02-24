import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import '../HorseRacingGame.css';

const HorseRacingGame = () => {
  const gameRef = useRef(null); // Reference to the Phaser game instance
  const roomRef = useRef(null); // Reference to the Colyseus room
  const [selectedHorse, setSelectedHorse] = useState(null); // Selected horse for betting
  const [bets, setBets] = useState([]); // List of bets placed by clients
  const [gameStatus, setGameStatus] = useState('waiting'); // Current game status

  // Initialize game and connect to Colyseus room
  useEffect(() => {
    const client = new Client('ws://localhost:2567');

    async function connectToRoom() {
      try {
        const room = await client.joinOrCreate('horse_racing');
        roomRef.current = room;

        // Handle game state updates
        room.onStateChange((state) => {
          if (gameRef.current) {
            // Update horse positions and animations
            state.horses.forEach((horse, index) => {
              const gameHorse = gameRef.current.scene.scenes[0].children.list
                .find(obj => obj.getData('horseIndex') === index);
              if (gameHorse) {
                gameHorse.x = horse.x;
                if (horse.speed > 0) {
                  gameHorse.anims.play('gallop', true);
                } else {
                  gameHorse.anims.pause();
                }
              }
            });

            // Update bets
            setBets([]); // Clear previous bets
            state.bets.forEach((horseIndex, clientId) => {
              setBets(bets => [...bets, { clientId, horseIndex }]);
            });
          }
        });

        // Handle race result messages
        room.onMessage('raceResult', (message) => {
          setGameStatus(message.won ? 'You won!' : 'You lost!');
        });
      } catch (error) {
        console.error('Could not connect to room:', error);
      }
    }

    // Phaser game configuration
    const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 800,
      height: 400,
      backgroundColor: '#7cba3d', // Green background for the race track
      scene: {
        preload: function() {
          // Load horse spritesheet
          this.load.spritesheet('horse', '/horse_run_cycle.png', {
            frameWidth: 82,
            frameHeight: 66,
          });
        },
        create: function() {
          // Create galloping animation
          this.anims.create({
            key: 'gallop',
            frames: this.anims.generateFrameNumbers('horse', { start: 0, end: 4 }),
            frameRate: 12,
            repeat: -1,
          });

          // Draw race track lines
          for (let i = 0; i < 5; i++) {
            this.add.line(0, (i + 1) * 80, 0, 0, 800, 0, 0xffffff)
              .setLineWidth(2)
              .setOrigin(0);
          }

          // Draw finish line
          this.add.rectangle(700, 200, 10, 400, 0xffffff);

          // Create horses with unique colors
          const colors = [0xFFFFFF, 0xFFCCCC, 0xCCFFCC, 0xCCCCFF, 0xFFEECC];
          for (let i = 0; i < 5; i++) {
            const horse = this.add.sprite(50, (i + 1) * 80 - 40, 'horse')
              .setInteractive()
              .setData('horseIndex', i)
              .setTint(colors[i]);

            horse.anims.play('gallop');
            horse.anims.pause();

            // Add click handler for selecting a horse
            horse.on('pointerdown', () => {
              setSelectedHorse(i);
            });

            // Add horse labels
            this.add.text(100, (i + 1) * 80 - 40, `Horse ${i + 1}`, {
              color: '#000',
              fontSize: '16px',
            });
          }
        },
      },
    };

    // Initialize Phaser game
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Connect to Colyseus room
    connectToRoom();

    // Cleanup on component unmount
    return () => {
      game.destroy(true);
      if (roomRef.current) {
        roomRef.current.leave();
      }
    };
  }, []);

  // Place a bet on the selected horse
  const placeBet = () => {
    if (selectedHorse !== null && roomRef.current) {
      roomRef.current.send('placeBet', { horseIndex: selectedHorse });
      setGameStatus(`Bet placed on Horse ${selectedHorse + 1}`);
    }
  };

  // Start the race
  const startRace = () => {
    if (roomRef.current) {
      roomRef.current.send('startRace');
      setGameStatus('Race in progress...');
    }
  };

  return (
    <div className="horse-racing-container">
      <div className="controls">
        <button
          onClick={placeBet}
          disabled={selectedHorse === null}
          className="bet-button"
        >
          Place Bet on Horse {selectedHorse !== null ? selectedHorse + 1 : ''}
        </button>
        <button onClick={startRace} className="start-button">
          Start Race
        </button>
      </div>
      <div className="game-status">{gameStatus}</div>
      <div id="game-container" className="game-area" />
      <div className="bets-table">
        <table>
          <thead>
            <tr>
              <th>Client ID</th>
              <th>Horse</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet, index) => (
              <tr key={index}>
                <td>{bet.clientId}</td>
                <td>Horse {bet.horseIndex + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HorseRacingGame;