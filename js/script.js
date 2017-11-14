$(function (){ // Wait for document ready
    // Init controller
    var controller = new ScrollMagic.Controller();

    // Build scene
    new ScrollMagic.Scene({
        triggerElement: "#projects", // point of execution
        duration: $(window).height(), // pin element for the window height
        triggerHook: 0, // don't trigger until #projects hits the top of the viewport
        reverse: true // allows the effect to trigger when srolled in reverse direction
    })
    .setPin("#target") // the element we want to point
    .addTo(controller); // add scene to ScrollMagic controller
});
