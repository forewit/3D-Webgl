'use strict';

var scene;

var init = function () {
    var canvas = document.getElementById('webgl-surface');
    scene = new Scene(canvas);

    var camera = new Camera(
        glMatrix.toRadian(45),
		canvas.clientWidth / canvas.clientHeight,
		0.1,
        100.0
	);
    camera.orient(
        [0,2,7],
        [0,0.5,0],
        [0,1,0]
    );
    var dirLight = new DirLight(
        [0, -1, 0],
        [0.2, 0.2, 0.2],
        [0.7, 0.7, 0.7],
        [0.7, 0.7, 0.7]
    );
    //scene.Add(dirLight);

    var pointLight = new PointLight(
        [0.0, -2, 2],
        [0.0, 0.0, 1.0],
        [0.0, 0.0, 1.0],
        [0.0, 0.0, 1.0],
        [1,1,1]
    );
    scene.Add(pointLight);

    var cube = new Model(
        './models/cube.json',
        './models/cube.png',
        './models/cube_specular.png',
        function () {
            scene.Add(cube);
            cube.setPosition([0, 0, 0]);
            cube.shine = 10;
        }
    );

    var t0 = performance.now();
    var loop = function (dt) {
        var perSec = (performance.now() - t0) / 1000;

        mat4.rotate(
            cube.world,
            cube.world,
            glMatrix.toRadian(20) * perSec,
            [1,0,0]
        )
        
        scene.Render(camera);
        t0 = performance.now();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};
