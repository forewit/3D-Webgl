
$(window).bind('scroll',function(e){
    parallaxScroll();
});

function parallaxScroll(){
    var scrolled = $(window).scrollTop();
    $('#parallax-bg1').css('top',(0-(scrolled*.25))+'px');
    $('#parallax-bg1').css('opacity: 0.5;');
}
