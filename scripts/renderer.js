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

/**
 * @class renderer
 * @name renderer
 *
 * Handles all webgl functions
 *
 */
function Renderer(canvas) {
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
    me.gl = gl;

    me.models = [];

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

    // Set global uniform locations
    me.uniforms = {};

    me.uniforms.mProj = gl.getUniformLocation(me.program, 'u_proj');
    me.uniforms.mView = gl.getUniformLocation(me.program, 'u_view');
    me.uniforms.mWorld = gl.getUniformLocation(me.program, 'u_world');
    me.uniforms.viewPos = gl.getUniformLocation(me.program, 'u_viewPosition');

    me.uniforms.materialShine = gl.getUniformLocation(me.program, 'u_material.shine'),
    me.uniforms.materialDiffuse = gl.getUniformLocation(me.program, 'u_material.diffuse');
    me.uniforms.materialSpecular = gl.getUniformLocation(me.program, 'u_material.specular');

    // Initialize light uniform locations
    me.uniforms.pointLights = [];
    me.uniforms.dirLights = [];
    me.uniforms.spotLights = [];

    // Set attribute locations
    me.attribs = {
		vPos: gl.getAttribLocation(me.program, 'a_vertPosition'),
		vNorm: gl.getAttribLocation(me.program, 'a_vertNormal'),
		vTexCoord: gl.getAttribLocation(me.program, 'a_vertTexCoord'),
	};

}

