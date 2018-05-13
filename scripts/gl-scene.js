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

// TODO: replace objects with arrays where possible
// TODO: change me.material to a single shine var instead of object
// TODO: move setting uniforms out of render loop
// TODO: combine load and begin functions
// TODO: add load texture function
// TODO: overload the add models function (depending of number of textuers)
// TODO: add spot lights, point lights, and directional lights
// TODO: make materials plural instead of singular :)
// USEFUL: ` + `
/* TODO: documentation
		* MUST unload and load scene before adding lights
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
	var me = this;
	me.gl = gl;
	me.running = false;

	//
	// DEFAULT VALUES FOR LIGHTING, MODELS, ETC.
	//
	me.models = {};
	me.textures = {};
	me.specularMaps = {};
	me.pointLights = [];
	me.dirLights = [];
	me.spotLights = [];

	me.pointLightUniforms = [];

	// Initialize default view and camera position
	me.camera = new Camera(	                /********* DEFAULTS *********/
		vec3.fromValues(0, 0, 10),          // CAMERA POSITION
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
	/*
	me.pointLight = {
		position: [2, 0.8, 2],
		ambient: [0.2, 0.2, 0.2],
		diffuse: [1, 1, 1],
		specular: [1, 1, 1],
		constant: 1.0,
		linear: 0.045,
		quadratic: 0.0075,
	};
	*/
	me.material = {
		shine: 100,
	};
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

	// Setup vertex shader
	const vertexShaderText = `
	precision mediump float;

	attribute vec3 a_vertPosition;
	attribute vec2 a_vertTexCoord;
	attribute vec3 a_vertNormal;

	varying vec2 v_fragTexCoord;
	varying vec3 v_fragNormal;
	varying vec3 v_fragPosition;

	uniform mat4 u_world;
	uniform mat4 u_view;
	uniform mat4 u_proj;

	void main()
	{
		vec4 vertPosition = vec4(a_vertPosition, 1.0);
		vec3 surfacePosition = (u_world * vertPosition).xyz;

		v_fragPosition = surfacePosition;
		v_fragNormal = (u_world * vec4(a_vertNormal, 0.0)).xyz;
	  	v_fragTexCoord = a_vertTexCoord;

	  	gl_Position = u_proj * u_view * u_world * vertPosition;
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

	varying vec2 v_fragTexCoord;
	varying vec3 v_fragNormal;
	varying vec3 v_fragPosition;

	uniform vec3 u_viewPosition;

	#define NUM_POINT_LIGHTS 2
	struct PointLight {
		vec3 position;

		vec3 ambient;
		vec3 diffuse;
		vec3 specular;

		float constant;
		float linear;
		float quadratic;
	};
	uniform PointLight u_pointLights[NUM_POINT_LIGHTS];

	#define NUM_DIR_LIGHTS 1
	struct DirLight {
	    vec3 direction;

	    vec3 ambient;
	    vec3 diffuse;
	    vec3 specular;
	};
	uniform DirLight u_dirLights[NUM_DIR_LIGHTS];

	#define NUM_SPOT_LIGHTS 1
	struct SpotLight {
		vec3 position;
		vec3 direction;

		vec3 ambient;
		vec3 diffuse;
		vec3 specular;

		float constant;
		float linear;
		float quadratic;

		float innerCutOff;
		float outerCutOff;
	};
	uniform SpotLight u_spotLights[NUM_SPOT_LIGHTS];

	struct Material {
		sampler2D diffuse;
		sampler2D specular;
		float shine;
	};
	uniform Material u_material;


	// Function prototypes
	vec3 CalcPointLight(PointLight light, vec3 normal, vec3 fragPos, vec3 viewDir);
	vec3 CalcDirLight(DirLight light, vec3 normal, vec3 viewDir);
	vec3 CalcSpotLight(SpotLight light, vec3 normal, vec3 fragPos, vec3 viewDir);

	void main()
	{
		// properties
	    vec3 norm = normalize(v_fragNormal);
	    vec3 viewDir = normalize(u_viewPosition - v_fragPosition);

		vec3 result = vec3(0.0);

		// Directional lights
		for(int i = 0; i < NUM_DIR_LIGHTS; i++)
	        result += CalcDirLight(u_dirLights[i], norm, viewDir);

	    // Point lights
	    for(int i = 0; i < NUM_POINT_LIGHTS; i++)
	        result += CalcPointLight(u_pointLights[i], norm, v_fragPosition, viewDir);

		// Spot lights
		for(int i = 0; i < NUM_SPOT_LIGHTS; i++)
	        result += CalcSpotLight(u_spotLights[i], norm, v_fragPosition, viewDir);

	    gl_FragColor = vec4(result, 1.0);
  	}

  vec3 CalcPointLight(PointLight light, vec3 normal, vec3 fragPos, vec3 viewDir) {
	  vec3 lightDir = normalize(light.position - fragPos);

	  // diffuse shading
	  float diff = max(dot(normal, lightDir), 0.0);

	  // specular shading
	  vec3 reflectDir = reflect(-lightDir, normal);
	  float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_material.shine);

	  // attenuation
	  float distance    = length(light.position - fragPos);
	  float attenuation = 1.0 / (light.constant + light.linear * distance +
				   light.quadratic * (distance * distance));

	  // combine results
	  vec3 ambient  = light.ambient  * vec3(texture2D(u_material.diffuse, v_fragTexCoord));
	  vec3 diffuse  = light.diffuse  * diff * vec3(texture2D(u_material.diffuse, v_fragTexCoord));
	  vec3 specular = light.specular * spec * vec3(texture2D(u_material.specular, v_fragTexCoord));
	  ambient  *= attenuation;
	  diffuse  *= attenuation;
	  specular *= attenuation;
	  return (ambient + diffuse + specular);
  }

  	vec3 CalcDirLight(DirLight light, vec3 normal, vec3 viewDir) {
	    vec3 lightDir = normalize(-light.direction);

	    // diffuse shading
	    float diff = max(dot(normal, lightDir), 0.0);

	    // specular shading
	    vec3 reflectDir = reflect(-lightDir, normal);
	    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_material.shine);

	    // combine results
	    vec3 ambient  = light.ambient  * vec3(texture2D(u_material.diffuse, v_fragTexCoord));
	    vec3 diffuse  = light.diffuse  * diff * vec3(texture2D(u_material.diffuse, v_fragTexCoord));
	    vec3 specular = light.specular * spec * vec3(texture2D(u_material.specular, v_fragTexCoord));
	    return (ambient + diffuse + specular);
	}

	vec3 CalcSpotLight(SpotLight light, vec3 normal, vec3 fragPos, vec3 viewDir) {

		vec3 lightDir = normalize(light.position - fragPos);

		// diffuse shading
		float diff = max(dot(normal, lightDir), 0.0);

		// specular shading
		vec3 reflectDir = reflect(-lightDir, normal);
		float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_material.shine);

		// attenuation
		float distance    = length(light.position - fragPos);
		float attenuation = 1.0 / (light.constant + light.linear * distance +
					 light.quadratic * (distance * distance));

		// combine results
		vec3 ambient  = light.ambient  * vec3(texture2D(u_material.diffuse, v_fragTexCoord));
		vec3 diffuse  = light.diffuse  * diff * vec3(texture2D(u_material.diffuse, v_fragTexCoord));
		vec3 specular = light.specular * spec * vec3(texture2D(u_material.specular, v_fragTexCoord));
		ambient  *= attenuation;
		diffuse  *= attenuation;
		specular *= attenuation;

		// Clamp for spot light
		float theta = dot(lightDir, normalize(-light.direction));
		float epsilon   = light.innerCutOff- light.outerCutOff;
		float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);

		diffuse  *= intensity;
		specular *= intensity;

		return (ambient + diffuse + specular);
	}

  `;
	var fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fragmentShaderText);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fs));
		return;
	}

	// Setup the gl program
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



	// Set uniform locations
	for (i=0, len=me.pointLights.length; i<len; i++) {
		var uniforms = [
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].position'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].ambient'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].diffuse'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].specular'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].constant'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].linear'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].quadratic'),
		];
		me.pointLightUniforms.push(uniforms);
	}



	// TODO: moving the light and material uniform locations to when a light or model is added
	me.program.uniforms = {
		// Global uniforms
		mProj: gl.getUniformLocation(me.program, 'u_proj'),
		mView: gl.getUniformLocation(me.program, 'u_view'),
		mWorld: gl.getUniformLocation(me.program, 'u_world'),
		viewPosition: gl.getUniformLocation(me.program, 'u_viewPosition'),

		// Lighting uniforms
		lightPosition: gl.getUniformLocation(me.program, 'u_pointLights[0].position'),
		lightAmbient: gl.getUniformLocation(me.program, 'u_pointLights[0].ambient'),
		lightDiffuse: gl.getUniformLocation(me.program, 'u_pointLights[0].diffuse'),
		lightSpecular: gl.getUniformLocation(me.program, 'u_pointLights[0].specular'),
		lightConstant: gl.getUniformLocation(me.program, 'u_pointLights[0].constant'),
		lightLinear: gl.getUniformLocation(me.program, 'u_pointLights[0].linear'),
		lightQuadratic: gl.getUniformLocation(me.program, 'u_pointLights[0].quadratic'),

		// Material uniforms
		materialShine: gl.getUniformLocation(me.program, 'u_material.shine'),
		materialDiffuse: gl.getUniformLocation(me.program, 'u_material.diffuse'),
		materialSpecular: gl.getUniformLocation(me.program, 'u_material.specular'),
	};
	me.program.attribs = {
		vPos: gl.getAttribLocation(me.program, 'a_vertPosition'),
		vNorm: gl.getAttribLocation(me.program, 'a_vertNormal'),
		vTexCoord: gl.getAttribLocation(me.program, 'a_vertTexCoord'),
	};

	callback();
};


