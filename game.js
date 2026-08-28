// Игровые константы
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

// Состояние игры
let gameState = 'menu';
let player, zombies = [], bullets = [], pickups = [], particles = [];
let score = 0, kills = 0, gameTime = 0;
let keys = {};
let mouseX = 0, mouseY = 0;
let shooting = false;
let lastShotTime = 0;
let spawnTimer = 0;
let difficulty = 1;
let bestScore = localStorage.getItem('bestScore') || 0;

// Класс игрока
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 150;
        this.health = 100;
        this.maxHealth = 100;
        this.ammo = 12;
        this.maxAmmo = 12;
        this.angle = 0;
        this.alive = true;
        this.hitFlash = 0;
    }

    update(dt) {
        if (!this.alive) return;
        
        // Движение
        let dx = 0, dy = 0;
        if (keys['w'] || keys['arrowup']) dy = -1;
        if (keys['s'] || keys['arrowdown']) dy = 1;
        if (keys['a'] || keys['arrowleft']) dx = -1;
        if (keys['d'] || keys['arrowright']) dx = 1;
        
        // Джойстик
        if (joystickActive) {
            dx = joystickDX;
            dy = joystickDY;
        }
        
        // Нормализация
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }
        
        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;
        
        // Границы
        this.x = Math.max(this.width / 2, Math.min(CANVAS_WIDTH - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(CANVAS_HEIGHT - this.height / 2, this.y));
        
        // Угол к мыши
        this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Тело
        ctx.fillStyle = this.hitFlash > 0 ? '#ff0000' : '#4a8f4a';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Оружие
        ctx.rotate(this.angle);
        ctx.fillStyle = '#333';
        ctx.fillRect(10, -3, 25, 6);
        ctx.fillRect(30, -5, 8, 10);
        
        ctx.restore();
    }
}

// Класс зомби
class Zombie {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 28;
        this.type = type || 'normal';
        this.alive = true;
        this.hitFlash = 0;
        
        switch(this.type) {
            case 'fast':
                this.speed = 120 + difficulty * 5;
                this.health = 50;
                this.damage = 8;
                this.color = '#ff9900';
                break;
            case 'tank':
                this.speed = 40 + difficulty * 2;
                this.health = 150;
                this.damage = 20;
                this.width = 40;
                this.height = 40;
                this.color = '#ff0000';
                break;
            default: // normal
                this.speed = 70 + difficulty * 5;
                this.health = 50;
                this.damage = 10;
                this.color = '#66aa66';
        }
    }

    update(dt) {
        if (!this.alive) return;
        
        // Движение к игроку
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }
        
        // Проверка столкновения с игроком
        if (dist < (this.width + player.width) / 2) {
            player.health -= this.damage * dt * 2;
            player.hitFlash = 0.1;
            if (player.health <= 0) {
                player.health = 0;
                player.alive = false;
                gameOver();
            }
        }
        
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Тело
        ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Глаза
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-this.width / 4, -this.height / 4, 6, 6);
        ctx.fillRect(this.width / 4 - 6, -this.height / 4, 6, 6);
        
        ctx.restore();
    }
}

// Класс пули
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.speed = 500;
        this.damage = 25;
        this.radius = 4;
        this.alive = true;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.life = 2; // секунды
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        
        if (this.life <= 0 || this.x < 0 || this.x > CANVAS_WIDTH || 
            this.y < 0 || this.y > CANVAS_HEIGHT) {
            this.alive = false;
        }
        
        // Проверка попадания
        for (let zombie of zombies) {
            if (!zombie.alive) continue;
            const dist = Math.sqrt((this.x - zombie.x) ** 2 + (this.y - zombie.y) ** 2);
            if (dist < (zombie.width + this.radius) / 2) {
                zombie.health -= this.damage;
                zombie.hitFlash = 0.1;
                this.alive = false;
                
                if (zombie.health <= 0) {
                    zombie.alive = false;
                    kills++;
                    score += 10;
                    spawnParticles(zombie.x, zombie.y, zombie.color);
                }
                break;
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Класс пикапа
class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'health' или 'ammo'
        this.width = 20;
        this.height = 20;
        this.alive = true;
        this.bob = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.bob += dt * 3;
        
        // Проверка подбора
        const dist = Math.sqrt((this.x - player.x) ** 2 + (this.y - player.y) ** 2);
        if (dist < (this.width + player.width) / 2) {
            if (this.type === 'health') {
                player.health = Math.min(player.maxHealth, player.health + 30);
            } else if (this.type === 'ammo') {
                player.ammo = Math.min(player.maxAmmo, player.ammo + 6);
            }
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        
        const bounceY = this.y + Math.sin(this.bob) * 5;
        
        ctx.save();
        ctx.translate(this.x, bounceY);
        
        if (this.type === 'health') {
            // Аптечка
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-6, -2, 12, 4);
            ctx.fillRect(-2, -6, 4, 12);
        } else {
            // Патроны
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(-8, -4, 8, 8);
            ctx.fillRect(0, -4, 8, 8);
            ctx.fillStyle = '#cc8800';
            ctx.fillRect(-8, -8, 16, 4);
        }
        
        ctx.restore();
    }
}

// Частицы
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.life = 0.5;
        this.maxLife = 0.5;
        this.color = color;
        this.radius = Math.random() * 3 + 1;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.vy += 200 * dt; // гравитация
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Инициализация
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Джойстик
let joystickActive = false;
let joystickDX = 0;
let joystickDY = 0;

// Функции экранов
function showMainMenu() {
    gameState = 'menu';
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('controlsScreen').classList.add('hidden');
    document.getElementById('aboutScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('deathScreen').classList.add('hidden');
}

function showControls() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('controlsScreen').classList.remove('hidden');
}

