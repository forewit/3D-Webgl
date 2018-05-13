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

var model = function (id, jsonURL, textureURL, specMapURL, callback) {
	var me = this;

	// Load model json
	var request = new XMLHttpRequest();
	request.open('GET', jsonURL, true);
	request.onload = function () {
		if (request.status > 199 && request.status < 300) {
			try {
				var modelJSON = JSON.parse(request.responseText);

				// Load texture image
				var texImg = new Image();
				texImg.onload = function () {

                    // Load specular map image
					var specMapImg = new Image();
					specMapImg.onload = function () {

                        me.id = id;
                        me.vertices = modelJSON.data.attributes.position.array;
                        me.indices = modelJSON.data.index.array;
                        me.normals = modelJSON.data.attributes.normal.array;
                        me.texCoords = modelJSON.data.attributes.uv.array;
                        me.texImg = texImg;
                        me.specMapImg = specMapImg;

                        callback();
					};
					specMapImg.src = specMapURL;
				};
				texImg.src = textureURL;
			} catch (e) {
				// Failed to load image or parse json
				console.error(e);
				return;
			}
		} else {
			// Failed to load json
			console.error(request.status);
			return;
		}
	};
	request.send();
};
