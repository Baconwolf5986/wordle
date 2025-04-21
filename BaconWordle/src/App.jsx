import { useState, useEffect } from 'react';
import { wordSet } from './data/formatted-word-set.js';
import {
  getDailyWord,
  getCurrentDate,
  storeUserStats,
  storeTodayGameState,
  getTodayGameState,
} from './firebase/backend-communication.js';
import { useAuth } from './context/AuthContext.jsx';
import Tile from './components/tile.jsx';
import Stats from './components/stats.jsx';
import Keyboard from './components/keyboard.jsx';
import './App.css';

function App() {
  const { currentUser } = useAuth();
  const rows = 6;
  const columns = 5;

  // Initial empty grid state
  // row x columns
  // Each inter
  const createEmptyGrid = () => {
    return Array(rows)
      .fill()
      .map(() =>
        Array(columns).fill({
          letter: '',
          correctness: null,
        })
      );
  };

  // SET VARIABLES
  const [grid, setGrid] = useState(createEmptyGrid);
  const [currentInput, setCurrentInput] = useState('');
  const [currentRow, setCurrentRow] = useState(0);
  const [currentColumn, setCurrentColumn] = useState(0);
  const [inputLocked, setInputLocked] = useState(false);
  const [secretWord, setSecretWord] = useState(null);
  const [status, setStatus] = useState('');
  const [statsVisible, setStatsVisible] = useState(false);
  const [isKeyPressed, setIsKeyPressed] = useState(false);

  // Load game state when the component mounts
  // Load game state when the user logs in or out
  useEffect(() => {
    const currentDate = getCurrentDate();
    const storedDate = localStorage.getItem('current-date');
    
    // Reset game state if it's a new day
    if (storedDate !== currentDate) {
      localStorage.setItem('current-date', currentDate);
      localStorage.removeItem('wordle-grid');
      localStorage.removeItem('current-row');
      localStorage.removeItem('status');
      
      // Set the game to initial
      setGrid(createEmptyGrid());
      setCurrentRow(0);
      setCurrentColumn(0);
      setCurrentInput('');
      setStatus('');
    } else {
      // Load existing game state based on whether user is logged in
      loadGameState();
    }
    
    // Fetch secret word for the day
    const fetchSecretWord = async () => {
      try {
        const word = await getDailyWord(currentDate);
        setSecretWord(word);
      } catch (error) {
        console.error('Error fetching secret word:', error);
      }
    };
    
    fetchSecretWord();
  }, []);

  useEffect(() => {
    loadGameState();
  }, [currentUser]);

  // HELPER FUNCTION TO LOAD GAME STATE
  // If user is logged in, fetch from Firebase; otherwise, use localStorage
  const loadGameState = async () => {
    const currentDate = getCurrentDate();
    
    // CASE: LOGGED IN
    if (currentUser) {
      try {
        const gameState = await getTodayGameState(currentDate, currentUser);
        
        if (gameState && gameState.gameGrid && gameState.gameGrid.length > 0) {
          console.log("Today's game state found in Firebase:", gameState);
          
          // Convert the flat array to grid format
          const formattedGrid = createEmptyGrid();
          
          gameState.gameGrid.forEach((tile) => {
            if (tile.row < rows && tile.column < columns) {
              formattedGrid[tile.row][tile.column] = {
                letter: tile.letter || '',
                correctness: tile.correctness || null,
              };
            }
          });
          
          setGrid(formattedGrid);
          setInputLocked(gameState.inputLocked || false);
          setCurrentRow(gameState.currentRow || 0);
          setCurrentColumn(getColumnPosition(formattedGrid[gameState.currentRow || 0]));
          setStatus(gameState.status || '');
          setCurrentInput(getCurrentRowInput(formattedGrid[gameState.currentRow || 0]));
        } else {
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error("Error fetching game state from Firebase:", error);
        loadFromLocalStorage();
      }
    // CASE: NOT LOGGED IN
    } else {
      loadFromLocalStorage();
    }
  };

  // Function to load game state from localStorage
  const loadFromLocalStorage = () => {
    const savedGrid = localStorage.getItem('wordle-grid');
    const savedRow = localStorage.getItem('current-row');
    const savedStatus = localStorage.getItem('status');
    
    if (savedGrid) {
      const parsedGrid = JSON.parse(savedGrid);
      setGrid(parsedGrid);
      
      const rowIndex = savedRow ? parseInt(savedRow, 10) : 0;
      setCurrentRow(rowIndex);
      
      // Calculate currentColumn based on the current row's content
      const colIndex = getColumnPosition(parsedGrid[rowIndex]);
      setCurrentColumn(colIndex);
      
      // Build current input from the current row
      const rowInput = getCurrentRowInput(parsedGrid[rowIndex]);
      setCurrentInput(rowInput);
      
      if (savedStatus) {
        setStatus(savedStatus);
      }
    } else {
      // No localStorage data found, start fresh
      setGrid(createEmptyGrid());
      setCurrentRow(0);
      setCurrentColumn(0);
      setCurrentInput('');
      setStatus('');
    }
  };

  // Helper: Find column in the row
  const getColumnPosition = (row) => {
    for (let i = 0; i < columns; i++) {
      if (i === columns - 1 && row[i].letter !== '') {
        return columns;
      }
      if (row[i].letter === '') {
        return i;
      }
    }
    return 0;
  };

  // Helper: Find current input
  const getCurrentRowInput = (row) => {
    return row.map(tile => tile.letter).join('');
  };

  // Save current game state through reloads
  const saveGameState = () => {
    // Store in localStorage
    localStorage.setItem('wordle-grid', JSON.stringify(grid));
    localStorage.setItem('current-row', currentRow.toString());
    if (status) {
      localStorage.setItem('status', status);
    }
    
    // If logged in, save to Firebase
    if (currentUser) {
      storeTodayGameState(
        status,
        grid,
        getCurrentDate(),
        currentUser,
        currentRow
      ).catch(error => {
        console.error("Error saving to Firebase:", error);
      });
    }
  };

  // FOR: Typing letters
  function handleInputChange(input_letter) {
    if (inputLocked || status || currentColumn >= columns) return;
    
    const newGrid = [...grid];
    newGrid[currentRow][currentColumn] = {
      letter: input_letter,
      correctness: null,
    };
    
    setGrid(newGrid);
    setCurrentInput(currentInput + input_letter);
    setCurrentColumn(currentColumn + 1);
  }

  // FOR: Backspace 
  function deleteLastInput() {
    if (inputLocked || status || currentColumn <= 0) return;
    
    const newGrid = [...grid];
    newGrid[currentRow][currentColumn - 1] = {
      letter: '',
      correctness: null,
    };
    
    setGrid(newGrid);
    setCurrentInput(currentInput.slice(0, -1));
    setCurrentColumn(currentColumn - 1);
    
  }

  // FOR: Enter key
  function handleEnter() {
    if (!secretWord || inputLocked || status || currentInput.length !== columns) return;
    
    if (wordSet.has(currentInput.toLowerCase())) {
      setInputLocked(true);
      
      // Check row for correctness
      for (let i = 0; i < columns; i++) {
        setTimeout(() => {
          setTimeout(() => {
            const newGrid = [...grid];
            const guessedLetter = currentInput[i];
            const secretLetters = secretWord.split('');
            
            if (guessedLetter === secretLetters[i]) {
              newGrid[currentRow][i] = {
                letter: guessedLetter,
                correctness: 'correct',
              };
            } else if (secretLetters.includes(guessedLetter)) {
              newGrid[currentRow][i] = {
                letter: guessedLetter,
                correctness: 'present',
              };
            } else {
              newGrid[currentRow][i] = {
                letter: guessedLetter,
                correctness: 'none',
              };
            }
            
            setGrid(newGrid);
            
            // Save game state after the row is checked
            if (i === columns - 1) {
              setTimeout(() => saveGameState(), 0);
              setTimeout(() => checkWin(), 500);
            }
          }, 500);
        }, i * 500);
      }
    } else {
      alert('Not a valid word!');
      // Clear current input
      const newGrid = [...grid];
      for (let i = 0; i < columns; i++) {
        newGrid[currentRow][i] = {
          letter: '',
          correctness: null,
        };
      }
      
      setGrid(newGrid);
      setCurrentInput('');
      setCurrentColumn(0);
    }
  }

  // GAME STATE
  function checkWin() {
    let newStatus = '';
    
    // IF: WORD = SECRET WORD
    if (currentInput.toLowerCase() === secretWord.toLowerCase()) {
      alert('You win!');
      newStatus = 'win';
      saveUserStats(true, currentRow + 1);
    } else {
      const newRow = currentRow + 1;
      // IF: NO MORE GUESSES LEFT
      if (newRow >= rows) {
        alert(`You lose! The word was: ${secretWord}`);
        newStatus = 'lose';
        saveUserStats(false, rows);
      } else {
        setCurrentRow(newRow);
        setCurrentColumn(0);
        setCurrentInput('');
        setInputLocked(false);
        
        // Save the game state after checking win/lose
        setTimeout(() => {
          localStorage.setItem('current-row', newRow.toString());
          if (currentUser) {
            storeTodayGameState(
              '',
              grid,
              getCurrentDate(),
              currentUser,
              newRow
            ).catch(error => {
              console.error("Error saving to Firebase:", error);
            });
          }
        }, 0);
        
        return;
      }
    }
    
    // Update status
    setStatus(newStatus);
    localStorage.setItem('status', newStatus);
    
    // Save final game state to Firebase if user is logged in
    if (currentUser) {
      storeTodayGameState(
        newStatus,
        grid,
        getCurrentDate(),
        currentUser,
        currentRow
      ).catch(error => {
        console.error("Error saving to Firebase:", error);
      });
    }
  }

  // Save user stats
  const saveUserStats = async (win, guessCount) => {
    if (currentUser) {
      try {
        const result = {
          date: getCurrentDate(),
          win: win,
          guessCount: guessCount,
        };
        await storeUserStats(result, currentUser);
      } catch (error) {
        console.error('Error storing user stats:', error);
      }
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const whenKeyPressed = (event) => {
      if (isKeyPressed || status) return;
      setIsKeyPressed(true);
      
      if (event.key.length === 1 && /^[a-zA-Z]$/.test(event.key)) {
      // TYPING LETTERS
        console.log(`Key pressed: ${event.key}`, currentRow, currentColumn, `status: ${status}`, `inputLocked: ${inputLocked}`);
        handleInputChange(event.key.toUpperCase());
      } else if (event.key === 'Backspace') {
      // BACKSPACE/DELETE
        deleteLastInput();
      } else if (event.key === 'Enter') {
      // ENTER
        handleEnter();
      }
      
      setTimeout(() => setIsKeyPressed(false), 50);
    };
    
    window.addEventListener('keydown', whenKeyPressed);
    return () => {
      window.removeEventListener('keydown', whenKeyPressed);
    };
  }, [isKeyPressed, status, inputLocked, currentInput, grid, currentRow, currentColumn]);

  // Toggle stats visibility
  function handleStatsButton() {
    setStatsVisible(!statsVisible);
  }

  // RENDER GRID
  // Each portion
  const renderGrid = () => (
    <div className="grid">
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          {row.map((tile, colIndex) => (
            <Tile
              key={`${rowIndex}-${colIndex}`}
              letter={tile.letter}
              correctness={tile.correctness}
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="app">
      <img src="/stats.svg" className="stats-button" onClick={handleStatsButton} alt="Statistics" />
      {statsVisible && 
        <Stats 
          setStatsVisible={setStatsVisible} 
        />
      }
      {renderGrid()}
      <Keyboard 
        grid={grid}
        handleEnter={handleEnter}
        handleInputChange={handleInputChange}
        deleteLastInput={deleteLastInput}
      />
    </div>
  );
}

export default App;