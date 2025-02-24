// Initialize board immediately without waiting for SQL
const BONUS_PROBABILITY = 0.15;
const BOARD_SIZE = 15;
const LETTER_POOL = {
    A:9, B:2, C:2, D:4, E:12, F:2, G:3, H:2, I:9, J:1, K:1, L:4, M:2,
    N:6, O:8, P:2, Q:1, R:6, S:4, T:6, U:4, V:2, W:2, X:1, Y:2, Z:1
};

import { Trie } from './trie.js';

class Game {
    constructor() {
        this.board = Array(BOARD_SIZE).fill().map(() => 
            Array(BOARD_SIZE).fill(null));
        this.bonuses = this.generateBonuses();
        this.tray = [];
        this.totalScore = 0;
        this.letterPool = this.initializeLetterPool();  // Initialize the letter pool first
        this.initBoard();
        this.dictionary = new Trie();
        this.selectedTiles = new Set();
        this.currentTurn = [];
        this.drawTiles(7);  // Draw tiles last, after everything is initialized
    }

    generateBonuses() {
        return Array(BOARD_SIZE).fill().map(() => 
            Array(BOARD_SIZE).fill().map(() => 
                Math.random() < BONUS_PROBABILITY ? 
                ['2L','3L','2W','3W'][Math.floor(Math.random()*4)] : null
            ));
    }

    initBoard() {
        const boardEl = document.getElementById('board');
        boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, var(--cell-size))`;
        
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                const bonus = this.bonuses[y][x];
                if (bonus) {
                    cell.className += ' bonus';
                    cell.dataset.bonus = bonus;
                }
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.ondragover = (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    cell.classList.add('dragover');
                };
                cell.ondrop = (e) => {
                    e.preventDefault();
                    cell.classList.remove('dragover');
                    const data = e.dataTransfer.getData('text/plain');
                    if (data.startsWith('board:')) {
                        // Moving from another board position
                        const [oldX, oldY] = data.substring(6).split(',').map(Number);
                        this.moveTile(oldX, oldY, x, y);
                    } else {
                        // Moving from tray
                        const tileIndex = parseInt(data);
                        this.placeTile(x, y, tileIndex);
                    }
                };
                cell.ondragleave = () => {
                    cell.classList.remove('dragover');
                };
                boardEl.appendChild(cell);
            }
        }
    }

    initializeLetterPool() {
        // Create a fresh array of all available letters
        const pool = [];
        for (const [letter, count] of Object.entries(LETTER_POOL)) {
            for (let i = 0; i < count; i++) {
                pool.push(letter);
            }
        }
        return pool;
    }

    drawTiles(count) {
        // Replenish the letter pool if it's running low
        if (this.letterPool.length < count) {
            console.debug('Replenishing letter pool');
            this.letterPool = this.initializeLetterPool();
        }
        
        // Draw tiles until we have the requested number or the pool is empty
        while (this.tray.length < count && this.letterPool.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.letterPool.length);
            const letter = this.letterPool.splice(randomIndex, 1)[0];
            console.debug('Drawing letter:', letter);
            this.tray.push(letter);
        }
        
        console.debug('Tray after drawing:', this.tray);
        this.renderTray();
    }

    renderTray() {
        const trayEl = document.getElementById('tray');
        trayEl.innerHTML = '';
        this.tray.forEach((letter, index) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            if (this.selectedTiles.has(index)) {
                tile.className += ' selected';
            }
            const letterSpan = document.createElement('span');
            letterSpan.textContent = letter;
            tile.appendChild(letterSpan);
            
            const pointSpan = document.createElement('span');
            pointSpan.className = 'points';
            pointSpan.textContent = this.getLetterScore(letter);
            tile.appendChild(pointSpan);
            
            tile.draggable = true;
            tile.ondragstart = (e) => {
                if (!this.selectedTiles.has(index)) {
                    this.selectedTiles.clear(); // Clear other selections when dragging unselected tile
                }
                e.dataTransfer.setData('text/plain', index.toString());
                e.dataTransfer.effectAllowed = 'move';
            };
            tile.onclick = () => this.selectTile(index);
            trayEl.appendChild(tile);
        });
    }

    selectTile(index) {
        if (this.selectedTiles.has(index)) {
            this.selectedTiles.delete(index);
        } else {
            this.selectedTiles.add(index);
        }
        this.renderTray();
    }

    placeTile(x, y, tileIndex = null) {
        // If no specific tile index provided, use the only selected tile
        if (tileIndex === null) {
            if (this.selectedTiles.size !== 1) {
                console.debug('Must have exactly one tile selected for placement');
                return;
            }
            tileIndex = Array.from(this.selectedTiles)[0];
        }
        
        if (this.board[y][x] || tileIndex >= this.tray.length) {
            console.debug('Tile placement blocked');
            return;
        }
        
        const letter = this.tray.splice(tileIndex, 1)[0];
        console.debug('Placing tile:', letter, 'at position:', x, y);
        
        const tile = document.createElement('div');
        tile.className = 'tile placed';
        
        // Create letter span
        const letterSpan = document.createElement('span');
        letterSpan.textContent = letter;
        tile.appendChild(letterSpan);
        
        // Create points span
        const pointSpan = document.createElement('span');
        pointSpan.className = 'points';
        const points = this.getLetterScore(letter);
        pointSpan.textContent = points;
        tile.appendChild(pointSpan);
        
        // Make current turn tiles draggable
        tile.draggable = true;
        tile.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', `board:${x},${y}`);
            e.dataTransfer.effectAllowed = 'move';
        };
        tile.onclick = () => this.withdrawTile(x, y);
        
        this.board[y][x] = letter;
        
        const cell = document.querySelector(`#board .cell:nth-child(${y * BOARD_SIZE + x + 1})`);
        cell.appendChild(tile);
        