function showAbout() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('aboutScreen').classList.remove('hidden');
}

function startGame() {
    gameState = 'playing';
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('deathScreen').classList.add('hidden');
    
    resetGame();
}

function restartGame() {
    document.getElementById('deathScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    resetGame();
}

function gameOver() {
    gameState = 'dead';
    document.getElementById('finalKills').textContent = kills;
    document.getElementById('finalTime').textContent = Math.floor(gameTime) + 'с';
    
    if (kills > bestScore) {
        bestScore = kills;
        localStorage.setItem('bestScore', bestScore);
    }
    document.getElementById('bestScore').textContent = bestScore;
    
    setTimeout(() => {
        document.getElementById('deathScreen').classList.remove('hidden');
    }, 1000);
}

function resetGame() {
    player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    zombies = [];
    bullets = [];
    pickups = [];
    particles = [];
    score = 0;
    kills = 0;
    gameTime = 0;
    difficulty = 1;
    spawnTimer = 0;
    
    // Начальные пикапы
    for (let i = 0; i < 3; i++) {
        spawnPickup();
    }
}

function spawnZombie() {
    const type = Math.random();
    let zombieType = 'normal';
    if (type < 0.7) zombieType = 'normal';
    else if (type < 0.9) zombieType = 'fast';
    else zombieType = 'tank';
    
    // Спавн за пределами экрана
    let x, y;
    const side = Math.floor(Math.random() * 4);
    switch(side) {
        case 0: x = Math.random() * CANVAS_WIDTH; y = -20; break;
        case 1: x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + 20; break;
        case 2: x = -20; y = Math.random() * CANVAS_HEIGHT; break;
        case 3: x = CANVAS_WIDTH + 20; y = Math.random() * CANVAS_HEIGHT; break;
    }
    
    zombies.push(new Zombie(x, y, zombieType));
}

function spawnPickup() {
    const x = Math.random() * (CANVAS_WIDTH - 40) + 20;
    const y = Math.random() * (CANVAS_HEIGHT - 40) + 20;
    const type = Math.random() < 0.5 ? 'health' : 'ammo';
    pickups.push(new Pickup(x, y, type));
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function shoot() {
    const now = Date.now();
    if (now - lastShotTime < 300) return; // Ограничение скорострельности
    if (player.ammo <= 0) return;
    
    lastShotTime = now;
    player.ammo--;
    bullets.push(new Bullet(player.x, player.y, player.angle));
}

// Обработчики ввода
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        shooting = true;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        shooting = false;
    }
});

// Мобильное управление
const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystickKnob');
const shootBtn = document.getElementById('shootBtn');

joystick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
});

joystick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const touch = e.touches[0];
    
    let dx = (touch.clientX - centerX) / (rect.width / 2);
    let dy = (touch.clientY - centerY) / (rect.height / 2);
    
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
        dx /= dist;
        dy /= dist;
    }
    
    joystickDX = dx;
    joystickDY = dy;
    
    joystickKnob.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
});

joystick.addEventListener('touchend', (e) => {
    joystickActive = false;
    joystickDX = 0;
    joystickDY = 0;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
});

shootBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    shooting = true;
});

shootBtn.addEventListener('touchend', (e) => {
    shooting = false;
});

// Игровой цикл
let lastTime = Date.now();

function gameLoop() {
    const now = Date.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    
    if (gameState === 'playing') {
        update(dt);
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    gameTime += dt;
    difficulty = 1 + gameTime / 30; // Увеличение сложности
    
    // Обновление игрока
    player.update(dt);
    
    // Стрельба
    if (shooting && player.alive) {
        shoot();
    }
    
    // Спавн зомби
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnZombie();
        spawnTimer = Math.max(0.5, 2 - difficulty * 0.2);
    }
    
    // Обновление зомби
    for (let zombie of zombies) {
        zombie.update(dt);
    }
    zombies = zombies.filter(z => z.alive);
    
    // Обновление пуль
    for (let bullet of bullets) {
        bullet.update(dt);
    }
    bullets = bullets.filter(b => b.alive);
    
    // Обновление пикапов
    for (let pickup of pickups) {
        pickup.update(dt);
    }
    pickups = pickups.filter(p => p.alive);
    
    // Спавн пикапов
    if (pickups.length < 2 && Math.random() < 0.01) {
        spawnPickup();
    }
    
    // Обновление частиц
    for (let particle of particles) {
        particle.update(dt);
    }
    particles = particles.filter(p => p.life > 0);
    
    // Обновление HUD
    updateHUD();
}

function updateHUD() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('ammoCount').textContent = `${player.ammo}/${player.maxAmmo}`;
    document.getElementById('killCount').textContent = kills;
    document.getElementById('timeCount').textContent = Math.floor(gameTime) + 'с';
}

function draw() {
    // Очистка
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Сетка (пол)
    ctx.strokeStyle = '#2a4a2a';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }
    
    if (gameState === 'playing' || gameState === 'dead') {
        // Рисование пикапов
        for (let pickup of pickups) {
            pickup.draw(ctx);
        }
        
        // Рисование зомби
        for (let zombie of zombies) {
            zombie.draw(ctx);
        }
        
        // Рисование пуль
        for (let bullet of bullets) {
            bullet.draw(ctx);
        }
        
        // Рисование игрока
        player.draw(ctx);
        
        // Рисование частиц
        for (let particle of particles) {
            particle.draw(ctx);
        }
    }
}

// Запуск игры
showMainMenu();
gameLoop();