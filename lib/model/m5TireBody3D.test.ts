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