        this.currentTurn.push({ x, y, letter });
        this.selectedTiles.clear();
        this.renderTray();
        this.updatePlayButton();
        
        console.debug('Current board state:', this.board.map(row => row.join(' ')).join('\n'));
    }

    withdrawTile(x, y) {
        const tileIndex = this.currentTurn.findIndex(tile => tile.x === x && tile.y === y);
        if (tileIndex === -1) {
            console.debug('Cannot withdraw tile not placed in current turn');
            return;
        }

        const tile = this.currentTurn[tileIndex];
        this.tray.push(tile.letter);
        this.board[y][x] = null;
        
        const cell = document.querySelector(`#board .cell:nth-child(${y * BOARD_SIZE + x + 1})`);
        cell.innerHTML = '';
        
        this.currentTurn.splice(tileIndex, 1);
        this.renderTray();
        this.updatePlayButton();
    }

    updatePlayButton() {
        const button = document.querySelector('button');
        button.textContent = this.currentTurn.length > 0 ? 'Play' : 'End Turn';
    }

    tradeTiles() {
        if (this.currentTurn.length > 0) {
            console.debug('Cannot trade tiles after placing tiles');
            return;
        }
        
        if (this.selectedTiles.size === 0) {
            console.debug('No tiles selected for trade');
            return;
        }
        
        // Remove selected tiles from highest index to lowest and return them to the pool
        const selectedIndices = Array.from(this.selectedTiles).sort((a, b) => b - a);
        selectedIndices.forEach(index => {
            const letter = this.tray.splice(index, 1)[0];
            if (letter) this.letterPool.push(letter);
        });
        
        // Draw new tiles
        this.drawTiles(selectedIndices.length);
        this.selectedTiles.clear();
        this.renderTray();
    }

    async loadDictionary() {
        try {
            console.debug('Loading dictionary...');
            const success = await this.dictionary.loadFromFile('db/dictionary.json');
            if (!success) {
                console.error('Failed to load dictionary');
                this.validateWord = () => true;
            }
        } catch (err) {
            console.error('Failed to load dictionary:', err);
            this.validateWord = () => true;
        }
    }

    validateWord(word) {
        if (!this.dictionary) {
            console.debug('Dictionary not loaded, allowing word:', word);
            return true;
        }
        const isValid = this.dictionary.search(word);
        console.debug('Dictionary result for', word, ':', isValid ? 'valid' : 'invalid');
        return isValid;
    }

    getLetterScore(letter) {
        const scores = {
            'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'R': 1, 'S': 1, 'T': 1,
            'D': 2, 'G': 2,
            'B': 3, 'C': 3, 'M': 3, 'P': 3,
            'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
            'K': 5,
            'J': 8, 'X': 8,
            'Q': 10, 'Z': 10
        };
        return scores[letter] || 0;
    }

    findWords() {
        if (this.currentTurn.length === 0) return [];
        
        const sortedTiles = [...this.currentTurn].sort((a, b) => {
            if (a.y === b.y) return a.x - b.x;
            return a.y - b.y;
        });

        const isHorizontal = sortedTiles.every(tile => tile.y === sortedTiles[0].y);
        const isVertical = sortedTiles.every(tile => tile.x === sortedTiles[0].x);

        if (!isHorizontal && !isVertical) {
            console.debug('Invalid tile placement - must be in line');
            return [];
        }

        const words = [];
        const mainWord = { tiles: [], score: 0, word: '' };
        let wordMultiplier = 1;

        if (isHorizontal) {
            let x = sortedTiles[0].x;
            while (x > 0 && this.board[sortedTiles[0].y][x - 1]) x--;
            let word = '';
            const y = sortedTiles[0].y;
            while (x < BOARD_SIZE && this.board[y][x]) {
                const letter = this.board[y][x];
                const isNewTile = this.currentTurn.some(tile => tile.x === x && tile.y === y);
                const bonus = this.bonuses[y][x];
                let letterScore = this.getLetterScore(letter);
                
                if (isNewTile && bonus) {
                    if (bonus === '2L') letterScore *= 2;
                    if (bonus === '3L') letterScore *= 3;
                    if (bonus === '2W') wordMultiplier *= 2;
                    if (bonus === '3W') wordMultiplier *= 3;
                }
                
                word += letter;
                mainWord.score += letterScore;
                mainWord.tiles.push({ x, y, letter, isNewTile });
                x++;
            }
            mainWord.word = word;
        } else {
            let y = sortedTiles[0].y;
            while (y > 0 && this.board[y - 1][sortedTiles[0].x]) y--;
            let word = '';
            const x = sortedTiles[0].x;
            while (y < BOARD_SIZE && this.board[y][x]) {
                const letter = this.board[y][x];
                const isNewTile = this.currentTurn.some(tile => tile.x === x && tile.y === y);
                const bonus = this.bonuses[y][x];
                let letterScore = this.getLetterScore(letter);
                
                if (isNewTile && bonus) {
                    if (bonus === '2L') letterScore *= 2;
                    if (bonus === '3L') letterScore *= 3;
                    if (bonus === '2W') wordMultiplier *= 2;
                    if (bonus === '3W') wordMultiplier *= 3;
                }
                
                word += letter;
                mainWord.score += letterScore;
                mainWord.tiles.push({ x, y, letter, isNewTile });
                y++;
            }
            mainWord.word = word;
        }
        
        mainWord.score *= wordMultiplier;
        if (mainWord.word.length >= 2) {  // Only add words of length 2 or more
            words.push(mainWord);
        }

        for (const tile of this.currentTurn) {
            const crossWord = { tiles: [], score: 0, word: '' };
            let wordMultiplier = 1;
            
            if (isHorizontal) {
                let y = tile.y;
                while (y > 0 && this.board[y - 1][tile.x]) y--;
                if (y === tile.y && !this.board[y + 1]?.[tile.x]) continue;
                
                while (y < BOARD_SIZE && this.board[y]?.[tile.x]) {
                    const letter = this.board[y][tile.x];
                    const isNewTile = this.currentTurn.some(t => t.x === tile.x && t.y === y);
                    const bonus = this.bonuses[y][tile.x];
                    let letterScore = this.getLetterScore(letter);
                    
                    if (isNewTile && bonus) {
                        if (bonus === '2L') letterScore *= 2;
                        if (bonus === '3L') letterScore *= 3;
                        if (bonus === '2W') wordMultiplier *= 2;
                        if (bonus === '3W') wordMultiplier *= 3;
                    }
                    
                    crossWord.word += letter;
                    crossWord.score += letterScore;
                    crossWord.tiles.push({ x: tile.x, y, letter, isNewTile });
                    y++;
                }
            } else {
                let x = tile.x;
                while (x > 0 && this.board[tile.y][x - 1]) x--;
                if (x === tile.x && !this.board[tile.y][x + 1]) continue;
                
                while (x < BOARD_SIZE && this.board[tile.y]?.[x]) {
                    const letter = this.board[tile.y][x];
                    const isNewTile = this.currentTurn.some(t => t.x === x && t.y === tile.y);
                    const bonus = this.bonuses[tile.y][x];
                    let letterScore = this.getLetterScore(letter);
                    
                    if (isNewTile && bonus) {
                        if (bonus === '2L') letterScore *= 2;
                        if (bonus === '3L') letterScore *= 3;
                        if (bonus === '2W') wordMultiplier *= 2;
                        if (bonus === '3W') wordMultiplier *= 3;
                    }
                    
                    crossWord.word += letter;
                    crossWord.score += letterScore;
                    crossWord.tiles.push({ x, y: tile.y, letter, isNewTile });
                    x++;
                }
            }
            
            if (crossWord.word.length >= 2) {  // Only add words of length 2 or more
                crossWord.score *= wordMultiplier;
                words.push(crossWord);
            }
        }

        return words;
    }

    updateStatus(message) {
        document.getElementById('message').textContent = message;
        document.getElementById('score').textContent = `Score: ${this.totalScore}`;
    }

    moveTile(fromX, fromY, toX, toY) {
        // Check if the tile is from the current turn
        const tileIndex = this.currentTurn.findIndex(tile => tile.x === fromX && tile.y === fromY);
        if (tileIndex === -1) {
            console.debug('Cannot move tile from previous turn');
            return;
        }

        // Check if destination is empty
        if (this.board[toY][toX]) {
            console.debug('Destination cell is occupied');
            return;
        }

        // Move the tile
        const tile = this.currentTurn[tileIndex];
        this.board[fromY][fromX] = null;
        this.board[toY][toX] = tile.letter;

        // Update the tile's position in currentTurn
        this.currentTurn[tileIndex] = { ...tile, x: toX, y: toY };

        // Update DOM - move the entire tile element to maintain draggability
        const fromCell = document.querySelector(`#board .cell:nth-child(${fromY * BOARD_SIZE + fromX + 1})`);
        const toCell = document.querySelector(`#board .cell:nth-child(${toY * BOARD_SIZE + toX + 1})`);
        const tileElement = fromCell.firstChild;
        
        // Update the drag data to reflect new position
        tileElement.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', `board:${toX},${toY}`);
            e.dataTransfer.effectAllowed = 'move';
        };
        
        fromCell.removeChild(tileElement);
        toCell.appendChild(tileElement);
    }

    recallTiles() {
        // Return all tiles from current turn to tray
        for (const tile of this.currentTurn) {
            this.tray.push(tile.letter);
            const cell = document.querySelector(`#board .cell:nth-child(${tile.y * BOARD_SIZE + tile.x + 1})`);
            cell.innerHTML = '';
            this.board[tile.y][tile.x] = null;
        }
        this.currentTurn = [];
        this.renderTray();
        this.updatePlayButton();
    }
}

// Initialize game and load dictionary
window.game = new Game();
game.loadDictionary();

// Set up end turn handler
window.endTurn = () => {
    const words = game.findWords();
    if (words.length === 0) {
        game.updateStatus('No valid words formed');
        return;
    }

    const invalidWords = [];
    let turnScore = 0;
    
    for (const word of words) {
        if (!game.validateWord(word.word)) {
            invalidWords.push(word.word);
        } else {
            turnScore += word.score;
        }
    }
    
    if (invalidWords.length > 0) {
        game.updateStatus(`Invalid words: ${invalidWords.join(', ')}`);
        return;
    }

    if (game.currentTurn.length === 7) {
        turnScore += 50;
    }

    game.totalScore += turnScore;
    game.updateStatus(`Turn complete! Words: ${words.map(w => w.word).join(', ')}. Turn score: ${turnScore}`);
    
    game.drawTiles(7 - game.tray.length);
    game.currentTurn = [];
};

// Add trade tiles button handler
window.tradeTiles = () => {
    game.tradeTiles();
}; 