// Initialize Express App
const express = require('express');
const cors = require('cors');
const app = express();

// Configure CORS
const corsOption = {
    origin: "*",
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOption));
app.use(express.json());

// Initialize Firebase with Admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('./baconwor-firebase-adminsdk-fbsvc-7d07e30f6d.json');

admin.initializeApp({
credential: admin.credential.cert(serviceAccount),
});
  
const db = admin.firestore();

// Firestore Constants
// Secret Word
const DAILY_WORD_COLLECTION = "daily_word";
const DAILY_WORD_FIELD = "answer";
// User Stats
const USERS_COLLECTION = "users";
// Game State
const GAME_STATE_COLLECTION = "game_state";

// Format date to YYYY-MM-DD
function getFormattedDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// GET THE SECRET WORD
app.get("/get-daily-word", async (req, res) => {
    try {
        let dateReceived = req.query.date;
        let currentDate = getFormattedDate();

        if (dateReceived) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateReceived)) {
                return res.status(400).json({
                    message: "Invalid date format. Use YYYY-MM-DD."
                });
            }
        }
        else {
            dateReceived = currentDate; // Use today's date if no date is provided
        }

        const doc = await db.collection(DAILY_WORD_COLLECTION).doc(dateReceived).get();

        if (!doc.exists) {
            return res.status(404).json({
                message: "No word found"
            })
        }

        const answer = doc.data()[DAILY_WORD_FIELD];

        if (!answer) {
            return res.status(404).json({
                message: "No word found"
            });
        }

        res.json({
            answer: answer
        });
    } catch (error) {
        console.error("Error fetching word:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// STORE USER DATA
// Get Firebase ID token - heh
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({message: 'Unauthorized' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// API ENDPOINT TO STORE USER DATA
app.post("/store-user-data", verifyToken, async (req, res) =>{
    try {
        const userID = req.user.uid;
        const { result } = req.body;

        if (!result || typeof result.win !== 'boolean' || !result.guessCount || !result.date) {
            return res.status(400).json({ message: "Missing required fields" });
        };

        const userRef = db.collection(USERS_COLLECTION).doc(userID);
        const userDoc = await userRef.get();

        // Init stats schema
        let stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            winPercentage: 0,
            currentStreak: 0,
            highestStreak: 0,
            guessDistribution: {
                1:0,
                2:0,
                3:0,
                4:0,
                5:0,
                6:0
            },
            lastPlayedDate: null
        }

        if (userDoc.exists && userDoc.data().stats) {
            stats = userDoc.data().stats;
        }

        // Update stats -> Lose/Win = Game Played
        stats.gamesPlayed += 1;

        // Update wins, winstreak and guess distribution
        if (result.win) {
            stats.gamesWon += 1;

            // Use guess count
            if (result.guessCount >= 1 && result.guessCount <= 6) {
                stats.guessDistribution[result.guessCount] += 1;
            } 

            const today = result.date;
            const lastPlayedDate = stats.lastPlayedDate;

            if (lastPlayedDate) {
                const formattedLastDate = new Date(lastPlayedDate);
                const formattedToday = new Date(today);

                if (Math.floor((formattedToday - formattedLastDate) / (1000 * 60 * 60 * 24)) === 1) {
                    stats.currentStreak += 1;
                } else {
                    stats.currentStreak = 1;
                }

                stats.highestStreak = Math.max(stats.highestStreak, stats.currentStreak);
            } else {
                stats.currentStreak = 1;
            }
        } else {
            stats.currentStreak = 0;
        }

        stats.winPercentage = Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
        stats.lastPlayedDate = result.date;

        await userRef.set({ stats }, { merge: true });

        res.json ({
            message: "User stats updated successfully",
            stats: stats
        });
    } catch (error) {
        console.error("Error storing user stats:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});


// API ENDPOINT TO GET UESER DATA
app.get("/get-user-data", verifyToken, async (req, res) => {
    try {
        const userID = req.user.uid;
        const userData = await db.collection(USERS_COLLECTION).doc(userID).get();

        // No User: Return empty stat sheet
        if (!userData.exists) {
            return res.json({
                stats: {
                    gamesPlayed: 0,
                    gamesWon: 0, 
                    winPercentage: 0,
                    currentStreak: 0,
                    highestStreak: 0,
                    guessDistribution: {
                        1: 0,
                        2: 0,
                        3: 0,
                        4: 0,
                        5: 0,
                        6: 0,
                    },
                    lastPlayedDate: null
                }
            });
        }
        else {
            const stats = userData.data().stats;

            res.json({
                stats: stats || {}
            });
        }

    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
})


// API ENDPOINT TO STORE TODAY'S GAME STATE
app.post('/store-today-game-state', verifyToken, async(req, res) => {
    try {
        const userID = req.user.uid;
        const userGameStateRef = await db.collection(GAME_STATE_COLLECTION).doc(userID);

        const { status, gameGrid, date, currentRow } = req.body;

        // Store data by date (YYYY-MM-DD)
        await userGameStateRef.set({
            [date]: {
                status,
                gameGrid,
                currentRow,
            }
        }, { merge: true });
        
        res.json({
            message: "Game state stored successfully"
        });
    } catch (error) {
        console.error("Error storing game state:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
})

// API ENDPOINT TO RETRIEVE TODAY'S GAME STATE
app.get('/get-today-game-state', verifyToken, async (req, res) => {
    try {
        const userID = req.user.uid;
        const date = req.query.date;

        if (!date) {
            return res.status(400).json ({message : "Date query parameter is required"});
        }

        const userGameStateRef = await db.collection(GAME_STATE_COLLECTION).doc(userID).get();

        // Empty game state if it doesn't exist
        if (!userGameStateRef.exists) {
            return {
                [date]: {
                    status: "",
                    gameGrid: [],
                    currentRow: 0
                }
            }
        }

        const gameStateData = userGameStateRef.data();

        if (!gameStateData[date]) {
            return {
                [date]: {
                    status: "",
                    gameGrid: [],
                    currentRow: 0
                }
            }
        }


        res.json(gameStateData[date]);
    } catch (error) {
        console.error("Error retrieving today's game state:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})

const PORT = 3000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});