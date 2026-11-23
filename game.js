(()=>{'use strict';
const canvas=document.getElementById('arena'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const tg=window.Telegram?.WebApp;
try{tg?.ready();tg?.expand();tg?.setHeaderColor?.('#101820');tg?.setBackgroundColor?.('#101820')}catch(e){}
let W=0,H=0,dpr=1,last=0,raf=0,state='menu',elapsed=0,kills=0,hp=100,maxHp=100,level=1,xp=0,xpNeed=8;
let damage=1,fireRate=1,moveSpeed=220,bulletSpeed=540,projectileCount=1,magnet=1;
let player={x:0,y:0,r:13},camera={x:0,y:0},touch=null,keys={},enemies=[],bullets=[],bossShots=[],particles=[],pickups=[];
let spawn=0,shot=0,shake=0,hitCooldown=0,flash=0,bossTimer=60;
const upgrades=[
 {name:'Усиленный урон',desc:'Урон снарядов +30%',apply:()=>damage*=1.3},
 {name:'Быстрая стрельба',desc:'Скорость стрельбы +22%',apply:()=>fireRate*=1.22},
 {name:'Лёгкие ноги',desc:'Скорость движения +15%',apply:()=>moveSpeed*=1.15},
 {name:'Аптечка',desc:'Восстановить 35 здоровья',apply:()=>hp=Math.min(maxHp,hp+35)},
 {name:'Быстрые снаряды',desc:'Скорость снарядов +25%',apply:()=>bulletSpeed*=1.25},
 {name:'Дополнительный ствол',desc:'Добавляет ещё один снаряд',apply:()=>projectileCount=Math.min(5,projectileCount+1)},
 {name:'Магнит опыта',desc:'Радиус притяжения кристаллов +45%',apply:()=>magnet*=1.45},
 {name:'Крепкое здоровье',desc:'Максимум здоровья +20 и лечение',apply:()=>{maxHp+=20;hp=Math.min(maxHp,hp+20)}}
];
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);W=window.innerWidth;H=window.innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(!player.x){player.x=W/2;player.y=H*.66}}
window.addEventListener('resize',resize);resize();
function rand(a,b){return a+Math.random()*(b-a)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function spawnEnemy(){
 if(enemies.length>85)return;
 const edge=Math.floor(Math.random()*4);
 let x=edge===0?camera.x-25:edge===1?camera.x+W+25:rand(camera.x,camera.x+W);
 let y=edge===2?camera.y-25:edge===3?camera.y+H+25:rand(camera.y+75,camera.y+H);
 const roll=Math.random(),type=elapsed>18&&roll>.78?'tank':elapsed>8&&roll>.48?'runner':'normal';
 const cfg=type==='tank'?{r:22,hp:Math.ceil(6+elapsed/24),speed:35+elapsed*.22,color:'#b879d9'}:type==='runner'?{r:10,hp:Math.ceil(1+elapsed/55),speed:105+elapsed*.35,color:'#f4bd62'}:{r:15,hp:Math.ceil(2+elapsed/38),speed:58+elapsed*.28,color:'#e66b61'};
 enemies.push({x,y,r:cfg.r,hp:cfg.hp,maxHp:cfg.hp,speed:cfg.speed,color:cfg.color,type,phase:rand(0,7)});
}
function spawnBoss(){
 const hpMax=48+Math.floor(elapsed*1.2);
 enemies.push({x:camera.x+W/2,y:camera.y+82,r:31,hp:hpMax,maxHp:hpMax,speed:42+elapsed*.12,color:'#ff526e',type:'boss',phase:0,attack:1.1});
 const wrap=$('boss-wrap');wrap.classList.remove('hidden');
}
function burst(x,y,color,n){for(let i=0;i<(n||8);i++){let a=rand(0,Math.PI*2),s=rand(35,180);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.2,.55),max:.55,color,r:rand(2,4)})}}
function nearest(){let best=null,bd=Infinity;for(const e of enemies){let d=Math.hypot(e.x-player.x,e.y-player.y);if(d<bd){bd=d;best=e}}return best}
function shoot(){
 const e=nearest();if(!e)return;
 const base=Math.atan2(e.y-player.y,e.x-player.x);
 for(let i=0;i<projectileCount;i++){const offset=(i-(projectileCount-1)/2)*.13,a=base+offset;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*bulletSpeed,vy:Math.sin(a)*bulletSpeed,r:4,life:1.5,damage})}
}
function gainXp(n){xp+=n;if(xp>=xpNeed){xp-=xpNeed;level++;xpNeed=Math.ceil(xpNeed*1.28+1);pauseForUpgrade()}}
function pauseForUpgrade(){
 state='upgrade';touch=null;
 const box=$('upgrade-options');box.innerHTML='';
 const pool=[...upgrades],picks=[];
 while(picks.length<3&&pool.length){const i=Math.floor(Math.random()*pool.length);picks.push(pool.splice(i,1)[0])}
 for(const u of picks){const b=document.createElement('button');b.className='choice';b.textContent=u.name;const span=document.createElement('span');span.textContent=u.desc;b.appendChild(span);b.addEventListener('click',()=>{u.apply();$('upgrade-screen').classList.add('hidden');state='playing';last=performance.now()},{once:true});box.appendChild(b)}
 $('upgrade-screen').classList.remove('hidden');
}
function damagePlayer(amount){if(hitCooldown>0||state!=='playing')return;hp=Math.max(0,hp-amount);hitCooldown=.65;flash=.18;shake=7;burst(player.x,player.y,'#ff8c83',10);if(hp<=0)endGame()}
function update(dt){
 if(state!=='playing')return;
 elapsed+=dt;spawn-=dt;shot-=dt;hitCooldown=Math.max(0,hitCooldown-dt);flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*22);
 if(spawn<=0){spawn=Math.max(.28,1.12-elapsed*.006);spawnEnemy()}
 if(elapsed>=bossTimer&&!enemies.some(e=>e.type==='boss')){spawnBoss();bossTimer+=60}
 if(shot<=0){shoot();shot=1/fireRate}
 let mx=0,my=0;
 if(touch){let dx=touch.x-touch.startX,dy=touch.y-touch.startY,len=Math.hypot(dx,dy),max=48;if(len>max){dx=dx/len*max;dy=dy/len*max}mx=dx/max;my=dy/max}
 else{mx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);my=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);let l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}}
 player.x+=mx*moveSpeed*dt;player.y+=my*moveSpeed*dt;
 const follow=1-Math.exp(-dt*10);camera.x+=(player.x-W*.5-camera.x)*follow;camera.y+=(player.y-H*.58-camera.y)*follow;
 for(let i=enemies.length-1;i>=0;i--){
 const e=enemies[i],a=Math.atan2(player.y-e.y,player.x-e.x);
 e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;e.phase+=dt*5;
 if(e.type==='boss'){
  e.attack-=dt;
  if(e.attack<=0){
   const aim=Math.atan2(player.y-e.y,player.x-e.x),speed=190+elapsed*.35;
   bossShots.push({x:e.x,y:e.y,vx:Math.cos(aim)*speed,vy:Math.sin(aim)*speed,r:8,life:3});
   e.attack= Math.max(.72,1.65-elapsed*.002);
   burst(e.x,e.y,'#ff8296',5);
  }
 }
 if(Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r)damagePlayer(e.type==='boss'?35:e.type==='tank'?28:20)
 }
 for(let i=bossShots.length-1;i>=0;i--){
  const b=bossShots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(Math.hypot(b.x-player.x,b.y-player.y)<b.r+player.r){damagePlayer(14);burst(b.x,b.y,'#ff8296',9);bossShots.splice(i,1);continue}
  if(b.life<=0||b.x<camera.x-35||b.x>camera.x+W+35||b.y<camera.y-35||b.y>camera.y+H+35)bossShots.splice(i,1)
 }
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.r){e.hp-=b.damage;burst(b.x,b.y,'#a4ffe0',3);hit=true;if(e.hp<=0){burst(e.x,e.y,e.color,e.type==='boss'?42:12);enemies.splice(j,1);kills++;if(e.type==='boss'){for(let k=0;k<10;k++){const a=k*Math.PI*2/10;pickups.push({x:e.x+Math.cos(a)*34,y:e.y+Math.sin(a)*34,r:8,value:2})}$('boss-wrap').classList.add('hidden')}else if(Math.random()<.88)pickups.push({x:e.x,y:e.y,r:7,value:1})}break}}if(hit||b.life<=0||b.x<camera.x-40||b.x>camera.x+W+40||b.y<camera.y-40||b.y>camera.y+H+40)bullets.splice(i,1)}
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i],dx=player.x-p.x,dy=player.y-p.y,d=Math.hypot(dx,dy);if(d<125*magnet&&d>1){const pull=(1-d/(125*magnet))*420;p.x+=dx/d*pull*dt;p.y+=dy/d*pull*dt}if(d<player.r+p.r+7){pickups.splice(i,1);gainXp(p.value)}}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
 const boss=enemies.find(e=>e.type==='boss');if(boss){$('boss-wrap').classList.remove('hidden');$('boss-hp').style.width=(boss.hp/boss.maxHp*100)+'%'}else $('boss-wrap').classList.add('hidden');
 $('hp').textContent=Math.ceil(hp);$('level').textContent=level;$('kills').textContent=kills;$('time').textContent=fmt(elapsed);$('xp-bar').style.width=(xp/xpNeed*100)+'%';
}
function fmt(t){const s=Math.floor(t);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function draw(){
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#12242d';ctx.fillRect(0,0,W,H);
 ctx.save();
 if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 ctx.translate(-camera.x,-camera.y);
 ctx.fillStyle='#12242d';ctx.fillRect(camera.x,camera.y,W,H);
 ctx.strokeStyle='#ffffff0a';ctx.lineWidth=1;const grid=42;
 const sx=Math.floor(camera.x/grid)*grid,sy=Math.floor(camera.y/grid)*grid;
 for(let x=sx;x<camera.x+W+grid;x+=grid){ctx.beginPath();ctx.moveTo(x,camera.y);ctx.lineTo(x,camera.y+H);ctx.stroke()}
 for(let y=sy;y<camera.y+H+grid;y+=grid){ctx.beginPath();ctx.moveTo(camera.x,y);ctx.lineTo(camera.x+W,y);ctx.stroke()}
 for(const p of pickups){ctx.shadowBlur=14;ctx.shadowColor='#74f4c9';ctx.fillStyle='#9affd9';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}
 for(const b of bullets){ctx.shadowBlur=15;ctx.shadowColor='#9affdf';ctx.fillStyle='#eaffd9';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()}
 for(const b of bossShots){ctx.save();ctx.shadowBlur=20;ctx.shadowColor='#ff526e';ctx.fillStyle='#ff7188';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffd2d9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r+3,0,Math.PI*2);ctx.stroke();ctx.restore()}
 ctx.shadowBlur=0;
 for(const e of enemies){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.phase*.12);ctx.shadowBlur=12;ctx.shadowColor=e.color;ctx.fillStyle=e.color;ctx.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4,r=k%2?e.r*.72:e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#44202a';ctx.beginPath();ctx.arc(-4,-3,2,0,Math.PI*2);ctx.arc(4,-3,2,0,Math.PI*2);ctx.fill();if(e.maxHp>3){ctx.fillStyle='#0008';ctx.fillRect(-e.r,-e.r-8,e.r*2,3);ctx.fillStyle=e.type==='boss'?'#ff9aaa':'#ffe0a0';ctx.fillRect(-e.r,-e.r-8,e.r*2*(e.hp/e.maxHp),3)}
 if(e.type==='boss'){ctx.strokeStyle='#ff9aaa';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.r+7,0,Math.PI*2);ctx.stroke()}ctx.restore()}
 for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 ctx.shadowBlur=24;ctx.shadowColor=flash>0?'#ff766d':'#56e4ca';ctx.fillStyle=flash>0?'#fff0ed':hitCooldown>0?'#6dbba9':'#72e8d0';ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#eafff7';ctx.beginPath();ctx.arc(player.x-4,player.y-4,4,0,Math.PI*2);ctx.fill();
 ctx.restore();
 if(touch){const dx=touch.x-touch.startX,dy=touch.y-touch.startY,len=Math.hypot(dx,dy),scale=len>48?48/len:1;ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle='#a4ffe0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(touch.startX,touch.startY,48,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#a4ffe0';ctx.beginPath();ctx.arc(touch.startX+dx*scale,touch.startY+dy*scale,18,0,Math.PI*2);ctx.fill();ctx.restore()}
}
function loop(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt);draw();raf=requestAnimationFrame(loop)}
function start(){cancelAnimationFrame(raf);elapsed=0;kills=0;hp=100;maxHp=100;level=1;xp=0;xpNeed=8;damage=1;fireRate=1;moveSpeed=220;bulletSpeed=540;projectileCount=1;magnet=1;enemies=[];bullets=[];bossShots=[];particles=[];pickups=[];spawn=.5;shot=0;bossTimer=60;shake=0;hitCooldown=0;flash=0;player={x:W/2,y:H*.58,r:13};camera={x:0,y:0};touch=null;$('start-screen').classList.add('hidden');$('gameover-screen').classList.add('hidden');$('upgrade-screen').classList.add('hidden');$('pause-screen').classList.add('hidden');state='playing';last=performance.now();raf=requestAnimationFrame(loop)}
function endGame(){if(state==='over')return;state='over';touch=null;$('final-stats').textContent='Время: '+fmt(elapsed)+' · Уровень: '+level+' · Убийства: '+kills;$('gameover-screen').classList.remove('hidden')}
function pause(){if(state!=='playing')return;state='paused';touch=null;$('pause-screen').classList.remove('hidden')}
function resume(){if(state!=='paused')return;$('pause-screen').classList.add('hidden');state='playing';last=performance.now()}
function returnToMenu(){if(state!=='paused')return;cancelAnimationFrame(raf);touch=null;state='menu';$('pause-screen').classList.add('hidden');$('start-screen').classList.remove('hidden');}
function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointerdown',e=>{if(state==='playing'&&!touch){const p=pointerPos(e);touch={id:e.pointerId,startX:p.x,startY:p.y,x:p.x,y:p.y};try{canvas.setPointerCapture(e.pointerId)}catch(_){}}});
canvas.addEventListener('pointermove',e=>{if(touch&&touch.id===e.pointerId){const p=pointerPos(e);touch.x=p.x;touch.y=p.y}});
function release(e){if(touch&&(!e||touch.id===e.pointerId))touch=null}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
window.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='Escape')state==='playing'?pause():resume()});
window.addEventListener('keyup',e=>{keys[e.key]=false});
$('start-btn').addEventListener('click',start);$('restart-btn').addEventListener('click',start);$('pause-btn').addEventListener('click',pause);$('resume-btn').addEventListener('click',resume);$('menu-btn').addEventListener('click',returnToMenu);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
draw();
})();