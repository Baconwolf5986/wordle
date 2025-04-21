import '../App.css';

function Keyboard({ grid, handleInputChange, handleEnter, deleteLastInput }) {

    // Change class of letter based on correctness from grid
    const keyClass = (letter) => {
        const letterLower = letter.toLowerCase();
    
        for (const row of grid) {
            for (const cell of row) {
                if (cell.letter.toLowerCase() === letterLower) {
                    return `key ${cell.correctness}`;
                }
            }
        }
       return 'key';
    };

    // QWERRTYUIOP
    // ASDFGHJKL
    // (ENTER) ZXCVMN (BACKSPACE)
    return (
        <div className="keyboard-container">
            <div className="keyboard-row">
                {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(letter => (
                    <div 
                        key={letter} 
                        className={keyClass(letter)}
                        onClick={() => handleInputChange(letter)}
                    >
                        {letter}
                    </div>
                ))}
            </div>
            <div className="keyboard-row">
                {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(letter => (
                    <div 
                        key={letter} 
                        className={keyClass(letter)}
                        onClick={() => handleInputChange(letter)}
                    >
                        {letter}
                    </div>
                ))}
            </div>
            <div className="keyboard-row">
                <div 
                    className="key special-key"
                    onClick={() => handleEnter()}
                >
                    ENTER
                </div>
                {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(letter => (
                    <div 
                        key={letter} 
                        className={keyClass(letter)}
                        onClick={() => handleInputChange(letter)}
                    >
                        {letter}
                    </div>
                ))}
                <div 
                    className="key special-key"
                    onClick={() => deleteLastInput()}
                >
                    <img src="/backspace.svg" className="backspace-button" alt="Backspace" />
                </div>
            </div>
        </div>
    );
}

export default Keyboard;