Renderer.prototype.render = function (scene, camera) {
    var me = this;
    var gl = me.gl;


    // Set per light uniforms
    if (me.uniforms.pointLights.length != scene.pointLights.length) {
        console.log('point lights');
        for (i=0, len=scene.pointLights.length; i<len; i++) {
            var lightUniforms = [
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].position'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].ambient'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].diffuse'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].specular'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].constant'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].linear'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].quadratic'),
            ];
            me.uniforms.pointLights.push(lightUniforms);
        }
    }
    if (me.uniforms.spotLights.length != scene.spotLights.length) {
        console.log('spot lights');
        for (i=0, len=scene.spotLights.length; i<len; i++) {
            var lightUniforms = [
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
            ];
            me.uniforms.spotLights.push(lightUniforms);
        }
    }
    if (me.uniforms.dirLights.length != scene.dirLights.length) {
        console.log('directional lights');
        for (i=0, len=scene.dirLights.length; i<len; i++) {
            var lightUniforms = [
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].direction'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].ambient'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].diffuse'),
                gl.getUniformLocation(me.program, 'u_pointLights[' + i + '].specular'),
            ];
            me.uniforms.dirLights.push(lightUniforms);
        }
    }

    // Set per model uniform locations
    if (me.models.length != scene.models.length) {
        for (i=0, len=scene.models.length; i<len; i++) {
            var model = {}

            // Point data
            model.vbo = gl.createBuffer(); // Vertex buffer object
            model.ibo = gl.createBuffer(); // Index buffer object
            model.nbo = gl.createBuffer(); // Normal Buffer object
            model.tbo = gl.createBuffer(); // Texture coordinate buffer object
            model.nPoints = scene.models[i].indices.length;

            gl.bindBuffer(gl.ARRAY_BUFFER, model.vbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(scene.models[i].vertices), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, model.tbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(scene.models[i].texCoords), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, model.nbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(scene.models[i].normals), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.ibo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(scene.models[i].indices), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

            // Texture data
            var texture = gl.createTexture();
            model.texture = texture;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                gl.UNSIGNED_BYTE,
                scene.models[i].texImg
            );
            var specMap = gl.createTexture();
            model.specMap = specMap;
            gl.bindTexture(gl.TEXTURE_2D, specMap);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                gl.UNSIGNED_BYTE,
                scene.models[i].specMapImg
            );
            gl.bindTexture(gl.TEXTURE_2D, null);

            me.models.push(model);
        }
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
    gl.clearColor(0, 0, 0, 0.3);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

    gl.useProgram(me.program);

    gl.uniformMatrix4fv(me.uniforms.mView, gl.FALSE, camera.getViewMatrix());
    gl.uniformMatrix4fv(me.uniforms.mProj, gl.FALSE, camera.projMatrix);
    gl.uniform3fv(me.uniforms.viewPos, camera.position);

    // Point light uniforms
	for (i=0, len=me.uniforms.pointLights.length; i<len; i++) {
		gl.uniform3fv(me.uniforms.pointLights[i][0], scene.pointLights[i].position);
		gl.uniform3fv(me.uniforms.pointLights[i][1], scene.pointLights[i].ambient);
		gl.uniform3fv(me.uniforms.pointLights[i][2], scene.pointLights[i].diffuse);
		gl.uniform3fv(me.uniforms.pointLights[i][3], scene.pointLights[i].specular);
		gl.uniform1f(me.uniforms.pointLights[i][4], scene.pointLights[i].attenuation[0]);
		gl.uniform1f(me.uniforms.pointLights[i][5], scene.pointLights[i].attenuation[1]);
		gl.uniform1f(me.uniforms.pointLights[i][6], scene.pointLights[i].attenuation[2]);
	}
    for (i=0, len=me.uniforms.spotLights.length; i<len; i++) {
        gl.uniform3fv(me.uniforms.spotLights[i][0], scene.spotLights[i].position);
        gl.uniform3fv(me.uniforms.spotLights[i][1], scene.spotLights[i].direction);
        gl.uniform3fv(me.uniforms.spotLights[i][2], scene.spotLights[i].ambient);
        gl.uniform3fv(me.uniforms.spotLights[i][3], scene.spotLights[i].diffuse);
        gl.uniform3fv(me.uniforms.spotLights[i][4], scene.spotLights[i].specular);
        gl.uniform1f(me.uniforms.spotLights[i][5], scene.spotLights[i].attenuation[0]);
        gl.uniform1f(me.uniforms.spotLights[i][6], scene.spotLights[i].attenuation[1]);
        gl.uniform1f(me.uniforms.spotLights[i][7], scene.spotLights[i].attenuation[2]);
        gl.uniform1f(me.uniforms.spotLights[i][8], scene.spotLights[i].innerCutOff);
        gl.uniform1f(me.uniforms.spotLights[i][9], scene.spotLights[i].outerCutOff);

    }
    for (i=0, len=me.uniforms.dirLights.length; i<len; i++) {
		gl.uniform3fv(me.uniforms.dirLights[i][0], scene.dirLights[i].direction);
		gl.uniform3fv(me.uniforms.dirLights[i][1], scene.dirLights[i].ambient);
		gl.uniform3fv(me.uniforms.dirLights[i][2], scene.dirLights[i].diffuse);
		gl.uniform3fv(me.uniforms.dirLights[i][3], scene.dirLights[i].specular);
	}

    // Set material uniforms
	gl.uniform1f(me.uniforms.materialShine, scene.material.shine);
	gl.uniform1i(me.uniforms.materialDiffuse, 0) // Texture unit 0
	gl.uniform1i(me.uniforms.materialSpecular, 1) // Texture unit 1

    // TODO: iterates over too much?????
    for (i=0, len=me.models.length; i<len; i++) {
        // Bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, me.models[i].texture);

		// Bind specular mapping
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, me.models[i].specMap);

        // Per object uniforms
        gl.uniformMatrix4fv(
            me.uniforms.mWorld,
            gl.FALSE,
            scene.models[i].world
        );

        // Set attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].vbo);
		gl.vertexAttribPointer(
			me.attribs.vPos,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vPos);

        gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].tbo);
		gl.vertexAttribPointer(
			me.attribs.vTexCoord,
			2, gl.FLOAT, gl.FALSE,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vTexCoord)

		gl.bindBuffer(gl.ARRAY_BUFFER, me.models[i].nbo);
		gl.vertexAttribPointer(
			me.attribs.vNorm,
			3, gl.FLOAT, gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		gl.enableVertexAttribArray(me.attribs.vNorm);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, me.models[i].ibo);
		gl.drawElements(gl.TRIANGLES, me.models[i].nPoints, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
};
