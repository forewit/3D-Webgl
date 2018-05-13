/**
 * @class Model data and buffers
 * @name Model
 *
 * @param gl webgl getContext
 * @param vertices array of model verticies [x, y, z, x, y, z, ...]
 * @param indices array listing triangle face indices
 * @param normals array of face normals
 * @param texCoords array of coordinates mapping vertices to the texture image
 */
var Model = function (gl, vertices, indices, normals, texCoords) {
    this.vbo = gl.createBuffer(); // Vertex buffer object
    this.ibo = gl.createBuffer(); // Index buffer object
    this.nbo = gl.createBuffer(); // Normal Buffer object
    this.tbo = gl.createBuffer(); // Texture coordinate buffer object
    this.nPoints = indices.length;

    this.world = mat4.create()

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

/**
 * Position a model by translating its world matrix based
 * on the origin.
 *
 * @param {vec3} position target location [x, y, z]
 */
Model.prototype.position = function (position) {
    var origin = mat4.create();
    mat4.translate(this.world, origin, position);
};
