# 🐙 Git Over It - Code Climbing Adventure

An epic browser-based game where an octopus developer armed with a sword must ascend a tower of legacy code, battling programming enemies and shipping clean code to reach the summit!

## 🎮 Game Features

- **Quick Learning Curve**: Master the game in under a minute
- **Perfect Sessions**: Designed for 5-minute play sessions  
- **Cross-Platform**: Works on desktop (keyboard) and mobile (touch controls)
- **Programming Theme**: Battle bugs 🐛, git conflicts ⚡, legacy code 💩, and timeouts ⏰
- **Code Commitment**: Defeated enemies become committed code in the background
- **Modern Web Standards**: Built with vanilla HTML5, CSS3, and ES6+ JavaScript

## 🚀 Quick Start with DDEV

This project is configured to run locally using DDEV:

```bash
# Start the development environment
ddev start

# The game will be available at:
# http://git-over-it.ddev.site
```

## 🎯 How to Play

### Desktop Controls
- **Arrow Keys / WASD**: Move the octopus
- **Space**: Swing sword to attack enemies
- **Up Arrow / W**: Jump to higher platforms

### Mobile Controls  
- **Touch Joystick**: Move in any direction
- **Attack Button (⚔️)**: Swing sword
- **Joystick Up**: Jump to platforms

### Objective
1. Climb the tower by jumping between platforms
2. Slay programming enemies with your sword
3. Collect goals to commit code and advance levels
4. Complete all 5 levels to ship your code and win!
5. Watch out for distractions from your project manager!
6. Avoid falling off platforms or taking too much damage

## 🎨 Game Assets

The game uses two main visual assets:
- `octopus-asset.png` - Our heroic developer octopus
- `blade-right-asset.png` - The legendary debugging sword

## 🏗️ Technical Architecture

### File Structure
```
public/
├── index.html      # Main game page
├── style.css       # Modern responsive styling  
└── game.js         # Core game engine

.ddev/
└── config.yaml     # DDEV configuration
```

### Game Engine Features
- **Canvas Rendering**: Smooth 60fps HTML5 canvas graphics
- **Physics System**: Gravity, collision detection, and platforming
- **AI Enemies**: Smart enemy behavior (patrol, startled, aggressive states)
- **Particle Effects**: Visual feedback for attacks, hits, and goal collection
- **Multi-Level System**: 5 levels with increasing difficulty
- **Slack Interruptions**: Realistic project manager distractions
- **Electric Neon Theme**: Modern cyberpunk visual design
- **Responsive Design**: Adapts to any screen size
- **Touch Controls**: Native mobile support
- **Secret Features**: Hidden credits access (Shift+C)

### Modern Web Standards (2025)
- ES6+ JavaScript with classes and async/await
- CSS Grid and Flexbox layouts
- CSS Custom Properties (variables)
- Backdrop filters and modern effects
- Touch API for mobile controls
- Canvas 2D API for smooth rendering

## 🐛 Enemy Types

| Enemy | Health | Speed | Points | Behavior |
|-------|--------|-------|--------|----------|
| 🐛 Bug | 30 | 50 | 10 | Basic patrol |
| ⚡ Git Conflict | 40 | 60 | 15 | Aggressive chase |
| 💩 Legacy Code | 50 | 30 | 20 | Slow but tough |
| ⏰ Timeout | 25 | 80 | 12 | Fast moving |

## 🏆 Scoring System

- **Bugs Slayed**: Points earned from defeating enemies
- **Level Progress**: Track your ascent through 5 levels
- **Speedrun Timer**: Complete all levels as fast as possible
- **Health Management**: Avoid damage to maximize your climb
- **Victory Condition**: Complete all 5 levels to ship your code!

## 🔧 Development

The game is built entirely with vanilla web technologies:
- No frameworks or libraries required
- Modern JavaScript ES6+ features
- Responsive CSS with custom properties
- HTML5 Canvas for game rendering

## 📱 Browser Compatibility

Tested and optimized for:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎊 Credits

**Developers:** Chris, Mitch, and Claude  
**Brought to you by:** Bluehouse Group

Created as an indie web game celebrating the trials and triumphs of software development. May your deployments be bug-free and your project managers be understanding! 🚀

**Secret:** Press Shift+C anytime to view credits! 🤫

---

**Happy Climbing!** 🐙⚔️
