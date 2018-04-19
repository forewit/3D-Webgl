'use strict';

var demo;

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

    demo = new scene(gl);
    demo.load(function (demoLoadError) {
        if (demoLoadError) {
            console.error(demoLoadError);
        } else {
            demo.begin();
        }
    });
};
