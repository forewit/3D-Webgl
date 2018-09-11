/**
 * @fileoverview gl-scene - Simple and quick webgl scene creator
 * @author Marc Anderson
 * @version 1.0
 *
 * Inspired by: https://github.com/sessamekesh/IndigoCS-webgl-tutorials
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

// Good light attenuation: [1.0, 0.045, 0.0075]

/******* DEFAULTS ********/
const MAX_POINT_LIGHTS = 4; // Minimum of 1
const MAX_SPOT_LIGHTS = 4; // Minimum of 1
const MAX_DIR_LIGHTS = 4; // Minimum of 1
const MATERIAL_SHINE = 100;
/*************************/

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

#define NUM_POINT_LIGHTS <numPointLights>

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

#define NUM_DIR_LIGHTS <numDirLights>
struct DirLight {
    vec3 direction;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};
uniform DirLight u_dirLights[NUM_DIR_LIGHTS];

#define NUM_SPOT_LIGHTS <numSpotLights>
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
  float attenuation = 1.0 / max((light.constant + light.linear * distance +
               light.quadratic * (distance * distance)), 0.00001);

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
    float attenuation = 1.0 / max((light.constant + light.linear * distance +
                 light.quadratic * (distance * distance)), 0.00001);

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

// TODO: overload the add models function (depending of number of textuers)
// TODO: Move Material information to the model instead of the scene

/**
 * @class Webgl 3D scene containing models, cameras, and phong lighting with
 * point, spot, and directional lights.
 * @name Scene 
 * 
 * @param {HTML Canvas} canvas Webgl context
 * @param {Object} options Allows for customization of default settings
 */
var Scene = function (canvas, options) {
	var me = this;

	// Canvas
    var gl = canvas.getContext('webgl');
    if (!gl) {
    	console.log('Failed to get WebGL context - trying experimental context');
    	gl = canvas.getContext('experimental-webgl');
    }
	if (!gl) {
    	console.error('Your browser does not support WebGL - please use a different browser\nGoogleChrome works great!');
    	return;
    }

    // Vertex shader
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShaderText);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error('Error compiling vertex shader: ' + gl.getShaderInfoLog(vs));
        return;
    }

    // Fragment shader
    if (!options) options = {};
    me.maxPointLights = options.maxPointLights || MAX_POINT_LIGHTS;
    me.maxSpotLights = options.maxSpotLights || MAX_SPOT_LIGHTS;
    me.maxDirLights = options.maxDirLights || MAX_DIR_LIGHTS;

    var fsText = fragmentShaderText.replace('<numPointLights>', me.maxPointLights);
    fsText = fsText.replace('<numSpotLights>', me.maxSpotLights);
    fsText = fsText.replace('<numDirLights>', me.maxDirLights)

    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsText);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error('Error compiling fragment shader: ' + gl.getShaderInfoLog(fs));
        return;
    }

    // GL program
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
    gl.detachShader(program, vs);
    gl.detachShader(program, fs);

    // Initialize scene properties
	me.gl = gl;
    me.program = program;
	me.models = [];
	me.pointLights = [];
	me.dirLights = [];
    me.spotLights = [];
   
    // Global uniform locations
    me.uniforms = {
		mProj: gl.getUniformLocation(me.program, 'u_proj'),
		mView: gl.getUniformLocation(me.program, 'u_view'),
		mWorld: gl.getUniformLocation(me.program, 'u_world'),
		viewPos: gl.getUniformLocation(me.program, 'u_viewPosition'),
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
}

/**
 * Adds a model to the scene by generating buffers and uniform data
 * 
 * @param {Object} object Contains model JSON, texture, material and position data
 */
Scene.prototype.AddModel = function (object) {
	var me = this;
	var gl = me.gl;

    // Prevent adding duplicates
    for (i=0, len=me.models.length; i<len; i++) {
        if (object == me.models[i].data) { return; }
    }

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

	me.models.push(model);
};

/**
 * Add a point light to the scene
 * 
 * @param {Object} object Point light object that contains position, color, and attenuation data
 */
Scene.prototype.AddPointLight = function (object) {
	var me = this;
	var gl = me.gl;

    var len = me.pointLights.length;

    // Prevent exceeding maximum
    if (len == me.maxPointLights) {
        console.error('Cannot exceed point light maximum.');
        return;
    }
    // Prevent adding duplicates
    for (i=0; i<len; i++) {
        if (object == me.pointLights[i].data) {
            console.error('Cannot add duplicate point light.')
            return;
        }
    }

	var light = {
		data: object,
		uniforms: [
			gl.getUniformLocation(me.program, 'u_pointLights[' + len + '].position'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + len + '].ambient'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + len + '].diffuse'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + len + '].specular'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + len + '].constant'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + len + '].linear'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + len + '].quadratic'),
		],
	};
	me.pointLights.push(light);
};

/**
 * Add a spot light to the scene
 * 
 * @param {Object} object Spot light object that contains position, orientation, 
 * cutoff, color, and attenuation data
 */
