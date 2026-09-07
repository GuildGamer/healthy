import {
  copyMoveNetInputTensor,
  MOVENET_RGB_BYTE_LENGTH,
  packMoveNetInputForBridge,
} from './copy-rgb-tensor';
import { flattenMoveNetOutput } from './flatten-movenet-output';

describe('packMoveNetInputForBridge', () => {
  it('packs the expected MoveNet tensor size for runOnJS', () => {
    const source = new Uint8Array(MOVENET_RGB_BYTE_LENGTH);
    source[0] = 42;
    source[MOVENET_RGB_BYTE_LENGTH - 1] = 99;

    const packed = packMoveNetInputForBridge(source);

    expect(packed).toHaveLength(MOVENET_RGB_BYTE_LENGTH);
    expect(packed[0]).toBe(42);
    expect(packed[MOVENET_RGB_BYTE_LENGTH - 1]).toBe(99);
  });

  it('rejects tensors that are not 256×256×3 bytes', () => {
    expect(() => packMoveNetInputForBridge(new Uint8Array(100))).toThrow(
      /196608 bytes/,
    );
  });
});

describe('copyMoveNetInputTensor', () => {
  it('returns an independent copy of the expected MoveNet tensor size', () => {
    const source = new Uint8Array(MOVENET_RGB_BYTE_LENGTH);
    source[0] = 42;
    source[MOVENET_RGB_BYTE_LENGTH - 1] = 99;

    const copied = copyMoveNetInputTensor(source);

    expect(copied.byteLength).toBe(MOVENET_RGB_BYTE_LENGTH);
    expect(copied[0]).toBe(42);
    expect(copied[MOVENET_RGB_BYTE_LENGTH - 1]).toBe(99);

    source[0] = 0;
    expect(copied[0]).toBe(42);
  });

  it('copies from a subarray with a non-zero byte offset', () => {
    const backing = new Uint8Array(MOVENET_RGB_BYTE_LENGTH + 4);
    backing.fill(0);
    backing[2] = 7;
    const source = backing.subarray(2, 2 + MOVENET_RGB_BYTE_LENGTH);

    const copied = copyMoveNetInputTensor(source);

    expect(copied[0]).toBe(7);
    expect(copied.byteLength).toBe(MOVENET_RGB_BYTE_LENGTH);
  });

  it('rejects tensors that are not 256×256×3 bytes', () => {
    expect(() => copyMoveNetInputTensor(new Uint8Array(100))).toThrow(
      /196608 bytes/,
    );
  });
});

describe('flattenMoveNetOutput', () => {
  it('copies float values into a plain number array', () => {
    const buffer = new Float32Array([0.1, 0.2, 0.3]).buffer;
    const flat = flattenMoveNetOutput(buffer);

    expect(flat).toHaveLength(3);
    expect(flat[0]).toBeCloseTo(0.1);
    expect(flat[1]).toBeCloseTo(0.2);
    expect(flat[2]).toBeCloseTo(0.3);
  });
});
