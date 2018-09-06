/**
 * @class PointLight position and color data
 * @name PointLight
 *
 * @param {vec3} position [x, y, z]
 * @param {vec3} ambient [r, g, b]
 * @param {vec3} diffuse [r, g, b]
 * @param {vec3} specular [r, g, b]
 * @param {vec3} attenuation [constant, linear, quadratic]
 */
var PointLight = function (position, ambient, diffuse, specular, attenuation) {
    this.position  = position;
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
    this.attenuation = attenuation;
}

/**
 * @class Spotlight position, orientation, and color data
 * @name SpotLight
 * 
 * @param {vec3} position [x, y, z]
 * @param {vec3} direction Orientation vector
 * @param {vec3} ambient [r, g, b]
 * @param {vec3} diffuse [r, g, b]
 * @param {vec3} specular [r, g, b]
 * @param {vec3} attenuation [constant, linear, quadratic]
 * @param {vec3} innerCutOff Degrees
 * @param {vec3} outerCutOff Degrees
 */
var SpotLight = function (position, direction, ambient, diffuse, specular, attenuation, innerCutOff, outerCutOff) {
    this.position  = position;
    this.direction = direction;
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
    this.attenuation = attenuation;
    this.innerCutOff = innerCutOff;
    this.outerCutOff = outerCutOff;
}

/**
 * @class DirLight orientation and color data
 * @name DirLight
 *
 * @param {vec3} direction Orientation vector
 * @param {vec3} ambient [r, g, b]
 * @param {vec3} diffuse [r, g, b]
 * @param {vec3} specular [r, g, b]
 */
var DirLight = function (direction, ambient, diffuse, specular) {
    this.direction  = direction;
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
}
