$(window).bind('scroll',function(e){
    parallaxScroll();
});

function parallaxScroll(){
    var scrolled = $(window).scrollTop();
    $('.parallax-bg1').css('bottom',(0-(scrolled*.1))+'px');
    $('.parallax-bg2').css('bottom',(0-(scrolled*.15))+'px');
}
