# 🏆 Leaderboard Implementation Guide for Git Over It

## Yes, it's absolutely possible! Here are your options:

### Option 1: PHP + MySQL (Recommended for DDEV)
Since you're using DDEV, this is the most natural fit:

```php
// api/leaderboard.php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$pdo = new PDO('mysql:host=db;dbname=db', 'db', 'db');

if ($_POST) {
    // Submit score
    $stmt = $pdo->prepare("INSERT INTO scores (player_name, completion_time, timestamp) VALUES (?, ?, NOW())");
    $stmt->execute([$_POST['name'], $_POST['time']]);
    echo json_encode(['success' => true]);
} else {
    // Get top 10 scores
    $stmt = $pdo->query("SELECT player_name, completion_time, timestamp FROM scores ORDER BY completion_time ASC LIMIT 10");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}
?>
```

```sql
-- Database schema
CREATE TABLE scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_name VARCHAR(50) NOT NULL,
    completion_time INT NOT NULL, -- seconds to complete all 5 levels
    timestamp DATETIME NOT NULL,
    INDEX idx_time (completion_time)
);
```

### Option 2: Local Storage (Simple, but not shared)
```javascript
// In game.js - add to final victory
function saveLocalScore(time) {
    const scores = JSON.parse(localStorage.getItem('gitOverItScores') || '[]');
    const name = prompt('New record! Enter your name:');
    scores.push({ name, time, date: new Date().toISOString() });
    scores.sort((a, b) => a.time - b.time);
    localStorage.setItem('gitOverItScores', JSON.stringify(scores.slice(0, 10)));
}
```

### Option 3: Firebase (Cloud-based, truly shared)
```javascript
// Firebase setup for shared leaderboard
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function submitScore(name, time) {
    await addDoc(collection(db, 'scores'), {
        name, time, timestamp: new Date()
    });
}

async function getLeaderboard() {
    const q = query(collection(db, 'scores'), orderBy('time'), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}
```

### Option 4: JSON File (Quick & dirty)
```php
// api/scores.json - simple file-based storage
<?php
$file = 'scores.json';
if ($_POST) {
    $scores = json_decode(file_get_contents($file) ?: '[]', true);
    $scores[] = ['name' => $_POST['name'], 'time' => $_POST['time'], 'date' => date('c')];
    usort($scores, fn($a, $b) => $a['time'] - $b['time']);
    file_put_contents($file, json_encode(array_slice($scores, 0, 10)));
} else {
    echo file_get_contents($file);
}
?>
```

## Implementation Steps:

1. **Add to DDEV config** (`ddev/config.yaml`):
```yaml
database:
  type: mysql
  version: "8.0"
```

2. **Create the database table** (run `ddev ssh` then mysql commands)

3. **Add leaderboard UI** to your game completion screen

4. **Integrate API calls** in the game's final victory function

## UI Integration Example:
```javascript
// Add to final victory in endGame()
if (totalTime < 300) { // Under 5 minutes = potential record
    const name = prompt('🏆 Amazing time! Enter name for leaderboard:');
    if (name) {
        fetch('/api/leaderboard.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `name=${encodeURIComponent(name)}&time=${totalTime}`
        });
    }
}
```

**Recommendation:** Start with Option 1 (PHP + MySQL) since you already have DDEV running. It's the most robust and fits your existing setup perfectly! 