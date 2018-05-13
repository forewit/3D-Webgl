'use strict';

var scene;

var init = function () {
    var canvas = document.getElementById('webgl-surface');
    scene = new Scene();
    var r = new Renderer(canvas);

    var camera = new Camera(
        glMatrix.toRadian(45),
		canvas.clientWidth / canvas.clientHeight,
		0.1,
		100.0
	);
    camera.setPosition(
        [0,0,5],
        [0,0,0],
        [0,1,0]
    );
    var blueLight = new PointLight(
        camera.position,
        [0,0,0],
        [0.2, 0.2, 1],
        [0.2, 0.2, 1],
        [1.0, 0.045, 0.0075]
    );
    var spotLight = new SpotLight(
        camera.position,
        camera.forward,
        [0.0, 0.0, 0.0],
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
        [1.0, 0.045, 0.0075],
        glMatrix.toRadian(5),
        glMatrix.toRadian(6)
    );

    var cube = new Model(
        './models/cube.json',
        './models/cube.png',
        './models/cube_specular.png',
        function () {
            scene.Add(cube);
        }
    );
    scene.Add(spotLight);
    scene.Add(blueLight);

    var loop = function () {
        r.render(scene, camera);
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};
