const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// The problematic string is literally: \nconst showModal
// In the file, it's a backslash char followed by letter 'n' followed by 'const showModal'
// Let's find it using indexOf and slice it out

const badStr = String.fromCharCode(92) + 'n' + 'const showModal';  // \nconst showModal
const goodStr = '\nconst showModal';  // actual newline + const showModal

const idx = c.indexOf(badStr);
console.log('Found bad string at index:', idx);

if (idx >= 0) {
    c = c.substring(0, idx) + goodStr + c.substring(idx + badStr.length);
    fs.writeFileSync('app.js', c);
    console.log('Fixed successfully!');
    
    // Verify
    const lines = c.split('\n');
    for (let i = 396; i < 402; i++) {
        console.log(`Line ${i+1}: ${lines[i]}`);
    }
} else {
    console.log('Bad string not found - may already be fixed');
}
