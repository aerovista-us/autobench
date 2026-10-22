import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Pops Van AutoBench — design, measure and validate a classic Chevy 4x4";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{display:"flex",width:"100%",height:"100%",background:"linear-gradient(135deg,#08131f 0%,#123249 55%,#071018 100%)",color:"#f0f7fc",padding:65,fontFamily:"sans-serif",position:"relative",overflow:"hidden"}}>
      <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:"62%"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,fontSize:24,letterSpacing:4,color:"#80c7ef"}}>
          <div style={{display:"flex",padding:"10px 14px",border:"2px solid #80c7ef",borderRadius:10,fontWeight:800}}>AV</div>
          AEROVISTA / AUTOBENCH
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontSize:75,fontWeight:800,letterSpacing:-3,lineHeight:1}}>Pops Van</div>
          <div style={{fontSize:75,fontWeight:800,letterSpacing:-3,lineHeight:1,color:"#7bc5f1"}}>AutoBench</div>
          <div style={{fontSize:28,color:"#c5d9e8",marginTop:14}}>Measure. Design. Validate. Build.</div>
          <div style={{fontSize:22,color:"#a3bccb",maxWidth:630,lineHeight:1.4}}>A classic Chevy 4x4 reimagined through CAD, suspension clearance and measurement-led planning.</div>
        </div>
        <div style={{display:"flex",fontSize:18,letterSpacing:2,color:"#e8bd75"}}>CLASSIC CHEVY 4×4  /  ENGINEERING WORKBENCH</div>
      </div>
      <div style={{display:"flex",position:"absolute",right:-60,top:160,width:570,height:300,transform:"rotate(-7deg)"}}>
        <div style={{display:"flex",position:"absolute",top:90,left:35,width:480,height:180,border:"8px solid #92afc2",borderRadius:"85px 35px 28px 28px",background:"linear-gradient(180deg,#286d94 0%,#164766 53%,#0a111b 54%,#0c1723 100%)"}}/>
        <div style={{display:"flex",position:"absolute",top:112,left:75,width:180,height:70,borderRadius:15,background:"#9bbcc9",border:"7px solid #102d43"}}/>
        <div style={{display:"flex",position:"absolute",top:112,left:268,width:155,height:70,borderRadius:15,background:"#9bbcc9",border:"7px solid #102d43"}}/>
        <div style={{display:"flex",position:"absolute",top:208,left:55,width:430,height:36,background:"#0a141e",border:"5px solid #aec3ce",borderRadius:8}}/>
        <div style={{display:"flex",position:"absolute",top:224,left:145,width:245,height:8,background:"#91a9b6"}}/>
        <div style={{display:"flex",position:"absolute",top:224,left:145,width:245,height:8,background:"#91a9b6",transform:"translateY(12px)"}}/>
        <div style={{display:"flex",position:"absolute",top:222,left:62,width:50,height:33,background:"#ffca70",border:"4px solid #d7e2e9",borderRadius:5}}/>
        <div style={{display:"flex",position:"absolute",top:222,right:85,width:50,height:33,background:"#ffca70",border:"4px solid #d7e2e9",borderRadius:5}}/>
        <div style={{display:"flex",position:"absolute",top:245,left:90,width:95,height:95,borderRadius:60,background:"#080b0f",border:"12px solid #718b9c"}}/>
        <div style={{display:"flex",position:"absolute",top:245,right:105,width:95,height:95,borderRadius:60,background:"#080b0f",border:"12px solid #718b9c"}}/>
        <div style={{display:"flex",position:"absolute",top:76,left:110,width:340,height:8,background:"#9eb5c0",borderRadius:6}}/>
        {[140,220,300,380].map(x=><div key={x} style={{display:"flex",position:"absolute",top:57,left:x,width:29,height:29,borderRadius:20,background:"#ffc66a",border:"5px solid #111c28"}}/>)}
      </div>
    </div>,
    {...size}
  );
}
