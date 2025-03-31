import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Client } from "colyseus.js";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, getFirestore } from "firebase/firestore";
import "../HorseRacingGame.css";

const db = getFirestore();

const HorseRacingGame = () => {
  const gameRef = useRef(null);
  const roomRef = useRef(null);
  const [selectedHorse, setSelectedHorse] = useState(null);
  const [betAmount, setBetAmount] = useState(100);
  const [bets, setBets] = useState([]);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [horseStats, setHorseStats] = useState([]);
  const [playerCredits, setPlayerCredits] = useState(1000);
  const [raceResult, setRaceResult] = useState(null);
  const { roomId } = useParams();

  useEffect(() => {
    const client = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`);

    const connectToRoom = async () => {
      try {
        const playerId = localStorage.getItem("firebaseIdToken");
        const userRef = doc(db, "users", playerId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().isInGame) {
          console.log("Player is already in a game.");
          window.location.href = "/";
          return;
        }

        await updateDoc(userRef, { isInGame: true });
        const room = await client.joinOrCreate("horse_racing", {
          playerId: playerId || "anonymous",
        });

        roomRef.current = room;

        room.state.players.onAdd = (player, sessionId) => {
          if (sessionId === room.sessionId) setPlayerCredits(player.totalCredits);
        };

        // Sync player credits
        room.state.players.onAdd = (player, sessionId) => {
          if (sessionId === room.sessionId) setPlayerCredits(player.totalCredits);
        };

        // Sync bets from server state
        room.state.bets.onAdd = (betStr, clientId) => {
          const bet = JSON.parse(betStr);
          setBets((prev) => [
            ...prev.filter((b) => b.clientId !== clientId),
            { clientId, horseIndex: bet.horseIndex, amount: bet.amount },
          ]);
        };

        room.state.bets.onRemove = (betStr, clientId) => {
          setBets((prev) => prev.filter((b) => b.clientId !== clientId));
        };

        room.onStateChange((state) => {
          if (gameRef.current) {
            state.horses.forEach((horse, index) => {
              const gameHorse = gameRef.current.scene.scenes[0].children.list.find(
                (obj) => obj.getData("horseIndex") === index
              );
              if (gameHorse) {
                gameHorse.x = horse.x;
                gameHorse.setTint(parseInt(horse.color.replace("#", ""), 16));
                horse.speed > 0 ? gameHorse.anims.play("gallop", true) : gameHorse.anims.pause();
              }
            });
            setGameStatus(state.gamePhase);
          }
        });

        room.send("getHorseStats");
        room.onMessage("horseStats", setHorseStats);

        room.onMessage("betPlaced", (data) => {
          setBets((prev) => [
            ...prev.filter((b) => b.clientId !== data.sessionId),
            { clientId: data.sessionId, horseIndex: data.horseIndex, amount: data.amount },
          ]);
          if (data.sessionId === room.sessionId) setPlayerCredits((prev) => prev - data.amount);
        });

        room.onMessage("raceResult", (message) => {
          setRaceResult(message);
          if (message.payouts[room.sessionId]?.won) {
            setPlayerCredits((prev) => prev + message.payouts[room.sessionId].amount);
          }
        });

        room.onMessage("raceReset", (message) => {
          setBets([]);
          setRaceResult(null);
          setSelectedHorse(null);
          setHorseStats(message.horseStats);
          setGameStatus("waiting");
        });

        room.onMessage("playerJoin", (message) => {
          if (message.sessionId === room.sessionId) {
            setPlayerCredits(message.totalCredits);
            setHorseStats(message.horseStats);
          }
        });
      } catch (error) {
        console.error("Could not connect to room:", error);
      }
    };

    const config = {
      type: Phaser.AUTO,
      parent: "game-container",
      width: 800,
      height: 400,
      backgroundColor: "#7cba3d",
      scene: {
        preload() {
          this.load.spritesheet("horse", "/horse_run_cycle.png", {
            frameWidth: 82,
            frameHeight: 66,
          });
        },
        create() {
          this.anims.create({
            key: "gallop",
            frames: this.anims.generateFrameNumbers("horse", { start: 0, end: 4 }),
            frameRate: 12,
            repeat: -1,
          });

          for (let i = 0; i < 5; i++) {
            this.add.line(0, (i + 1) * 80, 0, 0, 800, 0, 0xffffff).setLineWidth(2).setOrigin(0);
            const horse = this.add
              .sprite(50, (i + 1) * 80 - 40, "horse")
              .setInteractive()
              .setData("horseIndex", i);
            horse.anims.play("gallop");
            horse.anims.pause();
            horse.on("pointerdown", () => setSelectedHorse(i));
            this.add.text(10, (i + 1) * 80 - 40, `Horse ${i + 1}`, {
              color: "#000",
              fontSize: "16px",
            });
          }
          this.add.rectangle(700, 200, 10, 400, 0xffffff);
        },
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    connectToRoom();

    return () => {
      game.destroy(true);
      roomRef.current?.leave();
    };
  }, []);

  const placeBet = () => {
    if (selectedHorse === null || betAmount <= 0 || !roomRef.current) return;
    if (playerCredits < betAmount) {
      setGameStatus("Insufficient credits!");
      return;
    }
    roomRef.current.send("placeBet", { horseIndex: selectedHorse, amount: betAmount });
    setGameStatus(`Bet placed on Horse ${selectedHorse + 1} for $${betAmount}`);
  };

  const startRace = () => {
    if (roomRef.current) {
      roomRef.current.send("startRace");
      setGameStatus("Race in progress...");
    }
  };

  return (
    <div className="horse-racing-container">
      <header className="controls">
        <div className="credits">Credits: ${playerCredits}</div>
        <div className="bet-section">
          <select
            value={selectedHorse ?? ""}
            onChange={(e) => setSelectedHorse(parseInt(e.target.value) || null)}
            disabled={gameStatus !== "waiting"}
          >
            <option value="">Select Horse</option>
            {horseStats.map((horse) => (
              <option key={horse.id} value={horse.id}>
                Horse {parseInt(horse.id) + 1} (Odds: {horse.odds})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
            disabled={gameStatus !== "waiting"}
          />
          <button
            onClick={placeBet}
            disabled={selectedHorse === null || gameStatus !== "waiting"}
            className="bet-button"
          >
            Place Bet
          </button>
          <button
            onClick={startRace}
            disabled={gameStatus !== "waiting"}
            className="start-button"
          >
            Start Race
          </button>
        </div>
      </header>
      <section className="game-status">{gameStatus}</section>
      <main id="game-container" className="game-area" />
      <footer className="info-section">
        <div className="horse-stats">
          <h3>Horse Stats</h3>
          <table>
            <thead>
              <tr>
                <th>Horse</th>
                <th>Stamina</th>
                <th>Accel.</th>
                <th>Consist.</th>
                <th>Odds</th>
              </tr>
            </thead>
            <tbody>
              {horseStats.map((horse) => (
                <tr key={horse.id}>
                  <td>Horse {parseInt(horse.id) + 1}</td>
                  <td>{horse.stats.stamina.toFixed(2)}</td>
                  <td>{horse.stats.acceleration.toFixed(2)}</td>
                  <td>{horse.stats.consistency.toFixed(2)}</td>
                  <td>{horse.odds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bets-table">
          <h3>Bets</h3>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Horse</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((bet, index) => (
                <tr key={index}>
                  <td>{roomRef.current?.state.players.get(bet.clientId)?.name || "Anonymous"}</td>
                  <td>Horse {bet.horseIndex + 1}</td>
                  <td>${bet.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {raceResult && (
          <div className="race-result">
            <h3>Race Results</h3>
            <p>Winner: Horse {parseInt(raceResult.winners[0]) + 1}</p>
            {raceResult.payouts[roomRef.current?.sessionId] && (
              <p>
                You {raceResult.payouts[roomRef.current.sessionId].won ? "won" : "lost"}: $
                {raceResult.payouts[roomRef.current.sessionId].amount}
              </p>
            )}
          </div>
        )}
      </footer>
    </div>
  );
};

export default HorseRacingGame;