Scene.prototype.AddSpotLight = function (object) {
	var me = this;
	var gl = me.gl;

    var len = me.spotLights.length;

    // Prevent exceeding maximum
    if (len == me.maxSpotLights) {
        console.error('Cannot exceed spot light maximum.');
        return;
    }
    // Prevent adding duplicates
    for (i=0; i<len; i++) {
        if (object == me.spotLights[i].data) {
            console.error('Cannot add duplicate spot light.')
            return;
        }
    }

	var light = {
		data: object,
		uniforms: [
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].position'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].direction'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].ambient'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].diffuse'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].specular'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].constant'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].linear'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].quadratic'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].innerCutOff'),
			gl.getUniformLocation(me.program, 'u_spotLights[' + len + '].outerCutOff'),
		],
	};
	me.spotLights.push(light);
};

/**
 * Add a directional light to the scene
 * 
 * @param {Object} object Directional light object that contains orientation and color data
 */
Scene.prototype.AddDirLight = function (object) {
	var me = this;
	var gl = me.gl;

    var len = me.dirLights.length;

    // Prevent exceeding maximum
    if (len == me.maxDirLights) {
        console.error('Cannot exceed directional light maximum.');
        return;
    }
    // Prevent adding duplicates
    for (i=0; i<len; i++) {
        if (object == me.dirLights[i].data) {
            console.error('Cannot add duplicate directional light.')
            return;
        }
    }

	var light = {
		data: object,
		uniforms: [
			gl.getUniformLocation(me.program, 'u_dirLights[' + len + '].direction'),
			gl.getUniformLocation(me.program, 'u_dirLights[' + len + '].ambient'),
			gl.getUniformLocation(me.program, 'u_dirLights[' + len + '].diffuse'),
			gl.getUniformLocation(me.program, 'u_dirLights[' + len + '].specular'),
		],
	};
	me.dirLights.push(light);
};

/**
 * Add lights or models with one function!
 * 
 * @param {Object} object Object to be added to the scene
 */
Scene.prototype.Add = function (object) {
	switch(object.constructor.name) {
	    case "Model":
			this.AddModel(object);
	        break;
	    case "PointLight":
			this.AddPointLight(object);
	        break;
		case "SpotLight":
			this.AddSpotLight(object);
			break;
		case "DirLight":
            this.AddDirLight(object); 
			break;
	    default:
	}
};

/**
 * Remove lights or models with one function!
 * 
 * @param {Object} object Object to be removed from the scene
 */
Scene.prototype.Remove = function (object) {
    var me = this;
    var gl = me.gl;

	switch(object.constructor.name) {
        // Remove a model from the scene
	    case "Model":
            for (i=0, len=me.models.length; i<len; i++) {
                if (object == me.models[i].data) {
                    // Delete buffers
                    gl.deleteBuffer(me.models[i].buffers.vbo);
                    gl.deleteBuffer(me.models[i].buffers.ibo);
                    gl.deleteBuffer(me.models[i].buffers.nbo);
                    gl.deleteBuffer(me.models[i].buffers.tbo);

                    // Delete textures
                    gl.deleteTexture(me.models[i].textures[0]);
                    gl.deleteTexture(me.models[i].textures[0]);

                    // Delete properties
                    delete me.models[i].data;
                    delete me.models[i].buffers;
                    delete me.models[i].textures;

                    // Remove object
                    me.models.splice(i,1);
                    break;
                }
            }
            break;

        // Remove a point light from the scene
        case "PointLight":
            for (i=0, len=me.pointLights.length; i<len; i++) {
                if (object == me.pointLights[i].data) {
                    // Set light intensity to zero
                    gl.uniform3fv(me.pointLights[i].uniforms[0], [0,0,0]);
                    gl.uniform3fv(me.pointLights[i].uniforms[1], [0,0,0]);
                    gl.uniform3fv(me.pointLights[i].uniforms[2], [0,0,0]);
                    gl.uniform3fv(me.pointLights[i].uniforms[3], [0,0,0]);

                    // Delete properties
                    delete me.pointLights[i].data;
                    delete me.pointLights[i].uniforms;

                    // Remove object
                    me.pointLights.splice(i,1);
                    break;
                }
            }
            break;

        // Remove a spot light from the scene
        case "SpotLight":
            for (i=0, len=me.spotLights.length; i<len; i++) {
                if (object == me.spotLights[i].data) {
                    // Set light intensity to zero
                    gl.uniform3fv(me.spotLights[i].uniforms[0], [0,0,0]);
                    gl.uniform3fv(me.spotLights[i].uniforms[1], [0,0,0]);
                    gl.uniform3fv(me.spotLights[i].uniforms[2], [0,0,0]);
                    gl.uniform3fv(me.spotLights[i].uniforms[3], [0,0,0]);
                    gl.uniform3fv(me.spotLights[i].uniforms[4], [0,0,0]);

                    // Delete properties
                    delete me.spotLights[i].data;
                    delete me.spotLights[i].uniforms;

                    // Remove object
                    me.spotLights.splice(i,1);
                    break;
                }
            }
            break;

        // Remove directional light from the scene
        case "DirLight":
            for (i=0, len=me.dirLights.length; i<len; i++) {
                if (object == me.dirLights[i].data) {
                    // Set light intensity to zero
                    gl.uniform3fv(me.dirLights[i].uniforms[0], [0,0,0]);
                    gl.uniform3fv(me.dirLights[i].uniforms[1], [0,0,0]);
                    gl.uniform3fv(me.dirLights[i].uniforms[2], [0,0,0]);
                    gl.uniform3fv(me.dirLights[i].uniforms[3], [0,0,0]);

                    // Delete properties
                    delete me.dirLights[i].data;
                    delete me.dirLights[i].uniforms;

                    // Remove object
                    me.dirLights.splice(i,1);
                    break;
                }
            }
			break;
	    default:
	}
};

