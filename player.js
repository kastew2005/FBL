class Player {
    constructor(camera) {
        this.camera = camera;
        this.position = camera.position;
        this.velocity = new THREE.Vector3();
        this.width = 0.6;
        this.height = 1.8;
        this.heightOffset = 1.6;
        this.isGrounded = false;
        this.speed = 0.12;
        this.auraActive = false;
    }

    getAABB() {
        const half = this.width / 2;
        return {
            min: new THREE.Vector3(this.position.x - half, this.position.y - this.heightOffset, this.position.z - half),
            max: new THREE.Vector3(this.position.x + half, this.position.y - this.heightOffset + this.height, this.position.z + half)
        };
    }
}
