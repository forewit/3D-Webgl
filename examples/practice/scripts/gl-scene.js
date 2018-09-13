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

const vertexShaderText =
`#version 300 es

layout(location=0) in vec3 a_vertPosition;
layout(location=1) in vec2 a_vertTexCoord;
layout(location=2) in vec3 a_vertNormal;

out vec2 v_fragTexCoord;
out vec3 v_fragNormal;
out vec3 v_fragPosition;

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

const fragmentShaderText = 
`#version 300 es
precision highp float;

in vec2 v_fragTexCoord;
in vec3 v_fragNormal;
in vec3 v_fragPosition;

out vec4 fragColor;

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

    fragColor = vec4(result, 1.0);
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
  vec3 ambient  = light.ambient  * vec3(texture(u_material.diffuse, v_fragTexCoord));
  vec3 diffuse  = light.diffuse  * diff * vec3(texture(u_material.diffuse, v_fragTexCoord));
  vec3 specular = light.specular * spec * vec3(texture(u_material.specular, v_fragTexCoord));
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
    vec3 ambient  = light.ambient  * vec3(texture(u_material.diffuse, v_fragTexCoord));
    vec3 diffuse  = light.diffuse  * diff * vec3(texture(u_material.diffuse, v_fragTexCoord));
    vec3 specular = light.specular * spec * vec3(texture(u_material.specular, v_fragTexCoord));
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
    vec3 ambient  = light.ambient  * vec3(texture(u_material.diffuse, v_fragTexCoord));
    vec3 diffuse  = light.diffuse  * diff * vec3(texture(u_material.diffuse, v_fragTexCoord));
    vec3 specular = light.specular * spec * vec3(texture(u_material.specular, v_fragTexCoord));
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
const geoVertexShaderText =
`#version 300 es

layout(std140, column_major) uniform;

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aUV;

uniform Matrices {
    mat4 uModelMatrix;
    mat4 uMVP;
};

out vec4 vPosition;
out vec4 vNormal;
out vec4 vUV;

void main() {
    vPosition = uModelMatrix * aPosition;
    vNormal = uModelMatrix * vec4(aNormal, 0.0);
    vUV = aUV;
    gl_Position = uMVP * aPosition;
}`;

const geoFragmentShaderText =
`#version 300 es
precision highp float;

in vec4 vPosition;
in vec4 vNormal; 
in vec4 vUV;

layout(location=0) out vec4 fragPosition;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragUV; 

void main() {
    fragPosition = vPosition;
    fragNormal = vec4(normalize(vNormal.xyz), 0.0);
    fragUV = vUV;
}`;

const mainVertexShaderText =
`#version 300 es

layout(std140, column_major) uniform;

layout(location=0) in vec4 aPosition;

uniform LightUniforms {
    mat4 mvp;
    vec4 position;
    vec4 color;
} uLight; 

void main() {
    gl_Position = uLight.mvp * aPosition;
}`;

