window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const startBtn = document.getElementById('start-btn');
    const menuScreen = document.getElementById('menu-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const progressFill = document.getElementById('progress-fill');
    const mobileControls = document.getElementById('mobile-controls');

    // Экран загрузки
    let p = 0;
    const interval = setInterval(() => {
        p += 20;
        if (progressFill) progressFill.style.width = p + '%';
        if (p >= 100) {
            clearInterval(interval);
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.style.display = 'none', 500);
            }
        }
    }, 100);

    // Сцена Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Свет
    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(20, 40, 20);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Инициализация компонентов
    const materials = createBlockMaterials();
    const world = new World(scene, materials);
    world.generate();

    const physics = new PhysicsEngine(world);
    const player = new Player(camera);
    const effects = new VisualFX(scene);
    const villager = new Villager(scene, 7, 7, 7);

    // Детекция мобильных устройств
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile && mobileControls) {
        mobileControls.style.display = 'block';
    }

    // Полноэкранный запуск
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            menuScreen.style.display = 'none';
            
            const docEl = document.documentElement;
            if (docEl.requestFullscreen) docEl.requestFullscreen();
            else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();

            if (!isMobile) canvas.requestPointerLock();
        });
    }

    // ПК Управление (Клавиатура и Мышь)
    let keys = {};
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyF') player.toggleAura();
        if (e.code === 'Space' && player.isGrounded) player.velocity.y = 8;
    });
    document.addEventListener('keyup', (e) => keys[e.code] = false);

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === canvas) {
            camera.rotation.y -= e.movementX * 0.002;
            camera.rotation.x -= e.movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    // Мобильное сенсорное управление
    let moveForward = 0, moveSide = 0;
    let touchLookId = null, lastTouchX = 0, lastTouchY = 0;

    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');

    if (joystickBase) {
        joystickBase.addEventListener('touchstart', (e) => e.preventDefault());
        joystickBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = joystickBase.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            let deltaX = touch.clientX - centerX;
            let deltaY = touch.clientY - centerY;
            const distance = Math.min(Math.hypot(deltaX, deltaY), 45);
            const angle = Math.atan2(deltaY, deltaX);

            const moveX = Math.cos(angle) * distance;
            const moveY = Math.sin(angle) * distance;

            joystickStick.style.transform = `translate(${moveX}px, ${moveY}px)`;
            moveSide = moveX / 45;
            moveForward = -moveY / 45;
        });

        const resetJoystick = () => {
            joystickStick.style.transform = 'translate(0px, 0px)';
            moveForward = 0; moveSide = 0;
        };
        joystickBase.addEventListener('touchend', resetJoystick);
        joystickBase.addEventListener('touchcancel', resetJoystick);
    }

    // Сенсорный обзор правой частью экрана
    window.addEventListener('touchstart', (e) => {
        for (let touch of e.changedTouches) {
            if (touch.clientX > window.innerWidth / 2 && touchLookId === null) {
                touchLookId = touch.identifier;
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
            }
        }
    });

    window.addEventListener('touchmove', (e) => {
        for (let touch of e.changedTouches) {
            if (touch.identifier === touchLookId) {
                const dx = touch.clientX - lastTouchX;
                const dy = touch.clientY - lastTouchY;

                camera.rotation.y -= dx * 0.005;
                camera.rotation.x -= dy * 0.005;
                camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

                lastTouchX = touch.clientX; lastTouchY = touch.clientY;
            }
        }
    });

    const resetTouchLook = (e) => {
        for (let touch of e.changedTouches) {
            if (touch.identifier === touchLookId) touchLookId = null;
        }
    };
    window.addEventListener('touchend', resetTouchLook);
    window.addEventListener('touchcancel', resetTouchLook);

    // Мобильные кнопки
    const btnJump = document.getElementById('btn-jump');
    const btnAura = document.getElementById('btn-aura');
    if (btnJump) btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (player.isGrounded) player.velocity.y = 8;
    });
    if (btnAura) btnAura.addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.toggleAura();
    });

    // Игровой цикл
    let lastTime = performance.now();
    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        // Перемещение
        if (keys['KeyW']) camera.translateZ(-player.speed);
        if (keys['KeyS']) camera.translateZ(player.speed);
        if (keys['KeyA']) camera.translateX(-player.speed);
        if (keys['KeyD']) camera.translateX(player.speed);

        if (moveForward !== 0) camera.translateZ(-moveForward * player.speed);
        if (moveSide !== 0) camera.translateX(moveSide * player.speed);

        // Частицы ауры
        if (player.auraActive) {
            effects.spawnAuraParticles(player.position);
        }

        villager.update();
        physics.applyPhysics(player, dt);
        renderer.render(scene, camera);
    }

    animate();
});
