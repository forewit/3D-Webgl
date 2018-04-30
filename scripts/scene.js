'use strict';

// Adapted from: https://github.com/sessamekesh/IndigoCS-webgl-tutorials
var scene = function (gl) {
	this.gl = gl;
};

scene.prototype.load = function (callback) {
	console.log('loading scene...');

	var me = this;

	me._loadResources(function(err, resources) {
		if (err) {
			callback(err);
			return;
		}

		// Import mesh data using the JSON output from the three.js blender exporter
		me.models = [];
		for (var i = 0; i < resources.models.length; i++) {
			var mesh = resources.models[i].data;
			me.models.push(new Model(
				me.gl,
				mesh.attributes.position.array,
				mesh.index.array,
				mesh.attributes.normal.array,
				mesh.attributes.uv.array
			));
			console.log('	added', mesh.name, 'model');
		}

		// Create shaders
		me.program = createShaderProgram (
			me.gl,
			resources.vsText,
			resources.fsText
		);
		if (me.program.error) {
			callback('program ' + me.program.error);
			return;
		}

		me.program.uniforms = {
			mProj: me.gl.getUniformLocation(me.program, 'mProj'),
			mView: me.gl.getUniformLocation(me.program, 'mView'),
			mWorld: me.gl.getUniformLocation(me.program, 'mWorld'),

			ambientLightIntensity: me.gl.getUniformLocation(me.program, 'ambientLightIntensity'),
		 	sunDirection: me.gl.getUniformLocation(me.program, 'sun.direction'),
	 		sunColor: me.gl.getUniformLocation(me.program, 'sun.color'),
		};

		me.program.attribs = {
			vPos: me.gl.getAttribLocation(me.program, 'vertPosition'),
			vNorm: me.gl.getAttribLocation(me.program, 'vertNormal'),
			vTexCoord: me.gl.getAttribLocation(me.program, 'vertTexCoord'),
		};

		// Create textures
		me.textures = [];
		for (var i=0; i < resources.texImages.length; i++) {
			me.textures.push(me.gl.createTexture());

			me.gl.bindTexture(me.gl.TEXTURE_2D, me.textures[i]);
			me.gl.pixelStorei(me.gl.UNPACK_FLIP_Y_WEBGL, true);
			me.gl.texParameteri(me.gl.TEXTURE_2D, me.gl.TEXTURE_WRAP_S, me.gl.CLAMP_TO_EDGE);
			me.gl.texParameteri(me.gl.TEXTURE_2D, me.gl.TEXTURE_WRAP_T, me.gl.CLAMP_TO_EDGE);
			me.gl.texParameteri(me.gl.TEXTURE_2D, me.gl.TEXTURE_MIN_FILTER, me.gl.LINEAR);
			me.gl.texParameteri(me.gl.TEXTURE_2D, me.gl.TEXTURE_MAG_FILTER, me.gl.LINEAR);
			me.gl.texImage2D(
				me.gl.TEXTURE_2D, 0, me.gl.RGBA, me.gl.RGBA,
				me.gl.UNSIGNED_BYTE,
				resources.texImages[i]
			);
			me.gl.bindTexture(me.gl.TEXTURE_2D, null);
		}

		// Logical values
		me.camera = new Camera(
			vec3.fromValues(10, 0, 0),	// Position
			vec3.fromValues(0, 0, 0),	// Look at
			vec3.fromValues(0, 1, 0)	// Up
		);

		me.projMatrix = mat4.create();
		me.viewMatrix = mat4.create();

		mat4.perspective(
			me.projMatrix,
			glMatrix.toRadian(45),
			me.gl.canvas.clientWidth / me.gl.canvas.clientHeight,
			0.1,
			100.0
		);

		callback();
	});
};
scene.prototype.unload = function () {
	console.log('unloading scene...');
	for (var i=0; i < this.models.length; i++) {
		models[i] = null;
	}
	this.program = null;
	this.models = null;
};
scene.prototype.begin = function () {
	console.log('begining scene...');

	var me = this;

	// Render Loop
	var previousFrame = performance.now();
	var dt = 0;
	var loop = function (currentFrameTime) {
		dt = currentFrameTime - previousFrame;
		me._update(dt);
		previousFrame = currentFrameTime;

		me._render();
		me.nextFrameHandle = requestAnimationFrame(loop);
	};
	me.nextFrameHandle = requestAnimationFrame(loop);
};
scene.prototype.end = function () {
	console.log('ending scene...');

	if (this.nextFrameHandle) {
		cancelAnimationFrame(this.nextFrameHandle);
	}
};

// Private functions
scene.prototype._update = function (dt) {
	var perSec = dt / 1000 * 2 * Math.PI;


	// Move camera up
	this.camera.moveUp(0.005 * perSec);


	// Update view based on camera
	this.camera.GetViewMatrix(this.viewMatrix);
};
scene.prototype._render = function () {
	var gl = this.gl;

	// Clear back buffer, set per-frame uniforms
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);

	gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);

	gl.clearColor(0, 0, 0, 0.3);
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

	gl.useProgram(this.program);

	gl.uniformMatrix4fv(this.program.uniforms.mProj, gl.FALSE, this.projMatrix);
	gl.uniformMatrix4fv(this.program.uniforms.mView, gl.FALSE, this.viewMatrix);
	gl.uniform3f(this.program.uniforms.ambientLightIntensity, 0.2, 0.2, 0.2);
	gl.uniform3f(this.program.uniforms.sunDirection, 3.0, 4.0, -2.0);
	gl.uniform3f(this.program.uniforms.sunColor, 0.9, 0.9, 0.9);

	// Draw meshes
	for (var i = 0; i < this.models.length; i++) {

		// Bind texture
		gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
		gl.activeTexture(gl.TEXTURE0);

		// Per object uniforms
		gl.uniformMatrix4fv(
			this.program.uniforms.mWorld,
			gl.FALSE,
			this.models[i].world
		);

		// Set attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, this.models[i].vbo);
		gl.vertexAttribPointer(
			this.program.attribs.vPos,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(this.program.attribs.vPos);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.models[i].tbo);
		gl.vertexAttribPointer(
			this.program.attribs.vTexCoord,
			2, gl.FLOAT, gl.FALSE,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(this.program.attribs.vTexCoord)

		gl.bindBuffer(gl.ARRAY_BUFFER, this.models[i].nbo);
		gl.vertexAttribPointer(
			this.program.attribs.vNorm,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(this.program.attribs.vNorm);

		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.models[i].ibo);
		gl.drawElements(gl.TRIANGLES, this.models[i].nPoints, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}
};
scene.prototype._loadResources = function (callback) {
	loadTextResource('./src/shader.vs.glsl', function (vsErr, vsText) {
		if (vsErr) {
			callback(vsErr);
		} else {
			loadTextResource('./src/shader.fs.glsl', function (fsErr, fsText) {
				if (fsErr) {
					callback(fsErr);
				} else {
					loadJSONResource('./src/tree.json', function (modelErr, modelJSON) {
						if (modelErr) {
							callback(modelErr);
						} else {
							loadImage('./img/texture.png', function (imgErr, texImg) {
								if (imgErr) {
									callback(imgErr);
								} else {
									callback(null, {
										vsText:vsText,
										fsText:fsText,
										models:[modelJSON],
										texImages:[texImg]
									});
								}
							});
						}
					});
				}
			});
		}
	});
};
