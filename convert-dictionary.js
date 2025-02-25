const fs = require('fs');
const path = require('path');

// Read the dictionary file
const dictionaryPath = path.join(__dirname, 'db', 'dictionary.txt');
const outputPath = path.join(__dirname, 'db', 'sdict.json');

try {
  // Read the file content
  const fileContent = fs.readFileSync(dictionaryPath, 'utf8');
  
  // Split by newlines to get an array of words
  // Filter out any empty lines
  const wordsArray = fileContent.split('\n').filter(word => word.trim() !== '');
  
  // Convert to JSON string with pretty formatting
  const jsonContent = JSON.stringify(wordsArray, null, 2);
  
  // Write to the output file
  fs.writeFileSync(outputPath, jsonContent);
  
  console.log(`Successfully converted dictionary to JSON and saved as ${outputPath}`);
  console.log(`Total words: ${wordsArray.length}`);
} catch (error) {
  console.error('Error processing the dictionary:', error);
} 