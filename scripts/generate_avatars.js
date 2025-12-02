const fs = require('fs');
const path = require('path');

const colors = ['#FF0055', '#00FFAA', '#00CCFF', '#FFAA00', '#CC00FF'];
const bgColors = ['#1a1a1a', '#0f0f0f', '#151520', '#201515', '#102020'];

const generateSVG = (index) => {
    const color = colors[index % colors.length];
    const bg = bgColors[index % bgColors.length];
    
    // futuristic shapes
    let shape = '';
    if (index === 0) {
        // Robot Eye
        shape = `
            <circle cx="50" cy="50" r="20" fill="none" stroke="${color}" stroke-width="2" />
            <circle cx="50" cy="50" r="8" fill="${color}" />
            <path d="M 30 50 L 20 50 M 70 50 L 80 50 M 50 30 L 50 20 M 50 70 L 50 80" stroke="${color}" stroke-width="2" />
        `;
    } else if (index === 1) {
        // Digital Grid
        shape = `
            <rect x="20" y="20" width="25" height="25" fill="${color}" opacity="0.5" />
            <rect x="55" y="20" width="25" height="25" fill="${color}" opacity="0.2" />
            <rect x="20" y="55" width="25" height="25" fill="${color}" opacity="0.8" />
            <rect x="55" y="55" width="25" height="25" fill="${color}" opacity="0.4" />
        `;
    } else if (index === 2) {
        // Hexagon Core
        shape = `
            <path d="M 50 20 L 75 35 L 75 65 L 50 80 L 25 65 L 25 35 Z" fill="none" stroke="${color}" stroke-width="3" />
            <circle cx="50" cy="50" r="10" fill="${color}" />
        `;
    } else if (index === 3) {
        // Pulse Wave
        shape = `
            <path d="M 10 50 Q 30 20 50 50 T 90 50" fill="none" stroke="${color}" stroke-width="3" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="4 4" />
        `;
    } else if (index === 4) {
        // Cyber Triangle
        shape = `
            <polygon points="50,20 80,75 20,75" fill="none" stroke="${color}" stroke-width="2" />
            <circle cx="50" cy="55" r="5" fill="${color}" />
            <line x1="50" y1="20" x2="50" y2="45" stroke="${color}" stroke-width="1" />
        `;
    }

    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="${bg}" rx="20" />
        ${shape}
    </svg>`;
};

const outputDir = path.join(__dirname, '../public/avatars');

for (let i = 0; i < 5; i++) {
    const svg = generateSVG(i);
    fs.writeFileSync(path.join(outputDir, `avatar_${i + 1}.svg`), svg);
    console.log(`Generated avatar_${i + 1}.svg`);
}
