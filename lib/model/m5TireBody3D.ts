import { BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";

export interface MeshEvidence {
  /** Vertices in vehicle coordinates (mm), x forward, y left, z up. */
  verticesMm: number[];
  triangleIndices: number[];
  source: string;
  measured: boolean;
}
export interface TirePose3D {
  centerMm: [number,number,number];
  diameterMm: number;
  widthMm: number;
  steerDeg: number;
}
export interface TireBody3DResult {
  status:"blocked"|"intersection"|"no-surface-intersection-detected";
  intersections:number;
  reasons:string[];
}

/** Triangulated surface collision screening. Mesh evidence is mandatory.
 * Checks tire surface segments against body triangles, and body edges against
 * tire triangles; also detects full containment via ray parity. A negative
 * result is not a safety or roadworthiness approval.
 */
export function checkTireBody3D(body:MeshEvidence|undefined, pose:TirePose3D, radialSegments=48):TireBody3DResult {
  const blocked=(reason:string):TireBody3DResult=>({status:"blocked",intersections:0,reasons:[reason]});
  if (!body?.measured || !body.source.trim() || body.verticesMm.length<9 ||
      body.verticesMm.length%3!==0 || body.triangleIndices.length<3 ||
      body.triangleIndices.length%3!==0 ||
      [...body.verticesMm,...body.triangleIndices].some(v=>!Number.isFinite(v)) ||
      body.triangleIndices.some(i=>!Number.isInteger(i)||i<0||i>=body.verticesMm.length/3)) {
    return blocked("A measured triangulated body mesh with source evidence is required");
  }
  if (![...pose.centerMm,pose.diameterMm,pose.widthMm,pose.steerDeg].every(Number.isFinite) ||
      pose.diameterMm<=0 || pose.widthMm<=0 || Math.abs(pose.steerDeg)>90) {
    return blocked("Invalid tire dimensions or pose");
  }
  const bodyGeom=new BufferGeometry();
  bodyGeom.setAttribute("position",new (requireFloat32Attribute())(body.verticesMm,3));
  bodyGeom.setIndex(body.triangleIndices);
  bodyGeom.computeBoundingSphere();
  const bodyMesh=new Mesh(bodyGeom,new MeshBasicMaterial({side:DoubleSide}));
  bodyMesh.updateMatrixWorld(true);
  const radius=pose.diameterMm/2, half=pose.widthMm/2, angle=pose.steerDeg*Math.PI/180;
  const center=new Vector3(...pose.centerMm);
  const axis=new Vector3(-Math.sin(angle),Math.cos(angle),0);
  const forward=new Vector3(Math.cos(angle),Math.sin(angle),0);
  const rings:[Vector3[],Vector3[]]=[[],[]];
  for(let k=0;k<2;k++) for(let i=0;i<radialSegments;i++){
    const t=2*Math.PI*i/radialSegments;
    rings[k].push(center.clone().addScaledVector(axis,k===0?-half:half)
      .addScaledVector(forward,radius*Math.cos(t)).add(new Vector3(0,0,radius*Math.sin(t))));
  }
  const ray=new Raycaster();
  function segmentHits(mesh:Mesh,a:Vector3,b:Vector3):boolean{
    const dir=b.clone().sub(a),length=dir.length();
    if(length<1e-8)return false;
    ray.set(a,dir.normalize());ray.near=1e-5;ray.far=length-1e-5;
    return ray.intersectObject(mesh,false).length>0;
  }
  let intersections=0;
  for(let k=0;k<2;k++) for(let i=0;i<radialSegments;i++){
    const j=(i+1)%radialSegments;
    if(segmentHits(bodyMesh,rings[k][i],rings[k][j]))intersections++;
    if(k===0 && segmentHits(bodyMesh,rings[0][i],rings[1][i]))intersections++;
  }
  // Test the converse: body triangle edges against a triangulated tire surface.
  const tireVertices:number[]=[],tireIndices:number[]=[];
  for(const ring of rings)for(const p of ring)tireVertices.push(p.x,p.y,p.z);
  for(let i=0;i<radialSegments;i++){
    const j=(i+1)%radialSegments;
    tireIndices.push(i,j,radialSegments+i,j,radialSegments+j,radialSegments+i);
  }
  // Close both caps so containment tests have a watertight tire volume.
  const centerA=center.clone().addScaledVector(axis,-half);
  const centerB=center.clone().addScaledVector(axis,half);
  tireVertices.push(centerA.x,centerA.y,centerA.z,centerB.x,centerB.y,centerB.z);
  for(let i=0;i<radialSegments;i++){
    const j=(i+1)%radialSegments;
    tireIndices.push(2*radialSegments,j,i,2*radialSegments+1,radialSegments+i,radialSegments+j);
  }
  const tireGeom=new BufferGeometry();
  tireGeom.setAttribute("position",new (requireFloat32Attribute())(tireVertices,3));
  tireGeom.setIndex(tireIndices);tireGeom.computeBoundingSphere();
  const tireMesh=new Mesh(tireGeom,new MeshBasicMaterial({side:DoubleSide}));
  tireMesh.updateMatrixWorld(true);
  for(let i=0;i<body.triangleIndices.length;i+=3){
    const ids=body.triangleIndices.slice(i,i+3);
    const pts=ids.map(id=>new Vector3(...body.verticesMm.slice(id*3,id*3+3)));
    for(let j=0;j<3;j++)if(segmentHits(tireMesh,pts[j],pts[(j+1)%3]))intersections++;
  }
  function inside(mesh:Mesh,point:Vector3):boolean{
    ray.set(point,new Vector3(0.829,0.417,0.372).normalize());ray.near=1e-5;ray.far=Infinity;
    const hits=ray.intersectObject(mesh,false);
    const distances:number[]=[];
    for(const hit of hits)if(!distances.some(d=>Math.abs(d-hit.distance)<1e-4))distances.push(hit.distance);
    return distances.length%2===1;
  }
  if(inside(bodyMesh,rings[0][0])||inside(tireMesh,new Vector3(...body.verticesMm.slice(0,3))))intersections++;
  bodyGeom.dispose();tireGeom.dispose();
  return {status:intersections?"intersection":"no-surface-intersection-detected",intersections,
    reasons:["Discrete triangulated surfaces only; resolution, mesh watertightness, motion between poses, and suspension/frame clearance remain unverified"]};
}
import { Float32BufferAttribute } from "three";
function requireFloat32Attribute(){return Float32BufferAttribute;}
