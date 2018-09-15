'use strict';

var scene;
var camera;
var models = [];
var init = function () {
    camera = new Camera(
        glMatrix.toRadian(45),
		canvas.clientWidth / canvas.clientHeight,
		0.1,
        100.0
	);
    camera.orient(
        [0,0,10],
        [0,0,0],
        [0,1,0]
    );

    var cube = new Model(
        './models/cube.json',
        './models/sphere.png',
        './models/sphere_specular.png',
        function () {
            models.push(cube);
            start();
        }
    );
};
