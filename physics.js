class PhysicsEngine {
    constructor(world) {
        this.world = world;
        this.gravity = -24.0;
    }

    checkCollision(box) {
        const minX = Math.floor(box.min.x);
        const maxX = Math.ceil(box.max.x);
        const minY = Math.floor(box.min.y);
        const maxY = Math.ceil(box.max.y);
        const minZ = Math.floor(box.min.z);
        const maxZ = Math.ceil(box.max.z);

        for (let x = minX; x < maxX; x++) {
            for (let y = minY; y < maxY; y++) {
                for (let z = minZ; z < maxZ; z++) {
                    const block = this.world.getBlock(x, y, z);
                    if (block !== 0 && block !== 9) { // Пропускаем воздух и воду
                        return true;
                    }
                }
            }
        }
        return false;
    }

    applyPhysics(player, dt) {
        player.velocity.y += this.gravity * dt;
        player.position.y += player.velocity.y * dt;

        let box = player.getAABB();
        if (this.checkCollision(box)) {
            if (player.velocity.y < 0) {
                player.position.y = Math.floor(player.position.y) + player.heightOffset;
                player.isGrounded = true;
            }
            player.velocity.y = 0;
        } else {
            player.isGrounded = false;
        }
    }
}
