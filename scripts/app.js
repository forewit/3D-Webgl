'use strict';

var scene;

var init = function () {
    var canvas = document.getElementById('webgl-surface');
    scene = new Scene(canvas, {maxDirLights: 2});

    var camera = new Camera(
        glMatrix.toRadian(45),
		canvas.clientWidth / canvas.clientHeight,
		0.1,
		100.0
	);
    camera.Orient(
        [0,0,5],
        [0,0,0],
        [0,1,0]
    );
    var dirLight = new DirLight(
        [-0.2, -1, -0.2],
        [0.2, 0.2, 0.2],
        [0.7, 0.7, 0.7],
        [0.7, 0.7, 0.7]
    );
    scene.Add(dirLight);
    var dirLight2 = new DirLight(
        [-0.2, -1, -0.2],
        [0.2, 0.2, 0.2],
        [0.7, 0.7, 0.7],
        [0.7, 0.7, 0.7]
    );
    scene.Add(dirLight2);

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
    scene.Add(spotLight);

    var cube = new Model(
        './models/cube.json',
        './models/cube.png',
        './models/cube_specular.png',
        function () {
            scene.Add(cube);
            cube.Position([3,-2,-7]);
        }
    );
    var tree = new Model(
        './models/tree.json',
        './models/tree.png',
        './models/tree_specular.png',
        function () {
            scene.Add(tree);
            tree.Position([0,-3,-10]);
        }
    );

    setTimeout(function(){
        scene.Remove(cube);
    }, 500);

    setTimeout(function(){
        scene.Add(cube);
    }, 2000);

    var t0 = performance.now();
    var loop = function () {
        var perSec = (performance.now() - t0) / 1000;

        mat4.rotate(
            cube.world,
            cube.world,
            glMatrix.toRadian(45) * perSec,
            [0,1,0]
        )

        scene.Render(camera);

        t0 = performance.now();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};