const mainFragmentShaderText =
`#version 300 es
precision highp float;

uniform LightUniforms {
    mat4 mvp; //projection * view * model
    vec4 position;
    vec4 color;
} uLight; 

uniform vec3 uEyePosition;

uniform sampler2D uPositionBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uUVBuffer;
uniform sampler2D uTextureMap;

out vec4 fragColor;

void main() {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec3 position = texelFetch(uPositionBuffer, fragCoord, 0).xyz;
    vec3 normal = normalize(texelFetch(uNormalBuffer, fragCoord, 0).xyz);
    vec2 uv = texelFetch(uUVBuffer, fragCoord, 0).xy;

    vec4 baseColor = texture(uTextureMap, uv);

    vec3 eyeDirection = normalize(uEyePosition - position);
    vec3 lightVec = uLight.position.xyz - position;
    float attenuation = 1.0 - length(lightVec);
    vec3 lightDirection = normalize(lightVec);
    vec3 reflectionDirection = reflect(-lightDirection, normal);
    float nDotL = max(dot(lightDirection, normal), 0.0);
    vec3 diffuse = nDotL * uLight.color.rgb;
    float ambient = 0.1;
    vec3 specular = pow(max(dot(reflectionDirection, eyeDirection), 0.0), 20.0) * uLight.color.rgb;

    fragColor = vec4(attenuation * (ambient + diffuse + specular) * baseColor.rgb, baseColor.a);
}`;
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
    var gl = canvas.getContext('webgl2');
    if (!gl) {
    	console.log('Failed to get WebGL context - trying experimental context');
    	gl = canvas.getContext('experimental-webgl');
    }
	if (!gl) {
    	console.error('Your browser does not support WebGL - please use a different browser\nGoogleChrome works great!');
    	return;
    }

	gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.clearColor(0,0,0,0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.ONE, gl.ONE);
    if (!gl.getExtension("EXT_color_buffer_float")) {
        console.error("FLOAT color buffer not available");
        document.body.innerHTML = "This example requires EXT_color_buffer_float which is unavailable on this system."
        return;
    }
    
    ////////////////////////////
    // GBUFFER PROGRAM SETUP
    ////////////////////////////
    var geoVS = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(geoVS, geoVertexShaderText);
    gl.compileShader(geoVS);
    if (!gl.getShaderParameter(geoVS, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(geoVS));
    }

    var geoFS = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(geoFS, geoFragmentShaderText);
    gl.compileShader(geoFS);
    if (!gl.getShaderParameter(geoFS, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(geoFS));
    }

    var geoProgram = gl.createProgram();
    gl.attachShader(geoProgram, geoVS);
    gl.attachShader(geoProgram, geoFS);
    gl.linkProgram(geoProgram);

    if (!gl.getProgramParameter(geoProgram, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(geoProgram));
    }

    //////////////////////////////////////////
    // GET GBUFFFER PROGRAM UNIFORM LOCATIONS
    //////////////////////////////////////////
    var matrixUniformLocation = gl.getUniformBlockIndex(geoProgram, "Matrices");
    gl.uniformBlockBinding(geoProgram, matrixUniformLocation, 0);

    ////////////////////////////
    // GBUFFER SETUP
    ////////////////////////////
    var gBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);

    gl.activeTexture(gl.TEXTURE0);

    var positionTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, positionTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, positionTarget, 0);

    var normalTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, normalTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normalTarget, 0);

    var uvTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, uvTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, uvTarget, 0);

    var depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

    gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
        gl.COLOR_ATTACHMENT1,
        gl.COLOR_ATTACHMENT2
    ]);


    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    /////////////////////////////
    // MAIN PROGRAM SETUP
    /////////////////////////////
    var mainVS = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(mainVS, mainVertexShaderText);
    gl.compileShader(mainVS);
    if (!gl.getShaderParameter(mainVS, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(mainVS));
    }

    var mainFS = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(mainFS, mainFragmentShaderText);
    gl.compileShader(mainFS);
    if (!gl.getShaderParameter(mainFS, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(mainFS));
    }

    var mainProgram = gl.createProgram();
    gl.attachShader(mainProgram, mainVS);
    gl.attachShader(mainProgram, mainFS);
    gl.linkProgram(mainProgram);
    if (!gl.getProgramParameter(mainProgram, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(mainProgram));
    }

    //////////////////////////////////////////////
    // GET MAIN PROGRAM UNIFORM LOCATIONS
    //////////////////////////////////////////////

    me.lightUniformsLocation = gl.getUniformBlockIndex(mainProgram, "LightUniforms");
    gl.uniformBlockBinding(mainProgram, lightUniformsLocation, 0);

    me.eyePositionLocation = gl.getUniformLocation(mainProgram, "uEyePosition");

    me.positionBufferLocation = gl.getUniformLocation(mainProgram, "uPositionBuffer");
    me.normalBufferLocation = gl.getUniformLocation(mainProgram, "uNormalBuffer");
    me.uVBufferLocation = gl.getUniformLocation(mainProgram, "uUVBuffer");
    me.textureMapLocation = gl.getUniformLocation(mainProgram, "uTextureMap");

    gl.useProgram(mainProgram);
    gl.uniform1i(me.positionBufferLocation, 0);
    gl.uniform1i(me.normalBufferLocation, 1);
    gl.uniform1i(me.uVBufferLocation, 2);
    gl.uniform1i(me.textureMapLocation, 3);

    // Initialize scene properties
    me.gl = gl;
    me.gbuffer = gbuffer;
    me.mainProgram = mainProgram;
    me.geoProgram = geoProgram;
	me.models = [];
	me.pointLights = [];
	me.dirLights = [];
    me.spotLights = [];
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

	// Position buffer: 0
	model.buffers.positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers.positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.vertices), gl.STATIC_DRAW);

	// Normal buffer: 1
	model.buffers.normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.normals), gl.STATIC_DRAW);

	// UV buffer: 2
	model.buffers.uvBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers.uvBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.texCoords), gl.STATIC_DRAW);

    // Index buffer
	model.buffers.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.buffers.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.data.indices), gl.STATIC_DRAW);

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
                    gl.deleteBuffer(me.models[i].buffers.positionBuffer);
                    gl.deleteBuffer(me.models[i].buffers.indexBuffer);
                    gl.deleteBuffer(me.models[i].buffers.normalBuffer);
                    gl.deleteBuffer(me.models[i].buffers.uvBuffer);

                    // Delete textures
                    gl.deleteTexture(me.models[i].textures[0]);
                    gl.deleteTexture(me.models[i].textures[1]);

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

    // Scene uniforms
    var matrixUniformData = new Float32Array(32);
    var matrixUniformBuffer = gl.createBuffer();
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matrixUniformBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 128, gl.DYNAMIC_DRAW);

    var lights = [
        {
            position: vec3.fromValues(0, 1, 0.5),
            color:    vec3.fromValues(0.8, 0.0, 0.0),
            uniformData: new Float32Array(24),
            uniformBuffer: gl.createBuffer()
        },
        {
            position: vec3.fromValues(1, 1, 0.5),
            color:    vec3.fromValues(0.0, 0.0, 0.8),
            uniformData: new Float32Array(24),
            uniformBuffer: gl.createBuffer()
        },
        {
            position: vec3.fromValues(1, 0, 0.5),
            color:    vec3.fromValues(0.0, 0.8, 0.0),
            uniformData: new Float32Array(24),
            uniformBuffer: gl.createBuffer()
        },
        {
            position: vec3.fromValues(0.5, 0, 1),
            color:    vec3.fromValues(0.0, 0.8, 0.8),
            uniformData: new Float32Array(24),
            uniformBuffer: gl.createBuffer()
        }
    ];
    
    var mvpMatrix = mat4.create();
    for (var i = 0, len = lights.length; i < len; ++i) {
        utils.xformMatrix(mvpMatrix, lights[i].position);
        mat4.multiply(mvpMatrix, viewProjMatrix, mvpMatrix);
        lights[i].uniformData.set(mvpMatrix);
        lights[i].uniformData.set(lights[i].position, 16);
        lights[i].uniformData.set(lights[i].color, 20);

        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, lights[i].uniformBuffer);        
        gl.bufferData(gl.UNIFORM_BUFFER, lights[i].uniformData, gl.STATIC_DRAW);
    }

    //////////////////
    // BIND TEXTURES
    //////////////////

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, positionTarget);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, normalTarget);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, uvTarget);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);


    //////////////////////////////
    // SET MAIN PROGRAM UNIFORMS
    //////////////////////////////

    gl.useProgram(me.mainProgram);
    gl.uniform3fv(me.eyePositionLocation, camera.position);

    /////////////////////////
    // DRAW TO GBUFFER
    /////////////////////////

    gl.bindFramebuffer(gl.FRAMEBUFFER, me.gbuffer);
    gl.useProgram(me.geoProgram);
    gl.depthMask(true);
    gl.disable(gl.BLEND);


	for (i=0, len=me.models.length; i<len; i++) {
        // Set attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].buffers.vbo);
		gl.vertexAttribPointer(0,3, gl.FLOAT, gl.FALSE,3 * Float32Array.BYTES_PER_ELEMENT,0);
		gl.enableVertexAttribArray(0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].buffers.tbo);
		gl.vertexAttribPointer(1,2, gl.FLOAT, gl.FALSE,2 * Float32Array.BYTES_PER_ELEMENT,0);
		gl.enableVertexAttribArray(1)

		gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].buffers.nbo);
		gl.vertexAttribPointer(2,3, gl.FLOAT, gl.FALSE,3 * Float32Array.BYTES_PER_ELEMENT,0);		
		gl.enableVertexAttribArray(2);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, me.models[i].buffers.ibo);
		gl.drawElements(gl.TRIANGLES, me.models[i].data.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
};