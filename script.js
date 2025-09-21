// Calming Maze Game - Main JavaScript File
class CalmingMaze {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.muteBtn = document.getElementById('muteBtn');
        this.newMazeBtn = document.getElementById('newMazeBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.homeBtn = document.getElementById('homeBtn');
        this.victoryMessage = document.getElementById('victoryMessage');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // Game settings
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.mazeWidth = 25;
        this.mazeHeight = 19;
        this.cellSize = 30;
        this.wallThickness = 3;
        
        // Player settings
        this.player = {
            x: 1,
            y: 1,
            targetX: 1,
            targetY: 1,
            size: 8,
            glowRadius: 15,
            speed: 0.25
        };
        
        // Game state
        this.maze = [];
        this.isMoving = false;
        this.gameWon = false;
        this.visitedCells = new Set();
        this.totalCells = 0;
        
        // Audio
        this.audioContext = null;
        this.isMuted = false;
        this.ambientGain = null;
        this.oscillator = null;
        
        // Animation
        this.particles = [];
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.generateMaze();
        this.setupAudio();
        this.gameLoop();
    }
    
    setupCanvas() {
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.canvas.style.width = this.canvasWidth + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // UI controls
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.newMazeBtn.addEventListener('click', () => this.generateNewMaze());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.homeBtn.addEventListener('click', () => this.goHome());
        this.playAgainBtn.addEventListener('click', () => this.resetGame());
        
        // Prevent arrow key scrolling
        window.addEventListener('keydown', (e) => {
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
    }
    
    generateMaze() {
        // Initialize maze with walls
        this.maze = Array(this.mazeHeight).fill().map(() => Array(this.mazeWidth).fill(1));
        
        // Recursive backtracking maze generation
        const stack = [];
        const startX = 1;
        const startY = 1;
        
        this.maze[startY][startX] = 0;
        stack.push([startX, startY]);
        
        while (stack.length > 0) {
            const [currentX, currentY] = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(currentX, currentY);
            
            if (neighbors.length > 0) {
                const [nextX, nextY] = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Remove wall between current and next cell
                const wallX = currentX + (nextX - currentX) / 2;
                const wallY = currentY + (nextY - currentY) / 2;
                this.maze[wallY][wallX] = 0;
                this.maze[nextY][nextX] = 0;
                
                stack.push([nextX, nextY]);
            } else {
                stack.pop();
            }
        }
        
        // Ensure exit is accessible
        this.maze[this.mazeHeight - 2][this.mazeWidth - 2] = 0;
        
        // Count total navigable cells for progress tracking
        this.totalCells = 0;
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                if (this.maze[y][x] === 0) this.totalCells++;
            }
        }
        
        // Reset game state
        this.player.x = this.player.targetX = 1;
        this.player.y = this.player.targetY = 1;
        this.visitedCells.clear();
        this.visitedCells.add('1,1');
        this.gameWon = false;
        this.updateProgress();
    }
    
