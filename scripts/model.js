var Model = function (jsonURL, textureURL, specMapURL, callback) {
	var me = this;

	loadJSONResource(jsonURL, function(jsonErr, modelJSON) {
        if (jsonErr) {
            console.error('Error loading JSON. ' + err);
            return;
        } else {
            loadImage(textureURL, function(texErr, texImg) {
                if (texErr) {
                    console.error('Error loading texture image. ' + texErr);
                    return;
                } else {
                    loadImage(specMapURL, function(specMapErr, specMapImg) {
                        if (specMapErr) {
                            console.error('Error loading specular map image. ' + specMapErr);
                            return;
                        } else {

                            me.world = mat4.create()
                            me.vertices = modelJSON.data.attributes.position.array;
                            me.indices = modelJSON.data.index.array;
                            me.normals = modelJSON.data.attributes.normal.array;
                            me.texCoords = modelJSON.data.attributes.uv.array;
                            me.texImg = texImg;
                            me.specMapImg = specMapImg;

                            callback();
                        }
                    });
                }
            });
        }
    });
};

/**
 * Position a model by translating its world matrix based
 * on the origin.
 *
 * @param {vec3} position target location [x, y, z]
 */
Model.prototype.position = function (position) {
    var origin = mat4.create();
    mat4.translate(this.world, origin, position);
};
