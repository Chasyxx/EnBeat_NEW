seqnote=x=>t*2**(x/12),addharmony3=(ch1,ch2,ch3)=>ch1%85+ch2%85+ch3%85,addharmony=(ch1,ch2)=>ch1%127+ch2%127,reverse=(x,l,d)=>x%256*(t&l)/d,decay=(x,l,d)=>x%256*(-t&l)/d,ch1=seqnote([0,2,4,6][(t>>16)%4])/2,ch2=seqnote([5,7,9,11][(t>>16)%4])/2,ch3=seqnote([12,14,16,18][(t>>16)%4])/2,channel1=reverse(addharmony3(ch1,ch2,ch3),16383,2E4),nt1=seqnote([4,5,7,5,4,6,7,9,6,6,4,4,4,4,4,4,6,7,9,7,6,8,9,8,8,8,8,8,8,8,8,6,6,7,9,7,6,8,9,11,9,9,9,9,9,9,9][(t>>13)%32]),nt2=seqnote([7,9,12,9,7,9,11,14,11,9,7,7,7,9,7,11,9,11,14,11,9,11,13,16,13,13,13,13,13,13,13,13][(t>>13)%32]),rt1=seqnote([4,6,4,4,6,7,9,10][(t>>15)%8]),rt2=seqnote([7,9,7,11,9,11,13,15][(t>>15)%8]),mainmelody1=decay(addharmony(nt1,nt2),t&131072?t&65536?65535:8191:8191,[1E4,1E4,1E4,15E4][(t>>16)%4]),mainmelody2=reverse(addharmony(rt1,rt2),16383,16384),drum=(5E6/(t&16383)&64)/2+random()*(-t&16383)/200,glitchdata='1100101011100000101011001110101011101010111011001010111011101110',glitch=random()*t*glitchdata[(t>>11)%glitchdata.length],kick=sqrt(3E3*(t&[16383,0][(t>>13)%2]))&64,sequence_song=t<1838100?t<1572780?t<1440737?t<1048521?t<524700?channel1:channel1+mainmelody1/1.2:(channel1+mainmelody1/1.2)/1.2+drum:channel1+mainmelody1/1.2:(channel1+mainmelody2/1.2)/2+(glitch&32)+kick:(channel1+mainmelody2/1.2)/2+(glitch&32)+kick+drum