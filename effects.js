class VisualFX {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.rainSystem = null;
        this.initRain();
    }

    // Спавн осколков при разрушении блока
    spawnBlockBreakParticles(x, y, z, color) {
        const pGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const pMat = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < 15; i++) {
            const particle = new THREE.Mesh(pGeo, pMat);
            particle.position.set(
                x + (Math.random() - 0.5) * 0.8,
                y + (Math.random() - 0.5) * 0.8,
                z + (Math.random() - 0.5) * 0.8
            );
            
            particle.userData = {
                vx: (Math.random() - 0.5) * 0.15,
                vy: Math.random() * 0.15 + 0.05,
                vz: (Math.random() - 0.5) * 0.15,
                life: 1.0
            };

            this.scene.add(particle);
            this.particles.push(particle);
        }
    }

    // Системный виртуальный дождь
    initRain() {
        const rainCount = 1200;
        const rainGeo = new THREE.BufferGeometry();
        const rainPos = new Float32Array(rainCount * 3);

        for (let i = 0; i < rainCount * 3; i += 3) {
            rainPos[i] = (Math.random() - 0.5) * 80;
            rainPos[i + 1] = Math.random() * 40;
            rainPos[i + 2] = (Math.random() - 0.5) * 80;
        }

        rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
        const rainMat = new THREE.PointsMaterial({
            color: 0x7aa3e5,
            size: 0.15,
            transparent: true,
            opacity: 0.6
        });

        this.rainSystem = new THREE.Points(rainGeo, rainMat);
        this.scene.add(this.rainSystem);
    }

    update(playerPos) {
        // Обновление осадков вокруг игрока
        if (this.rainSystem) {
            this.rainSystem.position.x = playerPos.x;
            this.rainSystem.position.z = playerPos.z;
            const positions = this.rainSystem.geometry.attributes.position.array;
            
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= 0.8; // Скорость падения капель
                if (positions[i] < 0) positions[i] = 40;
            }
            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }

        // Обновление частиц
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.x += p.userData.vx;
            p.position.y += p.userData.vy;
            p.position.z += p.userData.vz;
            p.userData.vy -= 0.01; // Гравитация частицы
            p.userData.life -= 0.03;

            p.scale.multiplyScalar(0.95);

            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }
}
