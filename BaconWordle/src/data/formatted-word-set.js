import words from './5-letter-words.json';

export const wordSet = new Set(words.map(word => word.toLowerCase()));