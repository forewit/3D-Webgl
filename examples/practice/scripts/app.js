'use strict';

var scene;
var camera;
var models = [];
var init = function () {
    camera = new Camera(
        glMatrix.toRadian(90),
		canvas.clientWidth / canvas.clientHeight,
		0.1,
        100.0
	);
    camera.orient(
        [1,1,1],
        [0,0,0],
        [0,1,0]
    );

    var cube = new Model(
        './models/cube.json',
        './models/cube.png',
        './models/cube_specular.png',
        function () {
            cube.setPosition([0, -3, 0]);
            cube.shine = 100;
            // ADD TO WEBGL
            models.push(cube);
            start();
        }
    );
};
