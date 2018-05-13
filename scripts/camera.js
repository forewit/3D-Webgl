

/**
 * @class movable Camera
 * @name Camera
 *
 * @param {vec3} position Camera location [x, y, z]
 * @param {vec3} lookAt Where camera is pointed [x, y, z]
 * @param {vec3} up	vector pointing in up direction
 */
var Camera = function (position, lookAt, up) {
	this.forward = vec3.create();
	this.up = vec3.create();
	this.right = vec3.create();

	this.position = position;

	vec3.subtract(this.forward, lookAt, this.position);
	vec3.cross(this.right, this.forward, up);
	vec3.cross(this.up, this.right, this.forward);

	vec3.normalize(this.forward, this.forward);
	vec3.normalize(this.right, this.right);
	vec3.normalize(this.up, this.up);
}

/**
 * Returns the view matrix created by the camera
 *
 * @param out the recieving matrix
 * @returns {mat4} out
 */
Camera.prototype.getViewMatrix = function () {
	var viewMatrix = mat4.create();
	var lookAt = vec3.create();
	vec3.add(lookAt, this.position, this.forward);
	return mat4.lookAt(viewMatrix, this.position, lookAt, this.up);
};

/**
 * Rotates the camera up
 *
 * @param rad radians to rotate up
 */
Camera.prototype.rotateUp = function (rad) {
	var upMatrix = mat4.create();
	mat4.rotate(upMatrix, upMatrix, rad, vec3.fromValues(1, 0, 0));
	vec3.transformMat4(this.forward, this.forward, upMatrix);
	this.realign();
};

/**
 * Rotates the camera right
 *
 * @param rad radians to rotate right
 */
Camera.prototype.rotateRight = function (rad) {
	var rightMatrix = mat4.create();
	mat4.rotate(rightMatrix, rightMatrix, rad, vec3.fromValues(0, 0, 1));
	vec3.transformMat4(this.forward, this.forward, rightMatrix);
	this.realign();
};

/**
 * Moves the camera forward
 *
 * @param dist distance to move forward
 */
Camera.prototype.moveForward = function (dist) {
	vec3.scaleAndAdd(this.position, this.position, this.forward, dist);
};

/**
 * Moves the camera right
 *
 * @param dist distance to move right
 */
Camera.prototype.moveRight = function (dist) {
	vec3.scaleAndAdd(this.position, this.position, this.right, dist);
};

/**
 * Moves the camera up
 *
 * @param dist distance to move up
 */
Camera.prototype.moveUp = function (dist) {
	vec3.scaleAndAdd(this.position, this.position, this.up, dist);
};

/**
 * Realigns the camera, normalizing the directional values
 *
 */
Camera.prototype.realign = function() {
	vec3.cross(this.right, this.forward, this.up);
	vec3.cross(this.up, this.right, this.forward);

	vec3.normalize(this.forward, this.forward);
	vec3.normalize(this.right, this.right);
	vec3.normalize(this.up, this.up);
};
