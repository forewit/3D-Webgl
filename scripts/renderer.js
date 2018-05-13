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

    // Clamp for spot light
    float theta = dot(lightDir, normalize(-light.direction));
    float epsilon   = light.innerCutOff- light.outerCutOff;
    float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);

    diffuse  *= intensity;
    specular *= intensity;

    return (ambient + diffuse + specular);
}

`;



/**
 * @class renderer
 * @name renderer
 *
 * Handles all webgl functions
 *
 */
var renderer = function (gl) {
    var me = this;
    me.gl = gl;

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
    me.program = program;

    // Set uniform locations
    me.uniforms.pointLights = [];
	for (i=0, len=scene.pointLights.length; i<len; i++) {
		var uniforms = [
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].position'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].ambient'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].diffuse'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].specular'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].constant'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].linear'),
			gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].quadratic'),
		];
		me.uniforms.pointLights.push(uniforms);
	}
    me.uniforms.mProj = gl.getUniformLocation(me.program, 'u_proj');
    me.uniforms.mView = gl.getUniformLocation(me.program, 'u_view');
    me.uniforms.mWorld = gl.getUniformLocation(me.program, 'u_world');
    me.uniforms.viewPos = gl.getUniformLocation(me.program, 'u_viewPosition');

    me.uniforms.materialShine = gl.getAttribLocation(me.program, 'a_vertPosition');
    me.uniforms.materialDiffuse = gl.getUniformLocation(me.program, 'u_material.diffuse');
    me.uniforms.materialSpecular = gl.getUniformLocation(me.program, 'u_material.specular');

    // Set attribute locations
    me.attribs = {
		vPos: gl.getAttribLocation(me.program, 'a_vertPosition'),
		vNorm: gl.getAttribLocation(me.program, 'a_vertNormal'),
		vTexCoord: gl.getAttribLocation(me.program, 'a_vertTexCoord'),
	};


    // TODO: Load Model texture maps
}

renderer.prototype.render = function (scene, camera) {

};
