/* A small, self-contained WebGL scene. Every cake, icing and candle surface is geometry. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const V = {
    sub:(a,b)=>a.map((v,i)=>v-b[i]), dot:(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),
    cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    norm:a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);}
  };
  function perspective(fov, aspect, near, far) {
    const f=1/Math.tan(fov/2), nf=1/(near-far);
    return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);
  }
  function lookAt(eye, target) {
    const z=V.norm(V.sub(eye,target)), x=V.norm(V.cross([0,1,0],z)), y=V.cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);
  }
  const color = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  class Geometry {
    constructor(){this.data=[];}
    vertex(p,n,c){this.data.push(...p,...n,...c);}
    tri(a,b,c,n,paint){this.vertex(a,n,paint);this.vertex(b,n,paint);this.vertex(c,n,paint);}
    quad(a,b,c,d,na,nb,nc,nd,paint){this.vertex(a,na,paint);this.vertex(b,nb,paint);this.vertex(c,nc,paint);this.vertex(a,na,paint);this.vertex(c,nc,paint);this.vertex(d,nd,paint);}
    cylinder(radius,bottom,top,paint,steps=96,center=[0,0,0]){
      const [cx,cy,cz]=center;
      for(let i=0;i<steps;i++){
        const a=i*TAU/steps,b=(i+1)*TAU/steps;
        const na=[Math.cos(a),0,Math.sin(a)], nb=[Math.cos(b),0,Math.sin(b)];
        const pa=[cx+radius*na[0],cy+bottom,cz+radius*na[2]],pb=[cx+radius*nb[0],cy+bottom,cz+radius*nb[2]];
        const pc=[pb[0],cy+top,pb[2]],pd=[pa[0],cy+top,pa[2]];
        this.quad(pa,pb,pc,pd,na,nb,nb,na,paint);
        this.tri([cx,cy+top,cz],pd,pc,[0,1,0],paint);
        this.tri([cx,cy+bottom,cz],pb,pa,[0,-1,0],paint);
      }
    }
    ellipsoid(center,scale,paint,flute=0,lat=10,lon=16){
      const point=(u,v)=>{
        const r=1+flute*Math.cos(v*6)*Math.sin(u);
        const n=[Math.sin(u)*Math.cos(v),Math.cos(u),Math.sin(u)*Math.sin(v)];
        return {p:n.map((q,i)=>center[i]+q*scale[i]*(i===1?1:r)),n:V.norm(n.map((q,i)=>q/scale[i]))};
      };
      for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
        const a=point(i*Math.PI/lat,j*TAU/lon),b=point((i+1)*Math.PI/lat,j*TAU/lon),c=point((i+1)*Math.PI/lat,(j+1)*TAU/lon),d=point(i*Math.PI/lat,(j+1)*TAU/lon);
        this.quad(a.p,b.p,c.p,d.p,a.n,b.n,c.n,d.n,paint);
      }
    }
    tube(points,radius,paint,steps=10){
      for(let i=0;i<points.length-1;i++){
        const tangent=V.norm(V.sub(points[Math.min(points.length-1,i+1)],points[Math.max(0,i-1)]));
        const across=V.norm([-tangent[1],tangent[0],0]);
        for(let j=0;j<steps;j++){
          const make=(p,a)=>{const n=[across[0]*Math.cos(a),across[1]*Math.cos(a),Math.sin(a)];return{p:p.map((v,k)=>v+n[k]*radius),n};};
          const a=make(points[i],j*TAU/steps),b=make(points[i+1],j*TAU/steps),c=make(points[i+1],(j+1)*TAU/steps),d=make(points[i],(j+1)*TAU/steps);
          this.quad(a.p,b.p,c.p,d.p,a.n,b.n,c.n,d.n,paint);
        }
      }
    }
    icing(radius,top,paint){
      for(let i=0;i<192;i++){
        const point=a=>{
          const drip=Math.pow((1+Math.cos(a*15))/2,3)*(.13+.035*Math.sin(a*7));
          return {x:radius*Math.cos(a),z:radius*Math.sin(a),y:top-.075-drip,n:[Math.cos(a),0,Math.sin(a)]};
        };
        const a=point(i*TAU/192),b=point((i+1)*TAU/192);
        this.quad([a.x,a.y,a.z],[b.x,b.y,b.z],[b.x,top,b.z],[a.x,top,a.z],a.n,b.n,b.n,a.n,paint);
      }
    }
  }
  function bezier(a,b,c,d,steps=20){return Array.from({length:steps+1},(_,i)=>{const t=i/steps,s=1-t;return a.map((v,k)=>s*s*s*v+3*s*s*t*b[k]+3*s*t*t*c[k]+t*t*t*d[k]);});}
  function makeCake(){
    const g=new Geometry(), cream=color('#f7e3c2'), piping=color('#fff2d8'), rose=color('#bb6f80'), gold=color('#d9aa68');
    // A softly bevelled porcelain stand, blush sponge and thick ivory icing.
    g.cylinder(1.82,-.54,-.48,color('#9b8275'));
    g.cylinder(1.86,-.48,-.42,color('#ead8bb'));
    g.cylinder(1.75,-.42,-.38,color('#fff0ce'));
    g.cylinder(1.43,-.38,.52,cream);
    g.cylinder(1.437,-.28,-.20,rose);
    g.cylinder(1.445,-.18,-.155,gold);
    g.cylinder(1.45,.48,.60,piping);
    g.icing(1.456,.58,piping);
    // Piped cream rosettes on the top and a small pearl border below.
    for(let i=0;i<24;i++){
      const a=i*TAU/24,x=Math.cos(a)*1.28,z=Math.sin(a)*1.28;
      g.ellipsoid([x,.65,z],[.135,.105,.135],piping,.13,7,12);
      g.ellipsoid([x+.018,.736,z],[.067,.085,.067],piping,.09,6,10);
      g.ellipsoid([Math.cos(a)*1.435,-.32,Math.sin(a)*1.435],[.043,.043,.043],gold,0,5,8);
    }
    // A handful of golden sugar pearls across the top.
    for(const [x,z] of [[-.86,.28],[.91,.19],[-.65,-.65],[.6,-.58],[-.1,-.85],[.76,.65],[-.82,.65]])g.ellipsoid([x,.63,z],[.031,.031,.031],gold,0,5,8);
    // Raised, curved numeral candles rather than flat text.
    const offset2=[-.43,.80,.12],offset0=[.40,.80,.12];
    const local2=[...bezier([-.26,.72,0],[-.28,1.08,0],[.30,1.08,0],[.27,.74,0]),...bezier([.27,.74,0],[.27,.49,0],[-.25,.35,0],[-.25,.09,0]).slice(1),...bezier([-.25,.09,0],[-.06,.09,0],[.14,.09,0],[.3,.09,0],8).slice(1)];
    const local0=Array.from({length:65},(_,i)=>{const a=i*TAU/64;return [.255*Math.cos(a),.52+.43*Math.sin(a),0];});
    g.tube(local2.map(p=>p.map((v,i)=>v+offset2[i])),.073,color('#e8b789'),12);
    g.tube(local0.map(p=>p.map((v,i)=>v+offset0[i])),.073,color('#dea091'),12);
    for(const x of [-.43,.4]){
      g.cylinder(.025,.6,.91,color('#cfb28c'),12,[x,0,.12]);
      g.cylinder(.012,1.76,1.88,color('#403239'),8,[x,0,.12]);
    }
    return g;
  }
  function makeFlame(){
    const g=new Geometry(),paint=color('#ffcd6d');
    const point=(y,a)=>{const t=y/.37,r=.095*Math.pow(Math.max(0,Math.sin(t*Math.PI)),.8)*(1-t*.5);const n=V.norm([Math.cos(a),.3,Math.sin(a)]);return{p:[r*Math.cos(a)+.025*t*t,y,r*Math.sin(a)],n};};
    for(let i=0;i<10;i++)for(let j=0;j<16;j++){
      const a=point(i*.037,j*TAU/16),b=point((i+1)*.037,j*TAU/16),c=point((i+1)*.037,(j+1)*TAU/16),d=point(i*.037,(j+1)*TAU/16);
      g.quad(a.p,b.p,c.p,d.p,a.n,b.n,c.n,d.n,paint);
    }
    return g;
  }
  const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;
    uniform mat4 uProjection,uView;uniform vec3 uOffset;uniform float uTime,uWind,uKind;
    varying vec3 vNormal,vColor,vPosition,vLocal;
    void main(){vec3 p=aPosition;if(uKind>1.5&&uKind<2.5){float h=p.y/.37;p.x+=sin(uTime*7.0+h*2.0)*.012*h+uWind*h*h*.19;p.y*=1.0-uWind*.18;}
    vLocal=p;p+=uOffset;vPosition=p;vNormal=aNormal;vColor=aColor;gl_Position=uProjection*uView*vec4(p,1.0);}`;
  const fragment=`precision mediump float;varying vec3 vNormal,vColor,vPosition,vLocal;uniform vec3 uEye;uniform float uKind,uAlpha;
    void main(){vec3 c=vColor;float alpha=uAlpha;
      if(uKind<.5){vec3 n=normalize(vNormal);vec3 l=normalize(vec3(-3.0,5.5,5.0)-vPosition);vec3 rim=normalize(vec3(4.0,2.0,-3.0)-vPosition);vec3 view=normalize(uEye-vPosition);
      float diffuse=max(dot(n,l),0.0),back=max(dot(n,rim),0.0);float spec=pow(max(dot(n,normalize(l+view)),0.0),45.0);
      c=c*(.37+diffuse*.62)+vec3(.19,.16,.23)*back*.38+vec3(1.0,.88,.64)*spec*.16;
      float flameLight=.05/(.2+length(vPosition-vec3(0.0,1.9,.12)));c+=vec3(1.0,.55,.18)*flameLight;}
      else if(uKind<2.5){float core=1.0-smoothstep(.01,.085,abs(vLocal.x));c=mix(vec3(1.0,.39,.09),vec3(1.0,.96,.72),core*.85);}
      else{float d=length(vLocal.xy)/.23;alpha*=pow(max(0.0,1.0-d),2.0);}
      gl_FragColor=vec4(c,alpha);}`;
  class BirthdayCake {
    constructor(canvas){
      this.canvas=canvas;this.available=false;this.running=false;this.frame=null;
      this.zoom=1;this.zoomFrom=1;this.zoomTarget=1;this.zoomStart=0;this.zoomDuration=0;
      this.yaw=.12;this.tilt=0;this.drag=null;this.wind=false;this.blown=false;this.blowTime=0;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.draw=this.draw.bind(this);this.resize=this.resize.bind(this);
      try{
        const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});
        if(!gl)return;this.gl=gl;
        const compile=(type,src)=>{const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Shader unavailable');return shader;};
        const program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
        gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL unavailable');
        gl.deleteShader(vs);gl.deleteShader(fs);this.program=program;gl.useProgram(program);
        this.locations={};for(const name of ['aPosition','aNormal','aColor'])this.locations[name]=gl.getAttribLocation(program,name);
        for(const name of ['uProjection','uView','uOffset','uTime','uWind','uKind','uAlpha','uEye'])this.locations[name]=gl.getUniformLocation(program,name);
        this.cake=this.upload(makeCake());this.flame=this.upload(makeFlame());
        const smoke=new Geometry();smoke.quad([-.23,-.23,0],[.23,-.23,0],[.23,.23,0],[-.23,.23,0],[0,0,1],[0,0,1],[0,0,1],[0,0,1],color('#e0d4c9'));this.smoke=this.upload(smoke);
        gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        this.available=true;canvas.parentElement?.classList.add('has-3d-cake');
        canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.stop();this.available=false;canvas.parentElement?.classList.remove('has-3d-cake');});
        window.addEventListener('resize',this.resize);
        canvas.addEventListener('pointerdown',event=>{this.drag={x:event.clientX,y:event.clientY,yaw:this.yaw,tilt:this.tilt};canvas.setPointerCapture?.(event.pointerId);});
        canvas.addEventListener('pointermove',event=>{if(!this.drag)return;this.yaw=Math.max(-.65,Math.min(.65,this.drag.yaw+(event.clientX-this.drag.x)*.007));this.tilt=Math.max(-.15,Math.min(.22,this.drag.tilt+(event.clientY-this.drag.y)*.003));if(!this.running||this.reduced)this.render(performance.now());});
        const release=()=>{this.drag=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
        document.addEventListener('visibilitychange',()=>{if(document.hidden){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}else if(this.running&&this.available&&this.frame===null)this.frame=requestAnimationFrame(this.draw);});
        this.resize();
      }catch{this.available=false;canvas.parentElement?.classList.remove('has-3d-cake');}
    }
    upload(geometry){const gl=this.gl,buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry.data),gl.STATIC_DRAW);return{buffer,count:geometry.data.length/9};}
    resize(){if(!this.available)return;const rect=this.canvas.getBoundingClientRect();const ratio=Math.min(window.devicePixelRatio||1,1.8);this.canvas.width=Math.max(1,Math.round(rect.width*ratio));this.canvas.height=Math.max(1,Math.round(rect.height*ratio));if(this.running)this.render(performance.now());}
    mesh(mesh,kind,offset=[0,0,0],alpha=1){
      const gl=this.gl,l=this.locations;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      [['aPosition',0],['aNormal',12],['aColor',24]].forEach(([name,offset])=>{gl.enableVertexAttribArray(l[name]);gl.vertexAttribPointer(l[name],3,gl.FLOAT,false,36,offset);});
      gl.uniform1f(l.uKind,kind);gl.uniform3fv(l.uOffset,offset);gl.uniform1f(l.uAlpha,alpha);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
    start(){if(!this.available)return;this.running=true;this.resize();if(this.frame===null)this.frame=requestAnimationFrame(this.draw);}
    stop(){this.running=false;this.drag=null;if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
    setBlown(value){this.blown=!!value;this.blowTime=performance.now();if(this.available&&(!this.running||this.reduced))this.render(this.blowTime);}
    setWind(value){this.wind=!!value;if(this.available&&this.reduced)this.render(performance.now());}
    setZoom(value,duration=700){this.zoomFrom=this.zoom;this.zoomTarget=Math.max(.4,Math.min(1.6,Number(value)||1));this.zoomStart=performance.now();this.zoomDuration=this.reduced?0:Math.max(0,duration);if(this.zoomDuration===0)this.zoom=this.zoomTarget;if(this.available&&(!this.running||this.reduced))this.render(this.zoomStart);}
    reset(){this.zoom=1;this.zoomFrom=1;this.zoomTarget=1;this.zoomDuration=0;this.yaw=.12;this.tilt=0;this.wind=false;this.blown=false;this.drag=null;}
    draw(time){this.frame=null;if(!this.running||!this.available)return;this.render(time);if(!this.reduced||this.zoomDuration)this.frame=requestAnimationFrame(this.draw);}
    render(time){
      if(!this.available)return;const gl=this.gl,l=this.locations;
      if(this.zoomDuration){const progress=Math.min(1,(time-this.zoomStart)/this.zoomDuration),ease=progress*progress*(3-2*progress);this.zoom=this.zoomFrom+(this.zoomTarget-this.zoomFrom)*ease;if(progress===1)this.zoomDuration=0;}
      gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
      const distance=7.45/this.zoom,pitch=.34+this.tilt,yaw=this.yaw+(this.reduced?0:Math.sin(time*.00019)*.028);
      const eye=[Math.sin(yaw)*distance*Math.cos(pitch),.69+distance*Math.sin(pitch),Math.cos(yaw)*distance*Math.cos(pitch)];
      gl.uniformMatrix4fv(l.uProjection,false,perspective(.69,this.canvas.width/this.canvas.height,.1,40));gl.uniformMatrix4fv(l.uView,false,lookAt(eye,[0,.69,0]));gl.uniform3fv(l.uEye,eye);
      gl.uniform1f(l.uTime,this.reduced?0:time*.001);gl.uniform1f(l.uWind,this.wind?1:0);
      gl.depthMask(true);this.mesh(this.cake,0);
      if(!this.blown){this.mesh(this.flame,2,[-.43,1.88,.12]);this.mesh(this.flame,2,[.4,1.88,.12]);}
      else{
        const elapsed=(time-this.blowTime)/1000;
        if(elapsed<2.3&&!this.reduced){gl.depthMask(false);for(const x of [-.43,.4])for(let i=0;i<3;i++){const age=elapsed-i*.16;if(age<0)continue;const alpha=Math.max(0,1-age/1.85)*Math.min(1,age*5)*.45;this.mesh(this.smoke,3,[x+Math.sin(age*3+i)*.08,1.95+age*.38,.14],alpha);}gl.depthMask(true);}
      }
    }
  }
  window.BirthdayCake=BirthdayCake;
})();
