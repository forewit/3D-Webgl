function init() {
    window.canvas = new Canvas();

    window.canvas.resize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", function() {
        window.canvas.resize(window.innerWidth, window.innerHeight);
    });

    loop();
}

function loop() {
    window.canvas.update();
    requestAnimationFrame(loop);
}
