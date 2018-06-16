/**
 * @class PointLight data and buffers
 * @name PointLight
 *
 * @param vec3 position
 * @param vec3 ambient
 * @param vec3 diffuse
 * @param vec3 specular
 * @param vec3 attenuation
 */
var PointLight = function (position, ambient, diffuse, specular, attenuation) {
    this.position  = position;
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
    this.attenuation = attenuation;
}

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
var DirLight = function (direction, ambient, diffuse, specular) {
    this.direction  = direction;
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
}
