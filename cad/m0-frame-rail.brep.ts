import { box } from "brepjs";

const LENGTH_MM = 3000;
const WIDTH_MM = 76;
const HEIGHT_MM = 152;

export const expected = {
  volume: LENGTH_MM * WIDTH_MM * HEIGHT_MM,
  tolerancePct: 0.001,
};

export default () =>
  box(LENGTH_MM, WIDTH_MM, HEIGHT_MM, { centered: true });
