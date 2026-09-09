class World {
    constructor(scene, materials) {
        this.scene = scene;
        this.materials = materials;
        this.blocks = new Map();
        this.size = 64;
        this.waterBlocks = new Set();
    }

    getBlockKey(x, y, z) {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }

    getBlock(x, y, z) {
        return this.blocks.get(this.getBlockKey(x, y, z)) || 0;
    }

    setBlock(x, y, z, type) {
        const key = this.getBlockKey(x, y, z);
        if (type === 0) {
            this.blocks.delete(key);
            this.waterBlocks.delete(key);
        } else {
            this.blocks.set(key, type);
            if (type === 9) this.waterBlocks.add(key); // Вода
        }
    }

    generate() {
        for (let x = -this.size / 2; x < this.size / 2; x++) {
            for (let z = -this.size / 2; z < this.size / 2; z++) {
                let height = Math.floor(Math.sin(x * 0.08) * Math.cos(z * 0.08) * 6) + 8;
                
                for (let y = 0; y <= 12; y++) {
                    if (y <= height) {
                        let type = (y === height) ? 2 : (y > height - 3 ? 1 : 3);
                        this.setBlock(x, y, z, type);
                    } else if (y <= 6) {
                        // Уровень моря (Вода)
                        this.setBlock(x, y, z, 9);
                    }
                }
            }
        }
        this.buildMesh();
    }

    // Автоматическое распространение воды
    updateWaterPhysics() {
        this.waterBlocks.forEach(key => {
            const [x, y, z] = key.split(',').map(Number);
            // Проверка блока снизу
            if (y > 0 && this.getBlock(x, y - 1, z) === 0) {
                this.setBlock(x, y - 1, z, 9);
            }
        });
    }

    buildMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const counts = {};

        this.blocks.forEach((type) => {
            counts[type] = (counts[type] || 0) + 1;
        });

        for (let type in counts) {
            let mat = this.materials[type] || this.materials[1];
            let mesh = new THREE.InstancedMesh(geometry, mat, counts[type]);
            mesh.frustumCulled = true; // Оптимизация Frustum Culling
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            let idx = 0;
            const dummy = new THREE.Object3D();
            this.blocks.forEach((bType, key) => {
                if (bType === parseInt(type)) {
                    const [x, y, z] = key.split(',').map(Number);
                    dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
                    dummy.updateMatrix();
                    mesh.setMatrixAt(idx++, dummy.matrix);
                }
            });
            this.scene.add(mesh);
        }
    }
}
