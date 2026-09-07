/**
 * Flatten MoveNet output for the JS thread.
 * ArrayBuffers cannot cross runOnJS — plain numbers can.
 */
export function flattenMoveNetOutput(output: ArrayBuffer): number[] {
  'worklet';

  const values = new Float32Array(output);
  const flat: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    flat.push(values[index]!);
  }
  return flat;
}
