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

ALL ANGLES ARE IN DEGREES */
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

    // clamp for spot light
    float inner = cos(light.innerCutOff);
    float outer = cos(light.outerCutOff);

    float theta = dot(lightDir, normalize(-light.direction));
    float epsilon   = inner - outer;
    float intensity = clamp((theta - outer) / epsilon, 0.0, 1.0);

    diffuse  *= intensity;
    specular *= intensity;

    return (ambient + diffuse + specular);
}

`;

// TODO: change me.material to a single shine var instead of object
// TODO: move setting uniforms out of render loop
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
var Scene = function (canvas) {
	var me = this;
    var gl = canvas.getContext('webgl');
    if (!gl) {
    	console.log('Failed to get WebGL context - trying experimental context');
    	gl = canvas.getContext('experimental-webgl');
    }
	if (!gl) {
    	console.error('Your browser does not support WebGL - please use a different browser\nGoogleChrome works great!');
    	return;
    }

	// Setup vertex shader
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShaderText);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vs));
        return;
    }

    // Setup fragment shader
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentShaderText);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fs));
        return;
    }

    // Setup gl program
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

	//
	// Setup scene variables
	//
	me.gl = gl;
    me.program = program;
	me.models = [];
	me.pointLights = [];
	me.dirLights = [];
	me.spotLights = [];

	me.myModels = [];
	me.myPointLights = [];
	me.myDirLights = [];
	me.mySpotLights = [];

    // Uniform locations
    me.uniforms = {
		mProj: gl.getUniformLocation(me.program, 'u_proj'),
		mView: gl.getUniformLocation(me.program, 'u_view'),
		mWorld: gl.getUniformLocation(me.program, 'u_world'),
		viewsPos: gl.getUniformLocation(me.program, 'u_viewPosition'),
		materialShine: gl.getUniformLocation(me.program, 'u_material.shine'),
		materialDiffuse: gl.getUniformLocation(me.program, 'u_material.diffuse'),
		materialSpecular: gl.getUniformLocation(me.program, 'u_material.specular'),
	};

    // Attribute locations
    me.attribs = {
		vPos: gl.getAttribLocation(me.program, 'a_vertPosition'),
		vNorm: gl.getAttribLocation(me.program, 'a_vertNormal'),
		vTexCoord: gl.getAttribLocation(me.program, 'a_vertTexCoord'),
	};


	// TODO: REMOVE
	me.material = {
		shine: 100,
	};
}

// TODO: implement Remove
// 1. remove from Scene
// 2. figure out how renderer can handle a remove
Scene.prototype.Remove = function (object) {
	switch(object.constructor.name) {
	    case "Model":
	        break;
	    case "PointLight":
	        break;
		case "SpotLight":
			break;
		case "DirLight":
			break;
	    default:
	        //code block
	}
}
Scene.prototype.loadModel = function (object) {
	var me = this;
	var gl = me.gl;

	var model = {
		data: object,
		buffers: {},
		textures: [],
	};

	// Vertex buffer
	model.buffers.vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers.vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.vertices), gl.STATIC_DRAW);

	// Index buffer
	model.buffers.ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.buffers.ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.data.indices), gl.STATIC_DRAW);

	// Normal buffer
	model.buffers.nbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers.nbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.normals), gl.STATIC_DRAW);

	// texture coordinate buffer
	model.buffers.tbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers.tbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.texCoords), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	// Textures
	function setupTexture(img, tex) {
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
			gl.UNSIGNED_BYTE,
			img
		);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	// Color texture
	var texture = gl.createTexture();
	setupTexture(model.data.texImg, texture);
	model.textures[0] = texture;


	// Specular map texture
	var specMap = gl.createTexture();
	setupTexture(model.data.specMapImg, specMap);
	model.textures[1] = specMap;

	me.myModels.push(model);
};

Scene.prototype.loadPointLight = function (object) {
	var me = this;
	var gl = me.gl;

	var i = me.myPointLights.length;
	console.log('Point light: ' + i);
	var light = {
		data: object,
		uniforms: [
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].position'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].ambient'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].diffuse'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].specular'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].constant'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].linear'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].quadratic'),
		],
	};
	me.myPointLights.push(light);
};

Scene.prototype.loadSpotLight = function (object) {
	var me = this;
	var gl = me.gl;

	var i = me.mySpotLights.length;
	console.log('Spot light: ' + i);
	var light = {
		data: object,
		uniforms: [
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].position'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].direction'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].ambient'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].diffuse'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].specular'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].constant'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].linear'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].quadratic'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].innerCutOff'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + i + '].outerCutOff'),
		],
	};
	me.mySpotLights.push(light);
};

Scene.prototype.loadDirLight = function (object) {
	var me = this;
	var gl = me.gl;

	var i = me.myDirLights.length;
	console.log('Dir light: ' + i);

	var light = {
		data: object,
		uniforms: [
			gl.getUniformLocation(me.program, 'u_dirLights[' + i + '].direction'),
			gl.getUniformLocation(me.program, 'u_dirLights[' + i + '].ambient'),
			gl.getUniformLocation(me.program, 'u_dirLights[' + i + '].diffuse'),
			gl.getUniformLocation(me.program, 'u_dirLights[' + i + '].specular'),
		],
	};
	me.myDirLights.push(light);
};

Scene.prototype.Add = function (object) {
	var me = this;
	var gl = me.gl;

	switch(object.constructor.name) {
	    case "Model":
			me.loadModel(object);
	        break;

	    case "PointLight":
			me.loadPointLight(object);
	        break;

		case "SpotLight":
			me.loadSpotLight(object);
			break;

		case "DirLight":
			me.loadDirLight(object);
			break;

	    default:
	        //code block
	}
};

Scene.prototype.Render = function (camera) {
	var me = this;
	var gl = me.gl;

	// Canvas setup
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);

	gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
	gl.clearColor(0, 0, 0, 0.3);
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

	// Set uniforms
	gl.useProgram(me.program);

	gl.uniformMatrix4fv(me.uniforms.mView, gl.FALSE, camera.getViewMatrix());
	gl.uniformMatrix4fv(me.uniforms.mProj, gl.FALSE, camera.projMatrix);
	gl.uniform3fv(me.uniforms.viewPos, camera.position);

	// Light uniforms
	for (i=0, len=me.myPointLights.length; i<len; i++) {
		gl.uniform3fv(me.myPointLights[i].uniforms[0], me.myPointLights[i].data.position);
		gl.uniform3fv(me.myPointLights[i].uniforms[1], me.myPointLights[i].data.ambient);
		gl.uniform3fv(me.myPointLights[i].uniforms[2], me.myPointLights[i].data.diffuse);
		gl.uniform3fv(me.myPointLights[i].uniforms[3], me.myPointLights[i].data.specular);
		gl.uniform1f(me.myPointLights[i].uniforms[4], me.myPointLights[i].data.attenuation[0]);
		gl.uniform1f(me.myPointLights[i].uniforms[5], me.myPointLights[i].data.attenuation[1]);
		gl.uniform1f(me.myPointLights[i].uniforms[6], me.myPointLights[i].data.attenuation[2]);
	}
	for (i=0, len=me.mySpotLights.length; i<len; i++) {
	    gl.uniform3fv(me.mySpotLights[i].uniforms[0], me.mySpotLights[i].data.position);
	    gl.uniform3fv(me.mySpotLights[i].uniforms[1], me.mySpotLights[i].data.direction);
	    gl.uniform3fv(me.mySpotLights[i].uniforms[2], me.mySpotLights[i].data.ambient);
	    gl.uniform3fv(me.mySpotLights[i].uniforms[3], me.mySpotLights[i].data.diffuse);
	    gl.uniform3fv(me.mySpotLights[i].uniforms[4], me.mySpotLights[i].data.specular);
	    gl.uniform1f(me.mySpotLights[i].uniforms[5], me.mySpotLights[i].data.attenuation[0]);
	    gl.uniform1f(me.mySpotLights[i].uniforms[6], me.mySpotLights[i].data.attenuation[1]);
	    gl.uniform1f(me.mySpotLights[i].uniforms[7], me.mySpotLights[i].data.attenuation[2]);
	    gl.uniform1f(me.mySpotLights[i].uniforms[8], me.mySpotLights[i].data.innerCutOff);
	    gl.uniform1f(me.mySpotLights[i].uniforms[9], me.mySpotLights[i].data.outerCutOff);
	}
	for (i=0, len=me.myDirLights.length; i<len; i++) {
		gl.uniform3fv(me.myDirLights[i].uniforms[0], me.myDirLights[i].data.direction);
		gl.uniform3fv(me.myDirLights[i].uniforms[1], me.myDirLights[i].data.ambient);
		gl.uniform3fv(me.myDirLights[i].uniforms[2], me.myDirLights[i].data.diffuse);
		gl.uniform3fv(me.myDirLights[i].uniforms[3], me.myDirLights[i].data.specular);
	}


	for (i=0, len=me.myModels.length; i<len; i++) {
        // Bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, me.myModels[i].textures[0]);

		// Bind specular mapping
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, me.myModels[i].textures[1]);

        // Per object uniforms
        //TODO verify e
        gl.uniformMatrix4fv(
            me.uniforms.mWorld,
            gl.FALSE,
            me.myModels[i].data.world,
        );

        // Set attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, me.myModels[i].buffers.vbo);
		gl.vertexAttribPointer(
			me.attribs.vPos,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vPos);

        gl.bindBuffer(gl.ARRAY_BUFFER, me.myModels[i].buffers.tbo);
		gl.vertexAttribPointer(
			me.attribs.vTexCoord,
			2, gl.FLOAT, gl.FALSE,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vTexCoord)

		gl.bindBuffer(gl.ARRAY_BUFFER, me.myModels[i].buffers.nbo);
		gl.vertexAttribPointer(
			me.attribs.vNorm,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vNorm);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, me.myModels[i].buffers.ibo);
		gl.drawElements(gl.TRIANGLES, me.myModels[i].data.indices.length, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
};
