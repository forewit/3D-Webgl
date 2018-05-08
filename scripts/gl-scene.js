/**
 * @fileoverview gl-scene - Simple and quick webgl scene creator
 * @author Marc Anderson
 * @version 1.0
 *
 * Adapted from: https://github.com/sessamekesh/IndigoCS-webgl-tutorials
 * Requires glMatrix: https://github.com/toji/gl-matrix
 */

/* Copyright (c) 2018, Marc Anderson.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

/* GLOBAL COORDINATES (SAME AS WEBGL):
           +y
            |    -z (in)
            |   /
            | /
  -x - - - - - - - - +x
           /|
         /  |
(out) +z    |
           -y
*/

/**
 * A scene contains models, a camera, and phong lighting.
 * It contains functions for adding and removing models, moving
 * them around, and interacting with the camera and light.
 *
 * @class webgl 3D scene
 * @name Scene
 * @param gl webgl context
 */
var Scene = function (gl) {
	this.gl = gl;
}

/**
 * Asynchronous function that starts the scene loading process
 * by setting up variables and initializing the vertex and
 * fragment shaders.
 *
 */
Scene.prototype.Load = function (callback) {
	var me = this;
	var gl = me.gl;

	// Initialize models and textures
	me.models = {};
	me.textures = {};

	// Initialize default view and camera position
	me.camera = new Camera(					/********* DEFAULTS *********/
		vec3.fromValues(0, 0, 10),			// CAMERA POSITION
		vec3.fromValues(0, 0, 0),			// CAMERA LOOK AT
		vec3.fromValues(0, 1, 0)			// CAMERA UP DIRECTION
	);
	me.viewMatrix = mat4.create();
	me.camera.getViewMatrix(me.viewMatrix);
	me.projMatrix = mat4.create();
	mat4.perspective(
		me.projMatrix,
		glMatrix.toRadian(45),				// FIELD OF VIEW
		gl.canvas.clientWidth / gl.canvas.clientHeight,
		0.1,								// MIN VIEW DISTANCE
		100.0								// MAX VIEW DISTANCE
	);

	// Setup light values
	me.light = {
		ambientColor: [0.1, 0.1, 0.1],
		diffuseColor: [1.0, 1.0, 1.0],
		diffuseDirection: [1.0, 1.0, 1.0],
	};
	me.lightPosition = [1, 1, 2];

	// Setup vertex shader
	var vertexShaderText = `
	precision mediump float;

	attribute vec3 a_vertPosition;
	attribute vec2 a_vertTexCoord;
	attribute vec3 a_vertNormal;

	varying vec2 v_fragTexCoord;
	varying vec3 v_fragNormal;
	varying vec3 v_fragToLight;

	uniform vec3 u_lightPosition;
	uniform mat4 u_world;
	uniform mat4 u_view;
	uniform mat4 u_proj;

	void main()
	{
	  vec4 position = vec4(a_vertPosition, 1.0);

	  v_fragTexCoord = a_vertTexCoord;
	  v_fragNormal = (u_world * vec4(a_vertNormal, 0.0)).xyz;
	  v_fragToLight = u_lightPosition - (u_world * position).xyz;

	  gl_Position = u_proj * u_view * u_world * position;
	}
	`;
	var vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, vertexShaderText);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		console.error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vs));
		return;
	}

	// Setup fragment shader
	const fragmentShaderText = `
	precision mediump float;

	struct DirectionalLight
	{
		vec3 ambientColor;
		vec3 diffuseColor;
		vec3 diffuseDirection;
	};

	varying vec2 v_fragTexCoord;
	varying vec3 v_fragNormal;
	varying vec3 v_fragToLight;

	uniform DirectionalLight u_light;
	uniform sampler2D sampler;

	void main()
	{
		vec3 surfaceNormal = normalize(v_fragNormal);
		vec3 diffuseDirectionNormal = normalize(u_light.diffuseDirection);
		vec4 textureColor = texture2D(sampler, v_fragTexCoord);
		vec3 surfaceToLightNormal = normalize(v_fragToLight);

		vec3 lightIntensity =
			//u_light.ambientColor +
			//u_light.diffuseColor * max(dot(v_fragNormal, diffuseDirectionNormal), 0.0) +
			u_light.diffuseColor * max(dot(v_fragNormal, surfaceToLightNormal), 0.0);

	  gl_FragColor = vec4(textureColor.rgb * lightIntensity, textureColor.a);
  }
  `;
  // TODO: should replace v_fragNormal with surfaceNormal?????
  // TODO: separate diffuse, ambient, and point lights
  // TODO: add point light intensity / color

	var fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fragmentShaderText);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fs));
		return;
	}

	// Setup webgl program from vertex and fragment shaders
	var program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Error linking program: ' + gl.getProgramInfoLog(program));
		return;
	}
	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error('Error validating program: ' + gl.getProgramInfoLog(program));
		return;
	}
	me.program = program;
	me.program.uniforms = {
		mProj: gl.getUniformLocation(me.program, 'u_proj'),
		mView: gl.getUniformLocation(me.program, 'u_view'),
		mWorld: gl.getUniformLocation(me.program, 'u_world'),

		lightAmbientColor: gl.getUniformLocation(me.program, 'u_light.ambientColor'),
		lightDiffuseDirection: gl.getUniformLocation(me.program, 'u_light.diffuseDirection'),
		lightDiffuseColor: gl.getUniformLocation(me.program, 'u_light.diffuseColor'),

		lightPosition: gl.getUniformLocation(me.program, 'u_lightPosition')
	};
	me.program.attribs = {
		vPos: gl.getAttribLocation(me.program, 'a_vertPosition'),
		vNorm: gl.getAttribLocation(me.program, 'a_vertNormal'),
		vTexCoord: gl.getAttribLocation(me.program, 'a_vertTexCoord'),
	};

	callback();
};

