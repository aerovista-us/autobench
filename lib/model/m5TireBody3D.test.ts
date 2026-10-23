import {describe,it,expect} from "vitest";
import {checkTireBody3D} from "./m5TireBody3D";
const pose={centerMm:[0,0,0] as [number,number,number],diameterMm:100,widthMm:40,steerDeg:25};
describe("M5 measured 3D mesh screen",()=>{
  it("fails closed when mesh is missing or not measured",()=>{
    expect(checkTireBody3D(undefined,pose).status).toBe("blocked");
    expect(checkTireBody3D({verticesMm:[0,0,0,100,0,0,0,100,0],triangleIndices:[0,1,2],source:"test",measured:false},pose).status).toBe("blocked");
  });
  it("detects a triangle crossing the tire",()=>{
    const mesh={verticesMm:[-100,-100,0,100,-100,0,0,100,0],triangleIndices:[0,1,2],source:"synthetic test geometry",measured:true};
    expect(checkTireBody3D(mesh,pose).status).toBe("intersection");
  });
  it("does not invent a collision for distant triangles",()=>{
    const mesh={verticesMm:[1000,1000,1000,1100,1000,1000,1000,1100,1000],triangleIndices:[0,1,2],source:"synthetic test geometry",measured:true};
    expect(checkTireBody3D(mesh,pose).status).toBe("no-surface-intersection-detected");
  });
});


function closedCube(cx:number,cy:number,cz:number,half:number){
  const verticesMm:number[]=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])
    verticesMm.push(cx+x*half,cy+y*half,cz+z*half);
  // Vertex id = x*4+y*2+z. All six faces triangulated.
  const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
  const triangleIndices=faces.flatMap(([a,b,c,d])=>[a,b,c,a,c,d]);
  return {verticesMm,triangleIndices,source:"synthetic closed mesh regression fixture",measured:true};
}
describe("M5 closed-body-mesh regression fixtures (synthetic, not Pops measurements)",()=>{
  it("detects a closed box crossing the tire",()=>{
    expect(checkTireBody3D(closedCube(45,0,0,12),pose).status).toBe("intersection");
  });
  it("does not report a collision for a distant closed box",()=>{
    expect(checkTireBody3D(closedCube(1000,1000,1000,20),pose).status).toBe("no-surface-intersection-detected");
  });
  it("detects a closed box completely enclosing the tire",()=>{
    expect(checkTireBody3D(closedCube(0,0,0,150),pose).status).toBe("intersection");
  });
  it("detects a small closed box entirely within the tire",()=>{
    expect(checkTireBody3D(closedCube(0,0,0,5),pose).status).toBe("intersection");
  });
});
