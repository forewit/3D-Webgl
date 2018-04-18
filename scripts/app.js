var loadResources = function () {
	loadTextResource('./src/shader.vs.glsl', function (vsErr, vsText) {
		if (vsErr) {
			alert('Fatal error getting vertex shader (see console)');
			console.error(vsErr);
		} else {
			loadTextResource('./src/shader.fs.glsl', function (fsErr, fsText) {
				if (fsErr) {
					alert('Fatal error getting fragment shader (see console)');
					console.error(fsErr);
				} else {
					loadJSONResource('./src/leaf.json', function (modelErr, leafJSON) {
						if (modelErr) {
							alert('Fatal error getting leaf model (see console)');
							console.error(modelErr);
						} else {
							loadImage('./img/texture.png', function (imgErr, texImg) {
								if (imgErr) {
									alert('Fatal error getting leaf texture (see console)');
									console.error(imgErr);
								} else {
									loadJSONResource('./src/tree1.json', function (model2Err, tree1JSON) {
										if (model2Err) {
											alert('Fatal error getting tree1 model (see console)');
											console.error(model2Err);
										} else {
											loadImage('./img/texture2.png', function(img2Err, tex2Img) {
												if (img2Err) {
													alert('Fatal error getting tree1 texture (see console)');
													console.error(img2Err);
												} else {
													startWebGL(vsText, fsText, texImg, leafJSON, tex2Img, tree1JSON);
												}
											});
										}
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



//
// TODO: modify to accept multiple models
//
var startWebGL = function (vertexShaderText, fragmentShaderText, texImg, leafJSON, tex2Img, tree1JSON) {

	// https://webglfundamentals.org/webgl/lessons/webgl-drawing-multiple-things.html

	//************ INIT TIME ***************
	// Create all shaders and programs and look up locations
	// Create buffers and upload vertex data
	// Create textures and upload texture data

	// Setup canvas
	var canvas = document.getElementById('webgl-surface');
	gl = canvas.getContext('webgl');
	if (!gl) {
		console.log('WebGL not supported, falling back on experimental-webgl');
		gl = canvas.getContext('experimental-webgl');
	}
	if (!gl) { alert('Your browser does not support WebGL'); }

	// Setup shaders and programs
	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);
	var program = createProgram(gl, vertexShader, fragmentShader);

	// Setup lookup locations
	var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
	var texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
	var normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');

	var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
	var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

	var ambientUniformLocation = gl.getUniformLocation(program, 'ambientLightIntensity');
	var sunlightDirUniformLocation = gl.getUniformLocation(program, 'sun.direction');
	var sunlightIntUniformLocation = gl.getUniformLocation(program, 'sun.color');

	// Create buffers
	var posVertexBuffer = gl.createBuffer();
	var texCoordVertexBuffer = gl.createBuffer();
	var indexBuffer = gl.createBuffer();
	var normalBuffer = gl.createBuffer();

	// Upload vertex data to buffers
	var vertices = leafJSON.meshes[0].vertices;
	var indices = [].concat.apply([], leafJSON.meshes[0].faces);
	var texCoords = leafJSON.meshes[0].texturecoords[0];
	var normals = leafJSON.meshes[0].normals;

	gl.bindBuffer(gl.ARRAY_BUFFER, posVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	// Create textures
	var texture = gl.createTexture();

	// Upload texture data
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
		gl.UNSIGNED_BYTE,
		texImg
	);
	gl.bindTexture(gl.TEXTURE_2D, null);

	//*********** RENDER TIME **************
	// Clear and set the viewport and other global state
	// 		(enable depth testing, turn on culling, etc..)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);
	gl.useProgram(program);

	// Setup attributes for the thing you want to draw
	//		For each attribute call gl.bindBuffer,
	//		gl.vertexAttribPointer, gl.enableVertexAttribArray
	gl.bindBuffer(gl.ARRAY_BUFFER, posVertexBuffer);
	gl.vertexAttribPointer(
		positionAttribLocation, 			// Attribute location
		3, 									// Number of elements per attribute
		gl.FLOAT, 							// Type of elements
		gl.FALSE,
		3 * Float32Array.BYTES_PER_ELEMENT,	// Size of an individual vertex
		0 									// Offset from the beginning of a single vertex to this attribute
	);
	gl.enableVertexAttribArray(positionAttribLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordVertexBuffer);
	gl.vertexAttribPointer(
		texCoordAttribLocation,
		2,
		gl.FLOAT,
		gl.FALSE,
		2 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(texCoordAttribLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.vertexAttribPointer(
		normalAttribLocation,
		3, gl.FLOAT,
		gl.TRUE,
		3 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(normalAttribLocation);

	// Setup uniforms for the thing you want to draw
	// 		Call gl.uniformXXX for each uniform
	// 		Call gl.activeTexture and gl.bindTexture to assign textures to texture units.

	// World, view, projection matrices
	var worldMatrix = new Float32Array(16);
	var viewMatrix = new Float32Array(16);
	var projMatrix = new Float32Array(16);

	mat4.identity(worldMatrix);
	mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
	mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.clientWidth / canvas.clientHeight, 0.1, 1000.0);

	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

	// Lighting
	gl.uniform3f(ambientUniformLocation, 0.2, 0.2, 0.2);
	gl.uniform3f(sunlightDirUniformLocation, 3.0, 4.0, -2.0);
	gl.uniform3f(sunlightIntUniformLocation, 0.9, 0.9, 0.9);

	// texturesgl.bindTexture(gl.TEXTURE_2D, leafModel.texture);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.activeTexture(gl.TEXTURE0);

	// Call gl.drawArrays or gl.drawElements
	gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
};








var old = function () {
		console.log('This is working');

		//
		// Setup WebGL canvas
		//
		var canvas = document.getElementById('webgl-surface');
		gl = canvas.getContext('webgl');

		if (!gl) {
			console.log('WebGL not supported, falling back on experimental-webgl');
			gl = canvas.getContext('experimental-webgl');
		}

		if (!gl) {
			alert('Your browser does not support WebGL');
		}

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.frontFace(gl.CCW);
		gl.cullFace(gl.BACK);

		//
		// Create shaders and program
		//
		var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
		var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);
		var program = createProgram(gl, vertexShader, fragmentShader);


		//
		// Add models
		//
		gl.useProgram(program);
		//
		// Create buffer
		//
		var vertices = leafJSON.meshes[0].vertices;
		var indices = [].concat.apply([], leafJSON.meshes[0].faces);
		var texCoords = leafJSON.meshes[0].texturecoords[0];
		var normals = leafJSON.meshes[0].normals;

		var posVertexBuffer = gl.createBuffer();
		var texCoordVertexBuffer = gl.createBuffer();
		var indexBuffer = gl.createBuffer();
		var normalBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, posVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, texCoordVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, posVertexBuffer);
		var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
		gl.vertexAttribPointer(
			positionAttribLocation, 			// Attribute location
			3, 									// Number of elements per attribute
			gl.FLOAT, 							// Type of elements
			gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,	// Size of an individual vertex
			0 									// Offset from the beginning of a single vertex to this attribute
		);
		gl.enableVertexAttribArray(positionAttribLocation);

		gl.bindBuffer(gl.ARRAY_BUFFER, texCoordVertexBuffer);
		var texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
		gl.vertexAttribPointer(
			texCoordAttribLocation,
			2,
			gl.FLOAT,
			gl.FALSE,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(texCoordAttribLocation);

		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		var normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');
		gl.vertexAttribPointer(
			normalAttribLocation,
			3, gl.FLOAT,
			gl.TRUE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(normalAttribLocation);


		//
		// Create texture
		//
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
			gl.UNSIGNED_BYTE,
			texImg
		);
		gl.bindTexture(gl.TEXTURE_2D, null);

		var leafModel = ({texture:texture, indices:indices, posVertexBuffer:posVertexBuffer,
			texCoordVertexBuffer:texCoordVertexBuffer, normalBuffer:normalBuffer});



		//
		// Define world, view, and projection matrices
		//
		gl.useProgram(program);

		var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
		var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
		var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

		var worldMatrix = new Float32Array(16);
		var viewMatrix = new Float32Array(16);
		var projMatrix = new Float32Array(16);

		mat4.identity(worldMatrix);
		mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
		mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.clientWidth / canvas.clientHeight, 0.1, 1000.0);

		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
		gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

		//
		// Lighting information
		//
		gl.useProgram(program);

		var ambientUniformLocation = gl.getUniformLocation(program, 'ambientLightIntensity');
		var sunlightDirUniformLocation = gl.getUniformLocation(program, 'sun.direction');
		var sunlightIntUniformLocation = gl.getUniformLocation(program, 'sun.color');

		gl.uniform3f(ambientUniformLocation, 0.2, 0.2, 0.2);
		gl.uniform3f(sunlightDirUniformLocation, 3.0, 4.0, -2.0);
		gl.uniform3f(sunlightIntUniformLocation, 0.9, 0.9, 0.9);

		//
		// Main render loop
		// TODO: modify to accept multiple models
		//
		var identityMatrix = new Float32Array(16);
		mat4.identity(identityMatrix);
		var originalViewMatrix = new Float32Array(16);
		mat4.copy(originalViewMatrix, viewMatrix);

		var loop = function () {
			// Offset viewMatrix
			mat4.translate(viewMatrix, originalViewMatrix, [0, scrollY/80, 0]);
			gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);

			gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
			gl.bindTexture(gl.TEXTURE_2D, leafModel.texture);
			gl.activeTexture(gl.TEXTURE0);
			gl.drawElements(gl.TRIANGLES, leafModel.indices.length, gl.UNSIGNED_SHORT, 0);

			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
}
