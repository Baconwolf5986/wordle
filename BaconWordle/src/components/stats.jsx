import { getUserStats } from '../firebase/backend-communication';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Login from './login.jsx';

function Stats({ setStatsVisible }) {
    const { currentUser, logOut } = useAuth();

    const [userStats, setUserStats] = useState(null);

    // Get user stats from firebase
    useEffect(() => {
        const fetchUserStats = async () => {
            if (currentUser) {
                try {
                    const stats = await getUserStats(currentUser);
                    setUserStats(stats.stats);
                    console.log("User stats fetched:", stats);
                } catch (error) {
                    console.error("Error fetching user stats:", error);
                }
            }
        };

        fetchUserStats();
    }, [currentUser]);

    return (
        <div className="stats-container">
            <button onClick={() => setStatsVisible(false)} className="close-button">X</button>
            {!currentUser ? (
                <Login />
            ) : (
                <div>

                    <h2 className="header">Statistics</h2>
                    {userStats ? (
                        <div className="stats-content">
                            <div className="stats-header">
                                <div>Games Played</div>
                                <div>Games Won</div>
                                <div>Win Percentage</div>
                                <div>Current Streak</div>
                            </div>
                            <div className="stats-details">
                                <div>{userStats.gamesPlayed}</div>
                                <div>{userStats.gamesWon}</div>
                                <div>{userStats.winPercentage}%</div>
                                <div>{userStats.currentStreak}</div>
                            </div>
                            <h3>Guess Distribution:</h3>
                                {Object.entries(userStats.guessDistribution).map(([guess, count]) => (
                                    <li key={guess}>
                                        {guess} Guess{count > 1 ? 'es' : ''}: {count}
                                    </li>
                                ))}
                            <button onClick={logOut} className="logout-button">
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <p>Loading stats...</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default Stats;