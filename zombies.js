class ZombieSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.zombies = [];
        this.maxZombies = 10;
        this.spawnRate = 3000;
        this.wave = 1;
        this.lastSpawn = 0;
        
        this.init();
    }
    
    init() {
        this.spawnZombie();
    }
    
    update(deltaTime) {
        const now = Date.now();
        
        // Спавн зомби
        if (this.zombies.length < this.maxZombies && now - this.lastSpawn > this.spawnRate) {
            this.spawnZombie();
            this.lastSpawn = now;
        }
        
        // Обновление зомби
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            
            if (zombie.userData.isDead) {
                this.scene.remove(zombie);
                this.zombies.splice(i, 1);
                this.updateScore(10);
                continue;
            }
            
            // Движение к игроку
            const direction = new THREE.Vector3()
                .subVectors(this.player.position, zombie.position)
                .normalize();
            
            zombie.position.add(direction.multiplyScalar(zombie.userData.speed * deltaTime));
            zombie.position.y = 0;
            
            // Поворот к игроку
            zombie.lookAt(this.player.position.x, 0, this.player.position.z);
            
            // Атака игрока
            const distance = zombie.position.distanceTo(this.player.position);
            if (distance < 2) {
                this.attackPlayer(zombie);
            }
        }
    }
    
    spawnZombie() {
        // Спавн на случайной позиции
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        const x = this.player.position.x + Math.cos(angle) * distance;
        const z = this.player.position.z + Math.sin(angle) * distance;
        
        const zombie = this.createZombieMesh();
        zombie.position.set(x, 0, z);
        zombie.userData = {
            health: 50 + this.wave * 10,
            speed: 2 + this.wave * 0.2,
            damage: 10 + this.wave * 2,
            isZombie: true,
            isDead: false
        };
        
        this.scene.add(zombie);
        this.zombies.push(zombie);
    }
    
    createZombieMesh() {
        const zombieGroup = new THREE.Group();
        
        // Тело
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a4a4a,
            roughness: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        zombieGroup.add(body);
        
        // Голова
        const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            roughness: 0.9
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        zombieGroup.add(head);
        
        // Руки
        for (let i = -1; i <= 1; i += 2) {
            const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
            const armMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x3a3a3a,
                roughness: 0.9
            });
            const arm = new THREE.Mesh(armGeometry, armMaterial);
            arm.position.set(i * 0.4, 1.2, 0);
            arm.rotation.z = i * -0.5;
            arm.castShadow = true;
            zombieGroup.add(arm);
        }
        
        // Ноги
        for (let i = -1; i <= 1; i += 2) {
            const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
            const legMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x2a2a2a,
                roughness: 0.9
            });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(i * 0.2, 0.4, 0);
            leg.castShadow = true;
            zombieGroup.add(leg);
        }
        
        return zombieGroup;
    }
    
    attackPlayer(zombie) {
        if (Date.now() - (zombie.userData.lastAttack || 0) > 1000) {
            zombie.userData.lastAttack = Date.now();
            this.player.takeDamage(zombie.userData.damage);
        }
    }
    
    updateScore(points) {
        const scoreElement = document.getElementById('score');
        const currentScore = parseInt(scoreElement.textContent);
        scoreElement.textContent = currentScore + points;
    }
    
    nextWave() {
        this.wave++;
        this.maxZombies += 5;
        this.spawnRate = Math.max(500, this.spawnRate - 200);
        
        document.getElementById('wave').textContent = this.wave;
    }
}
