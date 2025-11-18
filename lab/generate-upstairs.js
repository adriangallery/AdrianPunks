const { createCanvas } = require('canvas');
const fs = require('fs');

// Create canvas
const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');

// Background gradient
const gradient = ctx.createLinearGradient(0, 0, 800, 600);
gradient.addColorStop(0, '#1a1a1a');
gradient.addColorStop(1, '#2a2a2a');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 800, 600);

// Floor
ctx.fillStyle = '#8B4513';
ctx.fillRect(0, 500, 800, 100);

// Stairs (left side)
ctx.fillStyle = '#8B4513';
ctx.beginPath();
ctx.moveTo(20, 500);
ctx.lineTo(140, 500);
ctx.lineTo(112, 300);
ctx.lineTo(20, 300);
ctx.closePath();
ctx.fill();

// Stairs steps
ctx.strokeStyle = '#654321';
ctx.lineWidth = 2;
for (let i = 0; i < 10; i++) {
    const y = 500 - (i * 20);
    const x = 20 + (i * 8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 120, y);
    ctx.stroke();
}

// Window (right side)
ctx.fillStyle = '#87CEEB';
ctx.fillRect(600, 100, 150, 200);
ctx.strokeStyle = '#696969';
ctx.lineWidth = 3;
ctx.strokeRect(600, 100, 150, 200);

// Window cross
ctx.beginPath();
ctx.moveTo(675, 100);
ctx.lineTo(675, 300);
ctx.moveTo(600, 200);
ctx.lineTo(750, 200);
ctx.stroke();

// Furniture (center)
ctx.fillStyle = '#8B4513';
ctx.fillRect(300, 350, 200, 150);
ctx.fillRect(320, 320, 160, 30);

// Light fixture (ceiling)
ctx.fillStyle = '#FFFF00';
ctx.beginPath();
ctx.arc(400, 80, 30, 0, 2 * Math.PI);
ctx.fill();

// Light glow
ctx.shadowColor = '#FFFF00';
ctx.shadowBlur = 30;
ctx.fill();
ctx.shadowBlur = 0;

// Text overlay
ctx.fillStyle = '#00ff00';
ctx.font = '24px Arial';
ctx.fillText('UPSTAIRS - Fiat Zone', 20, 40);

// Save the image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('upstairs.png', buffer);

console.log('Upstairs image generated: upstairs.png'); 