/**
 * Asynchronous function unloads the scene, setting relavant
 * variables to null
 *
 * @param callback function
 */
Scene.prototype.Unload = function (callback) {
	this.Pause();

	if(this.models) {
		for (var i in this.models) {
			this.models[i] = null;
		}
		this.models = null;
	}
	if(this.models) {
		for (var i=0; i < this.textures.length; i++) {
			this.textures[i] = null;
		}
		this.textures = null
	}
	if (this.diffuse) { this.diffuse = null };
	if (this.ambientColor) { this.ambientColor = null };
	if (this.camera) { this.camera = null; }
	if (this.program) { this.program = null; }
	if (this.projMatrix) { this.projMatrix = null; }
	if (this.viewMatrix) { this.viewMatrix = null; }
	if (this.nextFrameHandle) { this.nextFrameHandle = null; }

	callback();
};

/**
 * A scene contains models, a camera, and a light source.
 * It contains functions for adding and removing models, moving
 * them around, and interacting with the camera and light.
 *
 * @param Update funciton that takes elapsed time (ms) as a parameter
 */
Scene.prototype.Begin = function (Update) {
	var me = this;

	// Start the update and render loops
	var previousFrame = performance.now();
	var dt = 0;
	var loop = function (currentFrameTime) {
		dt = currentFrameTime - previousFrame;
		Update(dt);
		previousFrame = currentFrameTime;

		me.Render();
		me.nextFrameHandle = requestAnimationFrame(loop);
	};
	me.nextFrameHandle = requestAnimationFrame(loop);
};

/**
 * Stops the animation frame loop
 *
 */
Scene.prototype.Pause = function () {
	if (this.nextFrameHandle) {
		cancelAnimationFrame(this.nextFrameHandle);
	}
};

/**
 * Adds a model to the scene. The json file must be formated
 * like the three.js blender exporter. Also, each model must include
 * a texture image.
 *
 * @param id string to identify the model
 * @param jsonURL URL pointing to the json file for a 3D model.
 * @param imgURL URL pointing to the texture image.
 * @param callback function
 */
Scene.prototype.AddModel = function (id, jsonURL, imgURL, callback) {
	var me = this;
	var gl = me.gl;

	// Load json
	var request = new XMLHttpRequest();
	request.open('GET', jsonURL, true);
	request.onload = function () {
		if (request.status > 199 && request.status < 300) {
			try {
				var modelJSON = JSON.parse(request.responseText);

				// Load image
				var image = new Image();
				image.onload = function () {

					// Create model
					me.models[id] = new Model(
						gl,
						modelJSON.data.attributes.position.array,
						modelJSON.data.index.array,
						modelJSON.data.attributes.normal.array,
						modelJSON.data.attributes.uv.array
					)
					// Create texture
					var texture = me.gl.createTexture();
					me.textures[id] = texture;
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					gl.texImage2D(
						gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
						gl.UNSIGNED_BYTE,
						image
					);
					gl.bindTexture(gl.TEXTURE_2D, null);

					callback();
				};
				image.src = imgURL;
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

/**
 * Render meshes and textures
 *
 */
Scene.prototype.Render = function () {
	var me = this;
	var gl = me.gl;

	// Clear back buffer, set per-frame uniforms
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);

	gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);

	gl.clearColor(0, 0, 0, 0.3);
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

	gl.useProgram(me.program);

	// Set view matrix and projection matrix uniforms
	gl.uniformMatrix4fv(me.program.uniforms.mProj, gl.FALSE, me.projMatrix);
	gl.uniformMatrix4fv(me.program.uniforms.mView, gl.FALSE, me.viewMatrix);

	// Set diffuse light and ambient light uniforms
	gl.uniform3fv(me.program.uniforms.lightAmbientColor, me.light.ambientColor);
	gl.uniform3fv(me.program.uniforms.lightDiffuseColor, me.light.diffuseColor);
	gl.uniform3fv(me.program.uniforms.lightDiffuseDirection, me.light.diffuseDirection);
	gl.uniform3fv(me.program.uniforms.lightPosition, me.lightPosition);

	// Draw meshes
	for (var i in me.models) {
		// Bind texture
		gl.bindTexture(gl.TEXTURE_2D, me.textures[i]);
		gl.activeTexture(gl.TEXTURE0);

		// Per object uniforms
		gl.uniformMatrix4fv(
			me.program.uniforms.mWorld,
			gl.FALSE,
			me.models[i].world
		);

		// Set attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].vbo);
		gl.vertexAttribPointer(
			me.program.attribs.vPos,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.program.attribs.vPos);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.models[i].tbo);
		gl.vertexAttribPointer(
			me.program.attribs.vTexCoord,
			2, gl.FLOAT, gl.FALSE,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.program.attribs.vTexCoord)

		gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].nbo);
		gl.vertexAttribPointer(
			me.program.attribs.vNorm,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.program.attribs.vNorm);

		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, me.models[i].ibo);
		gl.drawElements(gl.TRIANGLES, me.models[i].nPoints, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}
};

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
Camera.prototype.getViewMatrix = function (out) {
	var lookAt = vec3.create();
	vec3.add(lookAt, this.position, this.forward);
	mat4.lookAt(out, this.position, lookAt, this.up);
	return out;
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
