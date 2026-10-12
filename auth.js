/* Protótipo offline: hashes no cliente não oferecem segurança de produção. */
window.Auth=(function(){
 const expected="0c9bf04488d0527d2799577741506f0ab2372fdbc6fdba74a81731e78f2ccc07";
 function sha256(ascii){
  const mathPow=Math.pow,maxWord=mathPow(2,32),lengthProperty='length',words=[],asciiBitLength=unescape(encodeURIComponent(ascii)).length*8;
  ascii=unescape(encodeURIComponent(ascii));let hash=sha256.h=[],k=sha256.k=[],primeCounter=k[lengthProperty],isComposite={};
  for(let candidate=2;primeCounter<64;candidate++){if(!isComposite[candidate]){for(let i=0;i<313;i+=candidate)isComposite[i]=candidate;hash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;k[primeCounter++]=(mathPow(candidate,1/3)*maxWord)|0;}}
  ascii+='\x80';while(ascii[lengthProperty]%64-56)ascii+='\x00';
  for(let i=0;i<ascii[lengthProperty];i++){let j=ascii.charCodeAt(i);words[i>>2]|=j<<((3-i)%4)*8;}
  words[words[lengthProperty]]=(asciiBitLength/maxWord)|0;words[words[lengthProperty]]=asciiBitLength;
  for(let j=0;j<words[lengthProperty];){let w=words.slice(j,j+=16),oldHash=hash.slice(0,8),working=oldHash.slice();
   for(let i=0;i<64;i++){let i2=i+j,w15=w[i-15],w2=w[i-2],a=working[0],e=working[4];
    let temp1=working[7]+((e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7))+((e&working[5])^((~e)&working[6]))+k[i]+(w[i]=(i<16)?w[i]:(w[i-16]+((w15>>>7|w15<<25)^(w15>>>18|w15<<14)^(w15>>>3))+w[i-7]+((w2>>>17|w2<<15)^(w2>>>19|w2<<13)^(w2>>>10)))|0);
    let temp2=((a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10))+((a&working[1])^(a&working[2])^(working[1]&working[2]));
    working=[(temp1+temp2)|0,working[0],working[1],working[2],(working[3]+temp1)|0,working[4],working[5],working[6]];
   }for(let i=0;i<8;i++)hash[i]=(oldHash[i]+working[i])|0;
  }
  let result='';for(let i=0;i<8;i++)for(let j=3;j>=0;j--){let b=(hash[i]>>j*8)&255;result+=(b<16?'0':'')+b.toString(16)}return result;
 }
 return {hash:sha256,checkProfessor:p=>sha256(p)===expected};
})();
