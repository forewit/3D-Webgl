

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
            me.uniforms.pointLights[i] = lightUniforms;
        }
    }
    if (me.uniforms.spotLights.length != scene.spotLights.length) {
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
            me.uniforms.spotLights[i] = lightUniforms;
        }
    }
    if (me.uniforms.dirLights.length != scene.dirLights.length) {
        for (i=0, len=scene.dirLights.length; i<len; i++) {
            var lightUniforms = [
                gl.getUniformLocation(me.program, 'u_dirLights[' + i + '].direction'),
                gl.getUniformLocation(me.program, 'u_dirLights[' + i + '].ambient'),
                gl.getUniformLocation(me.program, 'u_dirLights[' + i + '].diffuse'),
                gl.getUniformLocation(me.program, 'u_dirLights[' + i + '].specular'),
            ];
            me.uniforms.dirLights[i] = lightUniforms;
        }
    }

    // Set per model uniform locations
    // TODO: PROBLEM this will rebuild ALL models, every time a scene.Add function is called
    if (me.models.length != scene.models.length) {
        // Add new models
        for (i=0, len=scene.models.length; i<len; i++) {
            console.log("added model");
            var model = {}

            // Point data
            model.vbo = gl.createBuffer(); // Vertex buffer object
            model.ibo = gl.createBuffer(); // Index buffer object
            model.nbo = gl.createBuffer(); // Normal Buffer object
            model.tbo = gl.createBuffer(); // Texture coordinate buffer object
            model.nPoints = scene.models[i].indices.length;
            model.world = scene.models[i].world;
            model.id = i;

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

            me.models[i] = model;
        }
    } else {
        // Update model world matrices
        for (i=0, len=scene.models.length; i<len; i++) {
            me.models[i].world = scene.models[i].world;
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
        //TODO verify e
        gl.uniformMatrix4fv(
            me.uniforms.mWorld,
            gl.FALSE,
            me.models[i].world
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



Renderer.prototype.unload = function (modelData) {
    var me = this;
    var gl = me.gl;

    for (i=0, len=me.models.length; i<len; i++) {
        if (me.models[i].data == modelData) {
            // delete model
            console.log('Model Removed!!');
        }
    }

};

Renderer.prototype.load = async function (modelData) {
    var me = this;
    var gl = me.gl;


    // Add new models
    var model = {
        data: modelData,
        buffers: [],
        textures: [],
        uniforms: []
    };

    // Point data
    model.buffers[0] = gl.createBuffer(); // Vertex buffer object
    model.buffers[1] = gl.createBuffer(); // Index buffer object
    model.buffers[2] = gl.createBuffer(); // Normal Buffer object
    model.buffers[3] = gl.createBuffer(); // Texture coordinate buffer object

    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers[0]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.vertices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.buffers[1]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.data.indices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers[2]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.normals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffers[3]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.data.texCoords), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Texture data
    var texture = gl.createTexture();
    var specMap = gl.createTexture();
    model.textures[0] = texture;
    model.textures[1] = specMap;

    function setupTexture(img) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
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

    setupTexture(model.data.texImg);
    setupTexture(model.data.specMapImg);

    //me.models.push(model);
};
