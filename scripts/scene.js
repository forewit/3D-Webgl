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

		// Create model objects
		me.models = [];
		for (var i = 0; i < resources.models.length; i++) {
			var mesh = resources.models[i].meshes[0];
			me.models.push(new Model(
				me.gl,
				mesh.vertices,
				[].concat.apply([], mesh.faces),
				mesh.normals
			));
			console.log('	added', mesh.name, 'model');
		}

		// Creat shaders
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

			
		};
	});
};
scene.prototype.unload = function () {
	console.log('unloading scene...');
};
scene.prototype.begin = function () {
	console.log('begining scene...');
};
scene.prototype.end = function () {
	console.log('ending scene...');
};

// Private functions
scene.prototype._loadResources = function (callback) {
	loadTextResource('./src/shader.vs.glsl', function (vsErr, vsText) {
		if (vsErr) {
			callback(vsErr);
		} else {
			loadTextResource('./src/shader.fs.glsl', function (fsErr, fsText) {
				if (fsErr) {
					callback(fsErr);
				} else {
					loadJSONResource('./src/leaf.json', function (model1Err, leafJSON) {
						if (model1Err) {
							callback(model1Err);
						} else {
							loadJSONResource('./src/tree1.json', function (model2Err, tree1JSON) {
								if (model2Err) {
									callback(model2Err);
								} else {
									callback(null, { vsText:vsText, fsText:fsText, models:[leafJSON, tree1JSON] });
								}
							});
						}
					});
				}
			});
		}
	});
};
scene.prototype._update = function (dt) {

};
scene.prototype._render = function () {

};
