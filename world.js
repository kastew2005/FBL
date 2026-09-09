class World {
    constructor(scene, materials) {
        this.scene = scene;
        this.materials = materials;
        this.blocks = new Map();
        this.size = 48;
    }

    getBlockKey(x, y, z) {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }

    getBlock(x, y, z) {
        return this.blocks.get(this.getBlockKey(x, y, z)) || 0;
    }

    setBlock(x, y, z, type) {
        const key = this.getBlockKey(x, y, z);
        if (type === 0) this.blocks.delete(key);
        else this.blocks.set(key, type);
    }

    generate() {
        // Рельеф
        for (let x = -this.size / 2; x < this.size / 2; x++) {
            for (let z = -this.size / 2; z < this.size / 2; z++) {
                let height = Math.floor(Math.sin(x * 0.08) * Math.cos(z * 0.08) * 4) + 5;
                for (let y = 0; y <= height; y++) {
                    let type = (y === height) ? 2 : (y > height - 3 ? 1 : 3);
                    this.setBlock(x, y, z, type);
                }

                // Спавн деревьев
                if (Math.random() < 0.02 && (Math.abs(x) > 8 || Math.abs(z) > 8)) {
                    this.spawnTree(x, height + 1, z);
                }
            }
        }

        // Спавн Деревни жителей и Алтаря Дракона
        this.spawnVillage(5, 6, 5);
        this.buildMesh();
    }

    spawnTree(x, y, z) {
        for (let i = 0; i < 4; i++) this.setBlock(x, y + i, z, 4);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = 2; dy <= 4; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (this.getBlock(x + dx, y + dy, z + dz) === 0) {
                        this.setBlock(x + dx, y + dy, z + dz, 5);
                    }
                }
            }
        }
    }

    spawnVillage(vx, vy, vz) {
        // Домик жителей
        for (let x = 0; x < 5; x++) {
            for (let z = 0; z < 5; z++) {
                for (let y = 0; y < 3; y++) {
                    if (x === 0 || x === 4 || z === 0 || z === 4) {
                        this.setBlock(vx + x, vy + y, vz + z, 10);
                    }
                }
            }
        }
        // Алтарь Дракона (фиолетовый блок)
        this.setBlock(vx + 2, vy, vz + 2, 6);
    }

    buildMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const counts = {};
        this.blocks.forEach((type) => counts[type] = (counts[type] || 0) + 1);

        for (let type in counts) {
            let mat = this.materials[type] || this.materials[1];
            let mesh = new THREE.InstancedMesh(geometry, mat, counts[type]);
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
