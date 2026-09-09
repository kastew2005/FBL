class Player {
    constructor() {
        this.x = 0; this.y = 8; this.z = 0;
        this.rotationX = 0; this.rotationY = 0;
        this.speed = 0.085;
        this.vy = 0;
        this.bobbingTimer = 0;
    }

    update(moveState, camera, handMesh) {
        let forwardVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
        let sideVector = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
        let moveDir = new THREE.Vector3(0, 0, 0);

        if (moveState.forward) moveDir.add(forwardVector);
        if (moveState.back) moveDir.sub(forwardVector);
        if (moveState.right) moveDir.add(sideVector);
        if (moveState.left) moveDir.sub(sideVector);

        if (moveDir.length() > 0) {
            moveDir.normalize();
            this.x += moveDir.x * this.speed;
            this.z += moveDir.z * this.speed;

            this.bobbingTimer += 0.16;
            if (Math.sin(this.bobbingTimer) < -0.92) sounds.playStep();
        } else {
            this.bobbingTimer = 0;
        }

        this.vy -= 0.007;
        this.y += this.vy;
        if (this.y < 2) { this.y = 2; this.vy = 0; }

        let bobY = Math.sin(this.bobbingTimer) * 0.04;
        let bobX = Math.cos(this.bobbingTimer * 0.5) * 0.02;

        camera.position.set(this.x + bobX, this.y + 1.5 + bobY, this.z);
        camera.quaternion.setFromEuler(new THREE.Euler(this.rotationX, this.rotationY, 0, 'YXZ'));

        if (handMesh) {
            handMesh.position.set(0.35 + bobX, -0.35 + bobY, -0.5);
        }
    }
}
