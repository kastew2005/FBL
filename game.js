window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const startBtn = document.getElementById('start-btn');
    const menuScreen = document.getElementById('menu-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const progressFill = document.getElementById('progress-fill');

    // Прогресс загрузки
    let p = 0;
    const interval = setInterval(() => {
        p += 25;
        progressFill.style.width = p + '%';
        if (p >= 100) {
            clearInterval(interval);
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }
    }, 150);

    // Three.js Инициализация
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Освещение
    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(20, 40, 20);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Подключение компонентов
    const materials = createBlockMaterials();
    const world = new World(scene, materials);
    world.generate();

    const physics = new PhysicsEngine(world);
    const player = new Player(camera);
    new Villager(scene, 2, 5, 2);

    // События управления
    startBtn.addEventListener('click', () => {
        menuScreen.style.display = 'none';
        canvas.requestPointerLock();
    });

    let keys = {};
    document.addEventListener('keydown', (e) => keys[e.code] = true);
    document.addEventListener('keyup', (e) => keys[e.code] = false);

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === canvas) {
            camera.rotation.y -= e.movementX * 0.002;
            camera.rotation.x -= e.movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    // Игровой цикл
    let lastTime = performance.now();
    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        // Перемещение
        const speed = player.speed;
        if (keys['KeyW']) camera.translateZ(-speed);
        if (keys['KeyS']) camera.translateZ(speed);
        if (keys['KeyA']) camera.translateX(-speed);
        if (keys['KeyD']) camera.translateX(speed);

        physics.applyPhysics(player, dt);
        renderer.render(scene, camera);
    }

    animate();
});
