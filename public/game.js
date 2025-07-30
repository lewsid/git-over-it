// Modern JavaScript Game Engine for Tighten Tower
class TightenTowerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'start'; // start, playing, gameOver
        
        // Game properties
        this.score = 0;
        this.floor = 1;
        this.gameTime = 0;
        this.lastTime = 0;
        this.currentLevel = 1;
        this.maxLevel = 5;
        this.levelComplete = false;
        
        // Player properties
        this.player = {
            x: 400,
            y: 500,
            width: 60,
            height: 60,
            health: 150,
            maxHealth: 150,
            speed: 200,
            isAttacking: false,
            attackCooldown: 0,
            attackProgress: 0, // 0 to 1 for smooth sword animation
            hasHitThisSwing: false, // Prevent multiple hits per swing
            direction: 1, // 1 for right, -1 for left
            velocityY: 0,
            onGround: true,
            hasWon: false
        };
        
        // Game objects
        this.enemies = [];
        this.particles = [];
        this.codeBlocks = [];
        this.platforms = [];
        this.goals = []; // Goals to reach at each level
        
        // Assets
        this.assets = {};
        this.imagesLoaded = 0;
        this.totalImages = 2;
        
        // Audio context for sound effects
        this.audioContext = null;
        this.sounds = {};
        this.initAudio();
        
        // Input handling
        this.keys = {};
        this.touch = {
            joystick: { active: false, x: 0, y: 0, startX: 0, startY: 0 },
            attack: false
        };
        
        // Camera
        this.camera = { y: 0 };
        
        // Screen effects
        this.screenShake = 0;
        this.confetti = [];
        this.floatingTexts = [];
        this.slackMessages = [];
        this.activeSlackMessage = null;
        this.slackTimer = 0;
        this.slackMessagesSentThisLevel = 0;
        this.previousGameState = null;
        this.musicPlaying = false;
        this.gameStartTime = null;
        this.gameCompletionTime = null;
        
        // Enable audio on first user interaction and handle Slack dismissal
        document.addEventListener('click', (event) => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Handle Slack message dismissal
            if (this.activeSlackMessage) {
                const rect = this.canvas.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;
                
                // Check if clicked on dismiss button or X button
                if (this.slackCloseArea && 
                    clickX >= this.slackCloseArea.x && clickX <= this.slackCloseArea.x + this.slackCloseArea.width &&
                    clickY >= this.slackCloseArea.y && clickY <= this.slackCloseArea.y + this.slackCloseArea.height) {
                    this.activeSlackMessage = null;
                } else if (this.slackXArea && 
                    clickX >= this.slackXArea.x && clickX <= this.slackXArea.x + this.slackXArea.width &&
                    clickY >= this.slackXArea.y && clickY <= this.slackXArea.y + this.slackXArea.height) {
                    this.activeSlackMessage = null;
                }
            }
        });
        
        // Initialize game
        this.init();
    }
    
    async init() {
        try {
            await this.loadAssets();
            this.setupEventListeners();
                    this.createLevel();
        this.testPlatformReachability(); // Test the platform layout
        this.gameLoop();
        console.log('Tighten Tower game initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            // Show error message to user
            document.getElementById('startScreen').innerHTML = `
                <h1>🐙 TIGHTEN TOWER</h1>
                <p style="color: #ff4444;">Failed to load game assets. Please refresh the page.</p>
                <p>Error: ${error.message}</p>
            `;
        }
    }
    
    async loadAssets() {
        const imagePromises = [
            this.loadImage('octopus-asset.png', 'octopus'),
            this.loadImage('blade-right-asset.png', 'sword')
        ];
        
        await Promise.all(imagePromises);
    }
    
    loadImage(src, key) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets[key] = img;
                this.imagesLoaded++;
                console.log(`Loaded ${key} asset: ${src}`);
                resolve();
            };
            img.onerror = (error) => {
                console.error(`Failed to load ${key} asset: ${src}`, error);
                reject(new Error(`Failed to load ${key} asset: ${src}`));
            };
            img.src = src;
        });
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    playSound(type) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch (type) {
            case 'jump':
                // Bouncy 8-bit jump sound like Mario/Galaga
                oscillator.frequency.setValueAtTime(330, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(523, this.audioContext.currentTime + 0.08);
                oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.15);
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.15);
                break;
                
            case 'attack':
                // Sword swoosh - like Zelda sword swing
                oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.1);
                oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.25);
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.12, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.25);
                break;
                
            case 'enemyHit':
                // Galaga-style hit sound - quick ascending beep
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                break;
                
            case 'enemyDeath':
                // Pacman-style death sound - descending warble
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                
                // Add a vibrato effect
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                lfo.frequency.setValueAtTime(10, this.audioContext.currentTime);
                lfoGain.gain.setValueAtTime(50, this.audioContext.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(oscillator.frequency);
                
                oscillator.start();
                lfo.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                lfo.stop(this.audioContext.currentTime + 0.3);
                break;
                
            case 'playerHit':
                // Galaga ship hit - dramatic descending tone
                oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(55, this.audioContext.currentTime + 0.4);
                oscillator.type = 'triangle';
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.4);
                break;
                
            case 'goalCollect':
                // Pac-Man pellet collection sound - quick ascending chirp
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                break;
                
            case 'slackNotification':
                // Annoying Slack notification sound - quick ascending beep
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + 0.1);
                oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.2);
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                break;
                
            case 'victory':
                this.playVictoryMusic();
                break;
                
            case 'gameOver':
                this.playGameOverMusic();
                break;
        }
    }
    
    // Test function to verify platform reachability
    testPlatformReachability() {
        const jumpHeight = 600 * 600 / (2 * 1200); // max height = v^2 / 2g = 150px
        console.log(`🦘 Max jump height: ${jumpHeight}px`);
        
        for (let i = 1; i < this.platforms.length; i++) {
            const current = this.platforms[i];
            const previous = this.platforms[i-1];
            const verticalGap = previous.y - current.y;
            const horizontalGap = Math.abs(current.x - (previous.x + previous.width/2));
            
            const reachable = verticalGap <= jumpHeight;
            console.log(`Platform ${i}: V-gap=${verticalGap}px, H-gap=${horizontalGap}px, Reachable=${reachable ? '✅' : '❌'}`);
        }
    }
    
    playVictoryMusic() {
        if (!this.audioContext || this.musicPlaying) return;
        this.musicPlaying = true;
        
        // Victory melody with harmony - more triumphant
        const melody = [
            {note: 523, time: 0.0, duration: 0.3},    // C
            {note: 659, time: 0.3, duration: 0.3},    // E
            {note: 784, time: 0.6, duration: 0.3},    // G
            {note: 1047, time: 0.9, duration: 0.6},   // High C (longer)
            {note: 880, time: 1.5, duration: 0.3},    // A
            {note: 1047, time: 1.8, duration: 0.8},   // High C finale
        ];
        
        // Harmony line (thirds below)
        const harmony = [
            {note: 415, time: 0.0, duration: 0.3},    // Ab
            {note: 523, time: 0.3, duration: 0.3},    // C
            {note: 659, time: 0.6, duration: 0.3},    // E
            {note: 784, time: 0.9, duration: 0.6},    // G
            {note: 698, time: 1.5, duration: 0.3},    // F#
            {note: 784, time: 1.8, duration: 0.8},    // G
        ];
        
        // Play melody
        melody.forEach(({note, time, duration}) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(note, this.audioContext.currentTime);
            osc.type = 'square';
            gain.gain.setValueAtTime(0.08, this.audioContext.currentTime + time);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration);
            
            osc.start(this.audioContext.currentTime + time);
            osc.stop(this.audioContext.currentTime + time + duration);
        });
        
        // Play harmony
        harmony.forEach(({note, time, duration}) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(note, this.audioContext.currentTime);
            osc.type = 'triangle'; // Softer harmony
            gain.gain.setValueAtTime(0.04, this.audioContext.currentTime + time);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration);
            
            osc.start(this.audioContext.currentTime + time);
            osc.stop(this.audioContext.currentTime + time + duration);
        });
        
        setTimeout(() => this.musicPlaying = false, 2800);
    }
    
    playGameOverMusic() {
        if (!this.audioContext || this.musicPlaying) return;
        this.musicPlaying = true;
        
        // Sad descending melody with echo effect
        const melody = [
            {note: 523, time: 0.0, duration: 0.6},    // C
            {note: 494, time: 0.6, duration: 0.6},    // B
            {note: 440, time: 1.2, duration: 0.6},    // A
            {note: 392, time: 1.8, duration: 0.6},    // G
            {note: 349, time: 2.4, duration: 1.2},    // F (longer, sadder)
        ];
        
        // Play main melody
        melody.forEach(({note, time, duration}) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(note, this.audioContext.currentTime);
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0.1, this.audioContext.currentTime + time);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration);
            
            osc.start(this.audioContext.currentTime + time);
            osc.stop(this.audioContext.currentTime + time + duration);
        });
        
        // Play echo effect (delayed and quieter)
        melody.forEach(({note, time, duration}) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(note, this.audioContext.currentTime);
            osc.type = 'sine'; // Even softer for echo
            gain.gain.setValueAtTime(0.03, this.audioContext.currentTime + time + 0.3); // Delayed
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration + 0.3);
            
            osc.start(this.audioContext.currentTime + time + 0.3);
            osc.stop(this.audioContext.currentTime + time + duration + 0.3);
        });
        
        setTimeout(() => this.musicPlaying = false, 4000);
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleAttack();
            }
            
            // Secret credits shortcut: Shift+C
            if (e.shiftKey && e.code === 'KeyC') {
                e.preventDefault();
                if (this.gameState !== 'credits') {
                    this.previousGameState = this.gameState;
                    this.gameState = 'credits';
                    document.getElementById('startScreen').style.display = 'none';
                    document.getElementById('gameOverScreen').style.display = 'none';
                    document.getElementById('creditsScreen').style.display = 'flex';
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Touch controls for mobile
        this.setupTouchControls();
        
        // UI buttons
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            this.currentLevel = 1; // Reset to level 1
            this.resetGame();
            this.startGame();
        });
        
        document.getElementById('nextLevelButton').addEventListener('click', () => {
            if (this.currentLevel < this.maxLevel) {
                this.currentLevel++;
                this.slackMessagesSentThisLevel = 0; // Reset Slack counter for new level
                this.resetGame();
                this.startGame();
            }
        });
        
        document.getElementById('creditsButton').addEventListener('click', () => {
            document.getElementById('gameOverScreen').style.display = 'none';
            document.getElementById('creditsScreen').style.display = 'flex';
        });
        
        document.getElementById('backToMenuButton').addEventListener('click', () => {
            document.getElementById('creditsScreen').style.display = 'none';
            
            // Return to previous state or default to start screen
            if (this.previousGameState === 'playing') {
                // If coming from game, pause and show start screen
                this.gameState = 'start';
                document.getElementById('startScreen').style.display = 'flex';
            } else if (this.previousGameState === 'gameOver') {
                this.gameState = 'gameOver';
                document.getElementById('gameOverScreen').style.display = 'flex';
            } else {
                this.gameState = 'start';
                document.getElementById('startScreen').style.display = 'flex';
            }
            
            this.previousGameState = null;
        });
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setupTouchControls() {
        const joystick = document.getElementById('joystick');
        const joystickKnob = document.getElementById('joystickKnob');
        const attackButton = document.getElementById('attackButton');
        
        // Joystick touch handling
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystick.getBoundingClientRect();
            this.touch.joystick.active = true;
            this.touch.joystick.startX = rect.left + rect.width / 2;
            this.touch.joystick.startY = rect.top + rect.height / 2;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.touch.joystick.active) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touch.joystick.startX;
            const deltaY = touch.clientY - this.touch.joystick.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 30;
            
            if (distance <= maxDistance) {
                this.touch.joystick.x = deltaX / maxDistance;
                this.touch.joystick.y = deltaY / maxDistance;
                joystickKnob.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px)`;
            } else {
                const angle = Math.atan2(deltaY, deltaX);
                this.touch.joystick.x = Math.cos(angle);
                this.touch.joystick.y = Math.sin(angle);
                joystickKnob.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * maxDistance}px, ${Math.sin(angle) * maxDistance}px)`;
            }
        });
        
        document.addEventListener('touchend', (e) => {
            this.touch.joystick.active = false;
            this.touch.joystick.x = 0;
            this.touch.joystick.y = 0;
            joystickKnob.style.transform = 'translate(-50%, -50%)';
        });
        
        // Attack button
        attackButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleAttack();
        });
        
        // Show mobile controls on touch devices
        if ('ontouchstart' in window) {
            document.getElementById('mobileControls').style.display = 'flex';
        }
    }
    
    createLevel() {
        // Create level-specific platforms and difficulty
        const levelConfigs = {
                         1: { // Tutorial level - wide platforms, guaranteed enemy
                 platforms: [
                     { x: 0, y: 580, width: 800, height: 20 },
                     { x: 150, y: 500, width: 250, height: 20 },
                     { x: 400, y: 430, width: 250, height: 20 },
                     { x: 150, y: 360, width: 250, height: 20 },
                     { x: 400, y: 290, width: 250, height: 20 },
                     { x: 300, y: 200, width: 200, height: 20 },
                 ],
                 enemySpawnRate: 1.0, // Guarantee one enemy spawns
                 enemySpeed: 0.7, // Slower for tutorial
                 description: "Tutorial: Learn the ropes"
             },
            2: { // Standard level
                platforms: [
                    { x: 0, y: 580, width: 800, height: 20 },
                    { x: 150, y: 500, width: 200, height: 20 },
                    { x: 450, y: 430, width: 200, height: 20 },
                    { x: 150, y: 360, width: 200, height: 20 },
                    { x: 450, y: 290, width: 200, height: 20 },
                    { x: 200, y: 220, width: 200, height: 20 },
                    { x: 400, y: 150, width: 200, height: 20 },
                    { x: 300, y: 80, width: 200, height: 20 },
                ],
                enemySpawnRate: 0.6,
                enemySpeed: 1.0,
                description: "Basic: Standard challenge"
            },
            3: { // Narrow platforms
                platforms: [
                    { x: 0, y: 580, width: 800, height: 20 },
                    { x: 100, y: 500, width: 150, height: 20 },
                    { x: 550, y: 430, width: 150, height: 20 },
                    { x: 100, y: 360, width: 150, height: 20 },
                    { x: 550, y: 290, width: 150, height: 20 },
                    { x: 200, y: 220, width: 150, height: 20 },
                    { x: 450, y: 150, width: 150, height: 20 },
                    { x: 100, y: 80, width: 150, height: 20 },
                    { x: 550, y: 20, width: 150, height: 20 },
                ],
                enemySpawnRate: 0.8,
                enemySpeed: 1.2,
                description: "Advanced: Narrow platforms"
            },
            4: { // Many small platforms
                platforms: [
                    { x: 0, y: 580, width: 800, height: 20 },
                    { x: 100, y: 520, width: 120, height: 20 },
                    { x: 300, y: 480, width: 120, height: 20 },
                    { x: 580, y: 440, width: 120, height: 20 },
                    { x: 50, y: 380, width: 120, height: 20 },
                    { x: 350, y: 340, width: 120, height: 20 },
                    { x: 600, y: 300, width: 120, height: 20 },
                    { x: 200, y: 240, width: 120, height: 20 },
                    { x: 500, y: 180, width: 120, height: 20 },
                    { x: 100, y: 120, width: 120, height: 20 },
                    { x: 580, y: 60, width: 120, height: 20 },
                    { x: 340, y: 20, width: 120, height: 20 },
                ],
                enemySpawnRate: 0.9,
                enemySpeed: 1.4,
                description: "Expert: Precise jumps required"
            },
            5: { // Boss level - floating platforms
                platforms: [
                    { x: 0, y: 580, width: 800, height: 20 },
                    { x: 50, y: 500, width: 100, height: 20 },
                    { x: 200, y: 460, width: 100, height: 20 },
                    { x: 350, y: 420, width: 100, height: 20 },
                    { x: 500, y: 380, width: 100, height: 20 },
                    { x: 650, y: 340, width: 100, height: 20 },
                    { x: 100, y: 280, width: 100, height: 20 },
                    { x: 300, y: 240, width: 100, height: 20 },
                    { x: 500, y: 200, width: 100, height: 20 },
                    { x: 200, y: 140, width: 100, height: 20 },
                    { x: 400, y: 100, width: 100, height: 20 },
                    { x: 600, y: 60, width: 100, height: 20 },
                    { x: 350, y: 20, width: 100, height: 20 }, // Final platform
                ],
                enemySpawnRate: 1.0,
                enemySpeed: 1.6,
                description: "BOSS LEVEL: The final challenge!"
            }
        };
        
        const config = levelConfigs[this.currentLevel] || levelConfigs[1];
        this.platforms = config.platforms;
        this.levelConfig = config;
        
        // Create goals dynamically based on platforms (skip ground and place on every other platform)
        this.goals = [];
        const goalEmojis = ['🚀', '💎', '⭐', '🏆', '👑', '💯', '🎯', '🔥', '⚡', '🌟'];
        
        for (let i = 1; i < this.platforms.length; i += 2) { // Every other platform gets a goal
            const platform = this.platforms[i];
            const goalIndex = Math.floor((i-1)/2);
            if (goalIndex < goalEmojis.length) {
                this.goals.push({
                    x: platform.x + platform.width - 40,
                    y: platform.y - 30,
                    width: 30,
                    height: 30,
                    collected: false,
                    emoji: goalEmojis[goalIndex]
                });
            }
        }
        
        // Always add a final goal on the last platform
        if (this.platforms.length > 1) {
            const finalPlatform = this.platforms[this.platforms.length - 1];
            this.goals.push({
                x: finalPlatform.x + finalPlatform.width/2 - 15,
                y: finalPlatform.y - 30,
                width: 30,
                height: 30,
                collected: false,
                emoji: '🎯'
            });
        }
        
        // Create background code blocks
        this.generateCodeBlocks();
        
        // Spawn initial enemies
        this.spawnEnemies();
    }
    
    generateCodeBlocks() {
        const laravelCodeSnippets = [
            'Route::get()', 'artisan make:model', 'Schema::create()', '@extends(\'layout\')',
            'public function index()', '$user->save()', 'DB::table(\'users\')', 'Auth::user()',
            'return view()', '@yield(\'content\')', 'eloquent relationships', 'use App\\Models\\User;',
            'middleware(\'auth\')', 'php artisan migrate', '$request->validated()', 'composer require',
            'env(\'APP_KEY\')', 'cache()->remember()', 'Mail::send()', 'Event::dispatch()',
            'Gate::allows()', 'collection->filter()', 'Carbon::now()', 'Log::info()',
            '@livewire(\'component\')', 'Blade::component()', 'redis->set()', 'queue->push()',
            'trait Searchable', 'interface Repository', 'abstract class Service', 'final class DTO'
        ];
        
        // Create more code blocks for that Matrix effect
        for (let i = 0; i < 80; i++) {
            this.codeBlocks.push({
                x: Math.random() * 750 + 25,
                y: Math.random() * 650 + 50,
                text: laravelCodeSnippets[Math.floor(Math.random() * laravelCodeSnippets.length)],
                opacity: 0.2 + Math.random() * 0.3,
                committed: false,
                speed: 10 + Math.random() * 20, // Matrix falling effect
                initialY: Math.random() * 650 + 50
            });
        }
    }
    
    spawnEnemies() {
        const enemyTypes = [
            { type: 'bug', emoji: '🐛', health: 50, speed: 50, points: 10 },       // 2 hits to kill
            { type: 'conflict', emoji: '⚡', health: 50, speed: 60, points: 15 },  // 2 hits to kill
            { type: 'legacy', emoji: '💩', health: 50, speed: 30, points: 20 },   // 2 hits to kill
            { type: 'timeout', emoji: '⏰', health: 50, speed: 80, points: 12 }    // 2 hits to kill
        ];
        
        // Spawn enemies on platforms (except ground and victory platform)
        const availablePlatforms = this.platforms.slice(1, -1);
        let enemiesSpawned = 0;
        
        availablePlatforms.forEach((platform, index) => {
            // For level 1, guarantee exactly one enemy on the first platform
            const shouldSpawn = (this.currentLevel === 1 && index === 0) || 
                               (this.currentLevel > 1 && Math.random() < this.levelConfig.enemySpawnRate);
                               
            if (shouldSpawn) {
                const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                this.enemies.push({
                    ...enemyType,
                    speed: enemyType.speed * this.levelConfig.enemySpeed,
                    x: platform.x + Math.random() * (platform.width - 40),
                    y: platform.y - 40,
                    width: 40,
                    height: 40,
                    maxHealth: enemyType.health,
                    direction: Math.random() < 0.5 ? -1 : 1,
                    platformIndex: index + 1,
                    alive: true,
                    hitCooldown: 0,
                    velocityY: 0,
                    onGround: true,
                    knockbackX: 0,
                    hasSeenPlayer: false,
                    startleTime: 0,
                    startleProgress: 0,
                    aiState: 'patrol' // patrol, startled, aggressive
                });
                enemiesSpawned++;
                
                // For level 1, stop after spawning one enemy
                if (this.currentLevel === 1 && enemiesSpawned >= 1) return;
            }
        });
        
        // Add boss enemies on levels 3+ 
        if (this.currentLevel >= 3) {
            const bossPlatform = this.platforms[this.platforms.length - 1];
            const bossEmojis = ['👹', '🤖', '👾', '🔥', '💀'][this.currentLevel - 3] || '👹';
            this.enemies.push({
                type: 'boss',
                emoji: bossEmojis,
                health: 50 + (this.currentLevel - 3) * 25,  // Progressively stronger bosses
                maxHealth: 50 + (this.currentLevel - 3) * 25,
                speed: 40 * this.levelConfig.enemySpeed,
                points: 100 * this.currentLevel,
                x: bossPlatform.x + bossPlatform.width / 2 - 30,
                y: bossPlatform.y - 60,
                width: 60,
                height: 60,
                direction: 1,
                platformIndex: this.platforms.length - 1,
                alive: true,
                hitCooldown: 0,
                velocityY: 0,
                onGround: true,
                knockbackX: 0,
                hasSeenPlayer: false,
                startleTime: 0,
                startleProgress: 0,
                aiState: 'patrol'
            });
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').style.display = 'none';
        if (this.currentLevel === 1) {
            this.gameStartTime = Date.now(); // Start timing for leaderboard
        }
        document.getElementById('gameOverScreen').style.display = 'none';
    }
    
    resetGame() {
        this.player = {
            x: 400,
            y: 500,
            width: 60,
            height: 60,
            health: 150,
            maxHealth: 150,
            speed: 200,
            isAttacking: false,
            attackCooldown: 0,
            attackProgress: 0,
            hasHitThisSwing: false,
            direction: 1,
            velocityY: 0,
            onGround: true,
            hasWon: false
        };
        
        this.score = 0;
        this.floor = 1;
        this.gameTime = 0;
        this.camera.y = 0;
        this.enemies = [];
        this.particles = [];
        this.codeBlocks = []; // Clear matrix code to prevent stacking!
        this.confetti = [];
        this.floatingTexts = []; // Clear floating text messages
        this.activeSlackMessage = null;
        this.slackTimer = 0;
        this.slackMessagesSentThisLevel = 0; // Reset Slack counter
        this.levelComplete = false;
        
        this.createLevel();
        // Reset goals
        this.goals.forEach(goal => goal.collected = false);
        
        // Reset screen shake
        this.screenShake = 0;
    }
    
    handleInput(deltaTime) {
        if (this.gameState !== 'playing' || this.activeSlackMessage) return;
        
        let moveX = 0;
        let jump = false;
        
        // Desktop controls
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) moveX -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) moveX += 1;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) jump = true;
        
        // Mobile controls
        if (this.touch.joystick.active) {
            moveX += this.touch.joystick.x;
            if (this.touch.joystick.y < -0.5) jump = true;
        }
        
        // Apply movement with smart enemy collision
        if (moveX !== 0) {
            const newX = this.player.x + moveX * this.player.speed * deltaTime;
            this.player.direction = moveX > 0 ? 1 : -1;
            
            // Check collision with enemies - only block movement that increases overlap
            let canMove = true;
            const currentPlayerRect = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
            const futurePlayerRect = { x: newX, y: this.player.y, width: this.player.width, height: this.player.height };
            
            this.enemies.forEach(enemy => {
                if (!enemy.alive) return;
                
                const enemyRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
                
                // If we're already colliding, allow movement that reduces overlap
                const currentlyColliding = this.checkRectCollision(currentPlayerRect, enemyRect);
                const wouldCollide = this.checkRectCollision(futurePlayerRect, enemyRect);
                
                if (wouldCollide && !currentlyColliding) {
                    // Block new collisions
                    canMove = false;
                } else if (currentlyColliding && wouldCollide) {
                    // Allow movement if it reduces overlap (moves away from enemy center)
                    const enemyCenterX = enemy.x + enemy.width / 2;
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const futureCenterX = newX + this.player.width / 2;
                    
                    const currentDistance = Math.abs(playerCenterX - enemyCenterX);
                    const futureDistance = Math.abs(futureCenterX - enemyCenterX);
                    
                    // Block movement that brings us closer to enemy center
                    if (futureDistance < currentDistance) {
                        canMove = false;
                    }
                }
            });
            
            if (canMove) {
                this.player.x = newX;
                // Keep player on screen
                this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
            }
        }
        
        // Jumping - More generous jump height
        if (jump && this.player.onGround) {
            this.player.velocityY = -600; // Even higher jump for easier platforming
            this.player.onGround = false;
            this.playSound('jump');
        }
    }
    
    handleAttack() {
        if (this.gameState !== 'playing' || this.player.attackCooldown > 0) return;
        
        this.player.isAttacking = true;
        this.player.attackProgress = 0;
        this.player.hasHitThisSwing = false; // Reset hit flag
        this.player.attackCooldown = 0.4; // Faster attacks for better combat feel
        
        // Play attack sound
        this.playSound('attack');
        
        // Create attack particle effect
        this.createAttackEffect();
    }
    
    hitEnemy(enemy) {
        const damage = enemy.type === 'boss' ? 25 : 25; // 2 hits to kill all enemies
        enemy.health -= damage;
        enemy.hitCooldown = 0.3; // Shorter cooldown for better responsiveness
        
        // Knockback effect
        const knockbackForce = 100;
        const knockbackDirection = this.player.direction;
        enemy.knockbackX = knockbackDirection * knockbackForce;
        
        // Create hit particles
        this.createHitParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
        
        if (enemy.health <= 0) {
            enemy.alive = false;
            this.score += enemy.points;
            this.commitCode(enemy);
            this.playSound('enemyDeath');
            
            // Special effect for boss death
            if (enemy.type === 'boss') {
                for (let i = 0; i < 20; i++) {
                    this.createHitParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                }
                this.screenShake = 0.5;
            }
            
            // Check floor progression
            this.updateFloor();
        } else {
            // Play hit sound for non-fatal hits
            this.playSound('enemyHit');
        }
    }
    
    commitCode(enemy) {
        // Find nearby code blocks and "commit" them
        const nearbyBlocks = this.codeBlocks.filter(block => {
            const dx = block.x - enemy.x;
            const dy = block.y - enemy.y;
            return Math.sqrt(dx * dx + dy * dy) < 100 && !block.committed;
        });
        
        nearbyBlocks.slice(0, 3).forEach(block => {
            block.committed = true;
            block.opacity = 1;
            this.createCommitEffect(block.x, block.y);
        });
    }
    
    updateFloor() {
        const aliveEnemies = this.enemies.length; // Already filtered in updateEnemies
        const newFloor = Math.max(1, 8 - Math.floor(aliveEnemies / 2));
        
        if (newFloor > this.floor) {
            this.floor = newFloor;
        }
        
        // Alternative victory condition: all enemies defeated AND reached the top
        if (aliveEnemies === 0 && this.player.y < 100) {
            this.player.hasWon = true;
            this.levelComplete = true;
            this.playSound('victory');
            this.createConfetti();
            this.endGame();
        }
    }
    
    updatePhysics(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Gravity
        this.player.velocityY += 1200 * deltaTime; // gravity
        this.player.y += this.player.velocityY * deltaTime;
        
        // Platform collision
        this.player.onGround = false;
        this.platforms.forEach(platform => {
            if (this.player.x < platform.x + platform.width &&
                this.player.x + this.player.width > platform.x &&
                this.player.y + this.player.height > platform.y &&
                this.player.y + this.player.height < platform.y + platform.height + 10 &&
                this.player.velocityY >= 0) {
                
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.onGround = true;
            }
        });
        
        // Update camera to follow player with screen shake
        let targetCameraY = Math.max(0, Math.min(200, 600 - this.player.y - 300));
        
        // Apply screen shake
        if (this.screenShake > 0) {
            targetCameraY += (Math.random() - 0.5) * this.screenShake * 20;
            this.screenShake -= deltaTime * 2;
            if (this.screenShake < 0) this.screenShake = 0;
        }
        
        this.camera.y += (targetCameraY - this.camera.y) * deltaTime * 3;
        
        // Update enemy AI
        this.updateEnemies(deltaTime);
        
        // Update attack animation and cooldowns
        if (this.player.attackCooldown > 0) {
            this.player.attackCooldown -= deltaTime;
        }
        
        if (this.player.isAttacking) {
            // Smooth attack animation over 0.3 seconds
            this.player.attackProgress += deltaTime / 0.3;
            
            // Check for enemy hits during the peak of the swing (0.3 to 0.6 progress)
            if (this.player.attackProgress >= 0.3 && this.player.attackProgress <= 0.6 && !this.player.hasHitThisSwing) {
                this.checkAttackHits();
                this.player.hasHitThisSwing = true; // Only hit once per swing
            }
            
            if (this.player.attackProgress >= 1) {
                this.player.isAttacking = false;
                this.player.attackProgress = 0;
                this.player.hasHitThisSwing = false; // Reset for next attack
            }
        }
        
        // Check for goal collection
        this.checkGoalCollection();
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update confetti
        this.updateConfetti(deltaTime);
        
        // Update floating texts
        this.updateFloatingTexts(deltaTime);
        
        // Update Slack messages (only when playing)
        if (!this.activeSlackMessage) {
            this.updateSlackTimer(deltaTime);
        }
        
        // Check for death
        if (this.player.y > 650) {
            this.player.health = 0;
        }
        
        if (this.player.health <= 0) {
            this.playSound('gameOver');
            this.endGame();
        }
    }
    
    updateEnemies(deltaTime) {
        // Filter out dead enemies first
        this.enemies = this.enemies.filter(enemy => enemy.alive);
        
        this.enemies.forEach(enemy => {
            enemy.hitCooldown = Math.max(0, enemy.hitCooldown - deltaTime);
            
            // Update startle animation
            if (enemy.startleTime > 0) {
                enemy.startleTime -= deltaTime;
                enemy.startleProgress = Math.max(0, enemy.startleTime / 0.5); // 0.5s startle duration
                if (enemy.startleTime <= 0) {
                    enemy.aiState = 'aggressive';
                    enemy.startleProgress = 0;
                }
            }
            
            // Apply gravity to enemies
            enemy.velocityY += 1200 * deltaTime; // Same gravity as player
            enemy.y += enemy.velocityY * deltaTime;
            
            // Apply knockback
            if (enemy.knockbackX !== 0) {
                enemy.x += enemy.knockbackX * deltaTime;
                enemy.knockbackX *= (1 - deltaTime * 3); // Decay knockback
                if (Math.abs(enemy.knockbackX) < 10) enemy.knockbackX = 0;
            }
            
            // Platform collision for enemies
            enemy.onGround = false;
            this.platforms.forEach(platform => {
                if (enemy.x < platform.x + platform.width &&
                    enemy.x + enemy.width > platform.x &&
                    enemy.y + enemy.height > platform.y &&
                    enemy.y + enemy.height < platform.y + platform.height + 10 &&
                    enemy.velocityY >= 0) {
                    
                    enemy.y = platform.y - enemy.height;
                    enemy.velocityY = 0;
                    enemy.onGround = true;
                }
            });
            
            // Check if enemy can see player (line of sight and range)
            const playerDistance = Math.abs(this.player.x - enemy.x);
            const playerVerticalDistance = Math.abs(this.player.y - enemy.y);
            const canSeePlayer = playerDistance < 150 && playerVerticalDistance < 80;
            
            // Startle detection - first time seeing player
            if (!enemy.hasSeenPlayer && canSeePlayer && enemy.aiState === 'patrol') {
                enemy.hasSeenPlayer = true;
                enemy.aiState = 'startled';
                enemy.startleTime = 0.5; // 0.5 second startle animation
                enemy.startleProgress = 1.0;
                // No sound for now to avoid spam
            }
            
            // AI behavior only when on ground
            if (enemy.onGround && enemy.aiState !== 'startled') {
                const platform = this.platforms[enemy.platformIndex];
                if (platform) {
                    // Normal movement with smart collision detection
                    let moveSpeed = enemy.speed;
                    if (enemy.knockbackX === 0) { // Only move normally if not being knocked back
                        const newX = enemy.x + enemy.direction * moveSpeed * deltaTime;
                        
                        // Check collision with player - similar logic to player movement
                        let canMove = true;
                        const currentEnemyRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
                        const futureEnemyRect = { x: newX, y: enemy.y, width: enemy.width, height: enemy.height };
                        const playerRect = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
                        
                        const currentlyColliding = this.checkRectCollision(currentEnemyRect, playerRect);
                        const wouldCollide = this.checkRectCollision(futureEnemyRect, playerRect);
                        
                        if (wouldCollide && !currentlyColliding) {
                            // Block new collisions and attack
                            canMove = false;
                            const playerDistance = Math.abs(this.player.x - enemy.x);
                            if (playerDistance < 60 && enemy.hitCooldown <= 0) {
                                this.player.health -= 25;
                                enemy.hitCooldown = 1.5;
                                this.createHitParticles(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
                                this.playSound('playerHit');
                                this.screenShake = 0.3;
                                
                                // Create floating damage text
                                this.createFloatingText('-25 HP', this.player.x + this.player.width/2, this.player.y, '#ff4444');
                            }
                        } else if (currentlyColliding && wouldCollide) {
                            // Allow movement that reduces overlap
                            const playerCenterX = this.player.x + this.player.width / 2;
                            const enemyCenterX = enemy.x + enemy.width / 2;
                            const futureCenterX = newX + enemy.width / 2;
                            
                            const currentDistance = Math.abs(enemyCenterX - playerCenterX);
                            const futureDistance = Math.abs(futureCenterX - playerCenterX);
                            
                            if (futureDistance < currentDistance) {
                                canMove = false; // Don't move closer
                            }
                        }
                        
                        if (canMove) {
                            enemy.x = newX;
                        }
                        
                        // Reverse direction at platform edges (stay on platform!)
                        if (enemy.x <= platform.x + 10 || enemy.x >= platform.x + platform.width - enemy.width - 10) {
                            enemy.direction *= -1;
                        }
                        
                        // Move towards player if aggressive and nearby (but respect collision)
                        if (enemy.aiState === 'aggressive' && playerDistance < 120 && Math.abs(this.player.y - enemy.y) < 80 && !currentlyColliding) {
                            enemy.direction = this.player.x > enemy.x ? 1 : -1;
                        }
                    }
                }
            }
            
            // Remove enemies that fall off the world
            if (enemy.y > 700) {
                enemy.alive = false;
            }
        });
    }
    
    updateParticles(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.life -= deltaTime;
            particle.vy += 200 * deltaTime; // gravity
            return particle.life > 0;
        });
    }
    
    checkAttackHits() {
        // Create sword hitbox based on player position and direction
        const swordReach = 70;
        const swordWidth = 50;
        
        let swordX, swordY, swordW, swordH;
        
        if (this.player.direction > 0) {
            // Attacking right
            swordX = this.player.x + this.player.width - 10;
            swordY = this.player.y;
            swordW = swordReach;
            swordH = this.player.height;
        } else {
            // Attacking left  
            swordX = this.player.x - swordReach + 10;
            swordY = this.player.y;
            swordW = swordReach;
            swordH = this.player.height;
        }
        
        const swordRect = { x: swordX, y: swordY, width: swordW, height: swordH };
        
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            const enemyRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
            
            // Check rectangle collision between sword and enemy
            if (this.checkRectCollision(swordRect, enemyRect)) {
                this.hitEnemy(enemy);
            }
        });
    }
    
    checkGoalCollection() {
        this.goals.forEach(goal => {
            if (goal.collected) return;
            
            const dx = goal.x + goal.width/2 - (this.player.x + this.player.width/2);
            const dy = goal.y + goal.height/2 - (this.player.y + this.player.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 40) {
                goal.collected = true;
                this.score += 50; // Bonus points for goals
                this.createGoalEffect(goal.x + goal.width/2, goal.y + goal.height/2);
                this.playSound('goalCollect');
                
                // Create fading "git commit!" message
                this.createFloatingText('git commit! +50', goal.x + goal.width/2, goal.y, '#00ff88');
                
                // Check if all goals collected
                const allGoalsCollected = this.goals.every(g => g.collected);
                if (allGoalsCollected) {
                    this.player.hasWon = true;
                    this.levelComplete = true;
                    this.playSound('victory');
                    this.createConfetti();
                    this.endGame();
                }
            }
        });
    }
    
    checkRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createConfetti() {
        for (let i = 0; i < 50; i++) {
            this.confetti.push({
                x: Math.random() * this.canvas.width,
                y: -20,
                vx: (Math.random() - 0.5) * 200,
                vy: Math.random() * 100 + 50,
                life: 3.0 + Math.random() * 2.0,
                maxLife: 3.0 + Math.random() * 2.0,
                color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8'][Math.floor(Math.random() * 6)],
                size: 4 + Math.random() * 6,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }
    }
    
    updateConfetti(deltaTime) {
        this.confetti = this.confetti.filter(piece => {
            piece.x += piece.vx * deltaTime;
            piece.y += piece.vy * deltaTime;
            piece.vy += 200 * deltaTime; // gravity
            piece.life -= deltaTime;
            piece.rotation += piece.rotationSpeed * deltaTime;
            return piece.life > 0 && piece.y < this.canvas.height + 50;
        });
    }
    
    createAttackEffect() {
        const x = this.player.x + (this.player.direction > 0 ? this.player.width : 0);
        const y = this.player.y + this.player.height / 2;
        
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: this.player.direction * (100 + Math.random() * 100),
                vy: (Math.random() - 0.5) * 100,
                life: 0.3,
                color: '#ffdd44',
                size: 3 + Math.random() * 3
            });
        }
    }
    
    createHitParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: -Math.random() * 150 - 50,
                life: 0.5,
                color: '#ff4444',
                size: 2 + Math.random() * 2
            });
        }
    }
    
    createCommitEffect(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 100,
                vy: -Math.random() * 100 - 20,
                life: 0.8,
                color: '#44ff44',
                size: 2 + Math.random() * 3
            });
        }
    }
    
    createGoalEffect(x, y) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: -Math.random() * 150 - 50,
                life: 1.0,
                color: ['#ffdd44', '#ff44dd', '#44ddff', '#ddff44'][Math.floor(Math.random() * 4)],
                size: 3 + Math.random() * 4
            });
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for camera
        this.ctx.save();
        this.ctx.translate(0, this.camera.y);
        
        // Render background code blocks
        this.renderCodeBlocks();
        
        // Render platforms
        this.renderPlatforms();
        
        // Render enemies
        this.renderEnemies();
        
        // Render goals
        this.renderGoals();
        
        // Render player
        this.renderPlayer();
        
        // Render particles
        this.renderParticles();
        
        // Restore context
        this.ctx.restore();
        
        // Render confetti (outside camera transform)
        this.renderConfetti();
        
        // Render floating texts (outside camera transform)
        this.renderFloatingTexts();
        
        // Render Slack notification (blocks everything)
        this.renderSlackMessage();
        
        // Render UI
        this.renderUI();
    }
    
    renderCodeBlocks() {
        this.ctx.font = '12px monospace';
        this.codeBlocks.forEach(block => {
            // Matrix falling effect
            if (!block.committed) {
                block.y += block.speed * 0.016; // Slow falling
                if (block.y > 650) {
                    block.y = block.initialY - 100; // Reset to top
                }
            }
            
            // Laravel green for committed code, matrix green for falling code
            this.ctx.fillStyle = block.committed ? '#00ff88' : '#00aa44';
            this.ctx.globalAlpha = block.committed ? 0.9 : block.opacity;
            this.ctx.fillText(block.text, block.x, block.y);
            
            // Add glow effect to committed code
            if (block.committed) {
                this.ctx.shadowColor = '#00ff88';
                this.ctx.shadowBlur = 5;
                this.ctx.fillText(block.text, block.x, block.y);
                this.ctx.shadowBlur = 0;
            }
        });
        this.ctx.globalAlpha = 1;
    }
    
    createFloatingText(text, x, y, color) {
        this.floatingTexts.push({
            text: text,
            x: x - this.ctx.measureText(text).width / 2, // Center text
            y: y,
            color: color,
            life: 2.0,
            maxLife: 2.0,
            velocity: -60, // Float upward
            scale: 1.0
        });
    }
    
    updateFloatingTexts(deltaTime) {
        this.floatingTexts = this.floatingTexts.filter(text => {
            text.y += text.velocity * deltaTime;
            text.life -= deltaTime;
            text.scale = 1.0 + (1 - text.life / text.maxLife) * 0.2; // Slight scale up
            return text.life > 0;
        });
    }
    
    renderFloatingTexts() {
        this.floatingTexts.forEach(text => {
            this.ctx.save();
            
            // Calculate fade based on remaining life
            const alpha = Math.min(1, text.life / text.maxLife);
            this.ctx.globalAlpha = alpha;
            
            // Scale and glow effect
            this.ctx.font = `bold ${Math.floor(14 * text.scale)}px Arial`;
            this.ctx.fillStyle = text.color;
            this.ctx.shadowColor = text.color;
            this.ctx.shadowBlur = 10 * alpha;
            
            // Add sparkle effect for positive messages
            if (text.text.includes('+') || text.text.includes('commit')) {
                this.ctx.shadowBlur = 15 * alpha;
                // Random twinkle
                if (Math.random() < 0.3) {
                    this.ctx.shadowBlur = 25 * alpha;
                }
            }
            
            this.ctx.fillText(text.text, text.x, text.y);
            this.ctx.restore();
        });
    }
    
    updateSlackTimer(deltaTime) {
        this.slackTimer += deltaTime;
        
        // Progressive Slack messages: 1 per level 1, 2 per level 2, etc.
        const maxMessagesForLevel = Math.min(this.currentLevel, 5);
        const messagesSentThisLevel = this.slackMessagesSentThisLevel || 0;
        
        // If we haven't reached the message limit for this level
        if (messagesSentThisLevel < maxMessagesForLevel) {
            let interval;
            if (messagesSentThisLevel === 0) {
                // First message appears within 5 seconds
                interval = 1 + Math.random() * 4;
            } else {
                // Subsequent messages are randomly timed
                interval = 15 + Math.random() * 25;
            }
            
            if (this.slackTimer > interval) {
                this.slackTimer = 0;
                this.createSlackMessage();
                this.slackMessagesSentThisLevel = (this.slackMessagesSentThisLevel || 0) + 1;
            }
        }
    }
    
    createSlackMessage() {
        const demandingMessages = [
            {
                sender: "Sarah Chen (PM)",
                message: "Where's the status update on the authentication feature? Client is asking for ETA.",
                urgency: "🔴"
            },
            {
                sender: "Mike Roberts (CEO)",
                message: "We need to ship this today. No excuses. The board meeting is tomorrow.",
                urgency: "🔴"
            },
            {
                sender: "Jennifer Liu (PM)",
                message: "Can you hop on a quick call? Just need 5 minutes to discuss the requirements.",
                urgency: "🟡"
            },
            {
                sender: "David Thompson (CTO)",
                message: "Production is down. Drop everything and fix the payment gateway NOW.",
                urgency: "🔴"
            },
            {
                sender: "Lisa Parker (PM)",
                message: "Client changed their mind again. Need to revert all changes and start over.",
                urgency: "🟡"
            },
            {
                sender: "Robert Kim (CEO)",
                message: "Why is development taking so long? This should be a simple feature.",
                urgency: "🔴"
            },
            {
                sender: "Anna Rodriguez (PM)",
                message: "Can you stay late tonight? We promised the client a demo first thing Monday.",
                urgency: "🟡"
            },
            {
                sender: "James Wilson (CTO)",
                message: "The database is corrupted. Please tell me you have backups ready.",
                urgency: "🔴"
            },
            {
                sender: "Michelle Chang (PM)",
                message: "Marketing needs the API docs by EOD. Can you prioritize this?",
                urgency: "🟡"
            },
            {
                sender: "Steven Davis (CEO)",
                message: "Investors are coming tomorrow. This demo better work perfectly.",
                urgency: "🔴"
            }
        ];
        
        const randomMessage = demandingMessages[Math.floor(Math.random() * demandingMessages.length)];
        this.activeSlackMessage = {
            ...randomMessage,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        
        // Play Slack notification sound
        this.playSound('slackNotification');
    }
    
        renderSlackMessage() {
        if (!this.activeSlackMessage) return;
        
        // Save current canvas state before drawing overlay
        this.ctx.save();
        
        // Block entire game with semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Slack notification window
        const msgWidth = 400;
        const msgHeight = 200;
        const msgX = (this.canvas.width - msgWidth) / 2;
        const msgY = (this.canvas.height - msgHeight) / 2;
        
        // Slack window background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(msgX, msgY, msgWidth, msgHeight);
        
        // Slack header bar
        this.ctx.fillStyle = '#4a154b';
        this.ctx.fillRect(msgX, msgY, msgWidth, 40);
        
        // Slack logo area
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('💬 Slack', msgX + 15, msgY + 25);
        
        // Close button
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText('×', msgX + msgWidth - 30, msgY + 28);
        
        // Message content area
        this.ctx.fillStyle = '#f8f8f8';
        this.ctx.fillRect(msgX + 10, msgY + 50, msgWidth - 20, msgHeight - 80);
        
        // Sender info
        this.ctx.fillStyle = '#1d1c1d';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(this.activeSlackMessage.sender, msgX + 20, msgY + 75);
        
        // Timestamp and urgency
        this.ctx.fillStyle = '#616061';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(this.activeSlackMessage.timestamp, msgX + 20, msgY + 95);
        this.ctx.fillText(this.activeSlackMessage.urgency, msgX + msgWidth - 40, msgY + 75);
        
        // Message text (word wrap)
        this.ctx.fillStyle = '#1d1c1d';
        this.ctx.font = '13px Arial';
        const words = this.activeSlackMessage.message.split(' ');
        let line = '';
        let lineY = msgY + 115;
        
        words.forEach(word => {
            const testLine = line + word + ' ';
            const metrics = this.ctx.measureText(testLine);
            if (metrics.width > msgWidth - 40 && line !== '') {
                this.ctx.fillText(line, msgX + 20, lineY);
                line = word + ' ';
                lineY += 18;
            } else {
                line = testLine;
            }
        });
        this.ctx.fillText(line, msgX + 20, lineY);
        
        // Dismiss button
        this.ctx.fillStyle = '#007a5a';
        this.ctx.fillRect(msgX + msgWidth - 80, msgY + msgHeight - 35, 60, 25);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText('Dismiss', msgX + msgWidth - 72, msgY + msgHeight - 20);
        
        // Store click area for the close/dismiss buttons
        this.slackCloseArea = {
            x: msgX + msgWidth - 80,
            y: msgY + msgHeight - 35,
            width: 60,
            height: 25
        };
        this.slackXArea = {
            x: msgX + msgWidth - 40,
            y: msgY,
            width: 40,
            height: 40
        };
        
        // Restore canvas state after drawing overlay
        this.ctx.restore();
    }
    
    renderConfetti() {
        this.confetti.forEach(piece => {
            this.ctx.save();
            this.ctx.translate(piece.x, piece.y);
            this.ctx.rotate(piece.rotation);
            this.ctx.fillStyle = piece.color;
            this.ctx.globalAlpha = piece.life / piece.maxLife;
            this.ctx.fillRect(-piece.size/2, -piece.size/2, piece.size, piece.size);
            this.ctx.restore();
        });
        this.ctx.globalAlpha = 1;
    }
    
    renderPlatforms() {
        this.platforms.forEach((platform, index) => {
            // Darker background for better text contrast
            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Gray/green visible border
            this.ctx.strokeStyle = '#6b7280'; // Gray
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            
            // Green accent border on top
            this.ctx.strokeStyle = '#10b981'; // Green
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(platform.x, platform.y);
            this.ctx.lineTo(platform.x + platform.width, platform.y);
            this.ctx.stroke();
            
            // Special rendering for ground platform (index 0)
            if (index === 0) {
                // Ground platform - terminal/console style
                this.ctx.fillStyle = '#0f172a'; // Dark terminal background
                this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                
                // Terminal green border
                this.ctx.strokeStyle = '#00ff41';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
                
                // Terminal prompt and commands
                this.ctx.fillStyle = '#00ff41';
                this.ctx.font = 'bold 10px monospace';
                this.ctx.fillText('~/tighten-game$', platform.x + 8, platform.y + 15);
                this.ctx.fillText('> npm run dev', platform.x + 8, platform.y + 28);
                this.ctx.fillText('> Server running on localhost:3000', platform.x + 8, platform.y + 41);
                this.ctx.fillText('> Ready for deployment...', platform.x + 8, platform.y + 54);
                
                return; // Skip the rest for ground platform
            }
            
            // Calculate how many characters can fit in platform width
            this.ctx.font = 'bold 9px monospace';
            const pattern = '/*********/';
            const charWidth = this.ctx.measureText('*').width;
            const availableWidth = platform.width - 8; // 4px margin on each side
            const charsToFit = Math.floor(availableWidth / charWidth);
            
            // Create repeating pattern that fits exactly
            let platformText = '';
            for (let i = 0; i < charsToFit; i++) {
                platformText += pattern[i % pattern.length];
            }
            
            // Render the pattern
            this.ctx.fillStyle = '#ffffff'; // Bright white for maximum visibility
            this.ctx.fillText(platformText, platform.x + 4, platform.y + 14); // Centered in 20px height
            
            // Left accent line
            this.ctx.fillStyle = '#10b981';
            this.ctx.fillRect(platform.x + 2, platform.y + 2, 2, platform.height - 4);
        });
    }
    
    renderEnemies() {
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            // Calculate position offsets first
            const fontSize = enemy.type === 'boss' ? '36px' : '24px';
            let xOffset = enemy.type === 'boss' ? 12 : 8;
            let yOffset = enemy.type === 'boss' ? 42 : 28;
            
            // Enhanced damage and glow effect
            this.ctx.save();
            const pulseIntensity = Math.sin(Date.now() * 0.008) * 0.3 + 0.7; // 0.4 to 1.0
            
            if (enemy.hitCooldown > 0) {
                // DRAMATIC damage effect - much more pronounced
                const damageIntensity = enemy.hitCooldown / 0.3; // 0.3s damage effect
                
                // Multiple colored shadows for impact
                this.ctx.shadowColor = '#ffffff';
                this.ctx.shadowBlur = 40 * damageIntensity;
                this.ctx.font = `${fontSize} Arial`;
                this.ctx.fillText(enemy.emoji, enemy.x + xOffset, enemy.y + yOffset);
                
                this.ctx.shadowColor = '#ff0000';
                this.ctx.shadowBlur = 30 * damageIntensity;
                this.ctx.fillText(enemy.emoji, enemy.x + xOffset, enemy.y + yOffset);
                
                this.ctx.shadowColor = '#ffff00';
                this.ctx.shadowBlur = 20 * damageIntensity;
                
                // Screen flash effect - draw damage indicator
                this.ctx.save();
                this.ctx.globalAlpha = damageIntensity * 0.8;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillText('-25', enemy.x + enemy.width/2 + (Math.random() - 0.5) * 20, enemy.y - 15 - (1 - damageIntensity) * 20);
                this.ctx.restore();
                
                // Damage particles/sparks
                if (Math.random() < 0.3) {
                    this.createHitParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                }
            } else {
                // Pulsing red glow normally
                const glowIntensity = Math.floor(pulseIntensity * 255).toString(16).padStart(2, '0');
                this.ctx.shadowColor = `#ff${glowIntensity}${glowIntensity}`;
                this.ctx.shadowBlur = 8 + (pulseIntensity * 8); // 8-16px blur
            }
            
            // Set font for emoji rendering
            this.ctx.font = `${fontSize} Arial`;
            
            // Render enemy emoji (always visible)
            this.ctx.fillText(enemy.emoji, enemy.x + xOffset, enemy.y + yOffset);
            
            // Spotted indicator when enemy has seen player
            if (enemy.hasSeenPlayer && enemy.aiState !== 'patrol') {
                this.ctx.save();
                
                if (enemy.startleProgress > 0) {
                    // During startle - show dramatic exclamation with shake
                    const shakeX = (Math.random() - 0.5) * enemy.startleProgress * 4;
                    const shakeY = (Math.random() - 0.5) * enemy.startleProgress * 4;
                    
                    // Large exclamation mark
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.shadowColor = '#ffff00';
                    this.ctx.shadowBlur = 10;
                    this.ctx.fillText('!', enemy.x + enemy.width/2 - 6 + shakeX, enemy.y - 10 + shakeY);
                    
                    // Additional visual effects during startle
                    this.ctx.strokeStyle = '#ff4444';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 30 + enemy.startleProgress * 10, 0, Math.PI * 2);
                    this.ctx.stroke();
                } else if (enemy.aiState === 'aggressive') {
                    // When aggressive - show smaller exclamation indicator
                    this.ctx.fillStyle = '#ff6666';
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.shadowColor = '#ff6666';
                    this.ctx.shadowBlur = 5;
                    this.ctx.fillText('!', enemy.x + enemy.width/2 - 3, enemy.y - 5);
                }
                
                this.ctx.restore();
            }
            
            this.ctx.restore(); // Always restore since we always apply glow
            
            // Health bar
            const healthBarWidth = enemy.width;
            const healthPercent = enemy.health / enemy.maxHealth;
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth, 4);
            this.ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : '#ff4444';
            this.ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth * healthPercent, 4);
        });
    }
    
    renderGoals() {
        this.goals.forEach(goal => {
            if (goal.collected) return;
            
            // Goal background glow (no visible box)
            this.ctx.save();
            this.ctx.shadowColor = '#ffdd44';
            this.ctx.shadowBlur = 20;
            
            // Goal emoji with floating animation
            const floatOffset = Math.sin(Date.now() * 0.005) * 3;
            this.ctx.font = '24px Arial';
            this.ctx.fillText(goal.emoji, goal.x + 3, goal.y + 22 + floatOffset);
            this.ctx.restore();
        });
    }
    
    renderPlayer() {
        const { x, y, width, height, direction, isAttacking, attackProgress } = this.player;
        
        // Draw octopus asset (no purple box!)
        if (this.assets.octopus) {
            this.ctx.save();
            if (direction < 0) {
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(this.assets.octopus, -(x + width), y, width, height);
            } else {
                this.ctx.drawImage(this.assets.octopus, x, y, width, height);
            }
            this.ctx.restore();
        } else {
            // Fallback if image doesn't load - just draw a simple octopus shape
            this.ctx.fillStyle = '#9333ea';
            this.ctx.fillRect(x, y, width, height);
        }
        
        // Draw sword - always visible, enhanced during attack
        if (this.assets.sword) {
            this.ctx.save();
            
            // Calculate sword position and rotation
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            
            let currentAngle, swordOpacity, swordWidth, swordHeight;
            
            // Maintain aspect ratio based on the blade image natural dimensions
            const baseWidth = 60;
            const baseHeight = 20;
            const aspectRatio = baseWidth / baseHeight; // 3:1 ratio
            
            if (isAttacking) {
                // BOTH directions: simple up-to-down swing (-60° to +60°)
                const startAngle = -Math.PI / 3;  // Always start from up (-60°)
                const endAngle = Math.PI / 3;     // Always end at down (+60°)
                currentAngle = startAngle + (endAngle - startAngle) * attackProgress;
                
                // Debug logging to confirm identical angles
                if (attackProgress < 0.01) {
                    console.log(`Attack started - Direction: ${direction > 0 ? 'RIGHT' : 'LEFT'}, Start angle: ${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
                } else if (attackProgress > 0.99) {
                    console.log(`Attack ended - Direction: ${direction > 0 ? 'RIGHT' : 'LEFT'}, End angle: ${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
                }
                
                swordOpacity = 0.9 + attackProgress * 0.1;
                // Scale up during attack while maintaining aspect ratio
                const scale = 1 + attackProgress * 0.4; // 1.0 to 1.4x scale
                swordWidth = baseWidth * scale;
                swordHeight = baseHeight * scale;
            } else {
                // Sword rests at ready position when not attacking
                currentAngle = direction > 0 ? -Math.PI / 12 : Math.PI / 12; // 15 degrees
                swordOpacity = 0.85;
                swordWidth = baseWidth;
                swordHeight = baseHeight;
            }
            
            // Position sword at the end of the arc - different sides based on direction
            const swordDistance = 40;
            let swordX, swordY;
            if (direction > 0) {
                // Right-facing: sword on the right side
                swordX = centerX + Math.cos(currentAngle) * swordDistance;
                swordY = centerY + Math.sin(currentAngle) * swordDistance;
            } else {
                // Left-facing: sword on the left side, but SAME swing motion
                swordX = centerX - Math.cos(currentAngle) * swordDistance; // Flip X position
                swordY = centerY + Math.sin(currentAngle) * swordDistance; // Same Y motion
            }
            
            // Translate to sword position and rotate
            this.ctx.translate(swordX, swordY);
            
            if (direction < 0) {
                // When facing left, flip the sword horizontally so handle stays towards octopus
                this.ctx.scale(-1, 1);
            }
            
            // SAME rotation for both directions
            this.ctx.rotate(currentAngle);
            
            // Add sword glow effect
            if (isAttacking) {
                this.ctx.shadowColor = '#00d4ff';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            } else {
                this.ctx.shadowColor = '#4f46e5';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            }
            
            this.ctx.globalAlpha = swordOpacity;
            this.ctx.drawImage(this.assets.sword, -swordWidth/2, -swordHeight/2, swordWidth, swordHeight);
            this.ctx.globalAlpha = 1;
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            
            this.ctx.restore();
        }
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 0.5;
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        });
        this.ctx.globalAlpha = 1;
    }
    
    renderUI() {
        // Update health bar
        const healthPercent = this.player.health / this.player.maxHealth;
        document.getElementById('healthFill').style.width = `${healthPercent * 80}px`;
        
        // Update score and level
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.currentLevel;
    }
    
    endGame() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').style.display = 'flex';
        
        const gameOverScreen = document.getElementById('gameOverScreen');
        const h1Element = gameOverScreen.querySelector('h1');
        const pElement = gameOverScreen.querySelector('p');
        const nextLevelButton = document.getElementById('nextLevelButton');
        const restartButton = document.getElementById('restartButton');
        
        const creditsButton = document.getElementById('creditsButton');
        
        if (this.player.hasWon) {
            if (this.currentLevel < this.maxLevel) {
                h1Element.innerHTML = `<strong>✅ LEVEL ${this.currentLevel} COMPLETE! 🎉</strong>`;
                pElement.textContent = `Pull request approved! Ready for level ${this.currentLevel + 1}?`;
                nextLevelButton.style.display = 'inline-block';
                creditsButton.style.display = 'none';
                restartButton.textContent = 'Restart Game';
            } else {
                // Final victory - calculate completion time
                this.gameCompletionTime = Date.now();
                const totalTime = Math.round((this.gameCompletionTime - this.gameStartTime) / 1000);
                const minutes = Math.floor(totalTime / 60);
                const seconds = totalTime % 60;
                
                h1Element.innerHTML = '<strong>🚀 YOU SHIPPED IT! 🎉</strong>';
                pElement.innerHTML = `<strong>Congratulations!</strong> You've mastered all 5 levels and successfully shipped the entire Laravel codebase to production!<br><br><strong>⏱️ Total Time: ${minutes}:${seconds.toString().padStart(2, '0')}</strong>`;
                nextLevelButton.style.display = 'none';
                creditsButton.style.display = 'inline-block';
                restartButton.textContent = 'Ship Again!';
            }
        } else if (this.player.health <= 0) {
            h1Element.innerHTML = '<strong>💥 FATAL ERROR 💥</strong>';
            pElement.textContent = 'Your code was corrupted by bugs! Time to debug and try again.';
            nextLevelButton.style.display = 'none';
            creditsButton.style.display = 'none';
            restartButton.textContent = 'Try Again';
        } else {
            h1Element.innerHTML = '<strong>⚠️ DEPLOYMENT FAILED ⚠️</strong>';
            pElement.textContent = 'Something went wrong in the pipeline. Check your logs and retry!';
            nextLevelButton.style.display = 'none';
            creditsButton.style.display = 'none';
            restartButton.textContent = 'Try Again';
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.016); // Cap at 60fps
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.handleInput(deltaTime);
            this.updatePhysics(deltaTime);
            this.gameTime += deltaTime;
        }
        
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TightenTowerGame();
}); 