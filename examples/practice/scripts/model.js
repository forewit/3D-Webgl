/**
 * @class 3D model data and texture images
 * @name Model
 * 
 * @param {String} jsonURL Path to model json file 
 * @param {String} textureURL Path to diffuse texture image
 * @param {String} specMapURL Path to specular texture image
 * @param {Function} callback Called after image loading is complete
 */
var Model =  function (jsonURL, textureURL, specMapURL, callback) {
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

                            me.vertices = modelJSON.data.attributes.position.array;
                            me.normals = modelJSON.data.attributes.normal.array;
                            me.texCoords = modelJSON.data.attributes.uv.array;
                            me.indices = modelJSON.data.index.array;
                            me.texImg = texImg;
                            me.specMapImg = specMapImg;
                            me.shine = 100;
                            callback();
                        }
                    });
                }
            });
        }
    });
};