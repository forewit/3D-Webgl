'use strict';

var scene;

var init = function () {
    var canvas = document.getElementById('webgl-surface');
    var gl = canvas.getContext('webgl');
    if (!gl) {
    	console.log('Failed to get WebGL context - trying experimental context');
    	gl = canvas.getContext('experimental-webgl');
    }
	if (!gl) {
    	alert('Your browser does not support WebGL - please use a different browser\nGoogleChrome works great!');
    	return;
    }

    scene = new Scene(gl);

    var redPos = [2, 0.8, 2];
    var bluePos = [3,0,2];
    var blue = new PointLight(
        redPos,
        [0,0,0],
        [0.2, 0.2, 1],
        [0.2, 0.2, 1],
        [1.0, 0.045, 0.0075]
    );
    var red = new PointLight(
        bluePos,
        [0,0,0],
        [1, 0.2, 0.2],
        [1, 0.2, 0.2],
        [1.0, 0.045, 0.0075]
    );

    var camera = new Camera(
		vec3.fromValues(0, 0, 10),
		vec3.fromValues(0, 0, 0),
		vec3.fromValues(0, 1, 0)
	);

    var tree = new Model('./models/tree.json', './models/tree.png', './models/tree_specular.png', function () {
        scene.add(tree);
    });

    scene.AddLight(red);
    scene.AddLight(blue);

    var r = new renderer(gl);
    var loop = function () {
        r.render(scene, camera);
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};
