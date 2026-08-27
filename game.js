// Инициализация Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// Игрок
const player = {
    position: new THREE.Vector3(0, 1.7, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    health: 100,
    stamina: 100,
    onGround: false,
    rotation: { x: 0, y: 0 },
    takeDamage: function(damage) {
        this.health -= damage;
        updateHealthDisplay();
        
        if (this.health <= 0) {
            this.die();
        }
    },
    die: function() {
        document.getElementById('death-screen').style.display = 'block';
        document.getElementById('final-score').textContent = document.getElementById('score').textContent;
        document.getElementById('final-wave').textContent = document.getElementById('wave').textContent;
        gameRunning = false;
    }
};

// Системы
let world, weaponSystem, zombieSystem;
let gameRunning = false;
const keys = {};

// Инициализация игры
function initGame() {
    world = new World(scene);
    weaponSystem = new WeaponSystem(scene, camera);
    zombieSystem = new ZombieSystem(scene, player);
    
    camera.position.copy(player.position);
    gameRunning = true;
    
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('death-screen').style
