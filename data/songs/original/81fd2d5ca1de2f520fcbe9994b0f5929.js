

// Infenitely instantiable 1 Pole Filters
// (every call = new filter instance)
t?0:z1=[],
callCount=0,
lpf=lowPassFilter=(a,c)=>(
	call=callCount++,
	z1[call]??=0,
	z1[call]+=(a-z1[call])*c
),
hpf=highPassFilter=(a,c)=>a-lpf(a,c),
bpf=bandPassFilter=(a,hc, lc)=>hpf(lpf(a,lc), hc),
nf=notchFilter=(a,lc, hc)=>(hpf(a, hc)+lpf(a,lc))/1.75,
lbf=lowBoostFilter=(a,c,v)=>a+lpf(a,c)*v,
hbf=highBoostFilter=(a,c,v)=>a+hpf(a,c)*v,

len=10000,
dc=t,

t?0:b1=Array(len).fill(0),
d1=(a,fb)=>(b1[dc%len]=lpf(a+b1[(dc+1)%len]*fb,.2)),

t?0:b2=Array(len).fill(0),
d2=(a,fb)=>(b2[dc%len]=lpf(a+b2[(dc+1)%len]*fb,.2)),

t+=random()+hpf(random()*3,.2)**8*.5,


tune=.82,
speed=0.27,
T=t*tune,
b=t*speed,

// Helpers

bt=(x,len,spd)=>(x>>spd)%len,

dec=(spd,vol)=>(b&(16384*spd)-1)/vol,

sinwave=(x,amp)=>amp*sin(x*PI/64)+amp,
fm=(x,mod)=>sinwave(x+sinwave(x, mod), 255),

seq=(arr,spd,m)=>T*m*2**(arr[bt(t*speed,arr.length,spd)]/12),

// Sequences

mel1=[7-12,10,12,15,22][bt(t,5,0)],
mel2=[0,3,7,10,14][bt(t,5,0)],
mel3=[3-12,7,10,12,15][bt(t,5,0)],
mel4=[5-12,8,10,15,19][bt(t,5,0)],


mel=[mel1,mel2,mel3,mel4],

// Instruments

ins=lr=>-tanh(bpf(seq(mel,16, .995+.005*lr)/2%128,.01,.003)/4)*64+64,

bass=lr=>hpf(tanh(fm(seq([-24,-33,-28,-31], 16, 1), (lr*sin(b/10000)*10+!lr*cos(b/10000)*10)*1+(1-dec(.25,1.6e4))**4*35+10)*(1-dec(.25,1.6e4))**4/100)*50+50, .01),

hats=tanh(tan(hpf((t*sin(t>>2)&52)*(1-dec(.125,1.6e3*.68))**9, .9)+50))*6*(dec(1,1.6e4)+dec(.5,1.6e4/2)),

snare=hpf(tanh(+2/((b>>6)+127&255)*(sin((t*sin(t>>5)&250)/6)+1)*.2), 0.1)*70,

// Mix & Master ?
song=lr=>(
	mix=bass(lr)*.7+hpf(ins(lr),.18)+snare+hats,
	mix=(tanh(mix/255-.1))*255, // subtle asymetric saturation
	mix=hbf(lbf(mix,.001,11),.25,2), // low & high boost
	mix=(tanh(lpf(hpf(mix, .001)/128*1.4,(-cos(t/1000000)*.42+.5)**2+.01))+1)*127, // cut DC offset + soft cliping
	mix*1.5
),
[max(min(d1(song(1), -.65), 255),0), max(min(d2(song(0), -.65),255),0)]