class World {
    constructor(scene, materials) {
        this.scene = scene;
        this.materials = materials;
        this.blocks = {};
        this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
        this.particles = [];
    }

    generate(size = 35) {
        for (let x = -size; x <= size; x++) {
            for (let z = -size; z <= size; z++) {
                let h = Math.floor(Math.sin(x * 0.15) * Math.cos(z * 0.15) * 2.5);
                
                this.createBlock(x, -2 + h, z, 3); // Камень
                this.createBlock(x, -1 + h, z, 1); // Земля
                this.createBlock(x, 0 + h, z, 2);  // Трава

                // Деревья
                if (x % 8 === 0 && z % 8 === 0 && Math.abs(x) > 4) {
                    let th = 1 + h;
                    for (let i = 0; i < 4; i++) this.createBlock(x, th + i, z, 4);
                    for (let lx = -1; lx <= 1; lx++) {
                        for (let lz = -1; lz <= 1; lz++) {
                            for (let ly = 3; ly <= 4; ly++) {
                                if (lx === 0 && lz === 0 && ly === 3) continue;
                                this.createBlock(x + lx, th + ly, z + lz, 5);
                            }
                        }
                    }
                }
            }
        }
        this.createClouds();
    }

    createBlock(x, y, z, type) {
        const key = `${x},${y},${z}`;
        if (this.blocks[key]) return;
        const mesh = new THREE.Mesh(this.boxGeo, this.materials[type]);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.blocks[key] = { mesh, type };
    }

    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        if (this.blocks[key]) {
            this.spawnParticles(x, y, z, this.blocks[key].type);
            this.scene.remove(this.blocks[key].mesh);
            delete this.blocks[key];
        }
    }

    spawnParticles(x, y, z, type) {
        let pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        let mat = Array.isArray(this.materials[type]) ? this.materials[type][0] : this.materials[type];
        for (let i = 0; i < 8; i++) {
            let p = new THREE.Mesh(pGeo, mat);
            p.position.set(x + (Math.random()-0.5)*0.8, y + (Math.random()-0.5)*0.8, z + (Math.random()-0.5)*0.8);
            p.userData = { vx: (Math.random()-0.5)*0.1, vy: Math.random()*0.1, vz: (Math.random()-0.5)*0.1, life: 20 };
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.position.x += p.userData.vx;
            p.position.y += p.userData.vy;
            p.position.z += p.userData.vz;
            p.userData.vy -= 0.005; // Гравитация частиц
            p.userData.life--;
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }

    createClouds() {
        let cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
        for (let i = 0; i < 12; i++) {
            let cloud = new THREE.Mesh(new THREE.BoxGeometry(12 + Math.random()*10, 2, 8 + Math.random()*6), cloudMat);
            cloud.position.set((Math.random()-0.5)*120, 25, (Math.random()-0.5)*120);
            this.scene.add(cloud);
        }
    }
}