Scene.prototype.AddLight = function (pointLight) {
	var me = this;
	if (!me.running) {
		me.pointLights.push(pointLight);
	} else {
		console.log('Cannot add light while scene is active');
	}
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
	me.running = true;

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
	me.running = false;
	if (this.nextFrameHandle) {
		cancelAnimationFrame(this.nextFrameHandle);
	}
};


Scene.prototype.LoadModel = function (model) {
	var me = this;
	var gl = me.gl;

	var newModel = {};
	newModel.vbo = gl.createBuffer(); // Vertex buffer object
	newModel.ibo = gl.createBuffer(); // Index buffer object
	newModel.nbo = gl.createBuffer(); // Normal Buffer object
	newModel.tbo = gl.createBuffer(); // Texture coordinate buffer object
	newModel.nPoints = model.indices.length;

	newModel.world = mat4.create()

	gl.bindBuffer(gl.ARRAY_BUFFER, newModel.vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, newModel.tbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texCoords), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, newModel.nbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	me.models[model.id] = newModel;

	// Create texture
	var texture = me.gl.createTexture();
	me.textures[model.id] = texture;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
		gl.UNSIGNED_BYTE,
		model.texImg
	);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// Create specular map texture
	var specMap = me.gl.createTexture();
	me.specularMaps[model.id] = specMap;
	gl.bindTexture(gl.TEXTURE_2D, specMap);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
		gl.UNSIGNED_BYTE,
		model.specMapImg
	);
	gl.bindTexture(gl.TEXTURE_2D, null);

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
Scene.prototype.AddModel = function (id, jsonURL, textureURL, specMapURL, callback) {
	var me = this;
	var gl = me.gl;

	// Load model json
	var request = new XMLHttpRequest();
	request.open('GET', jsonURL, true);
	request.onload = function () {
		if (request.status > 199 && request.status < 300) {
			try {
				var modelJSON = JSON.parse(request.responseText);

				// Load texture image
				var texImage = new Image();
				texImage.onload = function () {

					var specMapImage = new Image();
					specMapImage.onload = function () {
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
							texImage
						);
						gl.bindTexture(gl.TEXTURE_2D, null);

						// Create specular map texture
						var specMap = me.gl.createTexture();
						me.specularMaps[id] = specMap;
						gl.bindTexture(gl.TEXTURE_2D, specMap);
						gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
						gl.texImage2D(
							gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
							gl.UNSIGNED_BYTE,
							specMapImage
						);
						gl.bindTexture(gl.TEXTURE_2D, null);
						callback();
					};
					specMapImage.src = specMapURL;
				};
				texImage.src = textureURL;
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

	// Set global uniforms
	gl.uniformMatrix4fv(me.program.uniforms.mProj, gl.FALSE, me.projMatrix);
	gl.uniformMatrix4fv(me.program.uniforms.mView, gl.FALSE, me.viewMatrix);
	gl.uniform3fv(me.program.uniforms.viewPosition, me.camera.position);

	// Point light uniforms
	for (i=0, len=me.pointLights.length; i<len; i++) {
		gl.uniform3fv(me.pointLightUniforms[i][0], me.pointLights[i].position);
		gl.uniform3fv(me.pointLightUniforms[i][1], me.pointLights[i].ambient);
		gl.uniform3fv(me.pointLightUniforms[i][2], me.pointLights[i].diffuse);
		gl.uniform3fv(me.pointLightUniforms[i][3], me.pointLights[i].specular);
		gl.uniform1f(me.pointLightUniforms[i][4], me.pointLights[i].attenuation[0]);
		gl.uniform1f(me.pointLightUniforms[i][5], me.pointLights[i].attenuation[1]);
		gl.uniform1f(me.pointLightUniforms[i][6], me.pointLights[i].attenuation[2]);
	}


	// Set material uniforms
	gl.uniform1f(me.program.uniforms.materialShine, me.material.shine);
	gl.uniform1i(me.program.uniforms.materialDiffuse, 0) // Texture unit 0
	gl.uniform1i(me.program.uniforms.materialSpecular, 1) // Texture unit 1

	// Draw meshes
	for (var i in me.models) {
		// Bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, me.textures[i]);

		// Bind specular mapping
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, me.specularMaps[i]);

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
