function init() {
    window.canvas = new Canvas();
    loop();
}

function loop() {
    window.canvas.update();
    requestAnimationFrame(loop);
}
