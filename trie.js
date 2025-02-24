class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let current = this.root;
        for (let char of word.toUpperCase()) {
            if (!current.children[char]) {
                current.children[char] = new TrieNode();
            }
            current = current.children[char];
        }
        current.isEndOfWord = true;
    }

    search(word) {
        let current = this.root;
        for (let char of word.toUpperCase()) {
            if (!current.children[char]) {
                return false;
            }
            current = current.children[char];
        }
        return current.isEndOfWord;
    }

    // Helper method to load words from a JSON array
    loadFromArray(words) {
        for (let word of words) {
            this.insert(word);
        }
    }

    // Load words from a JSON file
    async loadFromFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const words = await response.json();
            this.loadFromArray(words);
            console.debug('Dictionary loaded successfully with', words.length, 'words');
            return true;
        } catch (err) {
            console.error('Failed to load dictionary:', err);
            return false;
        }
    }
}

// Export the Trie class
export { Trie }; 