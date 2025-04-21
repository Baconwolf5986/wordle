import { useEffect, useState } from 'react';
import '../App.css';

function Tile({ letter, correctness}) {
    return (
        <div className={`tile ${correctness}`}>
            {letter.toUpperCase()}
        </div>
    )
}

export default Tile;