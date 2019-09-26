VS_01 = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    uniform mat3 u_world;
    uniform mat3 u_object;
    uniform vec2 u_frame;

    varying vec2 v_texCoord;
    void main(){
        gl_Position = vec4( u_world * u_object * vec3(a_position, 1), 1);
        v_texCoord = a_texCoord + u_frame;
    }
`;

FS_01 = `
    precision mediump float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;
    
    void main(){
        gl_FragColor = texture2D(u_image, v_texCoord);
    }
`;

class Canvas {
    constructor () {
        this.canvasElm = document.createElement("canvas");
        this.canvasElm.width = 800;
        this.canvasElm.height = 600;

        this.worldSpaceMatrix = mat3.create();

        this.gl = this.canvasElm.getContext("webgl2");
        this.gl.clearColor(0.4,0.6,1.0,0);

        document.body.appendChild(this.canvasElm);

        this.sprite = new Sprite(this.gl, "./img/fireball.png", VS_01, FS_01, {width:512, height:512});
        this.spritePos = new Point();
        this.spriteFrame = new Point();
    }

    resize(w, h) {
        this.canvasElm.width = w;
        this.canvasElm.height = h;

        let wRatio = w / (h / 1080);
        mat3.identity(this.worldSpaceMatrix);
        mat3.translate(this.worldSpaceMatrix, this.worldSpaceMatrix, [-1, 1]);
        mat3.scale(this.worldSpaceMatrix, this.worldSpaceMatrix, [2/wRatio, -2/1080]);
        
    }

    update() {
        this.gl.viewport(0,0,this.canvasElm.width, this.canvasElm.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);


        this.spriteFrame.x = (new Date() * 0.01) % 6;
        this.sprite.render(this.spritePos, this.spriteFrame);


        this.gl.flush();
    }
}