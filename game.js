(()=>{'use strict';
const canvas=document.getElementById('arena'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const tg=window.Telegram?.WebApp;try{tg?.ready();tg?.expand();tg?.setHeaderColor?.('#101820');tg?.setBackgroundColor?.('#101820')}catch(e){}
let W=0,H=0,dpr=1,last=0,raf=0,state='menu',elapsed=0,kills=0,hp=100,level=1,xp=0,xpNeed=8,damage=1,fireRate=1,moveSpeed=210,bulletSpeed=520;
let player={x:0,y:0,r:13},pointer=null,enemies=[],bullets=[],particles=[],pickups=[],spawn=0,shot=0,shake=0;
const upgrades=[
 {name:'Усиленный урон',desc:'Урон пуль +35%',apply:()=>damage*=1.35},
 {name:'Быстрая стрельба',desc:'Скорость стрельбы +25%',apply:()=>fireRate*=1.25},
 {name:'Лёгкие ноги',desc:'Скорость движения +15%',apply:()=>moveSpeed*=1.15},
 {name:'Укреплённая броня',desc:'Восстановить 25 здоровья',apply:()=>hp=Math.min(100,hp+25)},
 {name:'Быстрые снаряды',desc:'Скорость пуль +25%',apply:()=>bulletSpeed*=1.25}
];
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(!player.x){player.x=W/2;player.y=H*.68}}
addEventListener('resize',resize);resize();
function rand(a,b){return a+Math.random()*(b-a)}
function spawnEnemy(){const edge=Math.floor(Math.random()*4);let x=edge===0?-25:edge===1?W+25:rand(0,W),y=edge===2?-25:edge===3?H+25:rand(70,H);let r=rand(11,19);enemies.push({x,y,r,hp:Math.ceil(2+elapsed/35),speed:rand(43,70)+elapsed*.45,phase:rand(0,7)})}
function burst(x,y,color,n=8){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),s=rand(35,180);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.2,.55),max:.55,color,r:rand(2,4)})}}
function nearest(){let best=null,bd=Infinity;for(const e of enemies){let d=Math.hypot(e.x-player.x,e.y-player.y);if(d<bd){bd=d;best=e}}return best}
function shoot(){const e=nearest();if(!e)return;let a=Math.atan2(e.y-player.y,e.x-player.x);bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*bulletSpeed,vy:Math.sin(a)*bulletSpeed,r:4,life:1.4,damage})}
function update(dt){if(state!=='playing')return;elapsed+=dt;spawn-=dt;shot-=dt;shake=Math.max(0,shake-dt*20);if(spawn<=0){spawn=Math.max(.24,1.05-elapsed*.008);spawnEnemy()}if(shot<=0){shoot();shot=1/fireRate}
if(pointer){let dx=pointer.x-player.x,dy=pointer.y-player.y,d=Math.hypot(dx,dy),step=moveSpeed*dt;if(d>4){player.x+=dx/d*Math.min(step,d);player.y+=dy/d*Math.min(step,d)}}
player.x=Math.max(player.r,Math.min(W-player.r,player.x));player.y=Math.max(65,Math.min(H-player.r,player.y));
for(let i=enemies.length-1;i>=0;i--){let e=enemies[i],a=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;e.phase+=dt*5;if(Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r){hp-=22*dt;shake=3;if(hp<=0){hp=0;endGame()}}}
for(let i=bullets.length-1;i>=0;i--){let b=bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;for(let j=enemies.length-1;j>=0;j--){let e=enemies[j];if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.r){e.hp-=b.damage;burst(b.x,b.y,'#a4ffe0',3);hit=true;if(e.hp<=0){burst(e.x,e.y,'#ff8d70',12);enemies.splice(j,1);kills++;if(Math.random()<.82)pickups.push({x:e.x,y:e.y,r:7})}break}}if(hit||b.life<=0||b.x< -20||b.x>W+20||b.y< -20||b.y>H+20)bullets.splice(i,1)}
for(let i=pickups.length-1;i>=0;i--){let p=pickups[i];if(Math.hypot(p.x-player.x,p.y-player.y)<p.r+player.r+8){pickups.splice(i,1);gainXp(1)}}
for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
$('hp').textContent=Math.ceil(hp);$('level').textContent=level;$('kills').textContent=kills;$('time').textContent=fmt(elapsed);$('xp-bar').style.width=(xp/xpNeed*100)+'%';
}
function fmt(t){let s=Math.floor(t);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function gainXp(n){xp+=n;if(xp>=xpNeed){xp-=xpNeed;level++;xpNeed=Math.ceil(xpNeed*1.32);pauseForUpgrade()}}
function pauseForUpgrade(){state='upgrade';const box=$('upgrade-options');box.innerHTML='';const picks=[...upgrades].sort(()=>Math.random()-.5).slice(0,3);for(const u of picks){const b=document.createElement('button');b.className='choice';b.innerHTML=u.name+'<span>'+u.desc+'</span>';b.onclick=()=>{u.apply();$('upgrade-screen').classList.add('hidden');state='playing';last=performance.now()};box.appendChild(b)}$('upgrade-screen').classList.remove('hidden')}
function draw(){ctx.clearRect(0,0,W,H);ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));
ctx.fillStyle='#12242d';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#ffffff0a';ctx.lineWidth=1;let grid=42,off=(elapsed*12)%grid;for(let x=0;x<W;x+=grid){ctx.beginPath();ctx.moveTo(x,-grid+off);ctx.lineTo(x,H);ctx.stroke()}for(let y=-grid+off;y<H;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
for(const p of pickups){ctx.shadowBlur=14;ctx.shadowColor='#74f4c9';ctx.fillStyle='#9affd9';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}ctx.shadowBlur=0;
for(const b of bullets){ctx.shadowBlur=15;ctx.shadowColor='#9affdf';ctx.fillStyle='#eaffd9';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill()}ctx.shadowBlur=0;
for(const e of enemies){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.phase*.12);ctx.shadowBlur=14;ctx.shadowColor='#ff705f';ctx.fillStyle='#e66b61';ctx.beginPath();for(let k=0;k<8;k++){let a=k*Math.PI/4,r=k%2?e.r*.72:e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#441f28';ctx.beginPath();ctx.arc(-4,-3,2,0,7);ctx.arc(4,-3,2,0,7);ctx.fill();ctx.restore()}
for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}ctx.globalAlpha=1;
ctx.shadowBlur=24;ctx.shadowColor='#56e4ca';ctx.fillStyle='#72e8d0';ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#eafff7';ctx.beginPath();ctx.arc(player.x-4,player.y-4,4,0,7);ctx.fill();ctx.restore()}
function loop(now){let dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt);draw();raf=requestAnimationFrame(loop)}
function start(){cancelAnimationFrame(raf);elapsed=0;kills=0;hp=100;level=1;xp=0;xpNeed=8;damage=1;fireRate=1;moveSpeed=210;bulletSpeed=520;enemies=[];bullets=[];particles=[];pickups=[];spawn=.5;shot=0;player={x:W/2,y:H*.68,r:13};pointer=null;$('start-screen').classList.add('hidden');$('gameover-screen').classList.add('hidden');$('upgrade-screen').classList.add('hidden');state='playing';last=performance.now();raf=requestAnimationFrame(loop)}
function endGame(){if(state==='over')return;state='over';pointer=null;$('final-stats').textContent='Время: '+fmt(elapsed)+' · Уровень: '+level+' · Победы: '+kills;$('gameover-screen').classList.remove('hidden')}
function pos(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointerdown',e=>{if(state==='playing'){pointer=pos(e);canvas.setPointerCapture?.(e.pointerId)}});canvas.addEventListener('pointermove',e=>{if(pointer&&state==='playing')pointer=pos(e)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>pointer=null);
$('start-btn').addEventListener('click',start);$('restart-btn').addEventListener('click',start);
draw();
})();