/**
 * Render the scene in webgl
 * 
 * @param {Object} camera Object that contains position, orientation, and fov data
 */
Scene.prototype.Render = function (camera) {
	var me = this;
	var gl = me.gl;

	gl.useProgram(me.program);

	// Canvas setup
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);

	gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.clearColor(0, 0, 0, 0.3);
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

	// Scene uniforms
	gl.uniformMatrix4fv(me.uniforms.mView, gl.FALSE, camera.getViewMatrix());
	gl.uniformMatrix4fv(me.uniforms.mProj, gl.FALSE, camera.projMatrix);
    gl.uniform3fv(me.uniforms.viewPos, camera.position);
	gl.uniform1i(me.uniforms.materialDiffuse, 0); // Texture unit 0
	gl.uniform1i(me.uniforms.materialSpecular, 1); // Texture unit 1

	// Light uniforms
	for (i=0, len=me.pointLights.length; i<len; i++) {
		gl.uniform3fv(me.pointLights[i].uniforms[0], me.pointLights[i].data.position);
		gl.uniform3fv(me.pointLights[i].uniforms[1], me.pointLights[i].data.ambient);
		gl.uniform3fv(me.pointLights[i].uniforms[2], me.pointLights[i].data.diffuse);
		gl.uniform3fv(me.pointLights[i].uniforms[3], me.pointLights[i].data.specular);
		gl.uniform1f(me.pointLights[i].uniforms[4], me.pointLights[i].data.attenuation[0]);
		gl.uniform1f(me.pointLights[i].uniforms[5], me.pointLights[i].data.attenuation[1]);
		gl.uniform1f(me.pointLights[i].uniforms[6], me.pointLights[i].data.attenuation[2]);
	}
	for (i=0, len=me.spotLights.length; i<len; i++) {
	    gl.uniform3fv(me.spotLights[i].uniforms[0], me.spotLights[i].data.position);
	    gl.uniform3fv(me.spotLights[i].uniforms[1], me.spotLights[i].data.direction);
	    gl.uniform3fv(me.spotLights[i].uniforms[2], me.spotLights[i].data.ambient);
	    gl.uniform3fv(me.spotLights[i].uniforms[3], me.spotLights[i].data.diffuse);
	    gl.uniform3fv(me.spotLights[i].uniforms[4], me.spotLights[i].data.specular);
	    gl.uniform1f(me.spotLights[i].uniforms[5], me.spotLights[i].data.attenuation[0]);
	    gl.uniform1f(me.spotLights[i].uniforms[6], me.spotLights[i].data.attenuation[1]);
	    gl.uniform1f(me.spotLights[i].uniforms[7], me.spotLights[i].data.attenuation[2]);
	    gl.uniform1f(me.spotLights[i].uniforms[8], me.spotLights[i].data.innerCutOff);
	    gl.uniform1f(me.spotLights[i].uniforms[9], me.spotLights[i].data.outerCutOff);
    }
	for (i=0, len=me.dirLights.length; i<len; i++) {
		gl.uniform3fv(me.dirLights[i].uniforms[0], me.dirLights[i].data.direction);
		gl.uniform3fv(me.dirLights[i].uniforms[1], me.dirLights[i].data.ambient);
		gl.uniform3fv(me.dirLights[i].uniforms[2], me.dirLights[i].data.diffuse);
		gl.uniform3fv(me.dirLights[i].uniforms[3], me.dirLights[i].data.specular);
    }

	for (i=0, len=me.models.length; i<len; i++) {
        // Material shine
        gl.uniform1f(me.uniforms.materialShine, me.models[i].data.shine || MATERIAL_SHINE); 

        // Bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, me.models[i].textures[0]);

        // Bind specular mapping
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, me.models[i].textures[1]);

        // Per object uniforms
        gl.uniformMatrix4fv(
            me.uniforms.mWorld,
            gl.FALSE,
            me.models[i].data.world,
        );

        // Set attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].buffers.vbo);
		gl.vertexAttribPointer(
			me.attribs.vPos,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vPos);

        gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].buffers.tbo);
		gl.vertexAttribPointer(
			me.attribs.vTexCoord,
			2, gl.FLOAT, gl.FALSE,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vTexCoord)

		gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].buffers.nbo);
		gl.vertexAttribPointer(
			me.attribs.vNorm,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vNorm);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, me.models[i].buffers.ibo);
		gl.drawElements(gl.TRIANGLES, me.models[i].data.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
};