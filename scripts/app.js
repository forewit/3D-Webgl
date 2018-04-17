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
							console.error(fsErr);
						} else {
							loadImage('./img/leafTexture.png', function (imgErr, leafImg) {
								if (imgErr) {
									alert('Fatal error getting leaf texture (see console)');
									console.error(imgErr);
								} else {
									startWebGL(vsText, fsText, leafImg, leafJSON);
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
var startWebGL = function (vertexShaderText, fragmentShaderText, leafImg, leafJSON) {
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
	var leafModel = addModel(gl, program, leafImg, leafJSON);


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
};
