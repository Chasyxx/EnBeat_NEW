T = t>>5,

m = (n) => (2**(1/12))**n,
x = (t) => ([[0,7,10,15],[-2,1,5,8],[-4,0,3,5],[-5,0,3,5]][t>>16&3].map(x=>t*m(x)%256).reduce((a,b)=>a+b))/4,
kick = 128*sin(1.5**(-t/2048%4+8)&1)*(1-t%8192/8192)*'10000100'[t>>13&7],
snare = 128*sin((t>>3)**7)*(1-t%8192/8192)/2*'00100010'[t>>13&7],
snare2 = 128*sin((t>>3)**7)*(.6-t%4096/8192)/2*'0000000101000001'[t>>12&15],
hat = 128*sin((t>>1)**7)*(1-t%8192/8192)/5*'01011001'[t>>13&7],
chords = 64*(x(t)/x(t-(8-(t>>13&7)))&1)*(1-t%8192/16384),
bass = t*m(-"0245"[t>>16&3]-12*(2-(t>>13&1)))%256/3,
((kick+snare+snare2+hat)+chords+bass)/1.5+64