    getUnvisitedNeighbors(x, y) {
        const neighbors = [];
        const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
        
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX > 0 && newX < this.mazeWidth - 1 && 
                newY > 0 && newY < this.mazeHeight - 1 && 
                this.maze[newY][newX] === 1) {
                neighbors.push([newX, newY]);
            }
        }
        
        return neighbors;
    }
    
    handleKeyPress(e) {
        if (this.isMoving || this.gameWon) return;
        
        let newX = this.player.targetX;
        let newY = this.player.targetY;
        
        switch(e.code) {
            case 'ArrowUp':
                newY--;
                break;
            case 'ArrowDown':
                newY++;
                break;
            case 'ArrowLeft':
                newX--;
                break;
            case 'ArrowRight':
                newX++;
                break;
            default:
                return;
        }
        
        // Check if move is valid
        if (this.isValidMove(newX, newY)) {
            this.player.targetX = newX;
            this.player.targetY = newY;
            this.isMoving = true;
            
            // Play movement sound effect
            this.playMoveSound();
            
            // Add to visited cells
            this.visitedCells.add(`${newX},${newY}`);
            this.updateProgress();
            
            // Check for victory
            if (newX === this.mazeWidth - 2 && newY === this.mazeHeight - 2) {
                setTimeout(() => this.showVictory(), 500);
            }
        }
    }
    
    isValidMove(x, y) {
        return x >= 0 && x < this.mazeWidth && 
               y >= 0 && y < this.mazeHeight && 
               this.maze[y][x] === 0;
    }
    
    updateProgress() {
        const progress = Math.floor((this.visitedCells.size / this.totalCells) * 100);
        this.progressFill.style.width = progress + '%';
        this.progressText.textContent = progress + '%';
    }
    
    setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createAmbientSound();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    createAmbientSound() {
        if (!this.audioContext) return;
        
        // Create ambient drone
        this.oscillator = this.audioContext.createOscillator();
        this.ambientGain = this.audioContext.createGain();
        
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        this.ambientGain.gain.setValueAtTime(0.02, this.audioContext.currentTime);
        
        this.oscillator.connect(this.ambientGain);
        this.ambientGain.connect(this.audioContext.destination);
        
        // Add subtle frequency modulation
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.1, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(5, this.audioContext.currentTime);
        
        lfo.connect(lfoGain);
        lfoGain.connect(this.oscillator.frequency);
        
        this.oscillator.start();
        lfo.start();
    }
    
    playMoveSound() {
        if (!this.audioContext || this.isMuted) return;
        
        // Create a gentle movement sound
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        // Configure sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440 + Math.random() * 200, this.audioContext.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.muteBtn.textContent = this.isMuted ? '🔇' : '🔊';
        
        if (this.ambientGain) {
            this.ambientGain.gain.setValueAtTime(
                this.isMuted ? 0 : 0.02, 
                this.audioContext.currentTime
            );
        }
    }
    
    resetGame() {
        this.victoryMessage.classList.remove('show');
        this.player.x = this.player.targetX = 1;
        this.player.y = this.player.targetY = 1;
        this.visitedCells.clear();
        this.visitedCells.add('1,1');
        this.gameWon = false;
        this.updateProgress();
    }
    
    generateNewMaze() {
        this.generateMaze();
    }
    
    goHome() {
        // Could redirect to a home page or show a menu
        alert('Welcome to Zen Maze! 🧘‍♀️ Find peace through mindful navigation.');
    }
    
    updatePlayer() {
        if (!this.isMoving) return;
        
        const dx = this.player.targetX - this.player.x;
        const dy = this.player.targetY - this.player.y;
        
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
            this.player.x = this.player.targetX;
            this.player.y = this.player.targetY;
            this.isMoving = false;
        } else {
            this.player.x += dx * this.player.speed;
            this.player.y += dy * this.player.speed;
        }
    }
    
    updateParticles() {
        // Add new particles around the player
        if (Math.random() < 0.3) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.player.glowRadius;
            
            this.particles.push({
                x: this.player.x * this.cellSize + this.cellSize / 2 + Math.cos(angle) * distance,
                y: this.player.y * this.cellSize + this.cellSize / 2 + Math.sin(angle) * distance,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: 1,
                decay: 0.02
            });
        }
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw maze
        this.ctx.fillStyle = '#e2e8f0';
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                if (this.maze[y][x] === 1) {
                    this.ctx.fillRect(
                        x * this.cellSize, 
                        y * this.cellSize, 
                        this.cellSize, 
                        this.cellSize
                    );
                }
            }
        }
        
        // Draw visited path with subtle color
        this.ctx.fillStyle = 'rgba(102, 126, 234, 0.05)';
        this.visitedCells.forEach(cellKey => {
            const [x, y] = cellKey.split(',').map(Number);
            this.ctx.fillRect(
                x * this.cellSize + 2, 
                y * this.cellSize + 2, 
                this.cellSize - 4, 
                this.cellSize - 4
            );
        });
        
        // Draw exit
        const exitX = (this.mazeWidth - 2) * this.cellSize;
        const exitY = (this.mazeHeight - 2) * this.cellSize;
        
        const gradient = this.ctx.createRadialGradient(
            exitX + this.cellSize / 2, exitY + this.cellSize / 2, 0,
            exitX + this.cellSize / 2, exitY + this.cellSize / 2, this.cellSize / 2
        );
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(exitX, exitY, this.cellSize, this.cellSize);
        
        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life * 0.6;
            this.ctx.fillStyle = '#667eea';
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 1, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Draw player (glowing orb)
        const playerX = this.player.x * this.cellSize + this.cellSize / 2;
        const playerY = this.player.y * this.cellSize + this.cellSize / 2;
        
        // Outer glow
        const glowGradient = this.ctx.createRadialGradient(
            playerX, playerY, 0,
            playerX, playerY, this.player.glowRadius
        );
        glowGradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
        glowGradient.addColorStop(0.7, 'rgba(102, 126, 234, 0.1)');
        glowGradient.addColorStop(1, 'rgba(102, 126, 234, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, this.player.glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner orb
        const orbGradient = this.ctx.createRadialGradient(
            playerX - 2, playerY - 2, 0,
            playerX, playerY, this.player.size
        );
        orbGradient.addColorStop(0, '#a78bfa');
        orbGradient.addColorStop(1, '#667eea');
        
        this.ctx.fillStyle = orbGradient;
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, this.player.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(playerX - 2, playerY - 2, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    showVictory() {
        this.gameWon = true;
        this.victoryMessage.classList.add('show');
        
        // Play victory sound
        if (this.audioContext && !this.isMuted) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(523, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(784, this.audioContext.currentTime + 0.3);
            
            gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.5);
        }
    }
    
    gameLoop() {
        this.updatePlayer();
        this.updateParticles();
        this.render();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CalmingMaze();
});