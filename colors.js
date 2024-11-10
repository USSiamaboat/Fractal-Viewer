function hslToRgb(h,s,l) {
    if ((h < 0) || (h > 360)) {
        console.log("Wtf are you doing: ", h)
        throw Error()
    }
   let a=s*Math.min(l,1-l);
   let f= (n,k=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
   return [f(0)*255,f(8)*255,f(4)*255];
}   