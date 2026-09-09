// Простой процедурный алгоритм шума
const SimplexNoise = function() {
    let F2 = 0.5*(Math.sqrt(3.0)-1.0), G2 = (3.0-Math.sqrt(3.0))/6.0;
    let p = new Uint8Array(256);
    for (let i=0; i<256; i++) p[i] = Math.floor(Math.random()*256);
    let perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
    for (let i=0; i<512; i++) {
        perm[i] = p[i & 255];
        permMod12[i] = (perm[i] % 12);
    }
    return {
        noise2D: function(xin, yin) {
            let n0, n1, n2;
            let s = (xin+yin)*F2;
            let i = Math.floor(xin+s), j = Math.floor(yin+s);
            let t = (i+j)*G2;
            let X0 = i-t, Y0 = j-t;
            let x0 = xin-X0, y0 = yin-Y0;
            let i1, j1;
            if (x0>y0) {i1=1; j1=0;} else {i1=0; j1=1;}
            let x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
            let x2 = x0 - 1.0 + 2.0*G2, y2 = y0 - 1.0 + 2.0*G2;
            let ii = i & 255, jj = j & 255;
            let gi0 = permMod12[ii+perm[jj]], gi1 = permMod12[ii+i1+perm[jj+j1]], gi2 = permMod12[ii+1+perm[jj+1]];
            let t0 = 0.5 - x0*x0-y0*y0; if(t0<0) n0 = 0.0; else { t0 *= t0; n0 = t0 * t0 * (gi0%2===0?1:-1)*(x0+y0); }
            let t1 = 0.5 - x1*x1-y1*y1; if(t1<0) n1 = 0.0; else { t1 *= t1; n1 = t1 * t1 * (gi1%2===0?1:-1)*(x1+y1); }
            let t2 = 0.5 - x2*x2-y2*y2; if(t2<0) n2 = 0.0; else { t2 *= t2; n2 = t2 * t2 * (gi2%2===0?1:-1)*(x2+y2); }
            return 70.0 * (n0 + n1 + n2);
        }
    };
};

class World {
    constructor(scene, materials) {
        this.scene = scene;
        this.materials = materials;
        this.blocks = {};
        this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
        this.particles = [];
        this.noise = SimplexNoise();
    }

    generate(size = 30) { // Огромный мир 60х60
        for (let x = -size; x <= size; x++) {
            for (let z = -size; z <= size; z++) {
                let n = this.noise.noise2D(x * 0.05, z * 0.05);
                let h = Math.floor(n * 3);

                this.createBlock(x, -3 + h, z, 3);
                this.createBlock(x, -2 + h, z, 3);
                this.createBlock(x, -1 + h, z, 1);
                this.createBlock(x, 0 + h, z, 2);

                // Случайные деревья
                if (Math.random() < 0.015 && Math.abs(x) > 3 && Math.abs(z) > 3) {
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
    }

    createBlock(x, y, z, type) {
        const key = `${x},${y},${z}`;
        if (this.blocks[key]) return;
        const mesh = new THREE.Mesh(this.boxGeo, this.materials[type]);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.blocks[key] = { mesh, type, x, y, z };
    }

    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        if (this.blocks[key]) {
            this.spawnParticles(x, y, z, this.blocks[key].type);
            this.scene.remove(this.blocks[key].mesh);
            delete this.blocks[key];
            this.checkPhysicsAround(x, y, z);
        }
    }

    // "От себя": Простая физика осыпания песка
    checkPhysicsAround(x, y, z) {
        let aboveKey = `${x},${y+1},${z}`;
        if (this.blocks[aboveKey] && this.blocks[aboveKey].type === 8) {
            let sand = this.blocks[aboveKey];
            this.removeBlock(x, y+1, z);
            this.createBlock(x, y, z, 8);
        }
    }

    spawnParticles(x, y, z, type) {
        let pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        let mat = Array.isArray(this.materials[type]) ? this.materials[type][0] : this.materials[type];
        for (let i = 0; i < 6; i++) {
            let p = new THREE.Mesh(pGeo, mat);
            p.position.set(x + (Math.random()-0.5)*0.6, y + (Math.random()-0.5)*0.6, z + (Math.random()-0.5)*0.6);
            p.userData = { vx: (Math.random()-0.5)*0.08, vy: Math.random()*0.08, vz: (Math.random()-0.5)*0.08, life: 15 };
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
            p.userData.vy -= 0.006;
            p.userData.life--;
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }
}
