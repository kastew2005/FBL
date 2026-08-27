class WeaponSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.weapons = {};
        this.currentWeapon = 'pistol';
        this.ammo = {
            pistol: { current: 12, reserve: 48, max: 12 },
            shotgun: { current: 6, reserve: 24, max: 6 },
            rifle: { current: 30, reserve: 90, max: 30 }
        };
        this.medkits = 3;
        this.reloading = false;
        
        this.initWeapons();
    }
    
    initWeapons() {
        // Пистолет
        this.weapons.pistol = {
            damage: 25,
            fireRate: 500,
            reloadTime: 1000,
            spread: 0.02,
            range: 50
        };
        
        // Дробовик
        this.weapons.shotgun = {
            damage: 15,
            pellets: 8,
            fireRate: 1000,
            reloadTime: 2000,
            spread: 0.15,
            range: 30
        };
        
        // Винтовка
        this.weapons.rifle = {
            damage: 35,
            fireRate: 100,
            reloadTime: 1500,
            spread: 0.01,
            range: 70
        };
        
        this.lastShot = 0;
    }
    
    shoot() {
        if (this.reloading) return;
        
        const weapon = this.weapons[this.currentWeapon];
        const now = Date.now();
        
        if (now - this.lastShot < weapon.fireRate) return;
        
        if (this.ammo[this.currentWeapon].current <= 0) {
            this.reload();
            return;
        }
        
        this.lastShot = now;
        this.ammo[this.currentWeapon].current--;
        
        if (this.currentWeapon === 'shotgun') {
            for (let i = 0; i < weapon.pellets; i++) {
                this.fireRay(weapon);
            }
        } else {
            this.fireRay(weapon);
        }
        
        this.updateAmmoDisplay();
        this.createMuzzleFlash();
    }
    
    fireRay(weapon) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        raycaster.far = weapon.range;
        
        // Добавляем разброс
        const spreadX = (Math.random() - 0.5) * weapon.spread;
        const spreadY = (Math.random() - 0.5) * weapon.spread;
        raycaster.ray.direction.x += spreadX;
        raycaster.ray.direction.y += spreadY;
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            const object = hit.object;
            
            // Проверяем, попали ли в зомби
            if (object.userData.isZombie) {
                object.userData.health -= weapon.damage;
                this.createBloodEffect(hit.point);
                
                if (object.userData.health <= 0) {
                    object.userData.isDead = true;
                    this.createDeathEffect(object.position);
                }
            } else {
                this.createImpactEffect(hit.point);
            }
        }
        
        // Создаем трассер
        this.createTracer(raycaster.ray);
    }
    
    createTracer(ray) {
        const tracerGeometry = new THREE.BufferGeometry();
        const points = [
            this.camera.position.clone(),
            this.camera.position.clone().add(ray.direction.multiplyScalar(50))
        ];
        tracerGeometry.setFromPoints(points);
        
        const tracerMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        
        const tracer = new THREE.Line(tracerGeometry, tracerMaterial);
        this.scene.add(tracer);
        
        setTimeout(() => {
            this.scene.remove(tracer);
        }, 100);
    }
    
    reload() {
        if (this.reloading) return;
        
        const weapon = this.ammo[this.currentWeapon];
        if (weapon.current === weapon.max || weapon.reserve === 0) return;
        
        this.reloading = true;
        
        setTimeout(() => {
            const needed = weapon.max - weapon.current;
            const available = Math.min(needed, weapon.reserve);
            
            weapon.current += available;
            weapon.reserve -= available;
            this.reloading = false;
            this.updateAmmoDisplay();
        }, this.weapons[this.currentWeapon].reloadTime);
    }
    
    useMedkit() {
        if (this.medkits <= 0) return;
        
        this.medkits--;
        return 50; // Восстанавливает 50 HP
    }
    
    switchWeapon(weaponName) {
        if (this.weapons[weaponName]) {
            this.currentWeapon = weaponName;
            this.updateAmmoDisplay();
        }
    }
    
    createMuzzleFlash() {
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(this.camera.position);
        flash.position.add(this.camera.getWorldDirection().multiplyScalar(0.5));
        this.scene.add(flash);
        
        setTimeout(() => {
            this.scene.remove(flash);
        }, 50);
    }
    
    createImpactEffect(position) {
        const impactGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const impactMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const impact = new THREE.Mesh(impactGeometry, impactMaterial);
        impact.position.copy(position);
        this.scene.add(impact);
        
        setTimeout(() => {
            this.scene.remove(impact);
        }, 200);
    }
    
    createBloodEffect(position) {
        const bloodGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bloodMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
        });
        const blood = new THREE.Mesh(bloodGeometry, bloodMaterial);
        blood.position.copy(position);
        this.scene.add(blood);
        
        setTimeout(() => {
            this.scene.remove(blood);
        }, 500);
    }
    
    createDeathEffect(position) {
        const deathGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const deathMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.6
        });
        const death = new THREE.Mesh(deathGeometry, deathMaterial);
        death.position.copy(position);
        this.scene.add(death);
        
        setTimeout(() => {
            this.scene.remove(death);
        }, 1000);
    }
    
    updateAmmoDisplay() {
        const weapon = this.ammo[this.currentWeapon];
        document.getElementById('ammo-text').textContent = `${weapon.current}/${weapon.reserve}`;
    }
}
