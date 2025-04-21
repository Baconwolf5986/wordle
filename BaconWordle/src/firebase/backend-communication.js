import axios from 'axios'
import { auth } from './firebase.js';
const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_BASE_URL;

// Current date helper
export function getCurrentDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// GET THE SECRET WORD FROM SERVER
export const getDailyWord = async (date = null) => {
    try {
        const config = {
            params: {}
        };

        if (date) {
            config.params.date = date;
        }

        const res = await axios.get(`${API_BASE_URL}/get-daily-word`, config);
        const answer = res.data.answer;

        return answer;
    } catch (error) {
        console.log("Error fetching word", error);
        throw error;
    }
}

// STORE USER STATS IN FIRESTORE
export async function storeUserStats(result, currentUser) {
    try {
        const token = currentUser ? await currentUser.getIdToken() : null;
        const response = await axios.post(`${API_BASE_URL}/store-user-data`, { result }, {
            headers: {
                "Authorization": `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error storing user stats:", error);
        throw error;
    }
}

// GET USER STATS FROM FIRESTORE
export async function getUserStats(currentUser) {
    try {
        const token = currentUser ? await currentUser.getIdToken() : null;
        const response = await axios.get(`${API_BASE_URL}/get-user-data`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    }   catch (error) {
        console.error("Error fetching user stats:", error);
        throw error;
    }
}

// STORE TODAY'S GAME STATE IN FIRESTORE
export async function storeTodayGameState(status, gameGrid, date, currentUser, currentRow) {
    try {
        const token = currentUser ? await currentUser.getIdToken() : null;

        // Fix grid for Firestore
        const formattedGrid = gameGrid.flatMap((row, rowIndex) =>
            row.map((cell, colIndex) => ({
                letter: cell.letter,
                correctness: cell.correctness,
                row: rowIndex,
                column: colIndex
            }))
        );

        console.log("Storing game state:", { 
            status, 
            gameGrid: formattedGrid, 
            date, 
            currentRow, 
        }, currentUser);

        const response = await axios.post(`${API_BASE_URL}/store-today-game-state`, { 
            status, 
            gameGrid: formattedGrid, 
            date, 
            currentRow, 
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error storing today's game:", error);
        throw error;
    }
}

// GET TODAY'S GAME STATE FROM FIRESTORE
export async function getTodayGameState(date, currentUser) {
    try {
      const token = currentUser ? await currentUser.getIdToken() : null;
      const response = await axios.get(`${API_BASE_URL}/get-today-game-state`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { date }
      });
  
      // Reformat in app
      return response.data;
          
    } catch (error) {
      console.error("Error fetching today's game state:", error);
      throw error;
    }
  }