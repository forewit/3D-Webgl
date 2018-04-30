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

    scene = new scene(gl);
    scene.Load();
    scene.AddModel('./src/tree.json','./img/texture.png');

    // Update loop
    var loop = function(dt) {
        var perSec = dt / 1000 * 2 * Math.PI;

    };
    scene.Begin(loop);
};
